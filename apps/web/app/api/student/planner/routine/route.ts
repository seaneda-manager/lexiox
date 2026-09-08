export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getPlannerStudentContext } from "@/lib/planner/studentContext";

const TIME = /^\d{2}:\d{2}(:\d{2})?$/;

type SlotInput = {
  zone: "school" | "home";
  weekday: number;
  start_time: string;
  end_time: string;
  kind: string;
  label?: string | null;
};

function validSlot(s: unknown): s is SlotInput {
  if (!s || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return (
    (o.zone === "school" || o.zone === "home") &&
    typeof o.weekday === "number" &&
    o.weekday >= 0 &&
    o.weekday <= 6 &&
    typeof o.start_time === "string" &&
    TIME.test(o.start_time) &&
    typeof o.end_time === "string" &&
    TIME.test(o.end_time) &&
    o.start_time < o.end_time &&
    typeof o.kind === "string" &&
    o.kind.length > 0
  );
}

// GET — 주간 루틴 슬롯 전체
export async function GET() {
  const ctx = await getPlannerStudentContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceSupabase();
  const { data, error } = await db
    .from("student_routine_slots")
    .select("id, zone, weekday, start_time, end_time, kind, label")
    .eq("student_id", ctx.academyId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, routineSlots: data ?? [] });
}

// PUT — 주간 루틴 전체 교체 (요일 그리드 통째 저장)
export async function PUT(req: Request) {
  try {
    const ctx = await getPlannerStudentContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as { slots?: unknown };
    const slots = Array.isArray(body.slots) ? body.slots : [];
    if (!slots.every(validSlot)) {
      return NextResponse.json({ error: "잘못된 슬롯 형식" }, { status: 400 });
    }
    if (slots.length > 200) {
      return NextResponse.json({ error: "슬롯이 너무 많습니다" }, { status: 400 });
    }

    const db = getServiceSupabase();
    const { error: delErr } = await db
      .from("student_routine_slots")
      .delete()
      .eq("student_id", ctx.academyId);
    if (delErr) throw delErr;

    if (slots.length > 0) {
      const rows = (slots as SlotInput[]).map((s) => ({
        student_id: ctx.academyId,
        zone: s.zone,
        weekday: s.weekday,
        start_time: s.start_time,
        end_time: s.end_time,
        kind: s.kind,
        label: s.label ?? null,
      }));
      const { error: insErr } = await db.from("student_routine_slots").insert(rows);
      if (insErr) throw insErr;
    }

    const { data } = await db
      .from("student_routine_slots")
      .select("id, zone, weekday, start_time, end_time, kind, label")
      .eq("student_id", ctx.academyId)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true });

    return NextResponse.json({ ok: true, routineSlots: data ?? [] });
  } catch (e) {
    console.error("STUDENT PLANNER ROUTINE PUT", e);
    return NextResponse.json({ error: (e as Error)?.message ?? "error" }, { status: 500 });
  }
}
