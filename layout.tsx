import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });
export const metadata: Metadata = { title: { default: "CSE SmartHub", template: "%s · CSE SmartHub" }, description: "Courses, notices, resources, assignments and an AI study assistant for CSE students and faculty." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body className={`${display.variable} ${body.variable}`}><Providers>{children}</Providers></body></html>;
}
