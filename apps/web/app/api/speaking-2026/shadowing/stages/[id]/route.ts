// app/api/speaking-2026/shadowing/stages/[id]/route.ts
// 쉐도잉 게임 스테이지 상세 — listen_repeat task(이미지+region 문장들)만 추출해서 반환
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadShadowingStage } from "@/lib/speaking-2026/shadowingStage";

export const dynamic = "force-dynamic";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    const stage = await loadShadowingStage(service, id);

    if (!stage) {
      return NextResponse.json({ ok: false, error: "Stage not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, stage });
  } catch (error) {
    console.error("[speaking-2026.shadowing.stages.id] error", error);
    return NextResponse.json({ ok: false, error: "Failed to load stage." }, { status: 500 });
  }
}
