package com.findAndVerify.warehouse.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.findAndVerify.warehouse.Entity.loadingEntity;



@Repository
public interface ManifestRepo extends JpaRepository<loadingEntity,Long>{
    /***
     * customer finds 
     * @param
     @return 
    ***/

     Optional<loadingEntity> findByPackageId(String packageId);
}
