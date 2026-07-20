import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const Choice = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(1),
  is_correct: z.boolean(),
  order_no: z.number().int().min(1).max(6),
});

const Question = z.object({
  id: z.string().optional(),
  number: z.number().int().min(1),
  stem: z.string().trim().min(1),
  choices: z
    .array(Choice)
    .min(2)
    .max(6)
    // ★ 멀티 정답 허용: 1~3개
    .refine((a) => {
      const k = a.filter((c) => c.is_correct).length;
      return k >= 1 && k <= 3;
    }, "The number of correct choices must be between 1 and 3.")
    // ★ order_no 연속성 체크
    .refine((a) => {
      const s = a.map((c) => c.order_no).sort((x, y) => x - y);
      return s.every((v, i) => v === i + 1);
    }, "order_no must be 1..N"),
});

const Payload = z.object({
  passage: z.object({
    id: z.string().optional(),
    set_id: z.string().optional(),
    title: z.string().trim().min(1),
    content: z.string().trim().min(1),
    questions: z.array(Question).min(1),
  }),
});

async function guardAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, status: 401 as const, error: "unauthorized" };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!me || me.role !== "admin")
    return { supabase, status: 403 as const, error: "forbidden" };

  return { supabase, status: 200 as const, error: null };
}

export async function POST(req: NextRequest) {
  const g = await guardAdmin();
  if (g.status !== 200)
    return NextResponse.json({ error: g.error }, { status: g.status });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = Payload.safeParse(json);
  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten();
    return NextResponse.json(
      {
        error:
          [...formErrors, ...Object.values(fieldErrors).flat()].join(" | ") ||
          "validation error",
      },
      { status: 400 }
    );
  }

  // RPC with order_no (fallback to legacy)
  let r = await g.supabase.rpc("save_reading_passage_full_with_order", {
    p_model: parsed.data.passage as any,
  });
  if (
    r.error &&
    /does not exist|unknown function|undefined function/i.test(r.error.message)
  ) {
    r = await g.supabase.rpc("save_reading_passage_full", {
      p_model: parsed.data.passage as any,
    });
  }
  if (r.error)
    return NextResponse.json({ error: r.error.message }, { status: 400 });

  return NextResponse.json({ ok: true, result: r.data }, { status: 201 });
}
