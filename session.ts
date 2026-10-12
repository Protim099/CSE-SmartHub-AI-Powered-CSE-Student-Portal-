import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";

export const COOKIE = "sh_session";
export type SessionPayload = { uid: string; role: Role };

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set and at least 32 characters (see .env.example)");
  return new TextEncoder().encode(s);
}
export async function signSession(p: SessionPayload) {
  return new SignJWT({ ...p }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(key());
}
export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { uid: String(payload.uid), role: payload.role as Role };
  } catch { return null; }
}
