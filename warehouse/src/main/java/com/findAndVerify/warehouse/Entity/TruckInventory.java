package com.findAndVerify.warehouse.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name="truck_inventory")
public class TruckInventory {
    
    @Id
    @Column(name="truck_id",length=50)
    private String truckId;

    @Column(name = "driver_name", length = 100)
    private String driverName;

    @Column(name = "destination_city", length = 100)
    private String destinationCity;

    public TruckInventory() {}

    public TruckInventory(String truckId, String driverName, String destinationCity) {
        this.truckId = truckId;
        this.driverName = driverName;
        this.destinationCity = destinationCity;
    }

    public String getTruckId() {
        return truckId;
    }

    public void setTruckId(String truckId) {
        this.truckId = truckId;
    }

    public String getDriverName() {
        return driverName;
    }

    public void setDriverName(String driverName) {
        this.driverName = driverName;
    }

    public String getDestinationCity() {
        return destinationCity;
    }

    public void setDestinationCity(String destinationCity) {
        this.destinationCity = destinationCity;
    }

    

}
