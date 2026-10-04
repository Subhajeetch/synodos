import { sql } from "drizzle-orm";
import { createDb } from "./client";

const { db, pool } = createDb(process.env.DATABASE_URL!);
const result = await db.execute(sql`select now() as now`);
console.log("Postgres connected:", result.rows[0]);
await pool.end();
