const { Client } = require('pg');

const client = new Client({
  host: "ep-hidden-sky-aoutcfq1.c-2.ap-southeast-1.aws.neon.tech",
  user: "neondb_owner",
  password: "npg_yB82qfDESAQg",
  database: "neondb",
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log("Connected to Neon DB!");

    const res = await client.query("SELECT id, package_id, current_status FROM loading_manifest;");
    console.log("Neon DB loading_manifest entries:");
    console.table(res.rows);

  } catch (err) {
    console.error("Error querying Neon DB:", err);
  } finally {
    await client.end();
  }
}

main();
