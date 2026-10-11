import Link from "next/link";
import { ArrowRight, BookOpen, Bot, CalendarDays, ClipboardList, FolderGit2, Library, Megaphone, GraduationCap } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Badge, Card, linkButton, priorityTone } from "@/components/ui";
import { fmtDate, label } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";
const FEATURES = [
  { icon: BookOpen, t: "Course catalog", d: "Syllabus, credits, semester and instructor for every course, with one-click enrolment." },
  { icon: Megaphone, t: "Notice board", d: "Searchable notices with categories, priorities and attachments." },
  { icon: Library, t: "Learning resources", d: "Slides, notes, lab manuals and past papers organised by course." },
  { icon: ClipboardList, t: "Assignments", d: "Deadlines, file submissions, status tracking and instructor feedback." },
  { icon: FolderGit2, t: "Project repository", d: "Browse student projects by technology, with GitHub and demo links." },
  { icon: CalendarDays, t: "Academic calendar", d: "Exams, deadlines and events in one timeline." },
];

export default async function Landing() {
  const user = await getCurrentUser().catch(() => null);
  const [notices, resources] = await Promise.all([
    db.notice.findMany({ orderBy: { publishedAt: "desc" }, take: 3 }).catch(() => []),
    db.resource.findMany({ where: { isPublic: true }, orderBy: { createdAt: "desc" }, take: 3 }).catch(() => []),
  ]);
  return (
    <div>
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold"><GraduationCap className="h-6 w-6 text-brand" aria-hidden />CSE SmartHub</Link>
        <nav aria-label="Primary" className="flex items-center gap-2">
          <a href="#features" className="hidden px-3 text-sm hover:underline sm:block">Features</a>
          <a href="#notices" className="hidden px-3 text-sm hover:underline sm:block">Announcements</a>
          <ThemeToggle />
          {user ? <Link href="/dashboard" className={linkButton()}>Open dashboard</Link> : <><Link href="/login" className={linkButton({ variant: "ghost" })}>Sign in</Link><Link href="/register" className={linkButton()}>Create account</Link></>}
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <h1 className="text-4xl font-semibold leading-[1.05] sm:text-6xl">Everything for your CSE semester, with answers that show their sources.</h1>
          <p className="mt-5 max-w-lg text-lg text-muted">Courses, notices, lab manuals, assignments and projects in one place, plus a study assistant that only answers from the materials your instructors uploaded.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className={linkButton({ size: "md" })}>Create a student account <ArrowRight className="h-4 w-4" /></Link><Link href="/login" className={linkButton({ variant: "outline" })}>Sign in</Link></div>
        </div>
        <Card className="overflow-hidden shadow-lg" aria-label="Example of an assistant answer with sources">
          <div className="flex items-center gap-2 border-b bg-brand-soft px-4 py-2.5 text-sm font-medium"><Bot className="h-4 w-4 text-brand" aria-hidden />Study assistant · Example</div>
          <div className="grid gap-3 p-5 text-sm">
            <p className="ml-auto max-w-[85%] rounded-xl bg-brand px-3 py-2 text-brand-fg">Why does a B-tree stay balanced when I insert keys?</p>
            <p className="max-w-[92%] rounded-xl bg-line/50 px-3 py-2">Nodes split when they overflow and push the median key up, so every leaf stays at the same depth [1]. Height only grows when the root itself splits [1].</p>
            <p className="rounded-lg border px-3 py-2 text-xs text-muted"><b className="text-ink">[1] Indexing and B-trees</b>, Database Systems notes. Passage 3</p>
            <p className="text-xs text-muted">No matching passage? The assistant says so instead of guessing.</p>
          </div>
        </Card>
      </section>

      <section id="features" className="border-y bg-surface"><div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-semibold sm:text-3xl">What's inside</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{FEATURES.map(({ icon: I, t, d }) => <div key={t} className="flex gap-3"><I className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden /><div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></div></div>)}</div>
      </div></section>

      <section id="notices" className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2">
        <div><h2 className="text-xl font-semibold">Latest announcements</h2><div className="mt-4 grid gap-3">
          {notices.length ? notices.map((n) => <Card key={n.id} className="p-4"><div className="flex items-center gap-2"><Badge tone={priorityTone[n.priority]}>{label(n.category)}</Badge><span className="text-xs text-muted">{fmtDate(n.publishedAt)}</span></div><p className="mt-2 font-medium">{n.title}</p></Card>) : <p className="text-sm text-muted">No announcements yet.</p>}
        </div></div>
        <div><h2 className="text-xl font-semibold">Open academic resources</h2><div className="mt-4 grid gap-3">
          {resources.length ? resources.map((r) => <Card key={r.id} className="p-4"><Badge>{label(r.type)}</Badge><p className="mt-2 font-medium">{r.title}</p><p className="text-sm text-muted">{r.description}</p></Card>) : <p className="text-sm text-muted">Sign in to browse resources for your courses.</p>}
        </div></div>
      </section>
      <footer className="border-t py-6 text-center text-sm text-muted">CSE SmartHub. Demo data is fictional and not official academic information.</footer>
    </div>
  );
}
