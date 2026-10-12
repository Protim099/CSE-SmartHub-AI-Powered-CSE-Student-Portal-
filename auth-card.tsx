import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card } from "@/components/ui";
export function AuthCard({ title, sub, children, foot }: { title: string; sub?: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center p-4"><div className="w-full max-w-md"><Link href="/" className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-semibold"><GraduationCap className="h-7 w-7 text-brand" aria-hidden />CSE SmartHub</Link><Card className="p-6 sm:p-8"><h1 className="text-2xl font-semibold">{title}</h1>{sub && <p className="mt-1 text-sm text-muted">{sub}</p>}<div className="mt-6">{children}</div></Card>{foot && <p className="mt-4 text-center text-sm text-muted">{foot}</p>}</div></main>;
}
