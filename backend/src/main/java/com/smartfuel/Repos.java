package com.smartfuel;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.*;
interface FuelRepo extends JpaRepository<Domain.Fuel,Long>{}
interface PriceRepo extends JpaRepository<Domain.PriceHistory,Long>{ List<Domain.PriceHistory> findByFuelIdOrderByTsDesc(Long f); }
interface TankRepo extends JpaRepository<Domain.Tank,Long>{
  @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select t from Tank t where t.id=:id") Optional<Domain.Tank> lock(@Param("id") Long id); }
interface MoveRepo extends JpaRepository<Domain.Movement,Long>{ List<Domain.Movement> findByTankIdOrderByIdDesc(Long t); }
interface SaleRepo extends JpaRepository<Domain.Sale,Long>{ List<Domain.Sale> findByTsAfterOrderByIdDesc(LocalDateTime t); List<Domain.Sale> findByShiftId(Long s); }
interface DeliveryRepo extends JpaRepository<Domain.Delivery,Long>{ boolean existsByNote(String n); }
interface AlertRepo extends JpaRepository<Domain.Alert,Long>{ List<Domain.Alert> findByStatusNot(String s); List<Domain.Alert> findByTankIdAndStatusNot(Long t,String s); }
interface UserRepo extends JpaRepository<Domain.AppUser,Long>{ Optional<Domain.AppUser> findByUsername(String u); }
interface AuditRepo extends JpaRepository<Domain.AuditLog,Long>{ List<Domain.AuditLog> findTop100ByOrderByIdDesc(); }
interface CustomerRepo extends JpaRepository<Domain.Customer,Long>{}
interface VehicleRepo extends JpaRepository<Domain.Vehicle,Long>{ boolean existsByRegNo(String r); }
interface ShiftRepo extends JpaRepository<Domain.Shift,Long>{ Optional<Domain.Shift> findFirstByStatus(String s); List<Domain.Shift> findAllByOrderByIdDesc(); }
