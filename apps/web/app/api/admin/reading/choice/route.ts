// File: apps/web/app/api/admin/reading/choice/route.ts
// UTF-8 (BOM 없음) 권장
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server"; // ← 헬퍼 통일
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 한 문제당 최대 보기 개수
 */
const MAX_CHOICES_PER_QUESTION = 6;

/**
 * Supabase 서버 클라이언트 + 관리자 가드
 */
async function guardAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error: uerr,
  } = await supabase.auth.getUser();
  if (uerr) return { supabase, status: 500 as const, error: uerr.message };
  if (!user) return { supabase, status: 401 as const, error: "unauthorized" };

  const { data: me, error: perr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (perr) return { supabase, status: 500 as const, error: perr.message };
  if (!me || me.role !== "admin") {
    // teacher 허용하려면 배열 포함 체크
    return { supabase, status: 403 as const, error: "forbidden" };
  }
  return { supabase, status: 200 as const, error: null };
}

/**
 * PATCH 바디 스키마 (부분 업데이트 허용)
 * - 최소 한 개 필드(text, is_correct)가 있어야 함
 */
const PatchSchema = z
  .object({
    id: z.string().min(1), // uuid 문자열 가정
    question_id: z.string().min(1).optional(),
    text: z.string().trim().min(1, "text must not be empty").optional(),
    is_correct: z.boolean().optional(),
  })
  .refine((v) => v.text !== undefined || v.is_correct !== undefined, {
    message: "Provide at least one of text or is_correct",
    path: ["text"],
  });

/**
 * POST: 보기 생성 (단건 또는 다건)
 * - 단건: { question_id, text, is_correct? }
 * - 다건: { question_id, texts: string[] }
 * - 제약: 한 문제당 최대 6개까지 (MAX_CHOICES_PER_QUESTION)
 */
const PostOneSchema = z.object({
  question_id: z.string().min(1),
  text: z.string().trim().min(1),
  is_correct: z.boolean().optional(),
});
const PostManySchema = z.object({
  question_id: z.string().min(1),
  texts: z.array(z.string().trim().min(1)).min(1).max(MAX_CHOICES_PER_QUESTION),
});
const PostSchema = z.union([PostOneSchema, PostManySchema]);

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (g.status !== 200) {
    return NextResponse.json(
      { error: g.error ?? "forbidden" },
      { status: g.status }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 유니온 공통부
  const base = parsed.data;
  const questionId = base.question_id;

  // 현재 개수 조회
  const { count, error: cntErr } = await g.supabase
    .from("reading_choices")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);

  if (cntErr) {
    return NextResponse.json({ error: cntErr.message }, { status: 400 });
  }

  const current = count ?? 0;
  const incoming = "texts" in base ? base.texts.length : 1;

  if (current + incoming > MAX_CHOICES_PER_QUESTION) {
    return NextResponse.json(
      {
        error: `max ${MAX_CHOICES_PER_QUESTION} choices per question; current=${current}, incoming=${incoming}`,
      },
      { status: 409 }
    );
  }

  // Insert payload 구성 (단건 vs 다건 분리)
  let rows: { question_id: string; text: string; is_correct: boolean }[];

  if ("texts" in base) {
    // 여러 보기 한 번에 생성
    const many = base as z.infer<typeof PostManySchema>;
    rows = many.texts.map((t) => ({
      question_id: many.question_id,
      text: t.trim(),
      is_correct: false,
    }));
  } else {
    // 단일 보기 생성
    const one = base as z.infer<typeof PostOneSchema>;
    rows = [
      {
        question_id: one.question_id,
        text: one.text.trim(),
        is_correct: one.is_correct ?? false,
      },
    ];
  }

  // is_correct=true가 존재하면 단일정답 유지 처리
  const hasCorrect = rows.some((r) => r.is_correct === true);
  if (hasCorrect) {
    const { error: clearErr } = await g.supabase
      .from("reading_choices")
      .update({ is_correct: false })
      .eq("question_id", questionId);

    if (clearErr) {
      return NextResponse.json({ error: clearErr.message }, { status: 400 });
    }
  }

  const { data: inserted, error: insErr } = await g.supabase
    .from("reading_choices")
    .insert(rows)
    .select("id");

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    ids: inserted?.map((r: any) => r.id) ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const g = await guardAdmin();
  if (g.status !== 200) {
    return NextResponse.json(
      { error: g.error ?? "forbidden" },
      { status: g.status }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, question_id: qidFromBody, text, is_correct } = parsed.data;

  // 1) 현재 choice 로드 (question_id 검증 및 후속 업데이트용)
  const { data: choice, error: fetchErr } = await g.supabase
    .from("reading_choices")
    .select("id, question_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr)
    return NextResponse.json({ error: fetchErr.message }, { status: 400 });
  if (!choice)
    return NextResponse.json({ error: "choice not found" }, { status: 404 });

  if (qidFromBody && qidFromBody !== choice.question_id) {
    return NextResponse.json(
      { error: "mismatched question_id" },
      { status: 400 }
    );
  }

  // 2) 정답 1개 규칙 처리
  if (is_correct === true) {
    const { error: clearErr } = await g.supabase
      .from("reading_choices")
      .update({ is_correct: false })
      .eq("question_id", choice.question_id)
      .neq("id", id); // ← 자기 자신 제외
    if (clearErr) {
      return NextResponse.json({ error: clearErr.message }, { status: 400 });
    }
  }

  // 3) 업데이트 페이로드 구성 (부분 업데이트)
  const payload: Record<string, unknown> = {};
  if (text !== undefined) payload.text = text.trim();
  if (is_correct !== undefined) payload.is_correct = is_correct;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }

  const { error: updateErr } = await g.supabase
    .from("reading_choices")
    .update(payload)
    .eq("id", id);

  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE: 보기 삭제
 * - 답안 테이블이 보기ID를 참조하지 않는 구조라면 바로 삭제
 * - 운영 정책상 제한이 필요하면 여기서 존재 여부 체크 후 409 등으로 응답
 */
const DeleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const g = await guardAdmin();
  if (g.status !== 200) {
    return NextResponse.json(
      { error: g.error ?? "forbidden" },
      { status: g.status }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = parsed.data;

  const { error } = await g.supabase
    .from("reading_choices")
    .delete()
    .eq("id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
