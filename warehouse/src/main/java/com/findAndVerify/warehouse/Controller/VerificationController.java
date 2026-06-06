package com.findAndVerify.warehouse.Controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
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

        
        Optional<loadingEntity> manifestOpt = manifestRepo.findByPackageId(scannedPackageId);
        if (manifestOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                "status", "NOT_FOUND",
                "message", "Alert: Package identifier absent from warehouse manifest data!"
            ));
        }

        loadingEntity record = manifestOpt.get();

       
        if ("DISPATCHED".equals(record.getCurrentStatus())) {
            return ResponseEntity.ok(Map.of(
                "status", "DUPLICATE",
                "message", "Notice: Package was already processed and verified."
            ));
        }

        
        if (!record.getExpectedTruckId().equals(currentTruckId)) {
            record.setCurrentStatus("MISMATCHED");
            manifestRepo.save(record);

            return ResponseEntity.ok(Map.of(
                "status", "MISMATCH",
                "message", "CRITICAL ROUTE DEVATION! Item belongs on: " + record.getExpectedTruckId()
            ));
        }

        // 5. Commit Valid Trace State to persistent memory
        record.setCurrentStatus("DISPATCHED");
        record.setDispatchedAt(LocalDateTime.now());
        manifestRepo.save(record);

        return ResponseEntity.ok(Map.of(
            "status", "VALID",
            "message", "Route confirmed. Proceed into vehicle."
        ));
    }
    @GetMapping("/trucks")
    public List<TruckInventory> getTrucks() {
        return truckInventoryRepo.findAll();
    }

    @PostMapping("/config/reset-manifest")
    public ResponseEntity<?> resetManifest() {
        // 1. Find all DISPATCHED packages in loading_manifest
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

        // 2. Ensure PKG-101 and PKG-102 exist as PENDING in loading_manifest for easy re-testing
        if (manifestRepo.findByPackageId("PKG-101").isEmpty()) {
            loadingEntity pkg101 = new loadingEntity();
            pkg101.setPackageId("PKG-101");
            pkg101.setExpectedTruckId("TRUCK_A");
            pkg101.setCurrentStatus("PENDING");
            pkg101.setWorkerNotes("Fragile electronic components");
            manifestRepo.save(pkg101);
        }
        if (manifestRepo.findByPackageId("PKG-102").isEmpty()) {
            loadingEntity pkg102 = new loadingEntity();
            pkg102.setPackageId("PKG-102");
            pkg102.setExpectedTruckId("TRUCK_B");
            pkg102.setCurrentStatus("PENDING");
            pkg102.setWorkerNotes("High priority shipment");
            manifestRepo.save(pkg102);
        }

        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "Dispatched packages archived successfully. Active manifest reset for re-testing."
        ));
    }
}
