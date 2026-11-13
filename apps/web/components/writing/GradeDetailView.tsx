// components/writing/GradeDetailView.tsx
// Writing AI 채점 상세(기준별 점수 · 근거 · 오류 목록 · 다음 단계)를 보여 준다.
// 선생님 채점 화면과 학생 피드백 화면이 같이 쓴다. audience="teacher" 일 때만 이중 채점·확인 플래그를 보인다.
import {
  CRITERIA,
  ERROR_CATEGORY_LABEL,
  type CriterionKey,
  type TaskGrade,
  type WritingGradeDetail,
  type WritingTaskKey,
} from "@/lib/writing/gradeDetail";

function Bar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-teal-500" style={{ width: `${(score / 5) * 100}%` }} />
      </div>
      <span className="w-8 text-xs font-bold tabular-nums text-slate-800">{score}/5</span>
    </div>
  );
}

function TaskBlock({ taskKey, title, grade, showHolistic }: { taskKey: WritingTaskKey; title: string; grade: TaskGrade; showHolistic: boolean }) {
  const keys: CriterionKey[] = ["task", "development", "language"];
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        {showHolistic && <span className="text-sm font-bold text-teal-700">AI 종합 {grade.holistic}/5</span>}
      </div>

      <div className="space-y-2.5">
        {keys.map((k) => {
          const c = grade.criteria[k];
          const meta = CRITERIA[taskKey][k];
          return (
            <div key={k} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-700" title={meta.hint}>
                  {meta.label}
                </span>
                <Bar score={c.score} />
              </div>
              {c.rationale && <p className="text-xs leading-relaxed text-slate-600">{c.rationale}</p>}
              {c.evidence.map((q, i) => (
                <p key={i} className="border-l-2 border-slate-300 pl-2 text-[11px] italic text-slate-500">
                  “{q}”
                </p>
              ))}
            </div>
          );
        })}
      </div>

      {(grade.strengths.length > 0 || grade.weaknesses.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {grade.strengths.length > 0 && (
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="mb-1 text-[11px] font-bold text-emerald-800">잘한 점</p>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-emerald-900">
                {grade.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {grade.weaknesses.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="mb-1 text-[11px] font-bold text-amber-800">보완할 점</p>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-900">
                {grade.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {grade.errors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-slate-700">주요 오류와 수정안</p>
          {grade.errors.map((e, i) => (
            <div key={i} className="rounded-lg bg-slate-50 p-2.5 text-xs">
              <p>
                <span className="mr-1.5 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                  {ERROR_CATEGORY_LABEL[e.category] ?? e.category}
                </span>
                <span className="text-rose-700 line-through decoration-rose-300">{e.quote}</span>
                {e.correction && <span className="ml-1.5 font-medium text-emerald-700">→ {e.correction}</span>}
              </p>
              {e.issue && <p className="mt-1 text-slate-600">{e.issue}</p>}
            </div>
          ))}
        </div>
      )}

      {grade.nextSteps.length > 0 && (
        <div className="rounded-lg bg-sky-50 p-3">
          <p className="mb-1 text-[11px] font-bold text-sky-800">다음 점수대로 가려면</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-sky-900">
            {grade.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function GradeDetailView({
  detail,
  audience,
}: {
  detail: WritingGradeDetail;
  audience: "teacher" | "student";
}) {
  return (
    <div className="space-y-4">
      {audience === "teacher" && (
        <div className="space-y-2">
          {detail.reviewFlags.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="mb-1 text-xs font-bold text-amber-800">⚠ 선생님 확인이 필요합니다</p>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-900">
                {detail.reviewFlags.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            독립 채점 {detail.passes.length}회 ·{" "}
            {detail.passes.map((p, i) => `#${i + 1} Email ${p.email ?? "-"} / Discussion ${p.discussion ?? "-"}`).join(" · ")}
            {" · "}분량 Email {detail.wordStats.email?.words ?? 0}단어 / Discussion {detail.wordStats.discussion?.words ?? 0}단어
          </p>
        </div>
      )}
      {detail.email && <TaskBlock taskKey="email" title="Write an Email" grade={detail.email} showHolistic={audience === "teacher"} />}
      {detail.discussion && <TaskBlock taskKey="discussion" title="Academic Discussion" grade={detail.discussion} showHolistic={audience === "teacher"} />}
    </div>
  );
}
