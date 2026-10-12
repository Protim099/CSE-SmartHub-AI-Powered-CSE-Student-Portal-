import { describe, expect, it } from "vitest";
import { assignmentSchema, chatSchema, passwordSchema, projectSchema, registerSchema, resourceSchema } from "@/lib/validators";

describe("validators", () => {
  it("rejects weak passwords", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("allletters").success).toBe(false);
    expect(passwordSchema.safeParse("Valid-pass1").success).toBe(true);
  });
  it("normalises emails on register", () => {
    const r = registerSchema.parse({ name: "Ada Lovelace", email: "ADA@Example.com", password: "Passw0rdOK", studentId: "S-100" });
    expect(r.email).toBe("ada@example.com");
  });
  it("rejects past assignment due dates", () => {
    const base = { title: "HW1", description: "Do it", courseId: "c1", maxMarks: 100 };
    expect(assignmentSchema.safeParse({ ...base, dueAt: "2001-01-01T10:00" }).success).toBe(false);
    expect(assignmentSchema.safeParse({ ...base, dueAt: new Date(Date.now() + 86400_000).toISOString() }).success).toBe(true);
  });
  it("splits project technologies and treats empty URLs as absent", () => {
    const p = projectSchema.parse({ title: "Proj", description: "A cool project here", technologies: "React, Node ,, SQL", githubUrl: "", demoUrl: "", year: "2025" });
    expect(p.technologies).toEqual(["React", "Node", "SQL"]);
    expect(p.githubUrl).toBeUndefined();
  });
  it("rejects non-http garbage URLs for resources", () => {
    expect(resourceSchema.safeParse({ title: "Notes", type: "LINK", url: "not a url" }).success).toBe(false);
  });
  it("defaults chat mode and enforces length", () => {
    expect(chatSchema.parse({ message: "What is a deadlock?" }).mode).toBe("ask");
    expect(chatSchema.safeParse({ message: "x" }).success).toBe(false);
    expect(chatSchema.safeParse({ message: "x".repeat(2000) }).success).toBe(false);
  });
});
