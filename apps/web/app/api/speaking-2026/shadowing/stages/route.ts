// app/api/speaking-2026/shadowing/stages/route.ts
// 쉐도잉 게임 스테이지 목록 — speaking_tests 중 label이 "Shadowing:"으로 시작하는 것만 노출
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SHADOWING_PREFIX = "Shadowing:";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const service = getServiceSupabase();
    if (!service) {
      return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
    }

    const { data, error } = await service
      .from("speaking_tests")
      .select("id, label, updated_at")
      .ilike("label", `${SHADOWING_PREFIX}%`)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const stages = (data ?? []).map((row) => ({
      id: row.id as string,
      label: (row.label as string).slice(SHADOWING_PREFIX.length).trim(),
    }));

    return NextResponse.json({ ok: true, stages });
  } catch (error) {
    console.error("[speaking-2026.shadowing.stages] error", error);
    return NextResponse.json({ ok: false, error: "Failed to load stages." }, { status: 500 });
  }
}
