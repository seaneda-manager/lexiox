"use client";
// AI 리뷰 본문: 생성(최초 20~40초) → Email / Discussion 탭 → 섹션별 상세.
import { useCallback, useEffect, useState } from "react";
import type { TaskReview, WritingAiReview, ReviewTaskKey } from "@/lib/writing/reviewTypes";

type Props = { sessionId: string; emailText: string; discussionText: string };

const TAB_LABEL: Record<ReviewTaskKey, string> = { email: "Email", discussion: "Academic Discussion" };

export default function ReviewClient({ sessionId, emailText, discussionText }: Props) {
  const [review, setReview] = useState<WritingAiReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReviewTaskKey>(emailText.trim() ? "email" : "discussion");

  const load = useCallback(
    async (regenerate = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/writing-2026/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, regenerate }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || "리뷰를 불러오지 못했습니다");
        setReview(json.review as WritingAiReview);
      } catch (e) {
        setError(e instanceof Error ? e.message : "리뷰를 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-slate-700">AI가 답안을 분석하고 있어요</p>
        <p className="mt-1 text-xs text-slate-500">처음 한 번만 20~40초 걸립니다. 다음부터는 바로 열려요.</p>
      </section>
    );
  }

  if (error || !review) {
    return (
      <section className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6 text-center">
        <p className="text-sm text-rose-700">{error ?? "리뷰가 없습니다"}</p>
        <button
          onClick={() => load(false)}
          className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
        >
          다시 시도
        </button>
      </section>
    );
  }

  const tabs = (["email", "discussion"] as ReviewTaskKey[]).filter((k) => review[k]);
  const active = review[tab] ? tab : tabs[0];
  const task = review[active]!;
  const studentText = active === "email" ? emailText : discussionText;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {tabs.map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                k === active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {TAB_LABEL[k]}
            </button>
          ))}
        </div>
        <button onClick={() => load(true)} className="text-xs text-slate-400 hover:text-slate-600" title="리뷰를 새로 생성합니다">
          ↻ 다시 생성
        </button>
      </div>

      <TaskReviewView task={task} studentText={studentText} />
    </section>
  );
}

function Card({ title, children, tone = "white" }: { title: string; children: React.ReactNode; tone?: "white" | "blue" | "emerald" | "amber" }) {
  const toneCls = {
    white: "border-slate-200 bg-white",
    blue: "border-blue-200 bg-blue-50/60",
    emerald: "border-emerald-200 bg-emerald-50/60",
    amber: "border-amber-200 bg-amber-50/60",
  }[tone];
  return (
    <div className={`space-y-3 rounded-2xl border p-5 ${toneCls}`}>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

function TaskReviewView({ task, studentText }: { task: TaskReview; studentText: string }) {
  const impr = task.improvements;
  return (
    <div className="space-y-5">
      {task.overview && (
        <Card title="총평">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{task.overview}</p>
        </Card>
      )}

      {/* 학생 답 vs 모범답안 비교 */}
      <Card title="내 답 vs 모범답안 비교">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold text-slate-600">내 답안</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{studentText}</p>
        </div>
        {task.comparison.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[110px_1fr_1fr] bg-slate-100 text-[11px] font-bold text-slate-600 sm:grid">
              <span className="px-3 py-2">관점</span>
              <span className="px-3 py-2">내 답</span>
              <span className="px-3 py-2">모범답안</span>
            </div>
            {task.comparison.map((r, i) => (
              <div key={i} className="grid gap-1 border-t border-slate-200 text-xs leading-relaxed sm:grid-cols-[110px_1fr_1fr] sm:gap-0">
                <span className="px-3 pt-2 font-semibold text-slate-800 sm:py-2">{r.aspect}</span>
                <span className="px-3 text-slate-600 sm:py-2">{r.yours}</span>
                <span className="px-3 pb-2 text-blue-900 sm:py-2">{r.model}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 내용·논리 */}
      {task.contentGaps.length > 0 && (
        <Card title="내용·논리에서 부족한 부분" tone="amber">
          <ul className="space-y-2.5">
            {task.contentGaps.map((g, i) => (
              <li key={i} className="text-sm">
                <p className="font-semibold text-amber-900">{g.point}</p>
                <p className="text-xs leading-relaxed text-amber-900/80">{g.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 문법 경향 */}
      {task.grammarPatterns.length > 0 && (
        <Card title="문법 오류 경향">
          <div className="space-y-4">
            {task.grammarPatterns.map((g, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-sm font-semibold text-rose-700">{g.pattern}</p>
                <p className="text-xs leading-relaxed text-slate-600">{g.explanation}</p>
                {g.examples.map((e, j) => (
                  <div key={j} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <p className="text-rose-600 line-through decoration-rose-300">{e.quote}</p>
                    <p className="font-medium text-emerald-700">→ {e.correction}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 향상 방법 */}
      <Card title="이렇게 향상시켜 보세요" tone="emerald">
        <div className="grid gap-4 md:grid-cols-3">
          <Bullets label="문법" items={impr.grammar} />
          <Bullets label="문맥·논리" items={impr.context} />
          <Bullets label="단어 선택" items={impr.wordChoice} />
        </div>
      </Card>

      {/* 모범답안 1 */}
      <Card title="모범답안 ① 내 답안 다듬기" tone="blue">
        <p className="text-xs text-blue-900/70">내 아이디어와 흐름은 그대로 두고 오류와 표현만 고친 버전입니다.</p>
        <p className="whitespace-pre-wrap rounded-lg bg-white/70 p-4 text-sm leading-relaxed text-blue-950">{task.improved.text}</p>
        {task.improved.changes.length > 0 && (
          <ul className="space-y-1.5">
            {task.improved.changes.map((c, i) => (
              <li key={i} className="text-xs leading-relaxed text-slate-700">
                <span className="font-semibold text-blue-800">{c.change}</span>
                {c.why && <span className="text-slate-500"> — {c.why}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 모범답안 2 */}
      <Card title="모범답안 ② 구조부터 새로 쓰기" tone="blue">
        <p className="text-xs text-blue-900/70">효과적인 글 구조를 보여 주는 완전히 새로 쓴 버전입니다.</p>
        <p className="whitespace-pre-wrap rounded-lg bg-white/70 p-4 text-sm leading-relaxed text-blue-950">{task.facelift.text}</p>
        {task.facelift.outline.length > 0 && (
          <ol className="space-y-1.5">
            {task.facelift.outline.map((o, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold text-blue-900">{o.part}</span>
                  <span className="text-slate-600"> — {o.role}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        {task.facelift.structureNotes.length > 0 && (
          <div className="rounded-lg bg-white/70 p-3">
            <p className="mb-1 text-[11px] font-bold text-blue-800">글 구조 작성 팁</p>
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-700">
              {task.facelift.structureNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {task.drillFocus.length > 0 && (
        <Card title="Drill에서 연습할 항목">
          <div className="flex flex-wrap gap-2">
            {task.drillFocus.map((d, i) => (
              <span key={i} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800" title={d.description}>
                {d.tag}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Bullets({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-emerald-800">{label}</p>
      <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-700">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
