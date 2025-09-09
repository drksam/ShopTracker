import "dotenv/config";
import * as schema from "@shared/schema";
import pg from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
// SQLite fallback removed: schema now uses Postgres-only pg-core with namespacing

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Postgres is mandatory now that the schema uses pg-core with the 'shoptracker' namespace. Set DATABASE_URL in your environment or .env file."
  );
}

const { Pool } = pg as any;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db: any = drizzlePg(pool, { schema });

export { db };
