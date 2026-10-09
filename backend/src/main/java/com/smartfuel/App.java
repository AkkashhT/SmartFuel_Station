package com.smartfuel;
import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import java.math.BigDecimal;
@SpringBootApplication
public class App {
  public static void main(String[] a){ SpringApplication.run(App.class,a); }
  @Bean CommandLineRunner seed(FuelRepo f, TankRepo t, MoveRepo m, ShiftRepo sr, UserRepo u, org.springframework.security.crypto.password.PasswordEncoder pe,
      @org.springframework.beans.factory.annotation.Value("${smartfuel.demo-password:Demo@123}") String pw){ return x -> {
    if(u.count()==0) for(String[] r:new String[][]{{"admin","Station Admin","ADMIN"},{"manager","Station Manager","MANAGER"},{"cashier","Cashier","CASHIER"},{"attendant","Pump Attendant","ATTENDANT"},{"auditor","Auditor","AUDITOR"}}){
      Domain.AppUser a=new Domain.AppUser(); a.username=r[0]; a.fullName=r[1]; a.role=r[2]; a.passwordHash=pe.encode(pw); u.save(a); }
    if(f.count()>0) return;
    String[] n={"Petrol (DEMO)","Diesel (DEMO)","XP95 (DEMO)"}; String[] p={"102.50","89.60","112.30"};
    for(int i=0;i<3;i++){
      Domain.Fuel fu=new Domain.Fuel(); fu.name=n[i]; fu.price=new BigDecimal(p[i]); f.save(fu);
      Domain.Tank tk=new Domain.Tank(); tk.name="T-0"+(i+1); tk.fuelId=fu.id; tk.capacity=new BigDecimal("20000");
      tk.stock=new BigDecimal(i==2?"2500":"12000"); tk.reorder=new BigDecimal("4000"); tk.critical=new BigDecimal("1500");
      tk.status=i==2?"LOW":"NORMAL"; t.save(tk);
      Domain.Movement mv=new Domain.Movement(); mv.tankId=tk.id; mv.type="OPENING_STOCK"; mv.ref="seed"; mv.qty=tk.stock; mv.balanceAfter=tk.stock; m.save(mv);
    }
    Domain.Shift sh=new Domain.Shift(); sh.name="MORNING"; sh.status="OPEN"; sh.openedBy="system"; sh.openingStock=new BigDecimal("26500"); sr.save(sh); }; }
}
