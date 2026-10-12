import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { COOKIE, signSession, verifySession } from "./session";

export async function createSession(uid: string, role: Role) {
  cookies().set(COOKIE, await signSession({ uid, role }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
}
export function destroySession() { cookies().delete(COOKIE); }

/** Always re-reads the user from the DB so deactivation / role changes apply immediately. */
export const getCurrentUser = cache(async () => {
  const s = await verifySession(cookies().get(COOKIE)?.value);
  if (!s) return null;
  const user = await db.user.findUnique({
    where: { id: s.uid },
    select: { id: true, name: true, email: true, role: true, isActive: true, bio: true },
  });
  return user && user.isActive ? user : null;
});
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For pages: redirects. */
export async function requireUser(...roles: Role[]): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (roles.length && !roles.includes(u.role)) redirect("/dashboard");
  return u;
}
/** For server actions / route handlers: throws instead of redirecting. */
export async function assertUser(...roles: Role[]): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error("You need to sign in.");
  if (roles.length && !roles.includes(u.role)) throw new Error("You don't have permission to do that.");
  return u;
}
