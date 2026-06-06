package com.findAndVerify.warehouse.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.findAndVerify.warehouse.Entity.archivedEntity;

@Repository
public interface ArchivedManifestRepo extends JpaRepository<archivedEntity, Long> {
}
