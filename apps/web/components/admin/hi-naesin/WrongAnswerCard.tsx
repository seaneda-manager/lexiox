import MarkReviewedButton from "./MarkReviewedButton";

const DRILL_TYPE_LABEL: Record<string, string> = {
  vocab: "어휘",
  identify_categorize: "구문 식별",
  translation: "번역",
  translation_arrange: "번역 순서 배열",
  fill_blank: "빈칸 채우기",
  writing: "작문",
  writing_arrange: "작문 순서 배열",
  grammar_choice: "문법 선택",
};

export type WrongAnswerRow = {
  id: string;
  response_text: string | null;
  response_choice: string | null;
  score_pct: number | null;
  feedback_text: string | null;
  created_at: string;
  drillType: string;
  payload: Record<string, unknown>;
  passageTitle: string | null;
  studentName?: string;
};

type Chunk = { id: string; ko?: string; en?: string };

// 순서 배열형 드릴은 response_choice에 학생이 배열한 chunk id 순서가
// JSON 배열 문자열로 저장된다 (예: '["k0","k2","k1"]'). 콤마로만 저장된 과거 데이터도 방어적으로 처리.
function parseOrderIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // not JSON — fall through
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function joinChunks(chunks: Chunk[], ids: string[], field: "ko" | "en"): string {
  const byId = new Map(chunks.map((c) => [c.id, c[field] ?? ""]));
  return ids.map((id) => byId.get(id) ?? `[${id}]`).join(" ");
}

function getDisplayFields(row: WrongAnswerRow): { prompt: string; correctAnswer: string; studentAnswer: string } {
  const { drillType, payload } = row;
  const fallbackStudentAnswer = row.response_text || row.response_choice || "(무응답)";

  switch (drillType) {
    case "vocab":
      return {
        prompt: String(payload.word ?? ""),
        correctAnswer: String(payload.meaningKo ?? ""),
        studentAnswer: fallbackStudentAnswer,
      };
    case "fill_blank":
      return {
        prompt: String(payload.sentenceTemplate ?? ""),
        correctAnswer: String(payload.answer ?? ""),
        studentAnswer: fallbackStudentAnswer,
      };
    case "translation":
      return {
        prompt: String(payload.sentenceEn ?? ""),
        correctAnswer: String(payload.answerKo ?? ""),
        studentAnswer: fallbackStudentAnswer,
      };
    case "writing":
      return {
        prompt: String(payload.koPrompt ?? ""),
        correctAnswer: String(payload.answerEn ?? ""),
        studentAnswer: fallbackStudentAnswer,
      };
    case "grammar_choice": {
      const correct = String(payload.correct ?? "").toLowerCase();
      const optionKey = `option${correct.toUpperCase()}`;
      return {
        prompt: String(payload.sentenceTemplate ?? ""),
        correctAnswer: String((payload as Record<string, unknown>)[optionKey] ?? ""),
        studentAnswer: fallbackStudentAnswer,
      };
    }
    case "translation_arrange": {
      const chunks = Array.isArray(payload.chunks) ? (payload.chunks as Chunk[]) : [];
      const studentIds = parseOrderIds(row.response_choice ?? row.response_text);
      return {
        prompt: String(payload.sentenceEn ?? ""),
        correctAnswer: joinChunks(chunks, chunks.map((c) => c.id), "ko"),
        studentAnswer: studentIds.length ? joinChunks(chunks, studentIds, "ko") : fallbackStudentAnswer,
      };
    }
    case "writing_arrange": {
      const chunks = Array.isArray(payload.chunks) ? (payload.chunks as Chunk[]) : [];
      const studentIds = parseOrderIds(row.response_choice ?? row.response_text);
      return {
        prompt: String(payload.koPrompt ?? ""),
        correctAnswer: joinChunks(chunks, chunks.map((c) => c.id), "en"),
        studentAnswer: studentIds.length ? joinChunks(chunks, studentIds, "en") : fallbackStudentAnswer,
      };
    }
    case "identify_categorize": {
      const targets = Array.isArray(payload.targets) ? (payload.targets as Record<string, unknown>[]) : [];
      const t = targets[0];
      const options = Array.isArray(t?.options) ? (t?.options as { key: string; label: string }[]) : [];
      const correctLabel = options.find((o) => o.key === t?.category)?.label ?? String(t?.category ?? "");
      return {
        prompt: String(payload.sentence ?? ""),
        correctAnswer: t ? `"${t.span}" → ${correctLabel}` : "",
        studentAnswer: fallbackStudentAnswer,
      };
    }
    default:
      return { prompt: "", correctAnswer: "", studentAnswer: fallbackStudentAnswer };
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WrongAnswerCard({
  row,
  revalidateTargetPath,
}: {
  row: WrongAnswerRow;
  revalidateTargetPath: string;
}) {
  const { prompt, correctAnswer, studentAnswer } = getDisplayFields(row);

  return (
    <div className="rounded-lg border border-rose-100 bg-white p-4 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
            {row.studentName && <span className="font-semibold text-gray-600">{row.studentName}</span>}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-500">
              {DRILL_TYPE_LABEL[row.drillType] ?? row.drillType}
            </span>
            {row.passageTitle && <span className="truncate">{row.passageTitle}</span>}
            <span>{formatDate(row.created_at)}</span>
          </div>
          {prompt && <p className="text-sm font-medium text-gray-900">{prompt}</p>}
        </div>
        <MarkReviewedButton responseId={row.id} revalidateTargetPath={revalidateTargetPath} />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2">
          <p className="text-[10px] font-semibold text-rose-500">학생 답</p>
          <p className="text-sm text-rose-800 break-words">{studentAnswer}</p>
        </div>
        {correctAnswer && (
          <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
            <p className="text-[10px] font-semibold text-emerald-600">정답</p>
            <p className="text-sm text-emerald-800 break-words">{correctAnswer}</p>
          </div>
        )}
      </div>

      {row.feedback_text && (
        <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-500">
            AI 피드백{row.score_pct != null ? ` · ${row.score_pct}점` : ""}
          </p>
          <p className="text-xs text-gray-700">{row.feedback_text}</p>
        </div>
      )}
    </div>
  );
}
