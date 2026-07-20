import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAndRole } from "@/lib/authServer";
import { getServerSupabase } from "@/lib/supabase/server";
import type { NaesinReadingCreatePayload } from "@/lib/reading/naesin-payload";
import ReadingEditorClient from "../[tab]/_client/ReadingEditorClient";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  setId?: string | string[];
}>;

type ServerSupabase = Awaited<ReturnType<typeof getServerSupabase>>;

export default async function AdminContentNewJsonPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const { session, role } = await getSessionAndRole();

  const sp = await searchParams;
  const rawSetId = sp?.setId;
  const setId = Array.isArray(rawSetId) ? rawSetId[0] : rawSetId;

  if (!session) {
    redirect(
      `/auth/login?next=${encodeURIComponent(
        setId ? `/admin/content/new/json?setId=${setId}` : "/admin/content/new/json",
      )}`,
    );
  }

  if (role !== "admin") {
    if (role === "teacher") redirect("/home/teacher");
    redirect("/home/student");
  }

  const supabase = await getServerSupabase();

  let initialPayload: NaesinReadingCreatePayload | undefined;
  let loadError: string | null = null;

  if (setId) {
    try {
      initialPayload = await loadNaesinPayloadBySetId(supabase, setId);
    } catch (error) {
      loadError =
        error instanceof Error ? error.message : "Failed to load Naesin set";
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          New Content — Naesin Reading JSON Editor
        </h1>

        <div className="flex items-center gap-2">
          <Link
            href="/reading/admin"
            className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Legacy advanced reading editor"
          >
            Legacy Reading Admin
          </Link>
        </div>
      </header>

      <nav className="flex items-center gap-3 text-sm">
        <Link href="/reading/admin" className="text-gray-600 hover:underline">
          Legacy Manual Editor
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href="/admin/content/new/json"
          className="font-semibold underline"
        >
          Naesin JSON Editor
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href="/admin/content/list"
          className="text-gray-600 hover:underline"
        >
          Content List
        </Link>
      </nav>

      <section className="space-y-3 rounded border p-4">
        <p className="text-sm text-gray-700">
          Paste a Naesin Reading payload JSON and save it directly into the
          <code className="ml-1">naesin_reading_*</code> tables.
        </p>

        <ReadingEditorClient
          initialPayload={initialPayload}
          initialSetId={setId}
          loadError={loadError}
        />
      </section>
    </div>
  );
}

async function loadNaesinPayloadBySetId(
  supabase: ServerSupabase,
  setId: string,
): Promise<NaesinReadingCreatePayload> {
  const { data: setRow, error: setError } = await supabase
    .from("naesin_reading_sets")
    .select(
      `
      id,
      title,
      subtitle,
      curriculum_id,
      source_type,
      exam_context,
      grade_band,
      difficulty,
      school_name,
      semester,
      book_name,
      unit_range,
      estimated_minutes,
      tags,
      is_published,
      metadata
    `,
    )
    .eq("id", setId)
    .single();

  if (setError || !setRow) {
    throw new Error(setError?.message ?? "Naesin set not found");
  }

  const { data: passageRows, error: passageError } = await supabase
    .from("naesin_reading_passages")
    .select(
      `
      id,
      order_index,
      title,
      source_type,
      exam_context,
      grade_band,
      difficulty,
      genre,
      text,
      translation_ko,
      summary,
      vocab_focus,
      grammar_focus,
      tags,
      metadata
    `,
    )
    .eq("set_id", setId)
    .order("order_index", { ascending: true });

  if (passageError) {
    throw new Error(passageError.message);
  }

  const passages = (passageRows ?? []) as any[];
  const passageIds = passages.map((p) => p.id as string);

  const { data: questionRows, error: questionError } =
    passageIds.length > 0
      ? await supabase
        .from("naesin_reading_questions")
        .select(
          `
            id,
            passage_id,
            order_index,
            number_label,
            type,
            stem,
            prompt_ko,
            answer_key,
            explanation,
            skill_tags,
            vocab_tags,
            grammar_tags,
            logic_tags,
            difficulty,
            score,
            metadata
          `,
        )
        .in("passage_id", passageIds)
        .order("order_index", { ascending: true })
      : { data: [], error: null };

  if (questionError) {
    throw new Error(questionError.message);
  }

  const questions = (questionRows ?? []) as any[];
  const questionIds = questions.map((q) => q.id as string);

  const { data: choiceRows, error: choiceError } =
    questionIds.length > 0
      ? await supabase
        .from("naesin_reading_choices")
        .select(
          `
            id,
            question_id,
            order_index,
            label,
            text,
            is_correct
          `,
        )
        .in("question_id", questionIds)
        .order("order_index", { ascending: true })
      : { data: [], error: null };

  if (choiceError) {
    throw new Error(choiceError.message);
  }

  const { data: evidenceRows, error: evidenceError } =
    questionIds.length > 0
      ? await supabase
        .from("naesin_reading_evidence")
        .select(
          `
            id,
            question_id,
            order_index,
            type,
            quote,
            start_offset,
            end_offset,
            paragraph_label,
            note
          `,
        )
        .in("question_id", questionIds)
        .order("order_index", { ascending: true })
      : { data: [], error: null };

  if (evidenceError) {
    throw new Error(evidenceError.message);
  }

  const choicesByQuestion = new Map<string, any[]>();
  for (const row of (choiceRows ?? []) as any[]) {
    const key = row.question_id as string;
    const bucket = choicesByQuestion.get(key) ?? [];
    bucket.push(row);
    choicesByQuestion.set(key, bucket);
  }

  const evidenceByQuestion = new Map<string, any[]>();
  for (const row of (evidenceRows ?? []) as any[]) {
    const key = row.question_id as string;
    const bucket = evidenceByQuestion.get(key) ?? [];
    bucket.push(row);
    evidenceByQuestion.set(key, bucket);
  }

  const questionsByPassage = new Map<string, any[]>();
  for (const row of questions) {
    const key = row.passage_id as string;
    const bucket = questionsByPassage.get(key) ?? [];
    bucket.push(row);
    questionsByPassage.set(key, bucket);
  }

  return {
    set: {
      title: setRow.title,
      subtitle: setRow.subtitle ?? undefined,
      curriculumId: setRow.curriculum_id ?? undefined,
      sourceType: setRow.source_type,
      examContext: setRow.exam_context,
      gradeBand: setRow.grade_band,
      difficulty: setRow.difficulty,
      schoolName: setRow.school_name ?? undefined,
      semester: setRow.semester ?? undefined,
      bookName: setRow.book_name ?? undefined,
      unitRange: setRow.unit_range ?? undefined,
      estimatedMinutes: setRow.estimated_minutes ?? undefined,
      tags: Array.isArray(setRow.tags) ? setRow.tags : [],
      isPublished: Boolean(setRow.is_published),
      metadata:
        setRow.metadata && typeof setRow.metadata === "object"
          ? setRow.metadata
          : {},
    },
    passages: passages.map((passage) => {
      const passageQuestions = (questionsByPassage.get(passage.id) ?? []).sort(
        (a, b) => Number(a.order_index) - Number(b.order_index),
      );

      return {
        passage: {
          orderIndex: Number(passage.order_index ?? 0),
          title: passage.title ?? undefined,
          sourceType: passage.source_type,
          examContext: passage.exam_context,
          gradeBand: passage.grade_band,
          difficulty: passage.difficulty,
          genre: passage.genre,
          text: passage.text,
          translationKo: passage.translation_ko ?? undefined,
          summary: passage.summary ?? undefined,
          vocabFocus: Array.isArray(passage.vocab_focus)
            ? passage.vocab_focus
            : [],
          grammarFocus: Array.isArray(passage.grammar_focus)
            ? passage.grammar_focus
            : [],
          tags: Array.isArray(passage.tags) ? passage.tags : [],
          metadata:
            passage.metadata && typeof passage.metadata === "object"
              ? passage.metadata
              : {},
        },
        questions: passageQuestions.map((question) => ({
          orderIndex: Number(question.order_index ?? 0),
          numberLabel: question.number_label,
          type: question.type,
          stem: question.stem,
          promptKo: question.prompt_ko ?? undefined,
          choices: ((choicesByQuestion.get(question.id) ?? []) as any[])
            .sort((a, b) => Number(a.order_index) - Number(b.order_index))
            .map((choice) => ({
              id: choice.id,
              label: choice.label,
              text: choice.text,
              isCorrect:
                typeof choice.is_correct === "boolean"
                  ? choice.is_correct
                  : undefined,
            })),
          answer: question.answer_key,
          evidence: ((evidenceByQuestion.get(question.id) ?? []) as any[])
            .sort((a, b) => Number(a.order_index) - Number(b.order_index))
            .map((evidence) => ({
              orderIndex: Number(evidence.order_index ?? 0),
              type: evidence.type,
              quote: evidence.quote ?? undefined,
              startOffset:
                typeof evidence.start_offset === "number"
                  ? evidence.start_offset
                  : undefined,
              endOffset:
                typeof evidence.end_offset === "number"
                  ? evidence.end_offset
                  : undefined,
              paragraphLabel: evidence.paragraph_label ?? undefined,
              note: evidence.note ?? undefined,
            })),
          explanation: question.explanation ?? undefined,
          skillTags: Array.isArray(question.skill_tags) ? question.skill_tags : [],
          vocabTags: Array.isArray(question.vocab_tags) ? question.vocab_tags : [],
          grammarTags: Array.isArray(question.grammar_tags)
            ? question.grammar_tags
            : [],
          logicTags: Array.isArray(question.logic_tags) ? question.logic_tags : [],
          difficulty: question.difficulty ?? undefined,
          score:
            typeof question.score === "number" ? question.score : Number(question.score ?? 1),
          metadata:
            question.metadata && typeof question.metadata === "object"
              ? question.metadata
              : {},
        })),
      };
    }),
  };
}
