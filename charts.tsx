"use client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tip = { contentStyle: { background: "hsl(var(--surface))", border: "1px solid hsl(var(--line))", borderRadius: 8, fontSize: 12 } };
export function ProgressChart({ data }: { data: { name: string; submitted: number; total: number }[] }) {
  if (!data.length) return null;
  return <div className="h-64 w-full" role="img" aria-label="Assignments submitted versus assigned, by course">
    <ResponsiveContainer><BarChart data={data} margin={{ left: -20 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--line))" vertical={false} />
      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted))" }} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted))" }} />
      <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey="total" name="Assigned" fill="hsl(var(--line))" radius={[4, 4, 0, 0]} />
      <Bar dataKey="submitted" name="Submitted" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
    </BarChart></ResponsiveContainer></div>;
}
const COLORS = ["hsl(var(--brand))", "hsl(var(--signal))", "hsl(var(--ink))"];
export function RoleChart({ data }: { data: { name: string; value: number }[] }) {
  return <div className="h-56 w-full" role="img" aria-label="Users by role"><ResponsiveContainer><PieChart>
    <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>
    <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer></div>;
}
