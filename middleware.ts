import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifySession } from "@/lib/session";

const PROTECTED = ["/dashboard", "/courses", "/notices", "/resources", "/assignments", "/projects", "/assistant", "/calendar", "/notifications", "/search", "/settings", "/admin"];
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const s = await verifySession(req.cookies.get(COOKIE)?.value);
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) && !s) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/admin") && s?.role !== "ADMIN") return NextResponse.redirect(new URL("/dashboard", req.url));
  if ((pathname === "/login" || pathname === "/register") && s) return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next|api|favicon.ico).*)"] };
