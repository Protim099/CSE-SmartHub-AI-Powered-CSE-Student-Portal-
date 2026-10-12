import { z } from "zod";

export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72)
  .regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number");
export const loginSchema = z.object({ email: z.string().email().toLowerCase(), password: z.string().min(1, "Enter your password") });
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().email("Enter a valid email").toLowerCase(),
  password: passwordSchema,
  studentId: z.string().trim().min(3, "Enter your student ID").max(20),
});
export const forgotSchema = z.object({ email: z.string().email().toLowerCase() });
export const resetSchema = z.object({ token: z.string().min(20), password: passwordSchema });

const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const optUrl = z.string().trim().url("Enter a valid URL").max(300).optional().or(z.literal("").transform(() => undefined));
const optId = z.string().trim().optional().transform((v) => v || undefined);

export const courseSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{2,4}-?\d{3,4}$/, "Use a code like CSE-2101"),
  title: text(3, 120), description: text(10, 1000), syllabus: text(10, 6000),
  credits: z.coerce.number().min(0.5).max(6), semester: z.coerce.number().int().min(1).max(8),
  departmentId: z.string().min(1), instructorId: optId,
});
export const noticeSchema = z.object({
  title: text(3, 140), body: text(5, 4000),
  category: z.enum(["GENERAL", "ACADEMIC", "EXAM", "EVENT", "SCHOLARSHIP", "LAB"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]), courseId: optId,
});
export const resourceSchema = z.object({
  title: text(3, 140), description: z.string().trim().max(600).optional(),
  type: z.enum(["PDF", "NOTES", "SLIDES", "LAB_MANUAL", "LINK", "PAST_PAPER"]),
  url: optUrl, content: z.string().trim().max(60000).optional(), courseId: optId,
  isPublic: z.coerce.boolean().optional(),
});
export const assignmentSchema = z.object({
  title: text(3, 140), description: text(5, 4000), courseId: z.string().min(1),
  dueAt: z.coerce.date().refine((d) => d.getTime() > Date.now(), "Due date must be in the future"),
  maxMarks: z.coerce.number().int().min(1).max(1000),
});
export const reviewSchema = z.object({
  feedback: text(2, 2000), status: z.enum(["REVIEWED", "NEEDS_REVISION"]),
  marks: z.string().optional().transform((v) => (v ? Number(v) : undefined)).pipe(z.number().int().min(0).optional()),
});
export const projectSchema = z.object({
  title: text(3, 120), description: text(10, 2000),
  technologies: z.string().trim().min(1, "Add at least one technology").transform((s) => s.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12)),
  githubUrl: optUrl, demoUrl: optUrl, year: z.coerce.number().int().min(2000).max(2100),
});
export const eventSchema = z.object({
  title: text(3, 140), description: z.string().trim().max(600).optional(),
  type: z.enum(["EXAM", "DEADLINE", "EVENT", "REMINDER"]), startsAt: z.coerce.date(), courseId: optId,
});
export const profileSchema = z.object({ name: text(2, 80), bio: z.string().trim().max(400).optional() });
export const passwordChangeSchema = z.object({ current: z.string().min(1), next: passwordSchema });
export const departmentSchema = z.object({ code: z.string().trim().toUpperCase().min(2).max(8), name: text(3, 100) });
export const chatSchema = z.object({
  message: z.string().trim().min(2, "Ask a longer question").max(1500),
  mode: z.enum(["ask", "summarize", "practice"]).default("ask"),
  courseId: z.string().optional(), conversationId: z.string().optional(),
});
