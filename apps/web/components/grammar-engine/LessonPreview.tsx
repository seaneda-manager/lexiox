import type { ReactNode } from "react";
import {
  GRAMMAR_LEVEL_LABEL,
  GRAMMAR_QUESTION_KIND_LABEL,
  lessonCounts,
  type GrammarLesson,
  type GrammarLessonLevel,
} from "@/models/middle-naesin/grammar-lesson";

const LEVEL_STYLE: Record<GrammarLessonLevel, string> = {
  basic: "bg-emerald-50 text-emerald-700 border-emerald-200",
  intermediate: "bg-amber-50 text-amber-700 border-amber-200",
  advanced: "bg-rose-50 text-rose-700 border-rose-200",
};

function Badge({ level }: { level: GrammarLessonLevel }) {
  return <span className={`mr-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${LEVEL_STYLE[level]}`}>{GRAMMAR_LEVEL_LABEL[level]}</span>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl border bg-white p-5">
      <div className="text-sm font-bold text-neutral-700">{title}</div>
      {children}
    </section>
  );
}

// [b]굵게[/b] 만 렌더링 (서식 규칙: docs/GRAMMAR_STYLE_GUIDE.md 5-B)
function T({ children }: { children?: string }) {
  const parts = String(children ?? "").split(/\[b\](.+?)\[\/b\]/g);
  return <>{parts.map((x, i) => (i % 2 ? <b key={i}>{x}</b> : <span key={i}>{x}</span>))}</>;
}

// 레슨 전체를 검수용으로 펼쳐 보여 준다 (서버 컴포넌트 — 상호작용 없음)
export default function LessonPreview({ lesson }: { lesson: GrammarLesson }) {
  const counts = lessonCounts(lesson);
  const dist = [0, 1, 2, 3].map((i) => `${String.fromCharCode(65 + i)} ${lesson.questions.filter((q) => q.kind !== "count_wrong" && q.answerIndex === i).length}`).join(" · ");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 text-xs text-neutral-500">
        예문 {counts.exampleCount}개 · 설명 빈칸 {counts.blanks} · Drill 빈칸 {lesson.drillFill.length} · 고치기 {lesson.drillFix.length} · 문제 {lesson.questions.length} · 정답 위치(개수 세기 제외): {dist}
      </div>

      <Section title="1. 설명">
        <p className="text-sm font-medium">{lesson.explanation.summaryEn}</p>
        <p className="text-sm text-sky-800">{lesson.explanation.summaryKo}</p>
        <ol className="space-y-2">
          {lesson.explanation.rules.map((r, i) => (
            <li key={i} className="rounded-lg border p-3 text-sm">
              <div className="font-medium"><T>{r.en}</T></div>
              <div className="text-xs text-neutral-500"><T>{r.ko}</T></div>
            </li>
          ))}
        </ol>
        <div className="space-y-1.5">
          {lesson.explanation.examples.map((r, i) => (
            <div key={i} className="rounded-lg bg-emerald-50/50 p-3 text-sm">
              <div><T>{r.en}</T></div>
              <div className="text-xs text-neutral-500"><T>{r.ko}</T></div>
            </div>
          ))}
        </div>
      </Section>

      {lesson.exampleGroups && lesson.exampleGroups.length > 0 && (
        <Section title={`1-B. 예문 모음 (${counts.exampleCount}개 · ${lesson.exampleGroups.length}그룹)`}>
          {lesson.exampleGroups.map((g, gi) => (
            <div key={gi} className="space-y-1 rounded-lg border p-3">
              <div className="text-sm font-semibold text-neutral-800">{g.title}</div>
              {g.note && <div className="text-xs text-violet-700">💡 {g.note}</div>}
              {g.examples.map((e, ei) => (
                <div key={ei} className={["rounded px-2 py-1.5 text-sm", e.wrong ? "bg-rose-50 text-rose-700" : "bg-emerald-50/40"].join(" ")}>
                  {e.wrong ? "✗ " : ""}
                  {e.tag && <span className="mr-1.5 rounded border bg-white px-1.5 py-0.5 text-[10px] font-bold text-neutral-600">{e.tag}</span>}
                  <T>{e.en}</T>
                  <span className="ml-2 text-xs text-neutral-500"><T>{e.ko}</T></span>
                  {e.note && <span className="ml-2 text-[11px] text-neutral-400">({e.note})</span>}
                </div>
              ))}
            </div>
          ))}
        </Section>
      )}

      <Section title="2. 쓰기 깜지 (학생이 따라 쓸 원문)">
        <pre className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 font-sans text-sm">{lesson.cramText}</pre>
      </Section>

      <Section title={`3. 빈칸 채우기 (${lesson.blanks.length})`}>
        {lesson.blanks.map((b, i) => (
          <div key={i} className="rounded-lg border p-3 text-sm">
            {i + 1}. {b.text.replace("___", `[ ${b.answer} ]`)}
            {b.hint && <span className="ml-2 text-xs text-neutral-400">힌트 {b.hint}</span>}
          </div>
        ))}
      </Section>

      <Section title={`4-A. Drill 빈칸 (${lesson.drillFill.length})`}>
        {lesson.drillFill.map((f, i) => (
          <div key={i} className="rounded-lg border p-3 text-sm">
            <Badge level={f.level} /> {i + 1}. {f.sentence.replace("___", `[ ${f.answer} ]`)}
            {f.choices && <span className="ml-2 text-xs text-neutral-400">보기: {f.choices.join(" / ")}</span>}
            {f.ko && <div className="text-xs text-neutral-500">{f.ko}</div>}
            {f.noteKo && <div className="text-xs text-neutral-400">💡 {f.noteKo}</div>}
          </div>
        ))}
      </Section>

      <Section title={`4-B. Drill 틀린 부분 고치기 + 이유 (${lesson.drillFix.length})`}>
        {lesson.drillFix.map((f, i) => (
          <div key={i} className="space-y-1 rounded-lg border p-3 text-sm">
            <div>
              <Badge level={f.level} /> {i + 1}. {f.sentence}
            </div>
            <div className="text-xs">
              틀린 곳: <b className="text-rose-600">{f.wrong}</b> → 정답: <b className="text-emerald-700">{f.correct.map((c) => c || "(삭제)").join(" / ")}</b>
            </div>
            <ul className="text-xs text-neutral-600">
              {f.reasonChoices.map((r, j) => (
                <li key={j} className={j === f.reasonIndex ? "font-semibold text-emerald-700" : ""}>
                  {j === f.reasonIndex ? "✓ " : "· "}
                  {r}
                </li>
              ))}
            </ul>
            {f.ko && <div className="text-xs text-neutral-500">{f.ko}</div>}
          </div>
        ))}
      </Section>

      <Section title={`5. 문제 (${lesson.questions.length})`}>
        {lesson.questions.map((q, i) => (
          <div key={i} className="space-y-1.5 rounded-lg border p-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge level={q.level} />
              <span className="text-xs text-neutral-500">{GRAMMAR_QUESTION_KIND_LABEL[q.kind]}</span>
              <b>{i + 1}.</b>
            </div>
            <div className="whitespace-pre-wrap font-medium">{q.stem}</div>
            <ul className="space-y-0.5">
              {q.choices.map((c, j) => (
                <li key={j} className={["rounded px-2 py-1", j === q.answerIndex ? "bg-emerald-50 font-semibold text-emerald-800" : ""].join(" ")}>
                  {q.kind === "count_wrong" ? "" : `${String.fromCharCode(65 + j)}. `}
                  {c.en}
                  {c.ko && <span className="ml-2 text-xs font-normal text-neutral-500">{c.ko}</span>}
                </li>
              ))}
            </ul>
            <div className="text-xs text-sky-800">💡 {q.explanationKo}</div>
          </div>
        ))}
      </Section>
    </div>
  );
}
