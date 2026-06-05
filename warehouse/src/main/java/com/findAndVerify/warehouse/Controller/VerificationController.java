package com.findAndVerify.warehouse.Controller;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.findAndVerify.warehouse.Entity.BayDoorRouting;
import com.findAndVerify.warehouse.Entity.loadingEntity;
import com.findAndVerify.warehouse.Repository.BayDoorRoutingRepo;
import com.findAndVerify.warehouse.Repository.ManifestRepo;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins="*")
public class VerificationController {
    @Autowired
    private ManifestRepo manifestRepo;

    @Autowired
    private BayDoorRoutingRepo bayDoorRoutingRepo;

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
}
