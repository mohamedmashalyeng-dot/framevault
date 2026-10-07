import { randomBytes } from "node:crypto";

/** Short, URL-safe, unguessable identifiers with a readable prefix. */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

export function randomToken(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}
