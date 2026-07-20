import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import NaesinReviewClient, {
  type NaesinReviewData,
  type NaesinReviewInitialState,
  type NaesinReviewPassage,
  type NaesinReviewQuestion,
  type SentenceAnalysisState,
} from "@/components/reading/review/NaesinReviewClient";
import type { UILabelCatalogItem } from "@/models/platform/labels";
import { makeUILabelCatalogMap } from "@/lib/labels/resolveLabel";

export const dynamic = "force-dynamic";

type Params = Promise<{ sessionId: string }>;

type SessionRow = {
  id: string;
  set_id: string;
  student_id: string;
  score_raw: number | null;
  score_percent: number | null;
  submitted_at: string | null;
  analytics_snapshot: Record<string, unknown> | null;
};

type SessionSnapshotRow = {
  session_id: string;
  student_id: string;
  set_id: string;
  accuracy_overall: number | null;
  score_percent: number | null;
  by_question_type: Record<string, unknown> | null;
  by_passage: Record<string, unknown> | null;
  evidence_metrics: Record<string, unknown> | null;
  vocab_metrics: Record<string, unknown> | null;
  sentence_metrics: Record<string, unknown> | null;
  behavior_metrics: Record<string, unknown> | null;
  weak_tags: string[] | null;
  prescriptions: string[] | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type StudentTendencySnapshotRow = {
  student_id: string;
  window_size: number;
  basis_session_ids: string[] | null;
  weak_tags: string[] | null;
  top_patterns: Record<string, unknown> | null;
  prescription_tags: string[] | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type SetRow = { id: string; title: string | null };

type PassageRow = {
  id: string;
  title: string | null;
  text: string;
  order_index: number | null;
};

type QuestionRow = {
  id: string;
  set_id: string;
  passage_id: string;
  number_label: string | null;
  order_index: number | null;
  type: string;
  stem: string;
  explanation: string | null;
  answer_key: any;
};

type ChoiceRow = {
  id: string;
  question_id: string;
  order_index: number | null;
  label: string | null;
  text: string;
  is_correct: boolean | null;
};

type AnswerRow = {
  question_id: string;
  selected_choice_id: string | null;
  selected_choice_ids: string[] | null;
  is_correct: boolean;
};

type EvidenceRow = {
  question_id: string;
  order_index: number | null;
  quote: string | null;
};

type EvidenceLogRow = {
  question_id: string;
  selected_evidence: string[] | null;
};

type UnknownWordLogRow = {
  passage_id: string;
  words: string[] | null;
};

type SentenceAnalysisLogRow = {
  question_id: string;
  translation_ko: string | null;
  subject_text: string | null;
  verb_text: string | null;
  object_text: string | null;
  complement_text: string | null;
  modifier_text: string | null;
};

type VocabLogRow = {
  passage_id: string;
  word: string;
  user_answer: string | null;
  is_correct: boolean | null;
  attempt_no: number | null;
};

export default async function Page({ params }: { params: Params }) {
  const { sessionId } = await params;
  const supabase = await getServerSupabase();

  try {
    const { data: sessionRow, error: sessionError } = await supabase
      .from("naesin_reading_sessions")
      .select(
        "id, set_id, student_id, score_raw, score_percent, submitted_at, analytics_snapshot",
      )
      .eq("id", sessionId)
      .single();

    if (sessionError || !sessionRow) {
      throw new Error(sessionError?.message ?? "Session not found");
    }

    const session = sessionRow as SessionRow;

 const [
  setRes,
  passageRes,
  sessionSnapshotRes,
  tendency5Res,
  tendency10Res,
  labelRes,
] = await Promise.all([
  supabase
    .from("naesin_reading_sets")
    .select("id, title")
    .eq("id", session.set_id)
    .single(),

  supabase
    .from("naesin_reading_passages")
    .select("id, title, text, order_index")
    .eq("set_id", session.set_id)
    .order("order_index", { ascending: true }),

  supabase
    .from("naesin_reading_session_analysis_snapshots")
    .select(
      "session_id, student_id, set_id, accuracy_overall, score_percent, by_question_type, by_passage, evidence_metrics, vocab_metrics, sentence_metrics, behavior_metrics, weak_tags, prescriptions, updated_at, created_at",
    )
    .eq("session_id", sessionId)
    .maybeSingle(),

  supabase
    .from("naesin_reading_student_tendency_snapshots")
    .select(
      "student_id, window_size, basis_session_ids, weak_tags, top_patterns, prescription_tags, updated_at, created_at",
    )
    .eq("student_id", session.student_id)
    .eq("window_size", 5)
    .maybeSingle(),

  supabase
    .from("naesin_reading_student_tendency_snapshots")
    .select(
      "student_id, window_size, basis_session_ids, weak_tags, top_patterns, prescription_tags, updated_at, created_at",
    )
    .eq("student_id", session.student_id)
    .eq("window_size", 10)
    .maybeSingle(),

  supabase
    .from("ui_label_catalog")
    .select("*")
    .eq("is_active", true)
    .eq("track", "naesin")
    .eq("section", "reading")
    .in("domain", ["weak_tag", "analytics_metric", "review_tab"])
    .order("sort_order", { ascending: true }),
]);

    if (setRes.error || !setRes.data) {
      throw new Error(setRes.error?.message ?? "Set not found");
    }
    if (passageRes.error) throw passageRes.error;
    if (sessionSnapshotRes.error) throw sessionSnapshotRes.error;
    if (tendency5Res.error) throw tendency5Res.error;
    if (tendency10Res.error) throw tendency10Res.error;
    if (labelRes.error) throw labelRes.error;
    
    const readingSet = setRes.data as SetRow;
    const passages = (passageRes.data ?? []) as PassageRow[];
    const sessionSnapshot = (sessionSnapshotRes.data ??
      null) as SessionSnapshotRow | null;
    const tendency5 = (tendency5Res.data ?? null) as StudentTendencySnapshotRow | null;
    const tendency10 = (tendency10Res.data ??
      null) as StudentTendencySnapshotRow | null;

const labelCatalogRows = (labelRes.data ?? []) as any[];

const labelCatalogMap = makeUILabelCatalogMap(
  labelCatalogRows.map((row) => ({
    id: String(row.id),
    domain: row.domain,
    key: row.key,
    track: row.track ?? null,
    section: row.section ?? null,
    schoolLevel: row.school_level ?? null,
    audience: row.audience ?? null,
    labelKo: row.label_ko,
    labelEn: row.label_en ?? null,
    shortDescriptionKo: row.short_description_ko ?? null,
    longDescriptionKo: row.long_description_ko ?? null,
    studentMessageKo: row.student_message_ko ?? null,
    parentMessageKo: row.parent_message_ko ?? null,
    teacherMessageKo: row.teacher_message_ko ?? null,
    sortOrder: Number(row.sort_order ?? 100),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  })) as UILabelCatalogItem[],
);

    const passageIds = passages.map((p) => p.id);

    const { data: questionRows, error: questionError } =
      passageIds.length > 0
        ? await supabase
            .from("naesin_reading_questions")
            .select(
              "id, set_id, passage_id, number_label, order_index, type, stem, explanation, answer_key",
            )
            .in("passage_id", passageIds)
            .order("order_index", { ascending: true })
        : { data: [], error: null as any };

    if (questionError) throw questionError;

    const questions = (questionRows ?? []) as QuestionRow[];
    const questionIds = questions.map((q) => q.id);

    const [
      choiceRes,
      answerRes,
      evidenceRes,
      evidenceLogRes,
      unknownWordLogRes,
      sentenceAnalysisLogRes,
      vocabLogRes,
    ] = await Promise.all([
      questionIds.length > 0
        ? supabase
            .from("naesin_reading_choices")
            .select("id, question_id, order_index, label, text, is_correct")
            .in("question_id", questionIds)
            .order("order_index", { ascending: true })
        : Promise.resolve({ data: [], error: null as any }),

      questionIds.length > 0
        ? supabase
            .from("naesin_reading_answers")
            .select("question_id, selected_choice_id, selected_choice_ids, is_correct")
            .eq("session_id", sessionId)
        : Promise.resolve({ data: [], error: null as any }),

      questionIds.length > 0
        ? supabase
            .from("naesin_reading_evidence")
            .select("question_id, order_index, quote")
            .in("question_id", questionIds)
            .order("order_index", { ascending: true })
        : Promise.resolve({ data: [], error: null as any }),

      questionIds.length > 0
        ? supabase
            .from("naesin_reading_review_evidence_logs")
            .select("question_id, selected_evidence")
            .eq("session_id", sessionId)
        : Promise.resolve({ data: [], error: null as any }),

      passageIds.length > 0
        ? supabase
            .from("naesin_reading_review_unknown_word_logs")
            .select("passage_id, words")
            .eq("session_id", sessionId)
        : Promise.resolve({ data: [], error: null as any }),

      questionIds.length > 0
        ? supabase
            .from("naesin_reading_review_sentence_analysis_logs")
            .select(
              "question_id, translation_ko, subject_text, verb_text, object_text, complement_text, modifier_text",
            )
            .eq("session_id", sessionId)
        : Promise.resolve({ data: [], error: null as any }),

      passageIds.length > 0
        ? supabase
            .from("naesin_reading_review_vocab_logs")
            .select("passage_id, word, user_answer, is_correct, attempt_no")
            .eq("session_id", sessionId)
            .order("attempt_no", { ascending: false })
        : Promise.resolve({ data: [], error: null as any }),
    ]);

    if (choiceRes.error) throw choiceRes.error;
    if (answerRes.error) throw answerRes.error;
    if (evidenceRes.error) throw evidenceRes.error;
    if (evidenceLogRes.error) throw evidenceLogRes.error;
    if (unknownWordLogRes.error) throw unknownWordLogRes.error;
    if (sentenceAnalysisLogRes.error) throw sentenceAnalysisLogRes.error;
    if (vocabLogRes.error) throw vocabLogRes.error;

    const choicesByQuestion = new Map<string, ChoiceRow[]>();
    for (const row of (choiceRes.data ?? []) as ChoiceRow[]) {
      const bucket = choicesByQuestion.get(row.question_id) ?? [];
      bucket.push(row);
      choicesByQuestion.set(row.question_id, bucket);
    }

    const answersByQuestion = new Map<string, AnswerRow>();
    for (const row of (answerRes.data ?? []) as AnswerRow[]) {
      answersByQuestion.set(row.question_id, row);
    }

    const evidenceByQuestion = new Map<string, EvidenceRow[]>();
    for (const row of (evidenceRes.data ?? []) as EvidenceRow[]) {
      const bucket = evidenceByQuestion.get(row.question_id) ?? [];
      bucket.push(row);
      evidenceByQuestion.set(row.question_id, bucket);
    }

    const questionsByPassage = new Map<string, QuestionRow[]>();
    for (const row of questions) {
      const bucket = questionsByPassage.get(row.passage_id) ?? [];
      bucket.push(row);
      questionsByPassage.set(row.passage_id, bucket);
    }

    const reviewPassages: NaesinReviewPassage[] = passages.map((passage) => {
      const passageQuestions = (questionsByPassage.get(passage.id) ?? []).sort(
        (a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
      );

      const reviewQuestions: NaesinReviewQuestion[] = passageQuestions.map((question) => {
        const questionChoices = (choicesByQuestion.get(question.id) ?? []).sort(
          (a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
        );

        const answerRow = answersByQuestion.get(question.id);
        const selectedIds = buildSelectedChoiceIds(answerRow);
        const correctIds = extractCorrectChoiceIds(question.answer_key);

        return {
          id: question.id,
          passageId: passage.id,
          numberLabel: question.number_label ?? "",
          type: question.type,
          stem: question.stem,
          isCorrect: Boolean(answerRow?.is_correct),
          selectedChoiceTexts: questionChoices
            .filter((choice) => selectedIds.includes(choice.id))
            .map((choice) => choice.text ?? ""),
          correctChoiceTexts: questionChoices
            .filter((choice) => correctIds.includes(choice.id))
            .map((choice) => choice.text ?? ""),
          explanation: question.explanation ?? undefined,
          officialEvidence: ((evidenceByQuestion.get(question.id) ?? []) as EvidenceRow[])
            .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
            .map((row) => row.quote ?? "")
            .filter(Boolean),
        };
      });

      return {
        id: passage.id,
        title: passage.title ?? `Passage ${Number(passage.order_index ?? 0) + 1}`,
        text: passage.text,
        questions: reviewQuestions,
      };
    });

    const initialState: NaesinReviewInitialState = {
      evidenceByQuestion: Object.fromEntries(
        ((evidenceLogRes.data ?? []) as EvidenceLogRow[]).map((row) => [
          row.question_id,
          row.selected_evidence ?? [],
        ]),
      ),
      unknownWordsByPassage: Object.fromEntries(
        ((unknownWordLogRes.data ?? []) as UnknownWordLogRow[]).map((row) => [
          row.passage_id,
          row.words ?? [],
        ]),
      ),
      analysisByQuestion: Object.fromEntries(
        ((sentenceAnalysisLogRes.data ?? []) as SentenceAnalysisLogRow[]).map((row) => [
          row.question_id,
          {
            translation: row.translation_ko ?? undefined,
            subject: row.subject_text ?? undefined,
            verb: row.verb_text ?? undefined,
            object: row.object_text ?? undefined,
            complement: row.complement_text ?? undefined,
            modifier: row.modifier_text ?? undefined,
          } satisfies SentenceAnalysisState,
        ]),
      ),
      vocabByKey: buildVocabByKey((vocabLogRes.data ?? []) as VocabLogRow[]),
    };

    const mergedAnalyticsSnapshot = buildMergedAnalyticsSnapshot(
      session.analytics_snapshot,
      sessionSnapshot,
      tendency5,
      tendency10,
    );

    const reviewData: NaesinReviewData = {
      sessionId,
  setId: session.set_id,
  setTitle: readingSet.title ?? "Naesin Reading",
  scoreRaw: session.score_raw,
  scorePercent: session.score_percent,
  submittedAt: session.submitted_at,
  analyticsSnapshot: mergedAnalyticsSnapshot,
  labelCatalog: labelCatalogMap,
  passages: reviewPassages,
};

    return (
      <div className="px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Lingo-X Naesin Review
            </div>
            <h1 className="text-xl font-semibold text-neutral-900">
              {readingSet.title ?? "Naesin Review"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/lingox/reading/ms/test?setId=${encodeURIComponent(session.set_id)}`}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            >
              Retry Test
            </Link>

            <Link
              href="/admin/content"
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            >
              Back to List
            </Link>
          </div>
        </div>

        <NaesinReviewClient data={reviewData} initialState={initialState} />
      </div>
    );
  } catch (error: any) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          내신 review 데이터를 불러오지 못했습니다.
          <div className="mt-2 text-xs text-red-600">
            {String(error?.message || error || "unknown error")}
          </div>
        </div>
      </div>
    );
  }
}

function buildSelectedChoiceIds(answer?: AnswerRow): string[] {
  if (!answer) return [];

  const many = Array.isArray(answer.selected_choice_ids)
    ? answer.selected_choice_ids.map(String)
    : [];

  const single =
    typeof answer.selected_choice_id === "string" && answer.selected_choice_id
      ? [String(answer.selected_choice_id)]
      : [];

  return [...new Set([...many, ...single])];
}

function extractCorrectChoiceIds(answerKey: any): string[] {
  if (!answerKey || typeof answerKey !== "object" || !("kind" in answerKey)) {
    return [];
  }

  switch (answerKey.kind) {
    case "single_choice":
      return typeof answerKey.choiceId === "string" ? [answerKey.choiceId] : [];
    case "multi_choice":
      return Array.isArray(answerKey.choiceIds)
        ? answerKey.choiceIds.map(String)
        : [];
    default:
      return [];
  }
}

function buildVocabByKey(rows: VocabLogRow[]) {
  const map: Record<
    string,
    { userAnswer?: string; isCorrect: boolean; attemptNo: number }
  > = {};

  for (const row of rows) {
    const passageId = String(row.passage_id ?? "").trim();
    const word = String(row.word ?? "").trim().toLowerCase();
    if (!passageId || !word) continue;

    const key = `${passageId}::${word}`;
    if (map[key]) continue;

    map[key] = {
      userAnswer: row.user_answer ?? undefined,
      isCorrect: Boolean(row.is_correct),
      attemptNo: Math.max(1, Number(row.attempt_no ?? 1)),
    };
  }

  return map;
}

function buildMergedAnalyticsSnapshot(
  sessionAnalytics: Record<string, unknown> | null,
  sessionSnapshot: SessionSnapshotRow | null,
  tendency5: StudentTendencySnapshotRow | null,
  tendency10: StudentTendencySnapshotRow | null,
): Record<string, unknown> | null {
  const base = asRecord(sessionAnalytics);

  const merged = {
    accuracyOverall:
      getNumberField(base, "accuracyOverall") ?? sessionSnapshot?.accuracy_overall ?? null,

    scorePercent:
      getNumberField(base, "scorePercent") ?? sessionSnapshot?.score_percent ?? null,

    weakTags:
      getStringArrayField(base, "weakTags") ??
      sessionSnapshot?.weak_tags ??
      [],

    prescriptions:
      getStringArrayField(base, "prescriptions") ??
      sessionSnapshot?.prescriptions ??
      [],

    evidenceMetrics:
      getRecordField(base, "evidenceMetrics") ??
      sessionSnapshot?.evidence_metrics ??
      null,

    vocabMetrics:
      getRecordField(base, "vocabMetrics") ??
      sessionSnapshot?.vocab_metrics ??
      null,

    sentenceMetrics:
      getRecordField(base, "sentenceMetrics") ??
      sessionSnapshot?.sentence_metrics ??
      null,

    behaviorMetrics:
      getRecordField(base, "behaviorMetrics") ??
      sessionSnapshot?.behavior_metrics ??
      null,

    byQuestionType: sessionSnapshot?.by_question_type ?? null,
    byPassage: sessionSnapshot?.by_passage ?? null,

    sessionSnapshot,
    tendency5,
    tendency10,
  } satisfies Record<string, unknown>;

  const hasMeaningfulData =
    merged.accuracyOverall != null ||
    (Array.isArray(merged.weakTags) && merged.weakTags.length > 0) ||
    merged.evidenceMetrics != null ||
    merged.vocabMetrics != null ||
    merged.sentenceMetrics != null ||
    merged.behaviorMetrics != null ||
    merged.sessionSnapshot != null ||
    merged.tendency5 != null ||
    merged.tendency10 != null;

  return hasMeaningfulData ? merged : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getRecordField(
  source: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  return asRecord(source?.[key]);
}

function getStringArrayField(
  source: Record<string, unknown> | null,
  key: string,
): string[] | null {
  const value = source?.[key];
  if (!Array.isArray(value)) return null;
  return value.map(String);
}

function getNumberField(
  source: Record<string, unknown> | null,
  key: string,
): number | null {
  const value = source?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
