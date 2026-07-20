// apps/web/app/api/admin/updated-reading/save/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import type { RReadingTest2026 } from "@/models/reading";

type SaveBody = {
  test: RReadingTest2026;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SaveBody;

    if (!body?.test) {
      return NextResponse.json(
        { ok: false, error: "Missing test payload" },
        { status: 400 }
      );
    }

    const test = body.test;

    const supabase = await getServerSupabase();

    // -------- SAVE LOGIC --------
    // test.meta.id 존재 여부 체크 → update/insert 분기
    const exists = await supabase
      .from("reading_tests_2026")
      .select("id")
      .eq("id", test.meta.id)
      .maybeSingle();

    let error = null;

    if (exists.data) {
      // Lock 체크
      const { data: lockRow } = await supabase
        .from("reading_tests_2026")
        .select("is_locked")
        .eq("id", test.meta.id)
        .single();
      if ((lockRow as any)?.is_locked) {
        return NextResponse.json({ ok: false, error: "이 시험은 Lock되어 수정할 수 없습니다." }, { status: 403 });
      }

      // UPDATE
      const { error: updateErr } = await supabase
        .from("reading_tests_2026")
        .update({
          label: test.meta.label,
          exam_era: test.meta.examEra,
          payload: test,
          updated_at: new Date().toISOString(),
        })
        .eq("id", test.meta.id);

      error = updateErr;
    } else {
      // INSERT
      const { error: insertErr } = await supabase
        .from("reading_tests_2026")
        .insert({
          id: test.meta.id,
          label: test.meta.label,
          exam_era: test.meta.examEra,
          payload: test,
          updated_at: new Date().toISOString(),
        });

      error = insertErr;
    }

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown server error" },
      { status: 500 }
    );
  }
}
