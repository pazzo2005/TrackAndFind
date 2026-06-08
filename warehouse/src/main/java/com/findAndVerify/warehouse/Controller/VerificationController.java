package com.findAndVerify.warehouse.Controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.findAndVerify.warehouse.Entity.BayDoorRouting;
import com.findAndVerify.warehouse.Entity.TruckInventory;
import com.findAndVerify.warehouse.Entity.archivedEntity;
import com.findAndVerify.warehouse.Entity.loadingEntity;
import com.findAndVerify.warehouse.Repository.ArchivedManifestRepo;
import com.findAndVerify.warehouse.Repository.BayDoorRoutingRepo;
import com.findAndVerify.warehouse.Repository.ManifestRepo;
import com.findAndVerify.warehouse.Repository.TruckInventoryRepo;
import com.findAndVerify.warehouse.Service.ManifestService;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins="*")
public class VerificationController {
    @Autowired
    private ManifestRepo manifestRepo;

    @Autowired
    private BayDoorRoutingRepo bayDoorRoutingRepo;

    @Autowired
    private TruckInventoryRepo truckInventoryRepo;

    @Autowired
    private ArchivedManifestRepo archivedManifestRepo;

    @Autowired
    private ManifestService manifestService;

    @Autowired
    private DataSource dataSource;

    @PutMapping("/config/assign-truck")
    public ResponseEntity<?> assignTruckToBay(@RequestBody Map<String, String> payload) {
        String bayDoorId = payload.get("bayDoorId");
        String truckId = payload.get("truckId");

        Optional<BayDoorRouting> routingOpt = bayDoorRoutingRepo.findById(bayDoorId);
        
        BayDoorRouting routing;
        if (routingOpt.isPresent()) {
            routing = routingOpt.get();
            routing.setActiveTruckId(truckId);
        } else {
            routing = new BayDoorRouting(bayDoorId, truckId);
        }
        
        bayDoorRoutingRepo.save(routing);
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Bay door " + bayDoorId + " is now dynamically hosting " + truckId
        ));
    }



    @PostMapping("/verify")
    public ResponseEntity<?> verifyPackage(@RequestBody Map<String, String> payload) {
        String scannedPackageId = payload.get("packageId");
        String workerBayDoorId = payload.get("bayDoorId"); 

       
        Optional<BayDoorRouting> doorConfig = bayDoorRoutingRepo.findById(workerBayDoorId);
        if (doorConfig.isEmpty() || doorConfig.get().getActiveTruckId() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "status", "NO_TRUCK_DOCKED",
                "message", "Error: No active truck assignment found for this bay door terminal!"
            ));
        }
        String currentTruckId = doorConfig.get().getActiveTruckId();

        
        loadingEntity record = manifestService.getPackageById(scannedPackageId);
        if (record == null) {
            return ResponseEntity.status(404).body(Map.of(
                "status", "NOT_FOUND",
                "message", "Alert: Package identifier absent from warehouse manifest data!"
            ));
        }

        if ("DISPATCHED".equals(record.getCurrentStatus())) {
            return ResponseEntity.ok(Map.of(
                "status", "DUPLICATE",
                "message", "Notice: Package was already processed and verified."
            ));
        }

        if (!record.getExpectedTruckId().equals(currentTruckId)) {
            record.setCurrentStatus("MISMATCHED");
            manifestService.savePackage(record);

            return ResponseEntity.ok(Map.of(
                "status", "MISMATCH",
                "message", "CRITICAL ROUTE DEVATION! Item belongs on: " + record.getExpectedTruckId()
            ));
        }

        // 5. Commit Valid Trace State to persistent memory
        record.setCurrentStatus("DISPATCHED");
        record.setDispatchedAt(LocalDateTime.now());
        manifestService.savePackage(record);

        return ResponseEntity.ok(Map.of(
            "status", "VALID",
            "message", "Route confirmed. Proceed into vehicle."
        ));
    }
    @GetMapping("/trucks")
    public List<TruckInventory> getTrucks() {
        return truckInventoryRepo.findAll();
    }

    @PostMapping("/trucks")
    public ResponseEntity<?> addTruck(@RequestBody TruckInventory newTruck) {
        truckInventoryRepo.save(newTruck);
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Truck " + newTruck.getTruckId() + " successfully registered in database."
        ));
    }

    @DeleteMapping("/trucks/{truckId}")
    public ResponseEntity<?> deleteTruck(@PathVariable String truckId) {
        truckInventoryRepo.deleteById(truckId);
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Truck " + truckId + " successfully removed from database."
        ));
    }

    @GetMapping("/bays")
    public List<BayDoorRouting> getBays() {
        return bayDoorRoutingRepo.findAll();
    }

    @PostMapping("/bays")
    public ResponseEntity<?> addBay(@RequestBody BayDoorRouting newBay) {
        if (newBay.getBayDoorId() == null || newBay.getBayDoorId().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "status", "ERROR",
                "message", "Bay door ID cannot be empty."
            ));
        }
        newBay.setBayDoorId(newBay.getBayDoorId().trim().toUpperCase());
        bayDoorRoutingRepo.save(newBay);
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Bay door " + newBay.getBayDoorId() + " successfully registered in database."
        ));
    }

    @DeleteMapping("/bays/{bayDoorId}")
    public ResponseEntity<?> deleteBay(@PathVariable String bayDoorId) {
        bayDoorRoutingRepo.deleteById(bayDoorId);
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Bay door " + bayDoorId + " successfully removed from database."
        ));
    }

    @PostMapping("/config/reset-manifest")
    public ResponseEntity<?> resetManifest() {
        // 1. Clear all Redis cache entries for packages first
        manifestService.clearAllCache();

        // 2. Find all DISPATCHED packages in loading_manifest
        List<loadingEntity> allPackages = manifestRepo.findAll();
        for (loadingEntity pkg : allPackages) {
            if ("DISPATCHED".equals(pkg.getCurrentStatus())) {
                archivedEntity archived = new archivedEntity(
                    pkg.getPackageId(),
                    pkg.getExpectedTruckId(),
                    pkg.getCurrentStatus(),
                    pkg.getDispatchedAt(),
                    pkg.getWorkerNotes()
                );
                archivedManifestRepo.save(archived);
                manifestRepo.delete(pkg);
            }
        }

        // 3. Ensure PKG-101 and PKG-102 exist as PENDING in loading_manifest for easy re-testing
        if (manifestRepo.findByPackageId("PKG-101").isEmpty()) {
            loadingEntity pkg101 = new loadingEntity();
            pkg101.setPackageId("PKG-101");
            pkg101.setExpectedTruckId("TRUCK_A");
            pkg101.setCurrentStatus("PENDING");
            pkg101.setWorkerNotes("Fragile electronic components");
            manifestService.savePackage(pkg101);
        } else {
            loadingEntity pkg101 = manifestRepo.findByPackageId("PKG-101").get();
            pkg101.setCurrentStatus("PENDING");
            pkg101.setDispatchedAt(null);
            manifestService.savePackage(pkg101);
        }
        
        if (manifestRepo.findByPackageId("PKG-102").isEmpty()) {
            loadingEntity pkg102 = new loadingEntity();
            pkg102.setPackageId("PKG-102");
            pkg102.setExpectedTruckId("TRUCK_B");
            pkg102.setCurrentStatus("PENDING");
            pkg102.setWorkerNotes("High priority shipment");
            manifestService.savePackage(pkg102);
        } else {
            loadingEntity pkg102 = manifestRepo.findByPackageId("PKG-102").get();
            pkg102.setCurrentStatus("PENDING");
            pkg102.setDispatchedAt(null);
            manifestService.savePackage(pkg102);
        }

        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Dispatched packages archived successfully. Active manifest reset for re-testing."
        ));
    }

    @PostMapping("/config/database")
    public ResponseEntity<?> configureDatabase(@RequestBody Map<String, String> payload) {
        String dbUrl = payload.get("dbUrl");
        String username = payload.get("username");
        String password = payload.get("password");

        if (dbUrl == null || username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "status", "ERROR",
                "message", "Missing database configuration parameters (dbUrl, username, password)"
            ));
        }

        try {
            if (dataSource instanceof com.findAndVerify.warehouse.config.DynamicDataSource) {
                com.findAndVerify.warehouse.config.DynamicDataSource dynamicDS = (com.findAndVerify.warehouse.config.DynamicDataSource) dataSource;
                
                // 1. Create a new HikariDataSource
                HikariDataSource newHikari = new HikariDataSource();
                newHikari.setJdbcUrl(dbUrl);
                newHikari.setUsername(username);
                newHikari.setPassword(password);
                newHikari.setDriverClassName("org.postgresql.Driver");

                // Copy pool parameters from active pool
                DataSource activeDS = dynamicDS.getTargetDataSource();
                if (activeDS instanceof HikariDataSource) {
                    HikariDataSource oldHikari = (HikariDataSource) activeDS;
                    newHikari.setConnectionTimeout(oldHikari.getConnectionTimeout());
                    newHikari.setMaximumPoolSize(oldHikari.getMaximumPoolSize());
                    newHikari.setIdleTimeout(oldHikari.getIdleTimeout());
                    newHikari.setMinimumIdle(oldHikari.getMinimumIdle());
                }

                // 2. Validate connection before swapping
                try (java.sql.Connection conn = newHikari.getConnection()) {
                    System.out.println("[DATABASE CONFIGURATION] New connection to " + dbUrl + " validated successfully!");
                } catch (Exception connEx) {
                    newHikari.close();
                    System.err.println("[DATABASE CONFIGURATION ERROR] Pre-connection validation failed: " + connEx.getMessage());
                    return ResponseEntity.badRequest().body(Map.of(
                        "status", "ERROR",
                        "message", "Failed to connect to the new database: " + connEx.getMessage()
                    ));
                }

                // 3. Hot-swap the underlying target datasource
                dynamicDS.replaceTargetDataSource(newHikari);

                // 4. Clear the Redis cache to prevent ID conflicts between databases
                try {
                    manifestService.clearAllCache();
                    System.out.println("[DATABASE CONFIGURATION UPDATED] Redis cache flushed successfully.");
                } catch (Exception e) {
                    System.err.println("[DATABASE CONFIGURATION ERROR] Failed to flush Redis cache: " + e.getMessage());
                }
                
                System.out.println("[DATABASE CONFIGURATION UPDATED] Re-routed database pool to: " + dbUrl);
                return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "message", "Database configuration dynamically updated. Connections successfully re-routed."
                ));
            } else {
                return ResponseEntity.internalServerError().body(Map.of(
                    "status", "ERROR",
                    "message", "DataSource is not an instance of DynamicDataSource. Cannot update dynamically."
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "ERROR",
                "message", "Failed to update database configuration: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/config/database")
    public ResponseEntity<?> getDatabaseConfig() {
        try {
            DataSource activeDS = dataSource;
            if (dataSource instanceof com.findAndVerify.warehouse.config.DynamicDataSource) {
                activeDS = ((com.findAndVerify.warehouse.config.DynamicDataSource) dataSource).getTargetDataSource();
            }

            if (activeDS instanceof HikariDataSource) {
                HikariDataSource hikariDS = (HikariDataSource) activeDS;
                String jdbcUrl = hikariDS.getJdbcUrl();
                String username = hikariDS.getUsername();
                
                String host = "postgres-db";
                int port = 5432;
                String databaseName = "warehouse_ledger";
                
                if (jdbcUrl != null && jdbcUrl.startsWith("jdbc:postgresql://")) {
                    String cleanUrl = jdbcUrl.substring("jdbc:postgresql://".length());
                    int slashIndex = cleanUrl.indexOf("/");
                    if (slashIndex != -1) {
                        String hostPort = cleanUrl.substring(0, slashIndex);
                        databaseName = cleanUrl.substring(slashIndex + 1);
                        int questionIndex = databaseName.indexOf("?");
                        if (questionIndex != -1) {
                            databaseName = databaseName.substring(0, questionIndex);
                        }
                        
                        int colonIndex = hostPort.indexOf(":");
                        if (colonIndex != -1) {
                            host = hostPort.substring(0, colonIndex);
                            port = Integer.parseInt(hostPort.substring(colonIndex + 1));
                        } else {
                            host = hostPort;
                        }
                    }
                }
                
                return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "host", host,
                    "port", port,
                    "databaseName", databaseName,
                    "username", username,
                    "password", hikariDS.getPassword() != null ? hikariDS.getPassword() : "",
                    "isCloud", !host.equals("postgres-db")
                ));
            }
            return ResponseEntity.internalServerError().body(Map.of("status", "ERROR", "message", "Unsupported DataSource"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("status", "ERROR", "message", e.getMessage()));
        }
    }

    // Dynamic Data Tiering Scheduler: Runs every hour and archives packages older than 10 days
    @org.springframework.scheduling.annotation.Scheduled(cron = "0 0 * * * ?")
    public void runAutoArchiving() {
        System.out.println("[SCHEDULER RUNNING] Scanning for dispatched packages older than 10 days...");
        performArchiving(14400); // 10 days in minutes
    }

    @PostMapping("/config/archive")
    public ResponseEntity<?> triggerManualArchive(@org.springframework.web.bind.annotation.RequestParam(defaultValue = "14400") int thresholdMinutes) {
        int count = performArchiving(thresholdMinutes);
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Successfully archived " + count + " dispatched packages older than " + thresholdMinutes + " minutes."
        ));
    }

    private int performArchiving(int thresholdMinutes) {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(thresholdMinutes);
        List<loadingEntity> allPackages = manifestRepo.findAll();
        int archiveCount = 0;

        for (loadingEntity pkg : allPackages) {
            if ("DISPATCHED".equals(pkg.getCurrentStatus()) && pkg.getDispatchedAt() != null) {
                if (pkg.getDispatchedAt().isBefore(cutoff)) {
                    archivedEntity archived = new archivedEntity(
                        pkg.getPackageId(),
                        pkg.getExpectedTruckId(),
                        pkg.getCurrentStatus(),
                        pkg.getDispatchedAt(),
                        pkg.getWorkerNotes()
                    );
                    archivedManifestRepo.save(archived);
                    manifestRepo.delete(pkg);
                    manifestService.evictPackage(pkg.getPackageId());
                    archiveCount++;
                }
            }
        }
        if (archiveCount > 0) {
            System.out.println("[DATA TIERING COMPLETED] Moved " + archiveCount + " cold packages to archived manifest ledger.");
        }
        return archiveCount;
    }
}
