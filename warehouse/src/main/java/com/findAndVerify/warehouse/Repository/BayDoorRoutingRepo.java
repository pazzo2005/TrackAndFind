package com.findAndVerify.warehouse.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.findAndVerify.warehouse.Entity.BayDoorRouting;

@Repository
public interface BayDoorRoutingRepo  extends JpaRepository<BayDoorRouting,String>{
    
}
