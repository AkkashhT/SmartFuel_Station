package com.smartfuel;
import com.smartfuel.Domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@RestController @RequestMapping("/api/v1") @CrossOrigin
public class Api {
  public record SaleReq(@NotNull Long tankId, @NotNull @DecimalMin("0.01") BigDecimal qty, @NotBlank String payMode, String vehicle, Long customerId){}
  public record CustReq(@NotBlank String name, String mobile, String type, @NotNull @DecimalMin("0") BigDecimal creditLimit){}
  public record VehReq(@NotBlank String regNo, String vehicleType, Long customerId, String fuelPref){}
  public record AdjReq(@NotNull BigDecimal qty, @NotBlank String reason){}
  public record OpenReq(@NotBlank String name){}
  public record CloseReq(@NotNull BigDecimal actualCollection, @NotNull BigDecimal physicalStock, String remarks){}
  public record DeliveryReq(@NotBlank String note, @NotNull Long tankId, @NotNull @DecimalMin("0.01") BigDecimal qty){}
  public record PriceReq(@NotNull @DecimalMin("0.01") BigDecimal price, String reason){}
  final FuelRepo fuels; final PriceRepo prices; final TankRepo tanks; final MoveRepo moves; final SaleRepo sales; final DeliveryRepo deliveries; final AlertRepo alerts;
  Api(FuelRepo f,PriceRepo p,TankRepo t,MoveRepo m,SaleRepo s,DeliveryRepo d,AlertRepo a){fuels=f;prices=p;tanks=t;moves=m;sales=s;deliveries=d;alerts=a;}

  @org.springframework.beans.factory.annotation.Autowired AuditRepo audits;
  @org.springframework.beans.factory.annotation.Autowired CustomerRepo customers;
  @org.springframework.beans.factory.annotation.Autowired VehicleRepo vehicles;
  @org.springframework.beans.factory.annotation.Autowired ShiftRepo shifts;
  static final BigDecimal STOCK_TOL=new BigDecimal("50"), CASH_TOL=new BigDecimal("100");
  BigDecimal sum(List<Sale> l,String mode){ return l.stream().filter(x->mode==null||mode.equals(x.payMode)).map(x->x.total).reduce(BigDecimal.ZERO,BigDecimal::add); }
  String who(){ var a=SecurityContextHolder.getContext().getAuthentication(); return a==null?"system":a.getName(); }
  void audit(String action,String detail){ AuditLog l=new AuditLog(); l.actor=who(); l.action=action; l.detail=detail; audits.save(l); }
  static ResponseStatusException bad(HttpStatus s,String m){ return new ResponseStatusException(s,m); }
  String level(Tank t){ if(t.stock.signum()<=0) return "EMPTY"; if(t.stock.compareTo(t.critical)<=0) return "CRITICAL"; if(t.stock.compareTo(t.reorder)<=0) return "LOW"; return "NORMAL"; }
  void move(Tank t,String type,BigDecimal q,String ref){ Movement m=new Movement(); m.tankId=t.id; m.type=type; m.qty=q; m.ref=ref; m.balanceAfter=t.stock; moves.save(m); }
  /** Alerts fire only when the level changes (no duplicate alert per sale). */
  void recheck(Tank t){ String n=level(t); if(n.equals(t.status)) return; t.status=n;
    if(n.equals("NORMAL")) alerts.findByTankIdAndStatusNot(t.id,"RESOLVED").forEach(a->a.status="RESOLVED");
    else { Alert a=new Alert(); a.tankId=t.id; a.alertLevel=n; a.stock=t.stock; alerts.save(a); } }
  Tank lock(Long id){ return tanks.lock(id).orElseThrow(()->bad(HttpStatus.NOT_FOUND,"Tank not found")); }

  @PostMapping("/sales") @Transactional
  public Sale sale(@Valid @RequestBody SaleReq r){
    Tank t=lock(r.tankId()); Fuel f=fuels.findById(t.fuelId).orElseThrow();
    if(t.stock.compareTo(r.qty())<0) throw bad(HttpStatus.CONFLICT,"Insufficient stock: only "+t.stock+" L available");
    Sale s=new Sale(); s.invoice="INV-"+System.currentTimeMillis(); s.tankId=t.id; s.fuelId=f.id; s.qty=r.qty();
    s.unitPriceAtSale=f.price; s.total=f.price.multiply(r.qty()).setScale(2,java.math.RoundingMode.HALF_UP); s.payMode=r.payMode(); s.vehicle=r.vehicle();
    Shift sh=shifts.findFirstByStatus("OPEN").orElseThrow(()->bad(HttpStatus.CONFLICT,"No open shift. A manager must open a shift before sales."));
    s.shiftId=sh.id;
    if("CREDIT".equals(s.payMode)){
      if(r.customerId()==null) throw bad(HttpStatus.BAD_REQUEST,"Customer is required for a credit sale");
      Customer c=customers.findById(r.customerId()).orElseThrow(()->bad(HttpStatus.NOT_FOUND,"Customer not found"));
      if(c.outstanding.add(s.total).compareTo(c.creditLimit)>0) throw bad(HttpStatus.CONFLICT,"Credit limit exceeded: available "+c.creditLimit.subtract(c.outstanding));
      c.outstanding=c.outstanding.add(s.total); s.customerId=c.id; }
    s.attendant=who(); sales.save(s); audit("SALE",s.invoice+" "+s.qty+" L tank "+t.id+" "+s.payMode); t.stock=t.stock.subtract(r.qty()); move(t,"SALE",r.qty().negate(),s.invoice); recheck(t); return s;
  }
  @PostMapping("/deliveries") @Transactional
  public Delivery delivery(@Valid @RequestBody DeliveryReq r){
    if(deliveries.existsByNote(r.note())) throw bad(HttpStatus.CONFLICT,"Delivery note already exists");
    Tank t=lock(r.tankId()); BigDecimal room=t.capacity.subtract(t.stock);
    if(r.qty().compareTo(room)>0) throw bad(HttpStatus.UNPROCESSABLE_ENTITY,"Delivery cannot be recorded. Tank has only "+room+" L available capacity.");
    Delivery d=new Delivery(); d.note=r.note(); d.tankId=t.id; d.qty=r.qty(); deliveries.save(d); audit("DELIVERY",d.note+" "+d.qty+" L tank "+t.id);
    t.stock=t.stock.add(r.qty()); move(t,"DELIVERY",r.qty(),r.note()); recheck(t); return d;
  }
  @PostMapping("/fuels/{id}/price") @Transactional
  public Fuel price(@PathVariable Long id,@Valid @RequestBody PriceReq r){
    Fuel f=fuels.findById(id).orElseThrow(()->bad(HttpStatus.NOT_FOUND,"Fuel not found"));
    PriceHistory h=new PriceHistory(); h.fuelId=id; h.oldPrice=f.price; h.newPrice=r.price(); h.reason=r.reason(); prices.save(h); audit("PRICE_CHANGE",f.name+" "+f.price+" -> "+r.price()+" "+r.reason()); f.price=r.price(); return f;
  }
  @GetMapping("/fuels/{id}/price-history") public List<PriceHistory> ph(@PathVariable Long id){ return prices.findByFuelIdOrderByTsDesc(id); }
  @GetMapping("/tanks/{id}/ledger") public List<Movement> ledger(@PathVariable Long id){ return moves.findByTankIdOrderByIdDesc(id); }
  @PostMapping("/alerts/{id}/ack") @Transactional public Alert ack(@PathVariable Long id){ Alert a=alerts.findById(id).orElseThrow(); if(a.status.equals("OPEN")) { a.status="ACKNOWLEDGED"; audit("ALERT_ACK","alert "+id); } return a; }
  @GetMapping("/customers") public List<Customer> customers(){ return customers.findAll(); }
  @PostMapping("/customers") @Transactional public Customer addCustomer(@Valid @RequestBody CustReq r){
    Customer c=new Customer(); c.name=r.name(); c.mobile=r.mobile(); c.type=r.type()==null?"INDIVIDUAL":r.type(); c.creditLimit=r.creditLimit(); c.outstanding=BigDecimal.ZERO;
    customers.save(c); audit("CUSTOMER_CREATE",c.name); return c; }
  @GetMapping("/vehicles") public List<Vehicle> vehicles(){ return vehicles.findAll(); }
  @PostMapping("/vehicles") @Transactional public Vehicle addVehicle(@Valid @RequestBody VehReq r){
    String reg=r.regNo().trim().toUpperCase(); if(vehicles.existsByRegNo(reg)) throw bad(HttpStatus.CONFLICT,"Vehicle registration already exists");
    Vehicle v=new Vehicle(); v.regNo=reg; v.vehicleType=r.vehicleType(); v.customerId=r.customerId(); v.fuelPref=r.fuelPref(); vehicles.save(v); audit("VEHICLE_CREATE",reg); return v; }
  @GetMapping("/shifts") public List<Shift> shifts(){ return shifts.findAllByOrderByIdDesc(); }
  @PostMapping("/shifts/open") @Transactional public Shift openShift(@Valid @RequestBody OpenReq r){
    if(shifts.findFirstByStatus("OPEN").isPresent()) throw bad(HttpStatus.CONFLICT,"A shift is already open");
    Shift s=new Shift(); s.name=r.name(); s.status="OPEN"; s.openedBy=who();
    s.openingStock=tanks.findAll().stream().map(t->t.stock).reduce(BigDecimal.ZERO,BigDecimal::add); shifts.save(s); audit("SHIFT_OPEN",s.name); return s; }
  @PostMapping("/shifts/{id}/close") @Transactional public Shift closeShift(@PathVariable Long id,@Valid @RequestBody CloseReq r){
    Shift s=shifts.findById(id).orElseThrow(()->bad(HttpStatus.NOT_FOUND,"Shift not found"));
    if(!"OPEN".equals(s.status)) throw bad(HttpStatus.CONFLICT,"Shift is closed and cannot be modified");
    List<Sale> ss=sales.findByShiftId(id);
    s.litresSold=ss.stream().map(x->x.qty).reduce(BigDecimal.ZERO,BigDecimal::add);
    s.expectedCash=sum(ss,"CASH"); s.expectedUpi=sum(ss,"UPI"); s.expectedCard=sum(ss,"CARD"); s.expectedCredit=sum(ss,"CREDIT"); s.expectedTotal=sum(ss,null);
    s.actualCollection=r.actualCollection(); s.collectionDifference=r.actualCollection().subtract(s.expectedTotal);
    s.systemClosingStock=tanks.findAll().stream().map(t->t.stock).reduce(BigDecimal.ZERO,BigDecimal::add);
    s.physicalStock=r.physicalStock(); s.stockVariance=r.physicalStock().subtract(s.systemClosingStock);
    boolean over=s.stockVariance.abs().compareTo(STOCK_TOL)>0||s.collectionDifference.abs().compareTo(CASH_TOL)>0;
    if(over&&(r.remarks()==null||r.remarks().isBlank())) throw bad(HttpStatus.UNPROCESSABLE_ENTITY,"Variance exceeds tolerance (stock "+s.stockVariance+" L, cash "+s.collectionDifference+"). Manager remarks are required.");
    s.remarks=r.remarks(); s.status="CLOSED"; s.closedBy=who(); s.closedAt=java.time.LocalDateTime.now();
    audit("SHIFT_CLOSE",s.name+" diff="+s.collectionDifference+" stockVar="+s.stockVariance); return s; }
  @PostMapping("/tanks/{id}/adjust") @Transactional public Tank adjust(@PathVariable Long id,@Valid @RequestBody AdjReq r){
    Tank t=lock(id); if(r.qty().signum()==0) throw bad(HttpStatus.BAD_REQUEST,"Adjustment quantity cannot be zero");
    BigDecimal n=t.stock.add(r.qty());
    if(n.signum()<0) throw bad(HttpStatus.UNPROCESSABLE_ENTITY,"Adjustment would make stock negative");
    if(n.compareTo(t.capacity)>0) throw bad(HttpStatus.UNPROCESSABLE_ENTITY,"Adjustment exceeds tank capacity");
    t.stock=n; move(t,r.qty().signum()>0?"ADJUSTMENT_IN":"ADJUSTMENT_OUT",r.qty(),"ADJ: "+r.reason());
    recheck(t); audit("STOCK_ADJUST","tank "+id+" "+r.qty()+" L, reason: "+r.reason()); return t; }
  List<Sale> between(String from,String to){
    java.time.LocalDateTime f=(from==null||from.isBlank())?LocalDate.of(2000,1,1).atStartOfDay():LocalDate.parse(from).atStartOfDay();
    java.time.LocalDateTime e=(to==null||to.isBlank())?java.time.LocalDateTime.now().plusDays(1):LocalDate.parse(to).plusDays(1).atStartOfDay();
    return sales.findAll().stream().filter(s->!s.ts.isBefore(f)&&s.ts.isBefore(e)).sorted(Comparator.comparing((Sale s)->s.id).reversed()).toList(); }
  @GetMapping("/reports/sales") public Map<String,Object> salesReport(@RequestParam(required=false) String from,@RequestParam(required=false) String to){
    List<Sale> l=between(from,to); Map<Long,String> fn=new HashMap<>(); fuels.findAll().forEach(f->fn.put(f.id,f.name));
    Map<String,Object> m=new LinkedHashMap<>(); m.put("count",l.size()); m.put("litres",l.stream().map(s->s.qty).reduce(BigDecimal.ZERO,BigDecimal::add)); m.put("revenue",sum(l,null));
    m.put("byFuelRevenue",l.stream().collect(java.util.stream.Collectors.groupingBy(s->fn.get(s.fuelId),TreeMap::new,java.util.stream.Collectors.reducing(BigDecimal.ZERO,s->s.total,BigDecimal::add))));
    m.put("byFuelLitres",l.stream().collect(java.util.stream.Collectors.groupingBy(s->fn.get(s.fuelId),TreeMap::new,java.util.stream.Collectors.reducing(BigDecimal.ZERO,s->s.qty,BigDecimal::add))));
    m.put("byPayment",l.stream().collect(java.util.stream.Collectors.groupingBy(s->s.payMode,TreeMap::new,java.util.stream.Collectors.reducing(BigDecimal.ZERO,s->s.total,BigDecimal::add)))); return m; }
  @GetMapping(value="/reports/sales.csv",produces="text/csv") public String salesCsv(@RequestParam(required=false) String from,@RequestParam(required=false) String to){
    Map<Long,String> fn=new HashMap<>(); fuels.findAll().forEach(f->fn.put(f.id,f.name));
    StringBuilder b=new StringBuilder("invoice,time,fuel,litres,unit_price,total,payment,vehicle,attendant\n");
    for(Sale s:between(from,to)) b.append(String.join(",",s.invoice,s.ts.toString(),"\""+fn.get(s.fuelId)+"\"",s.qty.toString(),s.unitPriceAtSale.toString(),s.total.toString(),s.payMode,"\""+(s.vehicle==null?"":s.vehicle.replace("\"","\"\""))+"\"",String.valueOf(s.attendant))).append('\n');
    return b.toString(); }
  @GetMapping("/reports/sales/page") public Map<String,Object> salesPage(@RequestParam(required=false) String from,@RequestParam(required=false) String to,
      @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size,@RequestParam(defaultValue="id") String sort,@RequestParam(defaultValue="desc") String dir){
    List<Sale> l=new ArrayList<>(between(from,to));
    Comparator<Sale> c=switch(sort){ case "total"->Comparator.comparing((Sale s)->s.total); case "qty"->Comparator.comparing((Sale s)->s.qty); case "time"->Comparator.comparing((Sale s)->s.ts); default->Comparator.comparing((Sale s)->s.id); };
    l.sort("asc".equals(dir)?c:c.reversed());
    int sz=Math.min(Math.max(size,1),100), a=Math.min(Math.max(page,0)*sz,l.size());
    Map<String,Object> m=new LinkedHashMap<>(); m.put("total",l.size()); m.put("page",page); m.put("size",sz); m.put("items",l.subList(a,Math.min(a+sz,l.size()))); return m; }
  /** Rule-based forecasting, reorder advice, anomaly flags and SIMULATED sensor readings (no hardware). */
  @GetMapping("/insights") public Map<String,Object> insights(){
    java.time.LocalDateTime wk=java.time.LocalDateTime.now().minusDays(7); List<Sale> all=sales.findAll(); Random rnd=new Random(System.currentTimeMillis()/10000);
    List<Map<String,Object>> tk=new ArrayList<>();
    for(Tank t:tanks.findAll()){
      BigDecimal week=all.stream().filter(s->t.id.equals(s.tankId)&&s.ts.isAfter(wk)).map(s->s.qty).reduce(BigDecimal.ZERO,BigDecimal::add);
      BigDecimal avg=week.divide(BigDecimal.valueOf(7),2,RoundingMode.HALF_UP);
      BigDecimal sensor=t.stock.multiply(BigDecimal.valueOf(1+(rnd.nextDouble()-0.5)*0.006)).setScale(2,RoundingMode.HALF_UP);
      Map<String,Object> m=new LinkedHashMap<>(); m.put("tankId",t.id); m.put("name",t.name); m.put("avgDailySales",avg);
      m.put("daysRemaining",avg.signum()>0?t.stock.divide(avg,1,RoundingMode.HALF_UP):null);
      m.put("recommendedOrder",t.capacity.multiply(new BigDecimal("0.9")).subtract(t.stock).max(BigDecimal.ZERO).setScale(0,RoundingMode.HALF_UP));
      m.put("sensorLitres",sensor); m.put("sensorTempC",Math.round((26+rnd.nextDouble()*6)*10)/10.0); m.put("sensorVariance",sensor.subtract(t.stock));
      m.put("sensorAlert",sensor.subtract(t.stock).abs().compareTo(t.capacity.multiply(new BigDecimal("0.002")))>0); tk.add(m); }
    List<Map<String,String>> an=new ArrayList<>();
    if(all.size()>=5){ BigDecimal mean=all.stream().map(s->s.qty).reduce(BigDecimal.ZERO,BigDecimal::add).divide(BigDecimal.valueOf(all.size()),2,RoundingMode.HALF_UP);
      for(Sale s:all) if(s.qty.compareTo(mean.multiply(BigDecimal.valueOf(3)))>0) an.add(Map.of("type","LARGE_TRANSACTION","invoice",s.invoice,"detail",s.qty+" L vs average "+mean+" L")); }
    all.stream().filter(s->s.vehicle!=null&&!s.vehicle.isBlank()).collect(java.util.stream.Collectors.groupingBy(s->s.vehicle.toUpperCase())).forEach((v,l)->{
      l.sort(Comparator.comparing(x->x.ts));
      for(int i=1;i<l.size();i++) if(java.time.Duration.between(l.get(i-1).ts,l.get(i).ts).toMinutes()<10) an.add(Map.of("type","REPEAT_VEHICLE","invoice",l.get(i).invoice,"detail",v+" fuelled twice within 10 minutes")); });
    Map<String,Object> out=new LinkedHashMap<>(); out.put("tanks",tk); out.put("anomalies",an.stream().limit(20).toList()); out.put("sensorNote","Sensor readings are SIMULATED"); return out; }
  @GetMapping("/me") public Map<String,String> me(){ var a=SecurityContextHolder.getContext().getAuthentication();
    return Map.of("username",a.getName(),"role",a.getAuthorities().iterator().next().getAuthority().replace("ROLE_","")); }
  @GetMapping("/audit") public List<AuditLog> auditLog(){ return audits.findTop100ByOrderByIdDesc(); }
  @GetMapping("/dashboard") public Map<String,Object> dash(){
    List<Sale> today=sales.findByTsAfterOrderByIdDesc(LocalDate.now().atStartOfDay());
    Map<String,Object> m=new LinkedHashMap<>();
    m.put("revenue",today.stream().map(s->s.total).reduce(BigDecimal.ZERO,BigDecimal::add));
    m.put("litres",today.stream().map(s->s.qty).reduce(BigDecimal.ZERO,BigDecimal::add));
    m.put("transactions",today.size()); m.put("fuels",fuels.findAll()); m.put("tanks",tanks.findAll());
    m.put("alerts",alerts.findByStatusNot("RESOLVED")); m.put("recentSales",today.stream().limit(10).toList()); return m;
  }
}
