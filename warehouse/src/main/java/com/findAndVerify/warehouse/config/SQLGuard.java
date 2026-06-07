package com.findAndVerify.warehouse.config;

import java.util.regex.Pattern;

public class SQLGuard {

    // Regex checking for destructive word boundaries (case-insensitive)
    private static final Pattern DESTRUCTIVE_PATTERN = Pattern.compile(
        "\\b(DROP|DELETE|TRUNCATE|ALTER|UPDATE|INSERT|CREATE|RENAME|REPLACE|GRANT|REVOKE|SHUTDOWN)\\b",
        Pattern.CASE_INSENSITIVE
    );

    /**
     * Validates if a SQL query is completely safe and read-only.
     * @param sql The raw SQL query compiled by the LLM
     * @return true if the query is a safe SELECT statement, false otherwise.
     */
    public static boolean isSafe(String sql) {
        if (sql == null || sql.trim().isEmpty()) {
            return false;
        }

        String trimmedSql = sql.trim().toUpperCase();

        // 1. Force the query to strictly start with SELECT
        if (!trimmedSql.startsWith("SELECT")) {
            return false;
        }

        // 2. Reject any destructive SQL commands
        return !DESTRUCTIVE_PATTERN.matcher(trimmedSql).find();
    }
}
