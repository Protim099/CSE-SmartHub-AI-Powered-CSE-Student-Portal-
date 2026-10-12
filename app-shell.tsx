"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BookOpen, Bot, CalendarDays, ChevronLeft, ChevronRight, FolderGit2, GraduationCap, LayoutDashboard, Library, LogOut, Megaphone, Menu, Search, Settings, ShieldCheck, ClipboardList, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button, Input } from "./ui";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/notices", label: "Notices", icon: Megaphone },
  { href: "/resources", label: "Resources", icon: Library },
  { href: "/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/assistant", label: "AI assistant", icon: Bot },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];
type U = { name: string; email: string; role: "STUDENT" | "FACULTY" | "ADMIN" };

export function AppShell({ user, unread, children }: { user: U; unread: number; children: React.ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setCollapsed(localStorage.getItem("sh_collapsed") === "1"); } catch {} }, []);
  useEffect(() => setOpen(false), [path]);
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem("sh_collapsed", c ? "0" : "1"); } catch {} return !c; });
  const items = user.role === "ADMIN" ? [...NAV, { href: "/admin", label: "Admin", icon: ShieldCheck }] : NAV;
  const crumbs = path.split("/").filter(Boolean);

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1 p-3">
      {items.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium", active ? "bg-brand text-brand-fg" : "text-ink hover:bg-brand-soft", collapsed && "lg:justify-center lg:px-2")}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden /><span className={cn(collapsed && "lg:hidden")}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-brand-fg">Skip to content</a>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-surface transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full", collapsed ? "lg:w-16" : "lg:w-64")}>
        <div className={cn("flex h-16 items-center justify-between border-b px-4", collapsed && "lg:justify-center lg:px-2")}>
          <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-semibold"><GraduationCap className="h-6 w-6 text-brand" aria-hidden /><span className={cn(collapsed && "lg:hidden")}>SmartHub</span></Link>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="hidden border-t p-3 lg:block"><Button variant="ghost" size="sm" className="w-full" onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" />Collapse</>}</Button></div>
      </aside>
      <div className={cn("transition-[padding]", collapsed ? "lg:pl-16" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-surface/90 px-4 backdrop-blur sm:gap-3 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
          <form action="/search" className="relative max-w-md flex-1" role="search">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden />
            <Input name="q" aria-label="Search notices, courses, resources and projects" placeholder="Search everything" className="pl-9" minLength={2} required />
          </form>
          <Link href="/notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-brand-soft" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
            <Bell className="h-4 w-4" />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
          </Link>
          <ThemeToggle />
          <Link href="/settings" className="hidden text-right text-xs leading-tight sm:block"><span className="block text-sm font-medium">{user.name}</span><span className="text-muted">{user.role.toLowerCase()}</span></Link>
          <form action={logoutAction}><Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out"><LogOut className="h-4 w-4" /></Button></form>
          <Link href="/settings" className="sr-only">Settings</Link>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-muted">
            <Link href="/dashboard" className="hover:text-ink">Home</Link>
            {crumbs.map((c, i) => <span key={i} className="flex items-center gap-1.5"><span aria-hidden>/</span>{i === crumbs.length - 1 ? <span aria-current="page" className="text-ink">{/^c[a-z0-9]{20,}$/.test(c) ? "Details" : c.replace(/-/g, " ")}</span> : <Link href={"/" + crumbs.slice(0, i + 1).join("/")} className="hover:text-ink">{c}</Link>}</span>)}
          </nav>
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} key={path}>{children}</motion.div>
        </main>
      </div>
    </div>
  );
}
