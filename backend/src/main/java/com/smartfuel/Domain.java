package com.smartfuel;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
public class Domain {
  @Entity(name="Fuel") @Table(name="fuels") public static class Fuel { @Id @GeneratedValue public Long id; public String name; public BigDecimal price; }
  @Entity(name="PriceHistory") @Table(name="fuel_price_history") public static class PriceHistory { @Id @GeneratedValue public Long id; public Long fuelId; public BigDecimal oldPrice, newPrice; public String reason; public LocalDateTime ts = LocalDateTime.now(); }
  @Entity(name="Tank") @Table(name="tanks") public static class Tank { @Id @GeneratedValue public Long id; public String name; public Long fuelId; public BigDecimal capacity, stock, reorder, critical; public String status = "NORMAL"; }
  @Entity(name="Movement") @Table(name="inventory_movements") public static class Movement { @Id @GeneratedValue public Long id; public Long tankId; public String type, ref; public BigDecimal qty, balanceAfter; public LocalDateTime ts = LocalDateTime.now(); }
  @Entity(name="Sale") @Table(name="sales") public static class Sale { @Id @GeneratedValue public Long id; public String invoice, payMode, vehicle, attendant; public Long shiftId, customerId; public Long tankId, fuelId; public BigDecimal qty, unitPriceAtSale, total; public LocalDateTime ts = LocalDateTime.now(); }
  @Entity(name="Delivery") @Table(name="deliveries") public static class Delivery { @Id @GeneratedValue public Long id; @Column(unique=true) public String note; public Long tankId; public BigDecimal qty; public LocalDateTime ts = LocalDateTime.now(); }
  @Entity(name="Alert") @Table(name="stock_alerts") public static class Alert { @Id @GeneratedValue public Long id; public Long tankId; public String alertLevel, status = "OPEN"; public BigDecimal stock; public LocalDateTime ts = LocalDateTime.now(); }
  @Entity(name="AppUser") @Table(name="users") public static class AppUser { @Id @GeneratedValue public Long id; @Column(unique=true) public String username; @com.fasterxml.jackson.annotation.JsonIgnore public String passwordHash; public String fullName, role; }
  @Entity(name="AuditLog") @Table(name="audit_logs") public static class AuditLog { @Id @GeneratedValue public Long id; public String actor, action, detail; public LocalDateTime ts = LocalDateTime.now(); }
  @Entity(name="Customer") @Table(name="customers") public static class Customer { @Id @GeneratedValue public Long id; public String name, mobile, type, status="ACTIVE"; public BigDecimal creditLimit, outstanding; }
  @Entity(name="Vehicle") @Table(name="vehicles") public static class Vehicle { @Id @GeneratedValue public Long id; @Column(unique=true) public String regNo; public String vehicleType, fuelPref; public Long customerId; }
  @Entity(name="Shift") @Table(name="shifts") public static class Shift { @Id @GeneratedValue public Long id; public String name, status, openedBy, closedBy, remarks;
    public LocalDateTime openedAt=LocalDateTime.now(), closedAt;
    public BigDecimal openingStock, systemClosingStock, physicalStock, stockVariance, litresSold, expectedCash, expectedUpi, expectedCard, expectedCredit, expectedTotal, actualCollection, collectionDifference; }
}
