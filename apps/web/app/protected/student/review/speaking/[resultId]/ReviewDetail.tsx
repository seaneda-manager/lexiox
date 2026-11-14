"use client";
// Speaking 상세 리뷰: 구성 진단 · 답안 비교 · 내용/문법/전달력 · 향상 방법 · 모범답안 2종 · Drill 진입
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Mic } from "lucide-react";
import type { SpeakingReviewBundle } from "@/lib/speaking/reviewTypes";
import ReviewGate, { type GateInfo } from "@/components/review/ReviewGate";
import StaffReviewBar from "@/components/review/StaffReviewBar";
import DrillHistory from "@/components/review/DrillHistory";

function Card({ title, children, tone = "white" }: { title: string; children: React.ReactNode; tone?: "white" | "blue" | "emerald" | "amber" }) {
  const toneCls = {
    white: "border-gray-200 bg-white",
    blue: "border-blue-200 bg-blue-50/60",
    emerald: "border-emerald-200 bg-emerald-50/60",
    amber: "border-amber-200 bg-amber-50/60",
  }[tone];
  return (
    <div className={`space-y-3 rounded-xl border p-4 ${toneCls}`}>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function Bullets({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-emerald-800">{label}</p>
      <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-gray-700">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ReviewDetail({ resultId, script, scriptVersion }: { resultId: string; script: string | null; scriptVersion: number }) {
  const [bundle, setBundle] = useState<SpeakingReviewBundle | null>(null);
  const [loading, setLoading] = useState(!!script);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<GateInfo | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [isStaff, setIsStaff] = useState(false);

  const load = useCallback(
    async () => {
      setLoading(true);
      setError(null);
      setGate(null);
      try {
        const res = await fetch("/api/speaking-2026/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultId }),
        });
        const json = await res.json().catch(() => ({}));
        if (json.notPublished || json.notGenerated) {
          setGate(json as GateInfo);
          return;
        }
        if (!res.ok || !json.ok) throw new Error(json.error || "리뷰를 불러오지 못했습니다");
        setBundle(json.bundle as SpeakingReviewBundle);
        setStatus(json.status === "draft" ? "draft" : "published");
        setIsStaff(!!json.isStaff);
      } catch (e) {
        setError(e instanceof Error ? e.message : "리뷰를 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    },
    [resultId],
  );

  // 스크립트를 고치면(scriptVersion 증가) 서버가 캐시를 무효화하므로 다시 불러온다.
  useEffect(() => {
    if (script) void load();
  }, [load, script, scriptVersion]);

  if (!script) {
    return (
      <section className="rounded-xl border border-dashed bg-gray-50 p-4 text-center text-xs text-gray-500">
        스크립트가 있어야 상세 리뷰를 볼 수 있어요. 위의 <b>재발화</b>로 말하면 스크립트가 저장됩니다.
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-orange-500" />
        <p className="mt-3 text-sm font-semibold text-gray-700">리뷰를 불러오고 있어요</p>
        <p className="mt-1 text-xs text-gray-500"></p>
      </section>
    );
  }

  if (gate) return <ReviewGate gate={gate} />;

  if (error || !bundle) {
    return (
      <section className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 px-6 py-6 text-center">
        <p className="text-sm text-rose-700">{error ?? "리뷰가 없습니다"}</p>
        <button onClick={() => load()} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700">
          다시 시도
        </button>
      </section>
    );
  }

  const { review: r, delivery: d } = bundle;
  const fillerTotal = d.fillers.reduce((a, f) => a + f.count, 0);

  return (
    <section className="space-y-4">
      {isStaff && (
        <StaffReviewBar
          kind="speaking"
          id={resultId}
          status={status}
          texts={{ overview: r.overview, improvedText: r.improved.text, faceliftText: r.facelift.text }}
          onChanged={() => load()}
        />
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">상세 리뷰</h2>
      </div>

      {r.overview && (
        <Card title="총평">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{r.overview}</p>
        </Card>
      )}

      {/* 전달 수치 + 구성 진단 */}
      <Card title="내 답변 한눈에 보기">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["단어 수", d.words],
            ["문장 수", d.sentences],
            ["군말", fillerTotal],
            ["말 속도(wpm)", d.wpm ?? "-"],
          ].map(([label, v]) => (
            <div key={String(label)} className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-[11px] text-gray-500">{label}</div>
              <div className="text-lg font-bold text-orange-700">{v}</div>
            </div>
          ))}
        </div>
        {d.fillers.length > 0 && (
          <p className="text-xs text-gray-500">
            군말: {d.fillers.map((f) => `${f.word} ×${f.count}`).join(", ")}
          </p>
        )}
        {r.structure.length > 0 && (
          <ul className="space-y-1.5">
            {r.structure.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${p.present ? "bg-emerald-500" : "bg-rose-400"}`}>
                  {p.present ? "✓" : "!"}
                </span>
                <span>
                  <span className="font-semibold text-gray-900">{p.part}</span>
                  <span className="text-gray-600"> — {p.comment}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 비교 */}
      {r.comparison.length > 0 && (
        <Card title="내 답 vs 모범답안 비교">
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <div className="hidden grid-cols-[110px_1fr_1fr] bg-gray-100 text-[11px] font-bold text-gray-600 sm:grid">
              <span className="px-3 py-2">관점</span>
              <span className="px-3 py-2">내 답</span>
              <span className="px-3 py-2">모범답안</span>
            </div>
            {r.comparison.map((row, i) => (
              <div key={i} className="grid gap-1 border-t border-gray-200 text-xs leading-relaxed sm:grid-cols-[110px_1fr_1fr] sm:gap-0">
                <span className="px-3 pt-2 font-semibold text-gray-800 sm:py-2">{row.aspect}</span>
                <span className="px-3 text-gray-600 sm:py-2">{row.yours}</span>
                <span className="px-3 pb-2 text-blue-900 sm:py-2">{row.model}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {r.contentGaps.length > 0 && (
        <Card title="내용·논리에서 부족한 부분" tone="amber">
          <ul className="space-y-2.5">
            {r.contentGaps.map((g, i) => (
              <li key={i} className="text-sm">
                <p className="font-semibold text-amber-900">{g.point}</p>
                <p className="text-xs leading-relaxed text-amber-900/80">{g.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {r.grammarPatterns.length > 0 && (
        <Card title="문법 오류 경향">
          <div className="space-y-4">
            {r.grammarPatterns.map((g, i) => (
              <div key={i} className="space-y-1.5">
                <p className="text-sm font-semibold text-rose-700">{g.pattern}</p>
                <p className="text-xs leading-relaxed text-gray-600">{g.explanation}</p>
                {g.examples.map((e, j) => (
                  <div key={j} className="rounded-lg bg-gray-50 px-3 py-2 text-xs">
                    <p className="text-rose-600 line-through decoration-rose-300">{e.quote}</p>
                    <p className="font-medium text-emerald-700">→ {e.correction}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {r.deliveryNotes.length > 0 && (
        <Card title="말하기 방식">
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-gray-700">
            {r.deliveryNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="이렇게 향상시켜 보세요" tone="emerald">
        <div className="grid gap-4 sm:grid-cols-2">
          <Bullets label="문법" items={r.improvements.grammar} />
          <Bullets label="문맥·구성" items={r.improvements.context} />
          <Bullets label="단어 선택" items={r.improvements.wordChoice} />
          <Bullets label="말하기 방식" items={r.improvements.delivery} />
        </div>
      </Card>

      <Card title="모범답안 ① 내 답변 다듬기" tone="blue">
        <p className="text-xs text-blue-900/70">내 아이디어와 흐름은 그대로 두고 오류와 표현만 고친 말하기용 답변입니다.</p>
        <p className="whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-sm leading-relaxed text-blue-950">{r.improved.text}</p>
        {r.improved.changes.length > 0 && (
          <ul className="space-y-1.5">
            {r.improved.changes.map((c, i) => (
              <li key={i} className="text-xs leading-relaxed text-gray-700">
                <span className="font-semibold text-blue-800">{c.change}</span>
                {c.why && <span className="text-gray-500"> — {c.why}</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="모범답안 ② 구조부터 새로 말하기" tone="blue">
        <p className="text-xs text-blue-900/70">효과적인 답변 구조를 보여 주는 완전히 새로 만든 버전입니다.</p>
        <p className="whitespace-pre-wrap rounded-lg bg-white/70 p-3 text-sm leading-relaxed text-blue-950">{r.facelift.text}</p>
        {r.facelift.outline.length > 0 && (
          <ol className="space-y-1.5">
            {r.facelift.outline.map((o, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">{i + 1}</span>
                <span>
                  <span className="font-semibold text-blue-900">{o.part}</span>
                  <span className="text-gray-600"> — {o.role}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
        {r.facelift.structureNotes.length > 0 && (
          <div className="rounded-lg bg-white/70 p-3">
            <p className="mb-1 text-[11px] font-bold text-blue-800">답변 구조 팁</p>
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-gray-700">
              {r.facelift.structureNotes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {r.drillFocus.length > 0 && (
        <Card title="Drill에서 연습할 항목">
          <div className="flex flex-wrap gap-2">
            {r.drillFocus.map((f, i) => (
              <span key={i} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800" title={f.description}>
                {f.tag}
              </span>
            ))}
          </div>
        </Card>
      )}

      <DrillHistory attempts={bundle.attempts} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/student/review/speaking/${resultId}/drill`}
          className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700"
        >
          <Mic className="h-4 w-4" /> 말하기 Drill 시작하기 →
        </Link>
        <Link
          href={`/student/review/speaking/${resultId}/vocab`}
          className="flex items-center justify-center gap-2 rounded-xl border border-orange-300 bg-white px-4 py-3 text-sm font-semibold text-orange-700 hover:bg-orange-50"
        >
          <Mic className="h-4 w-4" /> 말하기 단어시험 →
        </Link>
      </div>
    </section>
  );
}
