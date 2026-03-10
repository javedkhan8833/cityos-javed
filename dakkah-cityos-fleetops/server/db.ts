import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  family: 4,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  keepAlive: true,
  ssl: {
    rejectUnauthorized: false,
  },
});
export const db = drizzle(pool, { schema });
