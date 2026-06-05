package com.findAndVerify.warehouse.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "bay_door_routing")
public class BayDoorRouting {
    @Id
    @Column(name = "bay_door_id", length = 50)
    private String bayDoorId;

    @Column(name = "active_truck_id", length = 50)
    private String activeTruckId;

    
    public BayDoorRouting() {}

    public BayDoorRouting(String bayDoorId, String activeTruckId) {
        this.bayDoorId = bayDoorId;
        this.activeTruckId = activeTruckId;
    }

    public String getBayDoorId() {
        return bayDoorId;
    }

    public void setBayDoorId(String bayDoorId) {
        this.bayDoorId = bayDoorId;
    }

    public String getActiveTruckId() {
        return activeTruckId;
    }

    public void setActiveTruckId(String activeTruckId) {
        this.activeTruckId = activeTruckId;
    }

    
}
