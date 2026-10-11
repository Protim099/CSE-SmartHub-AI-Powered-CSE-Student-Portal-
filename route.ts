import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageCourse, resourceWhere } from "@/lib/access";
import { readUpload } from "@/lib/storage";

export const runtime = "nodejs";
const MIME: Record<string, string> = { pdf: "application/pdf", txt: "text/plain", md: "text/plain", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", zip: "application/zip" };

export async function GET(_: Request, { params }: { params: { kind: string; id: string } }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  let stored: string | null | undefined, name: string | null | undefined;

  if (params.kind === "resource") {
    const r = await db.resource.findFirst({ where: { AND: [{ id: params.id }, await resourceWhere(user)] } });
    stored = r?.filePath; name = r?.fileName;
  } else if (params.kind === "notice") {
    const n = await db.notice.findUnique({ where: { id: params.id } });
    stored = n?.attachmentPath; name = n?.attachmentName;
  } else if (params.kind === "submission") {
    const s = await db.submission.findUnique({ where: { id: params.id }, include: { assignment: true } });
    if (s && (s.studentId === user.id || (await canManageCourse(user, s.assignment.courseId)))) { stored = s.filePath; name = s.fileName; }
  }
  if (!stored || !name) return new NextResponse("Not found", { status: 404 });
  const ext = stored.split(".").pop() ?? "";
  const body = await readUpload(stored).catch(() => null);
  if (!body) return new NextResponse("File is no longer available", { status: 404 });
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
      "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store",
    },
  });
}
