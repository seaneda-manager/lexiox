// apps/web/app/api/admin/set-role/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { getServiceSupabase } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();

  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr) return NextResponse.json({ error: uerr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // ?몄텧??admin 媛??
  const { data: me, error: perr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (perr) return NextResponse.json({ error: perr.message }, { status: 500 });
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { userId, role } = body as { userId?: string; role?: string };
  if (!userId || !role) {
    return NextResponse.json({ error: "userId and role required" }, { status: 400 });
  }

  // admin 확인은 위에서 완료. admin_set_role은 service role 전용 (anon/authenticated EXECUTE 회수됨)
  const { error } = await getServiceSupabase().rpc("admin_set_role", { p_user: userId, p_role: role });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}




