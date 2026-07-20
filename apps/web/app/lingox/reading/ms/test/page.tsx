export const dynamic = "force-dynamic";

import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import type { RPassage, RQuestion } from "@/models/reading";
import TestRunnerV2 from "@/components/reading/runner/TestRunnerV2";

type SearchParams = Promise<{ setId?: string }>;

type NaesinPassageRow = {
  id: string;
  title: string | null;
  text: string;
  order_index: number | null;
};

type NaesinQuestionRow = {
  id: string;
  passage_id: string;
  number_label: string | null;
  order_index: number | null;
  type: string;
  stem: string;
  answer_key: any;
  explanation: string | null;
};

type NaesinChoiceRow = {
  id: string;
  question_id: string;
  order_index: number | null;
  label: string | null;
  text: string;
  is_correct: boolean | null;
};

type NaesinEvidenceRow = {
  question_id: string;
  order_index: number | null;
  quote: string | null;
};

export default async function Page({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const sp = await searchParams;
  const setId = typeof sp?.setId === "string" ? sp.setId.trim() : "";

  if (!setId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          setId가 없습니다. 내신 세트를 선택해서 다시 시작하세요.
        </div>
      </div>
    );
  }

  try {
    const supabase = await getServerSupabase();

    const { data: setRow, error: setError } = await supabase
      .from("naesin_reading_sets")
      .select("id, title")
      .eq("id", setId)
      .single();

    if (setError || !setRow) {
      throw new Error(setError?.message ?? "Naesin set not found");
    }

    const { data: passageRows, error: passageError } = await supabase
      .from("naesin_reading_passages")
      .select("id, title, text, order_index")
      .eq("set_id", setId)
      .order("order_index", { ascending: true });

    if (passageError) throw passageError;

    const passages = (passageRows ?? []) as NaesinPassageRow[];
    const passageIds = passages.map((p) => p.id);

    if (passages.length === 0) {
      return (
        <div className="p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            내신 세트에는 passage가 없습니다.
          </div>
        </div>
      );
    }

    const { data: questionRows, error: questionError } = await supabase
      .from("naesin_reading_questions")
      .select(
        "id, passage_id, number_label, order_index, type, stem, answer_key, explanation",
      )
      .in("passage_id", passageIds)
      .order("order_index", { ascending: true });

    if (questionError) throw questionError;

    const questions = (questionRows ?? []) as NaesinQuestionRow[];
    const questionIds = questions.map((q) => q.id);

    const { data: choiceRows, error: choiceError } =
      questionIds.length > 0
        ? await supabase
          .from("naesin_reading_choices")
          .select("id, question_id, order_index, label, text, is_correct")
          .in("question_id", questionIds)
          .order("order_index", { ascending: true })
        : { data: [], error: null as any };

    if (choiceError) throw choiceError;

    const { data: evidenceRows, error: evidenceError } =
      questionIds.length > 0
        ? await supabase
          .from("naesin_reading_evidence")
          .select("question_id, order_index, quote")
          .in("question_id", questionIds)
          .order("order_index", { ascending: true })
        : { data: [], error: null as any };

    if (evidenceError) throw evidenceError;

    const choicesByQuestion = new Map<string, NaesinChoiceRow[]>();
    for (const row of (choiceRows ?? []) as NaesinChoiceRow[]) {
      const bucket = choicesByQuestion.get(row.question_id) ?? [];
      bucket.push(row);
      choicesByQuestion.set(row.question_id, bucket);
    }

    const evidenceByQuestion = new Map<string, NaesinEvidenceRow[]>();
    for (const row of (evidenceRows ?? []) as NaesinEvidenceRow[]) {
      const bucket = evidenceByQuestion.get(row.question_id) ?? [];
      bucket.push(row);
      evidenceByQuestion.set(row.question_id, bucket);
    }

    const questionsByPassage = new Map<string, NaesinQuestionRow[]>();
    for (const row of questions) {
      const bucket = questionsByPassage.get(row.passage_id) ?? [];
      bucket.push(row);
      questionsByPassage.set(row.passage_id, bucket);
    }

    const paragraphs = passages.flatMap((p, index) => {
      const header =
        passages.length > 1 ? [`[Passage ${index + 1}] ${p.title ?? ""}`.trim()] : [];
      const body = String(p.text ?? "")
        .split(/\r?\n\r?\n+/g)
        .map((chunk) => chunk.trim())
        .filter(Boolean);
      return [...header, ...body];
    });

    const runnerQuestions: RQuestion[] = passages.flatMap((p) => {
      const qs = (questionsByPassage.get(p.id) ?? []).sort(
        (a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
      );

      return qs.map((q, idx) => {
        const answerKey = q.answer_key ?? {};
        const clueQuote =
          (evidenceByQuestion.get(q.id) ?? [])
            .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))[0]
            ?.quote ?? undefined;

        const mappedChoices = ((choicesByQuestion.get(q.id) ?? []) as NaesinChoiceRow[])
          .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
          .map((choice) => ({
            id: choice.id,
            text: choice.text ?? "",
            isCorrect: Boolean(choice.is_correct),
          }));

        const mappedType = mapNaesinQuestionTypeToRunnerType(q.type, answerKey);

        const summaryMeta =
          answerKey?.kind === "multi_choice"
            ? {
              candidates: mappedChoices.map((choice) => choice.text),
              correct: mappedChoices.reduce<number[]>((acc, choice, index) => {
                if (choice.isCorrect) acc.push(index);
                return acc;
              }, []),
              selectionCount:
                Array.isArray(answerKey.choiceIds) && answerKey.choiceIds.length > 0
                  ? answerKey.choiceIds.length
                  : mappedChoices.filter((choice) => choice.isCorrect).length || 2,
            }
            : undefined;

        return {
          id: q.id,
          number: coerceQuestionNumber(q.number_label, idx + 1),
          stem: q.stem,
          type: mappedType,
          choices: mappedChoices,
          meta: {
            explanation: q.explanation ?? undefined,
            clue_quote: clueQuote,
            ...(summaryMeta ? { summary: summaryMeta } : {}),
          },
        } as RQuestion;
      });
    });

    const passage: RPassage = {
      id: setRow.id,
      title: setRow.title ?? "Naesin Reading",
      paragraphs,
      questions: runnerQuestions,
    };

    return (
      <div className="px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Lingo-X 내신 Reading
            </div>
            <h1 className="text-xl font-semibold text-neutral-900">
              {setRow.title ?? "Naesin Reading"}
            </h1>
          </div>

          <Link
            href="/admin/content/list"
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Back to List
          </Link>
        </div>

        <TestRunnerV2
          passage={passage}
          setId={setId}
          profileId="lingox_ms"
          backend="naesin"
          mode="test"
          finishRedirectPath="/lingox/reading/ms/review/:sessionId"
        />
      </div>
    );
  } catch (error: any) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          내신 Reading test 데이터를 불러오지 못했습니다.
          <div className="mt-2 text-xs text-red-600">
            {String(error?.message || error || "unknown error")}
          </div>
        </div>
      </div>
    );
  }
}

function mapNaesinQuestionTypeToRunnerType(
  type: string,
  answerKey: any,
): RQuestion["type"] {
  if (answerKey?.kind === "multi_choice") return "summary";

  switch (type) {
    case "vocab_in_context":
    case "phrase_meaning":
      return "vocab";
    case "detail":
    case "grammar_in_context":
      return "detail";
    case "not_true":
      return "negative_detail";
    case "inference":
      return "inference";
    case "purpose":
    case "main_idea":
    case "title":
    case "tone":
    case "author_claim":
      return "purpose";
    case "reference":
      return "pronoun_ref";
    case "blank":
    case "sentence_insertion":
      return "insertion";
    case "summary":
      return "summary";
    case "order":
    case "topic_sentence":
    case "matching":
    case "chart_interpretation":
      return "organization";
    default:
      return "detail";
  }
}

function coerceQuestionNumber(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number(String(value).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
