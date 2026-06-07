const { Pool } = require('pg'); // Clean import at the top

/** * @param {String[]} tableName
 * @param {Object} cleintDB
 * @returns {Promise<String>}
 */
async function getTableSchema(tableName, cleintDB) {
     const dynamoDB = new Pool({
        host: cleintDB.host,
        user: cleintDB.username,
        password: cleintDB.password,
        database: cleintDB.databaseName,
        port: cleintDB.port || 5432
     });
     
     const client = await dynamoDB.connect();
     
     try {
        let combinedSchemaText = "";
        
        for (let table of tableName) {
            const query = `
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = $1 
                ORDER BY ordinal_position;
            `;
            
            const result = await client.query(query, [table.toLowerCase()]);
            
            if (result.rows.length === 0) {
                throw new Error(`Schema Error: Table ${table} was not found in the postgres database`);
            }
            
            combinedSchemaText += `Table ${table}\nColumns:\n`;
            result.rows.forEach(row => {
                combinedSchemaText += `  - ${row.column_name} (${row.data_type.toUpperCase()})\n`;
            });
            combinedSchemaText += `\n`;
        }
        
        return combinedSchemaText.trim();

     } catch (error) {
        throw new Error(`Database Introspection Phase Failed: ${error.message}`);
     } finally {
        client.release();
        // FIX: Added 'await' so the pool doesn't close prematurely during the loop execution
        await dynamoDB.end(); 
     }
}

module.exports = { getTableSchema };