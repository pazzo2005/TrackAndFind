package com.findAndVerify.warehouse.Service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.findAndVerify.warehouse.Entity.loadingEntity;
import com.findAndVerify.warehouse.Repository.ManifestRepo;

@Service
public class ManifestService {

    @Autowired
    private ManifestRepo manifestRepo;

    @Cacheable(value = "packages", key = "#packageId", unless = "#result == null")
    public loadingEntity getPackageById(String packageId) {
        System.out.println("CACHE MISS: Fetching package " + packageId + " from PostgreSQL database.");
        return manifestRepo.findByPackageId(packageId).orElse(null);
    }

    @CachePut(value = "packages", key = "#entity.packageId")
    public loadingEntity savePackage(loadingEntity entity) {
        System.out.println("CACHE WRITE: Saving and updating package " + entity.getPackageId() + " in Redis cache and database.");
        return manifestRepo.save(entity);
    }

    @CacheEvict(value = "packages", key = "#packageId")
    public void evictPackage(String packageId) {
        System.out.println("CACHE EVICT: Removing package " + packageId + " from Redis cache.");
    }

    @CacheEvict(value = "packages", allEntries = true)
    public void clearAllCache() {
        System.out.println("CACHE FLUSH: Evicting all packages from Redis cache.");
    }
}
