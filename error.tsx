"use client";
import { Button } from "@/components/ui";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center"><h1 className="text-2xl font-semibold">Something went wrong</h1><p className="max-w-md text-muted">We couldn't load this page. Check that the database is running and migrated (see README), then try again.</p><Button onClick={reset}>Try again</Button></div>;
}
