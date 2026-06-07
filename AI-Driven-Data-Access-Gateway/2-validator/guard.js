/**
 * @param {String} generatedSQL
 * @param {Boolean}
 */
function inspectAndValidate(generatedSQl){
    const cleanSQL = generatedSQl.trim().toUpperCase();
    if(!cleanSQL.startsWith('SELECT')){
        throw new Error("Security violation:Only data retrieval queries (SELECT) are authorized via thi gateway");
    }
    const forbiddenWords = ['DROP','ALTER','DELETE','TRUNCATE','UPDATE','GRANT','REVOKE','INSERT'];
    for(let keyword of forbiddenWords){
       const regex = new RegExp(`\\b${keyword}\\b`);
       if(regex.test(cleanSQL)){
        throw new Error(`Prohibited structural keyword detected: [${keyword}]`);
       }
    }
    return true;
}
module.exports={inspectAndValidate};