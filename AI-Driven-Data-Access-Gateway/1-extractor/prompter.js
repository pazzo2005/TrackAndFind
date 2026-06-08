const { Ollama } = require('ollama');
const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://host.docker.internal:11434' });
const { getTableSchema } = require('./metadata');

/**
 * @param {String[]} tableName
 * @param {String} cleintIntent
 * @param {Object} cleintDB
 * @returns {Promise<String>} 
 */
async function generateSQLIntent(tableName, cleintIntent, cleintDB) {
    try {
        const schemaContext = await getTableSchema(tableName, cleintDB);
        
        const systemPrompt = `
You are a precise, deterministic SQL compilation middleware engine.
You are operating on a PostgreSQL database with the following live table layouts:
${schemaContext}
The developer wants to perform this operation: "${cleintIntent}" across these target tables: "${tableName.join(', ')}".

Database Guidelines & Status Mappings:
1. The 'current_status' column in loading_manifest and archived_manifest uses UPPERCASE values: 'PENDING', 'DISPATCHED', 'MISMATCHED'.
2. 'PENDING' represents pending packages.
3. 'DISPATCHED' represents dispatched/delivered packages.
4. Data Type Safety: Never join or compare columns of different data types. For example, never compare VARCHAR columns (like package_id, expected_truck_id, truck_id, bay_door_id) with BIGINT columns (like id).
5. Schema Integrity: Only reference columns that are explicitly listed in the schema context for each table. Do NOT assume or use columns (like 'current_status') on a table (like 'truck_inventory' or 'bay_door_routing') if that column is not explicitly defined in the schema context for that table.

Instructions:
1. Generate exactly ONE single syntactically correct PostgreSQL SELECT query. Do NOT generate multiple statements or separate them with semicolons.
2. Only query the tables that are actually relevant to the operational intent. You do NOT need to query all of the target tables if some of them are irrelevant to the user request.
3. If multiple tables are listed, use explicit relational join syntax mapping matching keys.
4. Return only the raw SQL statement string.
5. Absolutely DO NOT include markdown formatting, conversational filler or code backticks (\`\`\`).
6. NEVER wrap table names or column names in single quotes (e.g. 'table_name'.column_name is invalid). Use plain unquoted identifiers (e.g. table_name.column_name) or double quotes ("table_name".column_name). Single quotes are strictly for text literals.

Examples:
- CORRECT: SELECT truck_inventory.truck_id, truck_inventory.driver_name FROM truck_inventory
- INCORRECT: SELECT 'truck_inventory'.truck_id, 'truck_inventory'.driver_name FROM truck_inventory
- CORRECT: SELECT loading_manifest.package_id, loading_manifest.current_status FROM loading_manifest WHERE loading_manifest.current_status = 'PENDING'
- INCORRECT: SELECT 'loading_manifest'.package_id, 'loading_manifest'.current_status FROM loading_manifest WHERE 'loading_manifest'.current_status = 'PENDING'`;

        const response = await ollama.generate({
            model: 'gemma3:latest',
            prompt: systemPrompt,
            options: {
                temperature: 0.0
            }
        });
        
        let sql = response.response.trim();
        // Clean single quotes around table prefixes (e.g. 'table_name'.col -> table_name.col)
        sql = sql.replace(/'([a-zA-Z0-9_]+)'\./g, '$1.');
        return sql;
    } catch (error) {
        throw new Error(`EXTRACT/PROMPTER PHASE FAILED] ${error.message}`);
    }
}

module.exports = { generateSQLIntent };