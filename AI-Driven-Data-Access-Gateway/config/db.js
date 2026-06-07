const {Pool} =require('pg');
require('dotenv').config();

const pool = new Pool({
    host:process.env.DB_HOST,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database:process.env.DB_NAME,
    port:process.env.DB_PORT || 5432,
    max:10,
    idleTimeoutMillis:30000,
    connectionTimeoutMillis:2000
});

(async() => {
    try{
      const client = await pool.connect();
      console.log(`[DATABASE] secure connection established with the postgres at the port ${process.env.DB_PORT}`);
      client.release();

    }catch(error){ 
      console.error(`[DATABASE] failed to connect at the port ${process.env.DB_PORT}`);
    }
})();
