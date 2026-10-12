import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";
import { signSession, verifySession } from "@/lib/session";
import { validateFile } from "@/lib/storage";

describe("rate limiting", () => {
  it("blocks after the limit and reports retry time", () => {
    const k = "t" + Math.random();
    for (let i = 0; i < 3; i++) expect(rateLimit(k, 3, 60_000).ok).toBe(true);
    const r = rateLimit(k, 3, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
  });
});
describe("sessions", () => {
  it("round-trips a valid token and rejects tampered ones", async () => {
    const t = await signSession({ uid: "u1", role: "STUDENT" });
    expect(await verifySession(t)).toEqual({ uid: "u1", role: "STUDENT" });
    expect(await verifySession(t.slice(0, -2) + "xx")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
  });
});
describe("upload validation", () => {
  const f = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });
  it("accepts allowed types", () => expect(validateFile(f("a.pdf", "application/pdf"))).toBe(".pdf"));
  it("rejects executables, mismatched types, empty and oversized files", () => {
    expect(() => validateFile(f("a.exe", "application/octet-stream"))).toThrow();
    expect(() => validateFile(f("a.pdf", "text/html"))).toThrow();
    expect(() => validateFile(f("a.pdf", "application/pdf", 0))).toThrow();
    expect(() => validateFile(f("a.pdf", "application/pdf", 11 * 1024 * 1024))).toThrow();
  });
});
