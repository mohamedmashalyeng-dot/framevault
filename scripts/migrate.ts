/**
 * Applies pending SQL migrations from ./drizzle to DATABASE_URL.
 * Usage: npm run db:migrate
 */
import "dotenv/config";
import { runMigrations } from "../src/db/migrate";
import { databaseEnv } from "../src/server/env";

runMigrations()
  .then(() => console.log(`Migrations applied to ${databaseEnv().DATABASE_URL}`))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
