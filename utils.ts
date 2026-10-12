import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...i: ClassValue[]) => twMerge(clsx(i));
export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const fmtDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const label = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
