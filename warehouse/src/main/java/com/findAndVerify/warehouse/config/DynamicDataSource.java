package com.findAndVerify.warehouse.config;

import org.springframework.jdbc.datasource.DelegatingDataSource;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;

public class DynamicDataSource extends DelegatingDataSource {
    private volatile DataSource target;

    public DynamicDataSource(DataSource targetDataSource) {
        super(targetDataSource);
        this.target = targetDataSource;
    }

    @Override
    public DataSource getTargetDataSource() {
        return this.target;
    }

    @Override
    public void setTargetDataSource(DataSource targetDataSource) {
        this.target = targetDataSource;
        super.setTargetDataSource(targetDataSource);
    }

    public synchronized void replaceTargetDataSource(DataSource newTarget) {
        DataSource oldTarget = this.target;
        this.target = newTarget;
        if (oldTarget instanceof HikariDataSource) {
            try {
                ((HikariDataSource) oldTarget).close();
                System.out.println("[DynamicDataSource] Closed old HikariDataSource connection pool successfully.");
            } catch (Exception e) {
                System.err.println("[DynamicDataSource] Error closing old HikariDataSource: " + e.getMessage());
            }
        }
    }
}
