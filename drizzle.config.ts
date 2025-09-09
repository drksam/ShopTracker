import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  // Limit operations to our dedicated Postgres schema to avoid touching shared tables
  schemaFilter: ["shoptracker"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
