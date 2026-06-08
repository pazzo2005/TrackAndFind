const { Pool } = require('pg');

/**
 * @param {String} safeSQL
 * @param {Object} cleintDB
 * @returns {Promise<Object[]>}
 */
async function executeSafeQuery(safeSQL, cleintDB) {
    const isLocal = cleintDB.host === 'postgres-db' || cleintDB.host === 'localhost' || cleintDB.host === '127.0.0.1';
    const dynamoPool = new Pool({
        host: cleintDB.host,
        user: cleintDB.username,
        password: cleintDB.password, // FIXED: Correctly mapped to password parameter
        database: cleintDB.databaseName, // FIXED: Added database parsing parameter name explicitly
        port: cleintDB.port || 5432,
        max: 1,
        idleTimeoutMillis: 2000,
        ssl: isLocal ? false : { rejectUnauthorized: false }
    });

    const client = await dynamoPool.connect();
    try {
        console.log(`[EXECUTOR] Dispatched query cleared by the Guard:\n -> "${safeSQL}"`);
        const result = await client.query(safeSQL);
        return result.rows;
    } catch (error) {
        throw new Error(`[DATABASE ENGINE RUNTIME FAILURE ] ${error.message}`);
    } finally {
        client.release();
        await dynamoPool.end();
    }
}

module.exports = { executeSafeQuery };