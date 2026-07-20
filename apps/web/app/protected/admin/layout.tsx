// apps/web/app/(protected)/admin/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminShell from "./_components/AdminShell";
import { getSupabaseServer } from "@/lib/supabaseServer";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
    error: uerr,
  } = await supabase.auth.getUser();

  if (uerr) redirect("/auth/login");
  if (!user) redirect("/auth/login");

  const { data: me, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) redirect("/auth/login");
  if (me?.role !== "admin") redirect("/auth/forbidden");

  return (
    <div className="min-h-screen">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}