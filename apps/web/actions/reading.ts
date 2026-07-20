"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";
import { readingSetSchema } from "@/models/reading/zod";
import { z } from "zod";
import {
  toParagraphs,
  joinParagraphs,
  coerceIsCorrect,
  mergeExplanationMeta,
} from "@/lib/reading/normalize";

export type RSet = z.infer<typeof readingSetSchema>;

export type StartReadingArgs = {
  setId?: string;
  passageId?: string;
  mode?: "study" | "test" | "exam" | "practice" | "drill" | "review";
  product?: "toefl" | "lingox";
  track?: "ms" | "hs" | "junior";
  profileId?: string;
};

export type SubmitReadingArgs = {
  sessionId?: string | number;
  questionId: string;
  choiceId: string;
  passageId?: string;
  elapsedMs?: number;
};

export type FinishReadingArgs = { sessionId?: string | number };

/** ====== Content (Set/Passage/Q/A) ====== */
export async function upsertReadingSet(json: unknown) {
  const supabase = await getSupabaseServer();
  const parsed = readingSetSchema.parse(json);

  {
    const { error } = await supabase.from("reading_sets").upsert({
      id: parsed.id,
      label: parsed.label,
      source: parsed.source,
      version: parsed.version,
    });
    if (error) throw error;
  }

  {
    const { error } = await supabase
      .from("reading_passages")
      .delete()
      .eq("set_id", parsed.id);
    if (error) throw error;
  }

  const passageRows = parsed.passages.map((p, i) => ({
    id: p.id,
    set_id: parsed.id,
    title: p.title,
    content: joinParagraphs(p.paragraphs),
    ord: i + 1,
  }));
  const { error: pErr } = await supabase.from("reading_passages").insert(passageRows);
  if (pErr) throw pErr;

  const questionRows = parsed.passages.flatMap((p, _i) =>
    p.questions.map((q, j) => ({
      id: q.id,
      passage_id: p.id,
      number: q.number,
      type: q.type,
      stem: q.stem,
      meta: q.meta ?? {},
      explanation: (q.meta as any)?.explanation ?? null,
      ord: j + 1,
    })),
  );
  if (questionRows.length > 0) {
    const { error: qErr } = await supabase.from("reading_questions").insert(questionRows);
    if (qErr) throw qErr;
  }

  const choiceRows = parsed.passages.flatMap((p) =>
    p.questions.flatMap((q) =>
      (q.choices ?? []).map((c, k) => ({
        id: c.id,
        question_id: q.id,
        text: c.text,
        is_correct: !!c.isCorrect,
        explain: null,
        ord: k + 1,
      })),
    ),
  );
  if (choiceRows.length > 0) {
    const { error: cErr } = await supabase.from("reading_choices").insert(choiceRows);
    if (cErr) throw cErr;
  }

  return { ok: true } as const;
}

export async function loadReadingSet(setId: string): Promise<RSet | null> {
  const supabase = await getSupabaseServer();

  const { data: set, error: setErr } = await supabase
    .from("reading_sets")
    .select("*")
    .eq("id", setId)
    .single();
  if (setErr) throw setErr;

  const { data: passages, error: pErr } = await supabase
    .from("reading_passages")
    .select("*")
    .eq("set_id", setId)
    .order("ord", { ascending: true });
  if (pErr) throw pErr;

  if (!set || !passages) return null;

  const passageIds = passages.map((p) => p.id);

  const { data: allQuestions, error: qErr } = await supabase
    .from("reading_questions")
    .select("*")
    .in("passage_id", passageIds)
    .order("ord", { ascending: true });
  if (qErr) throw qErr;

  const questionIds = (allQuestions ?? []).map((q: any) => q.id);

  const { data: choices, error: choicesErr } =
    questionIds.length > 0
      ? await supabase
          .from("reading_choices")
          .select("*")
          .in("question_id", questionIds)
          .order("ord", { ascending: true })
      : { data: [] as any[], error: null };
  if (choicesErr) throw choicesErr;

  const choicesByQuestion = new Map<string, any[]>();
  for (const c of choices ?? []) {
    const key = String(c.question_id);
    if (!choicesByQuestion.has(key)) choicesByQuestion.set(key, []);
    choicesByQuestion.get(key)!.push(c);
  }

  const questionsByPassage = new Map<string, any[]>();
  for (const q of allQuestions ?? []) {
    const key = String(q.passage_id);
    if (!questionsByPassage.has(key)) questionsByPassage.set(key, []);
    questionsByPassage.get(key)!.push(q);
  }

  const result: RSet = {
    id: set.id,
    label: set.label ?? "",
    source: set.source ?? "",
    version: set.version ?? 1,
    passages: passages.map((p) => ({
      id: String(p.id),
      title: p.title ?? "",
      paragraphs: toParagraphs(p.content),
      questions: (questionsByPassage.get(String(p.id)) ?? []).map((q: any) => ({
        id: String(q.id),
        number: q.number ?? 0,
        type: q.type,
        stem: q.stem ?? "",
        meta: mergeExplanationMeta(q?.meta, q?.explanation, undefined) ?? {},
        choices: (choicesByQuestion.get(String(q.id)) ?? []).map((c: any) => ({
          id: String(c.id),
          text: c.text ?? "",
          isCorrect: coerceIsCorrect(c.is_correct),
        })),
      })),
    })),
  };

  return result;
}

/** ====== Session Actions (REAL DB, SAFE) ====== */
function supaMsg(e: any): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (typeof e?.message === "string") return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export async function startReadingSession(args: StartReadingArgs) {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) return { ok: false, error: supaMsg(userErr) } as const;
    if (!user) return { ok: false, error: "Not authenticated" } as const;

    let setId = args.setId ?? null;
    let passageId = args.passageId ?? null;

    if (!passageId && setId) {
      const { data: p, error } = await supabase
        .from("reading_passages")
        .select("id")
        .eq("set_id", setId)
        .order("ord", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return { ok: false, error: supaMsg(error) } as const;
      if (!p?.id) return { ok: false, error: `No passage for setId=${setId}` } as const;

      passageId = String(p.id);
    }

    if (passageId && !setId) {
      const { data: p, error } = await supabase
        .from("reading_passages")
        .select("set_id")
        .eq("id", passageId)
        .maybeSingle();

      if (error) return { ok: false, error: supaMsg(error) } as const;
      setId = p?.set_id ? String(p.set_id) : null;
    }

    if (!passageId) {
      return { ok: false, error: "Missing passageId" } as const;
    }

    const { data, error } = await supabase
      .from("reading_sessions")
      .insert({
        user_id: user.id,
        set_id: setId,
        passage_id: passageId,
        mode: args.mode ?? "test",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) return { ok: false, error: supaMsg(error) } as const;
    return { ok: true, sessionId: String(data.id) } as const;
  } catch (e: any) {
    return { ok: false, error: supaMsg(e) } as const;
  }
}

export async function submitReadingAnswer(
  args: Omit<SubmitReadingArgs, "questionId" | "choiceId"> & {
    questionId: string | number;
    choiceId: string | number;
  },
) {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) return { ok: false, error: supaMsg(userErr) } as const;
    if (!user) return { ok: false, error: "Not authenticated" } as const;

    const sessionId = args.sessionId == null ? "" : String(args.sessionId);
    if (!sessionId) return { ok: true } as const;

    const questionId = String(args.questionId);
    const raw = String(args.choiceId);

    const parts = raw.includes("|")
      ? raw.split("|").map((s) => s.trim()).filter(Boolean)
      : [raw];

    const choiceId = parts[0];

    const payload: any = {
      session_id: sessionId,
      question_id: questionId,
      passage_id: args.passageId ?? null,
      choice_id: choiceId,
      choice_ids: parts.length > 1 ? parts : null,
      elapsed_ms: typeof args.elapsedMs === "number" ? args.elapsedMs : null,
    };

    const { error } = await supabase
      .from("reading_answers")
      .upsert(payload, { onConflict: "session_id,question_id" });

    if (error) return { ok: false, error: supaMsg(error) } as const;
    return { ok: true } as const;
  } catch (e: any) {
    return { ok: false, error: supaMsg(e) } as const;
  }
}

export async function finishReadingSession(arg: FinishReadingArgs | string | number) {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) return { ok: false, error: supaMsg(userErr) } as const;
    if (!user) return { ok: false, error: "Not authenticated" } as const;

    const sessionId =
      typeof arg === "string" || typeof arg === "number"
        ? String(arg)
        : arg.sessionId
          ? String(arg.sessionId)
          : "";

    if (!sessionId) return { ok: true, sessionId: "" } as const;

    const { error } = await supabase
      .from("reading_sessions")
      .update({ finished_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (error) return { ok: false, error: supaMsg(error), sessionId } as const;
    return { ok: true, sessionId } as const;
  } catch (e: any) {
    return { ok: false, error: supaMsg(e), sessionId: "" } as const;
  }
}