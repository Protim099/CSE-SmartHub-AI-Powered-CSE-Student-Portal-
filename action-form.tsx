"use client";
import { useRef, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./ui";
import type { ActionResult } from "@/lib/utils";

/** Form that calls a server action, shows a toast, and resets on success. */
export function ActionForm({ action, children, className, reset = true, submit }: {
  action: (fd: FormData) => Promise<ActionResult>; children: ReactNode; className?: string; reset?: boolean; submit?: string;
}) {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} className={className} aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await action(fd);
          if (r.ok) { toast.success(r.message ?? "Saved"); if (reset) ref.current?.reset(); } else toast.error(r.error);
        });
      }}>
      <fieldset disabled={pending} className="contents">
        {children}
        {submit && <div><Button type="submit">{pending && <Loader2 className="h-4 w-4 animate-spin" />}{submit}</Button></div>}
      </fieldset>
    </form>
  );
}

/** Button that calls a bound server action (delete, enroll, mark read…). */
export function ActionButton({ action, children, confirm, ...p }: { action: () => Promise<ActionResult>; children: ReactNode; confirm?: string } & Omit<ButtonProps, "onClick">) {
  const [pending, start] = useTransition();
  return (
    <Button type="button" disabled={pending} {...p}
      onClick={() => { if (confirm && !window.confirm(confirm)) return; start(async () => { const r = await action(); r.ok ? toast.success(r.message ?? "Done") : toast.error(r.error); }); }}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}{children}
    </Button>
  );
}
