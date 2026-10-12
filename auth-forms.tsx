"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { z } from "zod";
import { Button, Field, Input } from "./ui";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validators";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/lib/actions";
import type { ActionResult } from "@/lib/utils";

function useAuthForm<S extends z.ZodTypeAny>(schema: S, action: (v: unknown) => Promise<ActionResult>, onDone: (m?: string) => void) {
  const form = useForm<z.input<S>>({ resolver: zodResolver(schema) });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const submit = form.handleSubmit((values) => start(async () => {
    setError(undefined);
    const r = await action(values);
    if (r.ok) onDone(r.message); else { setError(r.error); toast.error(r.error); }
  }));
  return { form, pending, error, submit };
}
const Submit = ({ pending, children }: { pending: boolean; children: string }) => <Button type="submit" disabled={pending} className="w-full">{pending && <Loader2 className="h-4 w-4 animate-spin" />}{children}</Button>;
const Err = ({ msg }: { msg?: string }) => (msg ? <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{msg}</p> : null);

export function LoginForm() {
  const router = useRouter();
  const { form: f, pending, error, submit } = useAuthForm(loginSchema, loginAction, () => { router.push("/dashboard"); router.refresh(); });
  const e = f.formState.errors as Record<string, { message?: string }>;
  return <form onSubmit={submit} className="grid gap-4" noValidate>
    <Field label="Email" error={e.email?.message}><Input type="email" autoComplete="email" {...f.register("email" as never)} /></Field>
    <Field label="Password" error={e.password?.message}><Input type="password" autoComplete="current-password" {...f.register("password" as never)} /></Field>
    <Err msg={error} /><Submit pending={pending}>Sign in</Submit>
  </form>;
}
export function RegisterForm() {
  const router = useRouter();
  const { form: f, pending, error, submit } = useAuthForm(registerSchema, registerAction, () => { router.push("/dashboard"); router.refresh(); });
  const e = f.formState.errors as Record<string, { message?: string }>;
  return <form onSubmit={submit} className="grid gap-4" noValidate>
    <Field label="Full name" error={e.name?.message}><Input autoComplete="name" {...f.register("name" as never)} /></Field>
    <Field label="Student ID" error={e.studentId?.message}><Input {...f.register("studentId" as never)} /></Field>
    <Field label="Email" error={e.email?.message}><Input type="email" autoComplete="email" {...f.register("email" as never)} /></Field>
    <Field label="Password" hint="At least 8 characters with a letter and a number" error={e.password?.message}><Input type="password" autoComplete="new-password" {...f.register("password" as never)} /></Field>
    <Err msg={error} /><Submit pending={pending}>Create account</Submit>
  </form>;
}
export function ForgotForm() {
  const [sent, setSent] = useState<string>();
  const { form: f, pending, error, submit } = useAuthForm(forgotSchema, forgotPasswordAction, (m) => setSent(m));
  const e = f.formState.errors as Record<string, { message?: string }>;
  if (sent) return <p className="rounded-lg bg-brand-soft px-3 py-3 text-sm">{sent}</p>;
  return <form onSubmit={submit} className="grid gap-4" noValidate>
    <Field label="Email" error={e.email?.message}><Input type="email" {...f.register("email" as never)} /></Field>
    <Err msg={error} /><Submit pending={pending}>Send reset link</Submit>
  </form>;
}
export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const { form: f, pending, error, submit } = useAuthForm(resetSchema, resetPasswordAction, () => { toast.success("Password updated"); router.push("/login"); });
  const e = f.formState.errors as Record<string, { message?: string }>;
  return <form onSubmit={submit} className="grid gap-4" noValidate>
    <input type="hidden" value={token} {...f.register("token" as never, { value: token as never })} />
    <Field label="New password" error={e.password?.message}><Input type="password" autoComplete="new-password" {...f.register("password" as never)} /></Field>
    <Err msg={error} /><Submit pending={pending}>Set new password</Submit>
  </form>;
}
