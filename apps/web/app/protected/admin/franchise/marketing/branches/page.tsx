import { getServiceSupabase } from "@/lib/supabase/service";
import { HqNav } from "../_nav";
import { BranchesClient, type BranchView, type StudentView } from "./BranchesClient";

export const dynamic = "force-dynamic";

export default async function BranchesPage({ searchParams }: { searchParams: Promise<{ q?: string }> | { q?: string } }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const svc = getServiceSupabase();
  const [{ data: orgs }, { data: ms }, { data: assigned }] = await Promise.all([
    svc.from("organizations").select("id, name").eq("kind", "branch").order("name"),
    svc.from("memberships").select("org_id, user_id, role").in("role", ["owner", "manager"]),
    svc.from("academy_students").select("org_id").not("org_id", "is", null).eq("is_active", true),
  ]);
  const userIds = [...new Set((ms ?? []).map((m) => m.user_id as string))];
  const { data: profs } = userIds.length
    ? await svc.from("profiles").select("id, email, full_name, name").in("id", userIds)
    : { data: [] };

  let sq = svc
    .from("academy_students")
    .select("id, full_name, display_name, grade, school, org_id")
    .eq("is_active", true)
    .order("full_name")
    .limit(300);
  sq = q ? sq.or(`full_name.ilike.%${q.replace(/[%,()]/g, "")}%,school.ilike.%${q.replace(/[%,()]/g, "")}%`) : sq.is("org_id", null);
  const { data: students } = await sq;

  const branches: BranchView[] = (orgs ?? []).map((o) => ({
    id: o.id as string,
    name: o.name as string,
    students: (assigned ?? []).filter((s) => s.org_id === o.id).length,
    members: (ms ?? [])
      .filter((m) => m.org_id === o.id)
      .map((m) => {
        const p = (profs ?? []).find((x) => x.id === m.user_id);
        return { userId: m.user_id as string, role: m.role as string, label: (p?.full_name || p?.name || p?.email || "이름 없음") as string, email: (p?.email ?? "") as string };
      }),
  }));

  return (
    <div className="space-y-6">
      <HqNav active="/admin/franchise/marketing/branches" />
      <BranchesClient branches={branches} students={(students ?? []) as StudentView[]} query={q} />
    </div>
  );
}
