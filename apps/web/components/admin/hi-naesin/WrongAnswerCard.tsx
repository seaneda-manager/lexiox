import MarkReviewedButton from "./MarkReviewedButton";

const DRILL_TYPE_LABEL: Record<string, string> = {
  vocab: "어휘",
  identify_categorize: "구문 식별",
  translation: "번역",
  fill_blank: "빈칸 채우기",
  writing: "작문",
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

function getPromptAndAnswer(drillType: string, payload: Record<string, unknown>): { prompt: string; answer: string } {
  switch (drillType) {
    case "vocab":
      return { prompt: String(payload.word ?? ""), answer: String(payload.meaningKo ?? "") };
    case "fill_blank":
      return { prompt: String(payload.sentenceTemplate ?? ""), answer: String(payload.answer ?? "") };
    case "translation":
      return { prompt: String(payload.sentenceEn ?? ""), answer: String(payload.answerKo ?? "") };
    case "writing":
      return { prompt: String(payload.koPrompt ?? ""), answer: String(payload.answerEn ?? "") };
    case "grammar_choice": {
      const correct = String(payload.correct ?? "").toLowerCase();
      const optionKey = `option${correct.toUpperCase()}`;
      return {
        prompt: String(payload.sentenceTemplate ?? ""),
        answer: String((payload as Record<string, unknown>)[optionKey] ?? ""),
      };
    }
    default:
      return { prompt: "", answer: "" };
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
  const { prompt, answer } = getPromptAndAnswer(row.drillType, row.payload);
  const studentAnswer = row.response_text || row.response_choice || "(무응답)";

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
        {answer && (
          <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
            <p className="text-[10px] font-semibold text-emerald-600">정답</p>
            <p className="text-sm text-emerald-800 break-words">{answer}</p>
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
