import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED: Record<string, string[]> = {
  ".pdf": ["application/pdf"], ".txt": ["text/plain"], ".md": ["text/markdown", "text/plain", ""],
  ".png": ["image/png"], ".jpg": ["image/jpeg"], ".jpeg": ["image/jpeg"],
  ".zip": ["application/zip", "application/x-zip-compressed"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};
const dir = () => path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

export function validateFile(file: File) {
  if (file.size === 0) throw new Error("The file is empty.");
  if (file.size > MAX_BYTES) throw new Error("Files must be 10 MB or smaller.");
  const ext = path.extname(file.name).toLowerCase();
  const mimes = ALLOWED[ext];
  if (!mimes) throw new Error(`.${ext.slice(1) || "?"} files aren't allowed. Use: ${Object.keys(ALLOWED).join(", ")}`);
  if (file.type && !mimes.includes(file.type)) throw new Error("The file type doesn't match its extension.");
  return ext;
}
export async function saveUpload(file: File) {
  const ext = validateFile(file);
  const stored = `${randomUUID()}${ext}`; // never trust the client file name for the path
  await mkdir(dir(), { recursive: true });
  await writeFile(path.join(dir(), stored), Buffer.from(await file.arrayBuffer()));
  return { filePath: stored, fileName: file.name.replace(/[^\w.\- ]/g, "_").slice(0, 120) };
}
export async function readUpload(stored: string) {
  if (!/^[0-9a-f-]{36}\.\w+$/.test(stored)) throw new Error("Bad path");
  return readFile(path.join(dir(), stored));
}
export const optionalFile = (v: FormDataEntryValue | null) => (v instanceof File && v.size > 0 ? v : null);
