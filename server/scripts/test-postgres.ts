import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

async function main() {
  const host = process.env.PGHOST;
  const port = Number(process.env.PGPORT || 5432);
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  if (!host || !user || !password || !database) {
    console.error('Missing one or more required env vars: PGHOST, PGUSER, PGPASSWORD, PGDATABASE');
    process.exit(1);
  }

  const client = new Client({ host, port, user, password, database, ssl: false });
  try {
    await client.connect();
    console.log('Connected to Postgres:', { host, port, database, user });
    const { rows } = await client.query('SELECT NOW() as now');
    console.log('Server time:', rows[0]?.now);
    // Try listing public tables
    const tables = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 50;
    `);
    console.log('Sample tables:', tables.rows);
  } catch (err) {
    console.error('Postgres connection test failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
