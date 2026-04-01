import { Pool } from "pg";
import { env, toPostgresUri } from "../config/env.js";

export const adminPool = new Pool({
  connectionString: toPostgresUri(env.POSTGRES_ADMIN)
});

export const mainPool = new Pool({
  connectionString: toPostgresUri(env.POSTGRES_MAIN)
});
