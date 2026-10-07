import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

/** Case-insensitive "contains" match with LIKE wildcards in the term escaped. */
export function contains(column: SQLWrapper, term: string): SQL {
  const escaped = term.replace(/[\\%_]/g, (char) => `\\${char}`);
  return sql`${column} like ${`%${escaped}%`} escape '\\'`;
}
