import "server-only";
import type { Prisma, Role } from "@prisma/client";
import { db } from "./db";

type U = { id: string; role: Role };

/** Course ids the user may see content for: enrolled (student), taught (faculty), all (admin). */
export async function accessibleCourseIds(u: U): Promise<string[] | "all"> {
  if (u.role === "ADMIN") return "all";
  if (u.role === "FACULTY") return (await db.course.findMany({ where: { instructorId: u.id }, select: { id: true } })).map((c) => c.id);
  return (await db.enrollment.findMany({ where: { userId: u.id }, select: { courseId: true } })).map((e) => e.courseId);
}
export async function resourceWhere(u: U): Promise<Prisma.ResourceWhereInput> {
  const ids = await accessibleCourseIds(u);
  if (ids === "all") return {};
  return { OR: [{ isPublic: true }, { courseId: { in: ids } }] };
}
export async function canManageCourse(u: U, courseId: string) {
  if (u.role === "ADMIN") return true;
  if (u.role !== "FACULTY") return false;
  return !!(await db.course.findFirst({ where: { id: courseId, instructorId: u.id }, select: { id: true } }));
}
export async function audit(userId: string | null, action: string, entity: string, entityId?: string, meta?: Prisma.InputJsonValue) {
  await db.auditLog.create({ data: { userId, action, entity, entityId, meta } });
}
export async function notifyMany(userIds: string[], title: string, body: string | null, href: string) {
  if (!userIds.length) return;
  await db.notification.createMany({ data: userIds.map((userId) => ({ userId, title, body, href })) });
}
export async function courseStudentIds(courseId: string) {
  return (await db.enrollment.findMany({ where: { courseId }, select: { userId: true } })).map((e) => e.userId);
}

export async function noticeWhere(u: U): Promise<Prisma.NoticeWhereInput> {
  const ids = await accessibleCourseIds(u);
  if (ids === "all") return {};
  return { OR: [{ courseId: null }, { courseId: { in: ids } }] };
}
