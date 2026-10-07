import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { env } from "@/server/env";
import * as schema from "./schema";

export type Database = LibSQLDatabase<typeof schema>;

type DbGlobal = { __framevaultDb?: { client: Client; db: Database; url: string } };
const globalForDb = globalThis as unknown as DbGlobal;

function connect(): { client: Client; db: Database; url: string } {
  const { DATABASE_URL, DATABASE_AUTH_TOKEN } = env();
  const client = createClient({
    url: DATABASE_URL,
    authToken: DATABASE_AUTH_TOKEN,
    // Busy timeout (ms) for local files so concurrent writers wait instead of failing.
    timeout: 5000,
  });
  return { client, db: drizzle(client, { schema }), url: DATABASE_URL };
}

/** Lazily created singleton; reused across hot reloads in development. */
export function getDb(): Database {
  const url = env().DATABASE_URL;
  if (!globalForDb.__framevaultDb || globalForDb.__framevaultDb.url !== url) {
    globalForDb.__framevaultDb = connect();
  }
  return globalForDb.__framevaultDb.db;
}

export function getDbClient(): Client {
  getDb();
  return globalForDb.__framevaultDb!.client;
}

export { schema };
