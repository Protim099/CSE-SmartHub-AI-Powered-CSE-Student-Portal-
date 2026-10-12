import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const button = cva("inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap", {
  variants: {
    variant: { primary: "bg-brand text-brand-fg hover:bg-brand/90", outline: "border bg-surface hover:bg-brand-soft", ghost: "hover:bg-brand-soft", danger: "bg-danger text-white hover:bg-danger/90" },
    size: { sm: "h-8 px-3", md: "h-10 px-4", icon: "h-9 w-9" },
  }, defaultVariants: { variant: "primary", size: "md" },
});
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...p }, ref) => <button ref={ref} className={cn(button({ variant, size }), className)} {...p} />);
Button.displayName = "Button";
export const linkButton = (o?: VariantProps<typeof button>) => button(o);

export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("rounded-xl border bg-surface", className)} {...p} />;
export const CardHeader = ({ title, action, className }: { title: React.ReactNode; action?: React.ReactNode; className?: string }) => (
  <div className={cn("flex items-center justify-between gap-3 border-b px-5 py-3.5", className)}><h2 className="text-base font-semibold">{title}</h2>{action}</div>
);
const field = "w-full rounded-lg border bg-surface px-3 text-sm placeholder:text-muted/70 disabled:opacity-60";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cn(field, "h-10", className)} {...p} />);
Input.displayName = "Input";
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => <textarea ref={ref} className={cn(field, "min-h-24 py-2", className)} {...p} />);
Textarea.displayName = "Textarea";
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => <select ref={ref} className={cn(field, "h-10", className)} {...p} />);
Select.displayName = "Select";
export const Field = ({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) => (
  <label className={cn("grid gap-1.5 text-sm", className)}><span className="font-medium">{label}</span>{children}{hint && !error && <span className="text-xs text-muted">{hint}</span>}{error && <span role="alert" className="text-xs text-danger">{error}</span>}</label>
);
const tones = { neutral: "bg-line/60 text-ink", brand: "bg-brand-soft text-brand", warn: "bg-signal/15 text-signal", danger: "bg-danger/10 text-danger", ok: "bg-ok/10 text-ok" };
export const Badge = ({ tone = "neutral", children }: { tone?: keyof typeof tones; children: React.ReactNode }) => <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;

export const PageHeader = ({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}</div>{action}</div>
);
export const EmptyState = ({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-10 text-center"><Inbox className="h-8 w-8 text-muted" aria-hidden /><p className="font-medium">{title}</p>{hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}{action}</div>
);
export const Stat = ({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) => {
  const inner = <Card className="p-4"><p className="text-sm text-muted">{label}</p><p className="mt-1 font-display text-3xl font-semibold">{value}</p></Card>;
  return href ? <Link href={href} className="block rounded-xl hover:ring-2 hover:ring-brand/40">{inner}</Link> : inner;
};
export const DemoBanner = () => <p className="mb-4 rounded-lg border border-signal/40 bg-signal/10 px-3 py-2 text-sm">This deployment contains fictional demo data for demonstration only. It is not official academic information.</p>;
export const priorityTone = { LOW: "neutral", NORMAL: "brand", HIGH: "warn", URGENT: "danger" } as const;
export const Details = ({ summary, children }: { summary: string; children: React.ReactNode }) => (
  <details className="group mb-6 rounded-xl border bg-surface"><summary className="cursor-pointer list-none px-5 py-3 text-sm font-medium marker:hidden hover:bg-brand-soft group-open:border-b">{summary}</summary><div className="p-5">{children}</div></details>
);
