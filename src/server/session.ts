import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { user } from "@/db/schema";
import type { Viewer } from "./access";
import { getAuth } from "./auth";

/**
 * Data access layer for the signed-in person. Reads the Better Auth session
 * from the request and returns a deliberately narrow object. Must be called
 * inside a <Suspense> boundary, a Server Action or a Route Handler.
 */
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  // The role is re-read from the database so a demotion takes effect at once,
  // even while an older session is still valid.
  const [row] = await getDb()
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id));
  return row ?? null;
});

export async function getViewer(): Promise<Viewer> {
  const current = await getSessionUser();
  return current ? { id: current.id, role: current.role } : null;
}

export async function requireUser(returnTo = "/account"): Promise<SessionUser> {
  const current = await getSessionUser();
  if (!current) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return current;
}

/** Admin pages answer 404 to everyone else, so the area is not advertised. */
export async function requireAdminPage(): Promise<SessionUser> {
  const current = await getSessionUser();
  if (!current) redirect("/sign-in?next=%2Fadmin");
  if (current.role !== "admin") notFound();
  return current;
}

export class ForbiddenError extends Error {
  constructor() {
    super("Administrator access is required.");
  }
}

/** For Server Actions: throws instead of rendering. */
export async function requireAdminAction(): Promise<SessionUser> {
  const current = await getSessionUser();
  if (!current || current.role !== "admin") throw new ForbiddenError();
  return current;
}

/** Loads a viewer by id, used to re-check signed download links. */
export async function loadViewerById(userId: string): Promise<Viewer> {
  const [row] = await getDb().select({ id: user.id, role: user.role }).from(user).where(eq(user.id, userId));
  return row ?? null;
}
