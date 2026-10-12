"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodType, ZodTypeDef } from "zod";
import { db } from "./db";
import { assertUser, createSession, destroySession } from "./auth";
import { audit, canManageCourse, courseStudentIds, notifyMany } from "./access";
import { indexResource } from "./ai";
import { rateLimit } from "./rate-limit";
import { optionalFile, saveUpload } from "./storage";
import * as v from "./validators";
import type { ActionResult } from "./utils";

const fail = (error: string): ActionResult => ({ ok: false, error });
const ok = (message?: string): ActionResult => ({ ok: true, message });
const obj = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, val]) => typeof val === "string"));
function parse<T>(schema: ZodType<T, ZodTypeDef, any>, input: unknown): { data: T } | { error: string } {
  const r = schema.safeParse(input);
  return r.success ? { data: r.data } : { error: r.error.issues[0]?.message ?? "Check the form and try again." };
}
/** Wraps an action: converts thrown errors (auth, validation, upload) into a friendly result. */
async function guard(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try { return await fn(); } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    console.error(e);
    return fail(e instanceof Error ? e.message : "Something went wrong.");
  }
}
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/* ---------- Authentication ---------- */
export async function registerAction(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const p = parse(v.registerSchema, input); if ("error" in p) return fail(p.error);
    const d = p.data;
    if (!rateLimit(`reg:${d.email}`, 5, 60_000).ok) return fail("Too many attempts. Wait a minute and try again.");
    if (await db.user.findUnique({ where: { email: d.email } })) return fail("An account with this email already exists.");
    if (await db.studentProfile.findUnique({ where: { studentId: d.studentId } })) return fail("That student ID is already registered.");
    const dept = await db.department.findFirst({ orderBy: { code: "asc" } });
    const user = await db.user.create({
      data: {
        email: d.email, name: d.name, passwordHash: await bcrypt.hash(d.password, 12), role: "STUDENT", // self-registration is always STUDENT
        studentProfile: { create: { studentId: d.studentId, semester: 1, batch: String(new Date().getFullYear()), departmentId: dept?.id } },
      },
    });
    await audit(user.id, "register", "User", user.id);
    await createSession(user.id, user.role);
    return ok();
  });
}
export async function loginAction(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const p = parse(v.loginSchema, input); if ("error" in p) return fail(p.error);
    if (!rateLimit(`login:${p.data.email}`, 8, 5 * 60_000).ok) return fail("Too many sign-in attempts. Try again in a few minutes.");
    const user = await db.user.findUnique({ where: { email: p.data.email } });
    const valid = user ? await bcrypt.compare(p.data.password, user.passwordHash) : await bcrypt.compare(p.data.password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    if (!user || !valid || !user.isActive) return fail("Email or password is incorrect.");
    await createSession(user.id, user.role);
    await audit(user.id, "login", "User", user.id);
    return ok();
  });
}
export async function logoutAction() { destroySession(); redirect("/login"); }

export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const p = parse(v.forgotSchema, input); if ("error" in p) return fail(p.error);
    if (!rateLimit(`forgot:${p.data.email}`, 3, 15 * 60_000).ok) return fail("Too many requests. Try again later.");
    const user = await db.user.findUnique({ where: { email: p.data.email } });
    if (user && user.isActive) {
      const token = randomBytes(32).toString("hex");
      await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
      // No email provider is configured in this template. Wire one in here (Resend, SES, SMTP…).
      console.log(`[password reset - dev only] ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`);
    }
    return ok("If that email is registered, a reset link has been sent."); // identical response either way
  });
}
export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const p = parse(v.resetSchema, input); if ("error" in p) return fail(p.error);
    const t = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(p.data.token) } });
    if (!t || t.usedAt || t.expiresAt < new Date()) return fail("This reset link is invalid or has expired.");
    await db.$transaction([
      db.user.update({ where: { id: t.userId }, data: { passwordHash: await bcrypt.hash(p.data.password, 12) } }),
      db.passwordResetToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    ]);
    await audit(t.userId, "password_reset", "User", t.userId);
    return ok("Password updated. You can sign in now.");
  });
}

/* ---------- Courses ---------- */
export async function createCourseAction(fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("FACULTY", "ADMIN");
    const p = parse(v.courseSchema, obj(fd)); if ("error" in p) return fail(p.error);
    const { instructorId, ...rest } = p.data;
    const instructor = u.role === "ADMIN" ? instructorId ?? u.id : u.id; // faculty can only create their own courses
    if (u.role === "ADMIN") {
      const i = await db.user.findFirst({ where: { id: instructor, role: { in: ["FACULTY", "ADMIN"] } } });
      if (!i) return fail("Choose a valid instructor.");
    }
    if (await db.course.findUnique({ where: { code: rest.code } })) return fail("A course with this code already exists.");
    const c = await db.course.create({ data: { ...rest, instructorId: instructor } });
    await audit(u.id, "create", "Course", c.id);
    revalidatePath("/courses");
    return ok("Course created.");
  });
}
export async function deleteCourseAction(id: string): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("FACULTY", "ADMIN");
    if (!(await canManageCourse(u, id))) return fail("You can only manage your own courses.");
    await db.course.delete({ where: { id } });
    await audit(u.id, "delete", "Course", id);
    revalidatePath("/courses");
    return ok("Course deleted.");
  });
}
export async function toggleEnrollAction(courseId: string): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("STUDENT");
    const existing = await db.enrollment.findUnique({ where: { userId_courseId: { userId: u.id, courseId } } });
    if (existing) await db.enrollment.delete({ where: { id: existing.id } });
    else await db.enrollment.create({ data: { userId: u.id, courseId } });
    revalidatePath("/courses"); revalidatePath(`/courses/${courseId}`); revalidatePath("/dashboard");
    return ok(existing ? "You've left the course." : "You're enrolled.");
  });
}

/* ---------- Notices ---------- */
export async function createNoticeAction(fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("FACULTY", "ADMIN");
    const p = parse(v.noticeSchema, obj(fd)); if ("error" in p) return fail(p.error);
    if (p.data.courseId && !(await canManageCourse(u, p.data.courseId))) return fail("You can only post to your own courses.");
    const f = optionalFile(fd.get("attachment"));
    const att = f ? await saveUpload(f) : null;
    const n = await db.notice.create({ data: { ...p.data, authorId: u.id, attachmentPath: att?.filePath, attachmentName: att?.fileName } });
    const targets = p.data.courseId ? await courseStudentIds(p.data.courseId)
      : (await db.user.findMany({ where: { role: "STUDENT", isActive: true }, select: { id: true } })).map((x) => x.id);
    await notifyMany(targets, `${p.data.priority === "URGENT" ? "Urgent: " : ""}${n.title}`, null, "/notices");
    await audit(u.id, "create", "Notice", n.id);
    revalidatePath("/notices"); revalidatePath("/dashboard");
    return ok("Notice published.");
  });
}
export async function deleteNoticeAction(id: string): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("FACULTY", "ADMIN");
    const n = await db.notice.findUnique({ where: { id } });
    if (!n || (u.role !== "ADMIN" && n.authorId !== u.id)) return fail("You can only delete your own notices.");
    await db.notice.delete({ where: { id } });
    await audit(u.id, "delete", "Notice", id);
    revalidatePath("/notices");
    return ok("Notice deleted.");
  });
}

/* ---------- Resources ---------- */
export async function createResourceAction(fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("FACULTY", "ADMIN");
    const raw = obj(fd); raw.isPublic = fd.get("isPublic") === "on" ? "true" : "";
    const p = parse(v.resourceSchema, raw); if ("error" in p) return fail(p.error);
    if (p.data.courseId && !(await canManageCourse(u, p.data.courseId))) return fail("You can only upload to your own courses.");
    const f = optionalFile(fd.get("file"));
    if (!f && !p.data.url && !p.data.content) return fail("Attach a file, add a link, or paste text content.");
    const up = f ? await saveUpload(f) : null;
    let content = p.data.content;
    if (f && !content && /\.(txt|md)$/i.test(f.name)) content = (await f.text()).slice(0, 60000); // text files are indexed automatically
    const r = await db.resource.create({ data: { ...p.data, content, isPublic: !!p.data.isPublic, uploaderId: u.id, filePath: up?.filePath, fileName: up?.fileName } });
    const chunks = await indexResource(r.id);
    await audit(u.id, "create", "Resource", r.id);
    revalidatePath("/resources");
    return ok(chunks ? `Resource added and indexed for the AI assistant (${chunks} passages).` : "Resource added. It has no text content, so the AI assistant can't use it yet.");
  });
}
export async function deleteResourceAction(id: string): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("FACULTY", "ADMIN");
    const r = await db.resource.findUnique({ where: { id } });
    if (!r || (u.role !== "ADMIN" && r.uploaderId !== u.id)) return fail("You can only delete your own resources.");
    await db.resource.delete({ where: { id } });
    await audit(u.id, "delete", "Resource", id);
    revalidatePath("/resources");
    return ok("Resource deleted.");
  });
}

/* ---------- Assignments & submissions ---------- */
export async function createAssignmentAction(fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("FACULTY", "ADMIN");
    const p = parse(v.assignmentSchema, obj(fd)); if ("error" in p) return fail(p.error);
    if (!(await canManageCourse(u, p.data.courseId))) return fail("You can only create assignments for your own courses.");
    const a = await db.assignment.create({ data: { ...p.data, creatorId: u.id } });
    await notifyMany(await courseStudentIds(a.courseId), `New assignment: ${a.title}`, null, `/assignments/${a.id}`);
    await audit(u.id, "create", "Assignment", a.id);
    revalidatePath("/assignments"); revalidatePath("/dashboard"); revalidatePath("/calendar");
    return ok("Assignment created.");
  });
}
export async function submitAssignmentAction(assignmentId: string, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("STUDENT");
    const a = await db.assignment.findUnique({ where: { id: assignmentId } });
    if (!a) return fail("Assignment not found.");
    if (!(await db.enrollment.findUnique({ where: { userId_courseId: { userId: u.id, courseId: a.courseId } } }))) return fail("Enroll in the course before submitting.");
    const f = optionalFile(fd.get("file")); if (!f) return fail("Choose a file to submit.");
    const up = await saveUpload(f);
    const late = new Date() > a.dueAt;
    const note = String(fd.get("note") ?? "").slice(0, 500) || null;
    await db.submission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: u.id } },
      create: { assignmentId, studentId: u.id, ...up, note, status: late ? "LATE" : "SUBMITTED" },
      update: { ...up, note, status: late ? "LATE" : "SUBMITTED", feedback: null, marks: null, reviewedAt: null, reviewerId: null, submittedAt: new Date() },
    });
    await notifyMany([a.creatorId], `New submission: ${a.title}`, `${u.name} submitted${late ? " (late)" : ""}.`, `/assignments/${a.id}`);
    revalidatePath(`/assignments/${assignmentId}`); revalidatePath("/assignments"); revalidatePath("/dashboard");
    return ok(late ? "Submitted after the deadline - marked late." : "Submitted.");
  });
}
export async function reviewSubmissionAction(submissionId: string, fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("FACULTY", "ADMIN");
    const s = await db.submission.findUnique({ where: { id: submissionId }, include: { assignment: true } });
    if (!s || !(await canManageCourse(u, s.assignment.courseId))) return fail("You can only review submissions for your own courses.");
    const p = parse(v.reviewSchema, obj(fd)); if ("error" in p) return fail(p.error);
    if (p.data.marks !== undefined && p.data.marks > s.assignment.maxMarks) return fail(`Marks can't exceed ${s.assignment.maxMarks}.`);
    await db.submission.update({ where: { id: s.id }, data: { feedback: p.data.feedback, status: p.data.status, marks: p.data.marks ?? null, reviewerId: u.id, reviewedAt: new Date() } });
    await notifyMany([s.studentId], `Feedback on ${s.assignment.title}`, null, `/assignments/${s.assignmentId}`);
    await audit(u.id, "review", "Submission", s.id);
    revalidatePath(`/assignments/${s.assignmentId}`);
    return ok("Feedback saved.");
  });
}

/* ---------- Projects ---------- */
export async function createProjectAction(fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser();
    const p = parse(v.projectSchema, obj(fd)); if ("error" in p) return fail(p.error);
    const pr = await db.project.create({ data: { ...p.data, ownerId: u.id } });
    await audit(u.id, "create", "Project", pr.id);
    revalidatePath("/projects");
    return ok("Project added.");
  });
}
export async function deleteProjectAction(id: string): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser();
    const pr = await db.project.findUnique({ where: { id } });
    if (!pr || (u.role !== "ADMIN" && pr.ownerId !== u.id)) return fail("You can only delete your own projects.");
    await db.project.delete({ where: { id } });
    revalidatePath("/projects");
    return ok("Project deleted.");
  });
}

/* ---------- Calendar ---------- */
export async function createEventAction(fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("FACULTY", "ADMIN");
    const p = parse(v.eventSchema, obj(fd)); if ("error" in p) return fail(p.error);
    if (p.data.courseId && !(await canManageCourse(u, p.data.courseId))) return fail("You can only add events to your own courses.");
    const e = await db.calendarEvent.create({ data: { ...p.data, creatorId: u.id } });
    const targets = p.data.courseId ? await courseStudentIds(p.data.courseId) : (await db.user.findMany({ where: { role: "STUDENT" }, select: { id: true } })).map((x) => x.id);
    await notifyMany(targets, `New ${p.data.type.toLowerCase()}: ${e.title}`, null, "/calendar");
    revalidatePath("/calendar");
    return ok("Event added.");
  });
}
export async function deleteEventAction(id: string): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("FACULTY", "ADMIN");
    const e = await db.calendarEvent.findUnique({ where: { id } });
    if (!e || (u.role !== "ADMIN" && e.creatorId !== u.id)) return fail("You can only delete your own events.");
    await db.calendarEvent.delete({ where: { id } });
    revalidatePath("/calendar");
    return ok("Event deleted.");
  });
}

/* ---------- Notifications & profile ---------- */
export async function markNotificationsReadAction(): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser();
    await db.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
    revalidatePath("/notifications");
    return ok("All caught up.");
  });
}
export async function updateProfileAction(fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser();
    const p = parse(v.profileSchema, obj(fd)); if ("error" in p) return fail(p.error);
    await db.user.update({ where: { id: u.id }, data: p.data });
    revalidatePath("/settings");
    return ok("Profile saved.");
  });
}
export async function changePasswordAction(fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser();
    const p = parse(v.passwordChangeSchema, obj(fd)); if ("error" in p) return fail(p.error);
    const row = await db.user.findUnique({ where: { id: u.id } });
    if (!row || !(await bcrypt.compare(p.data.current, row.passwordHash))) return fail("Current password is incorrect.");
    await db.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(p.data.next, 12) } });
    await audit(u.id, "change_password", "User", u.id);
    return ok("Password changed.");
  });
}

/* ---------- Admin ---------- */
export async function setUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("ADMIN");
    if (!["STUDENT", "FACULTY", "ADMIN"].includes(role)) return fail("Invalid role.");
    if (userId === u.id) return fail("You can't change your own role.");
    const target = await db.user.update({ where: { id: userId }, data: { role: role as "STUDENT" | "FACULTY" | "ADMIN" } });
    if (role === "FACULTY") await db.facultyProfile.upsert({ where: { userId }, create: { userId, designation: "Lecturer" }, update: {} });
    await audit(u.id, "set_role", "User", userId, { role });
    revalidatePath("/admin");
    return ok(`${target.name} is now ${role.toLowerCase()}.`);
  });
}
export async function toggleUserActiveAction(userId: string): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("ADMIN");
    if (userId === u.id) return fail("You can't deactivate yourself.");
    const t = await db.user.findUnique({ where: { id: userId } }); if (!t) return fail("User not found.");
    await db.user.update({ where: { id: userId }, data: { isActive: !t.isActive } });
    await audit(u.id, t.isActive ? "deactivate" : "activate", "User", userId);
    revalidatePath("/admin");
    return ok(t.isActive ? "Account deactivated." : "Account reactivated.");
  });
}
export async function createDepartmentAction(fd: FormData): Promise<ActionResult> {
  return guard(async () => {
    const u = await assertUser("ADMIN");
    const p = parse(v.departmentSchema, obj(fd)); if ("error" in p) return fail(p.error);
    if (await db.department.findUnique({ where: { code: p.data.code } })) return fail("That department code exists.");
    const d = await db.department.create({ data: p.data });
    await audit(u.id, "create", "Department", d.id);
    revalidatePath("/admin");
    return ok("Department added.");
  });
}
