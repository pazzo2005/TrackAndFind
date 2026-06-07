const express = require('express');
const {generateSQLIntent} =require('./1-extractor/prompter');
const {inspectAndValidate} = require('./2-validator/guard');
const {executeSafeQuery} = require('./3-executor/runner');
require('dotenv').config();

const app = express();
app.use(express.json());
const cors = require('cors');
app.use(cors());
const PORT =process.env.PORT||3000;
app.post('/api/v1/query',async (req,res)=>{
    const{targetTable,intent,clientDB} = req.body;
    if(!targetTable || !Array.isArray(targetTable) || targetTable.length===0||!intent||!clientDB){
        return res.status(400).json({
            success:false,
            error:"Invalid payload structure mother funcker"
        });
    }
    try{
        console.log(`\n[GATEWAY ROUTE] Intercepted operational intent request: "${intent}" for tables: [${targetTable.join(', ')}]`);
        const rawSQL = await generateSQLIntent(targetTable,intent,clientDB);
        console.log(`[PIPELINE] Phase 1 Complete. Raw AI SQL Generated: "${rawSQL}"`);
        const validate =await inspectAndValidate(rawSQL);
        console.log(`[PIPELINE] Phase 2 Complete. Query successfully cleared security baseline checks.`);
        const dataRecords = await executeSafeQuery(rawSQL,clientDB);
        console.log(`[PIPELINE] Phase 3 Complete. Successfully extracted ${dataRecords.length} records.`);

        return res.status(200).json({
            success:true,
            compiledQuery:rawSQL,
            recordsCount:dataRecords.length,
            data:dataRecords
        });

    }catch(pipelineError){
       console.error(`[PIPELINE FAILURE] Routing Aborted: ${pipelineError.message}`);
       const statusCode = pipelineError.message.includes('Security') ? 403:500;
       return res.status(statusCode).json({
        success:false,
        error:pipelineError.message
       });
    }
});
app.listen(PORT,()=>{
    console.log(`[SYSTEM ONLINE] Multitenant AI-Powered Database Access Gateway active on port ${PORT}`);
});