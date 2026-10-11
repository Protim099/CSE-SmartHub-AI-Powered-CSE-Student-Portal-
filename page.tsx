import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge, Card, CardHeader, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { changePasswordAction, updateProfileAction } from "@/lib/actions";

export const metadata = { title: "Settings" };
export default async function Settings() {
  const user = await requireUser();
  const profile = await db.user.findUnique({ where: { id: user.id }, include: { studentProfile: { include: { department: true } }, facultyProfile: { include: { department: true } } } });
  const sp = profile?.studentProfile, fp = profile?.facultyProfile;
  return <>
    <PageHeader title="Profile and settings" />
    <div className="grid max-w-3xl gap-6">
      <Card><CardHeader title="Profile" action={<Badge tone="brand">{user.role.toLowerCase()}</Badge>} /><div className="grid gap-4 p-5">
        <p className="text-sm text-muted">{user.email}{sp && `, ID ${sp.studentId}, semester ${sp.semester}, batch ${sp.batch}`}{fp && `, ${fp.designation}`}{(sp?.department ?? fp?.department) && `, ${(sp?.department ?? fp?.department)!.name}`}</p>
        <ActionForm action={updateProfileAction} reset={false} className="grid gap-4" submit="Save profile"><Field label="Name"><Input name="name" defaultValue={user.name} required /></Field><Field label="Bio"><Textarea name="bio" defaultValue={user.bio ?? ""} maxLength={400} /></Field></ActionForm></div></Card>
      <Card><CardHeader title="Appearance" /><div className="flex items-center justify-between gap-3 p-5 text-sm"><span>Switch between light and dark mode. The default follows your device.</span><ThemeToggle /></div></Card>
      <Card><CardHeader title="Change password" /><div className="p-5"><ActionForm action={changePasswordAction} className="grid gap-4 sm:max-w-sm" submit="Change password">
        <Field label="Current password"><Input name="current" type="password" autoComplete="current-password" required /></Field>
        <Field label="New password" hint="At least 8 characters with a letter and a number"><Input name="next" type="password" autoComplete="new-password" required /></Field></ActionForm></div></Card>
    </div></>;
}
