"use client";
import { useRef, useState } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";
import { Badge, Button, Card, Select, Textarea } from "./ui";
import { cn } from "@/lib/utils";

type Src = { n: number; resourceId: string; title: string; excerpt: string };
type Msg = { role: "user" | "assistant"; text: string; sources?: Src[]; state?: string };
const MODES = [["ask", "Ask a question"], ["summarize", "Summarize material"], ["practice", "Practice questions"]] as const;

export function Chat({ courses, aiLive }: { courses: { id: string; code: string }[]; aiLive: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState(""); const [mode, setMode] = useState<string>("ask"); const [course, setCourse] = useState("");
  const [busy, setBusy] = useState(false); const [convo, setConvo] = useState<string>();
  const end = useRef<HTMLDivElement>(null);

  async function send() {
    const message = text.trim(); if (message.length < 2 || busy) return;
    setMsgs((m) => [...m, { role: "user", text: message }]); setText(""); setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, mode, courseId: course || undefined, conversationId: convo }) });
      const data = await res.json();
      if (!res.ok) setMsgs((m) => [...m, { role: "assistant", text: data.error ?? "Something went wrong.", state: "error" }]);
      else { setConvo(data.conversationId); setMsgs((m) => [...m, { role: "assistant", text: data.answer, sources: data.sources, state: data.state }]); }
    } catch { setMsgs((m) => [...m, { role: "assistant", text: "Couldn't reach the server. Check your connection and try again.", state: "error" }]); }
    setBusy(false); setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }
  return (
    <Card className="flex h-[70vh] min-h-[28rem] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <Select value={mode} onChange={(e) => setMode(e.target.value)} className="w-48" aria-label="Mode">{MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Select value={course} onChange={(e) => setCourse(e.target.value)} className="w-40" aria-label="Course"><option value="">All my courses</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}</Select>
        <Badge tone={aiLive ? "ok" : "warn"}>{aiLive ? "Live AI" : "Demo mode: retrieval only"}</Badge>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {!msgs.length && <div className="mx-auto mt-10 max-w-md text-center text-sm text-muted"><Bot className="mx-auto mb-2 h-8 w-8 text-brand" aria-hidden /><p>Ask about your course materials. Answers come only from documents you're allowed to see, with sources. If nothing supports an answer, I'll say so.</p></div>}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
            {m.role === "assistant" && <Bot className="mt-1 h-5 w-5 shrink-0 text-brand" aria-hidden />}
            <div className={cn("max-w-[85%] rounded-xl px-4 py-3 text-sm", m.role === "user" ? "bg-brand text-brand-fg" : m.state === "no_source" || m.state === "error" ? "border border-signal/50 bg-signal/10" : "bg-line/50")}>
              <p className="whitespace-pre-line">{m.text}</p>
              {m.sources && m.sources.length > 0 && <div className="mt-3 grid gap-2 border-t pt-3"><p className="text-xs font-medium">Sources</p>{m.sources.map((s) => <details key={s.n} className="rounded-lg border bg-surface p-2 text-xs"><summary className="cursor-pointer font-medium">[{s.n}] {s.title}</summary><p className="mt-1.5 whitespace-pre-line text-muted">{s.excerpt}</p></details>)}</div>}
            </div>
            {m.role === "user" && <User className="mt-1 h-5 w-5 shrink-0 text-muted" aria-hidden />}
          </div>))}
        {busy && <p className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />Searching your course materials…</p>}
        <div ref={end} />
      </div>
      <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === "ask" ? "e.g. What is the difference between a process and a thread?" : "Name a topic, e.g. deadlocks"} className="min-h-10 flex-1 resize-none" rows={1} maxLength={1500} aria-label="Your message"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} />
        <Button type="submit" disabled={busy || text.trim().length < 2} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </Card>
  );
}
