package com.findAndVerify.warehouse.Entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name="loading_manifest")
public class loadingEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "package_id", unique = true, nullable = false)
    private String packageId;

    @Column(name = "expected_truck_id", nullable = false)
    private String expectedTruckId;

    @Column(name = "current_status", nullable = false)
    private String currentStatus;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "worker_notes")
    private String workerNotes;

    public loadingEntity(){

    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPackageId() {
        return packageId;
    }

    public void setPackageId(String packageId) {
        this.packageId = packageId;
    }

    public String getExpectedTruckId() {
        return expectedTruckId;
    }

    public void setExpectedTruckId(String expectedTruckId) {
        this.expectedTruckId = expectedTruckId;
    }

    public String getCurrentStatus() {
        return currentStatus;
    }

    public void setCurrentStatus(String currentStatus) {
        this.currentStatus = currentStatus;
    }

    public LocalDateTime getDispatchedAt() {
        return dispatchedAt;
    }

    public void setDispatchedAt(LocalDateTime dispatchedAt) {
        this.dispatchedAt = dispatchedAt;
    }

    public String getWorkerNotes() {
        return workerNotes;
    }

    public void setWorkerNotes(String workerNotes) {
        this.workerNotes = workerNotes;
    }
}
