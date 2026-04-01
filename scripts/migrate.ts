import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";
import { adminPool } from "../src/db/pools.js";
import { env, toPostgresUri } from "../src/config/env.js";

function escapeIdentifier(value: string): string {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

async function ensureAdminDatabaseExists(): Promise<void> {
  const adminUri = new URL(toPostgresUri(env.POSTGRES_ADMIN));
  const dbName = adminUri.pathname.replace("/", "");
  adminUri.pathname = "/postgres";

  const client = new Client({ connectionString: adminUri.toString() });
  await client.connect();
  try {
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if ((exists.rowCount ?? 0) === 0) {
      await client.query(`CREATE DATABASE ${escapeIdentifier(dbName)}`);
      console.log(`Database created: ${dbName}`);
    }
  } finally {
    await client.end();
  }
}

async function run(): Promise<void> {
  const extensionSql = "CREATE EXTENSION IF NOT EXISTS pgcrypto;";
  const migrationSql = await readFile(join(process.cwd(), "sql", "001_init_admin_schema.sql"), "utf8");

  await ensureAdminDatabaseExists();

  await adminPool.query("BEGIN");
  try {
    await adminPool.query(extensionSql);
    await adminPool.query(migrationSql);
    await adminPool.query("COMMIT");
    console.log("Migration completed");
  } catch (error) {
    await adminPool.query("ROLLBACK");
    console.error("Migration failed", error);
    process.exitCode = 1;
  } finally {
    await adminPool.end();
  }
}

run();
