import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Choice (A~F) - order_no 1..6, 연속성은 QuestionSchema에서 추가검증 */
const ChoiceSchema = z.object({
  id: z.string().optional(), // 신규면 없음
  text: z.string().trim().min(1),
  is_correct: z.boolean(),
  order_no: z.number().int().min(1).max(6),
});

const QuestionSchema = z.object({
  id: z.string().optional(),
  number: z.number().int().min(1),
  stem: z.string().trim().min(1),
  choices: z
    .array(ChoiceSchema)
    .min(2, "At least 2 choices are required")
    .max(6, "At most 6 choices are allowed")
    // ✅ 정답 1~3개 허용
    .refine((arr) => {
      const n = arr.filter((c) => c.is_correct).length;
      return n >= 1 && n <= 3;
    }, "The number of correct answers must be between 1 and 3")
    .refine((arr) => {
      const ords = arr.map((c) => c.order_no).sort((a, b) => a - b);
      for (let i = 0; i < ords.length; i++) if (ords[i] !== i + 1) return false;
      return true;
    }, "order_no must be 1..N with no gaps"),
});

const PayloadSchema = z.object({
  passage: z.object({
    id: z.string().optional(), // 신규면 없음
    set_id: z.string().optional(), // 세트로 묶을 때 사용 (없어도 OK)
    title: z.string().trim().min(1),
    content: z.string().trim().min(1),
    questions: z.array(QuestionSchema).min(1),
  }),
});

async function guardTeacherOrAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return { supabase, status: 500 as const, error: error.message };
  if (!user) return { supabase, status: 401 as const, error: "unauthorized" };

  const { data: me, error: perr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (perr) return { supabase, status: 500 as const, error: perr.message };
  if (!me || !["admin", "teacher"].includes((me as any).role)) {
    return { supabase, status: 403 as const, error: "forbidden" };
  }
  return { supabase, status: 200 as const, error: null };
}

export async function POST(req: NextRequest) {
  const g = await guardTeacherOrAdmin();
  if (g.status !== 200) {
    return NextResponse.json({ error: g.error }, { status: g.status });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data.passage;

  // 권장: 트랜잭션 RPC 호출
  // 1순위: order_no 포함 버전
  let rpc = await g.supabase.rpc("save_reading_passage_full_with_order", {
    p_model: payload as any,
  });

  // 함수가 아직 없을 경우(마이그레이션 전), 구버전으로 폴백
  if (
    rpc.error &&
    /does not exist|undefined function|unknown function/i.test(
      rpc.error.message
    )
  ) {
    rpc = await g.supabase.rpc("save_reading_passage_full", {
      p_model: payload as any,
    });
  }

  if (rpc.error) {
    return NextResponse.json({ error: rpc.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result: rpc.data });
}
