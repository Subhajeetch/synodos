import { createDb } from "@synodos/db";
import { env } from "./env";

export const { db, pool } = createDb(env.DATABASE_URL);