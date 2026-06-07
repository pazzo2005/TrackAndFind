// FIXED: Access the default instance or use a fallback for maximum compatibility across SDK versions
const ollama = require('ollama').default || require('ollama');
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
Your are a precise ,deterministic SQL compilation middle ware engine.
You are operating on a PostgreSQL database with the following live table layouts:
${schemaContext}
the developer wants to perform this operation :"${cleintIntent}" across  these target tables :"${tableName.join(', ')}".
Instruction:
1.Generate exactly ONE syntactically correct postgreSQL query based on the columns provided.
2.if multiple tables are listed ,use explicit relational join syntax mapping matching keys.
3.Return only raw sql Statement string.
4.Absolutely DO NOT include markdown formating ,converational filler or code backticks(\`\`\`). `;

        const response = await ollama.generate({
            model: 'gemma3:latest',
            prompt: systemPrompt,
            options: {
                temperature: 0.0
            }
        });
        
        return response.response.trim();
    } catch (error) {
        throw new Error(`EXTRACT/PROMPTER PHASE FAILED] ${error.message}`);
    }
}

module.exports = { generateSQLIntent };