import { mkdir } from "node:fs/promises";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import { databaseEnv } from "@/server/env";
import { getDb } from "./index";

/** Applies pending migrations from ./drizzle. Safe to run repeatedly. */
export async function runMigrations() {
  const url = databaseEnv().DATABASE_URL;
  if (url.startsWith("file:")) {
    await mkdir(path.dirname(path.resolve(url.slice("file:".length))), { recursive: true });
  }
  await migrate(getDb(), { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
}
