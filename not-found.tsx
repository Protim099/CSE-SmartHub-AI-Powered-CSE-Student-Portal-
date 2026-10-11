import Link from "next/link";
import { linkButton } from "@/components/ui";
export default function NotFound() {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center"><h1 className="text-3xl font-semibold">Page not found</h1><p className="text-muted">The page you asked for doesn't exist, or you don't have access to it.</p><Link href="/" className={linkButton()}>Back to home</Link></div>;
}
