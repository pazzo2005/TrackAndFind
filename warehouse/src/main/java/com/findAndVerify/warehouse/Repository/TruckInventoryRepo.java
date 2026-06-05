package com.findAndVerify.warehouse.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.findAndVerify.warehouse.Entity.TruckInventory;

@Repository
public interface TruckInventoryRepo extends JpaRepository<TruckInventory,String>{
    
}
