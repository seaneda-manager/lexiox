"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarClock, Flame, Heart, Lightbulb, RotateCcw, Sparkles, Target, Trophy } from "lucide-react";
import { Pill, ScoreRing, Stepper } from "@/components/review-lab/parts";

// ───────── 가짜 데이터 ─────────
type Confidence = "sure" | "unsure";
type Q = {
  id: string;
  kind: string;
  stem: string;
  choices: string[];
  correct: number;
  chosen: number;
  confidence: Confidence;
  evidence: number; // 근거 문장 index
  why: string;
  trap: Record<number, string>; // 오답 선택지별 함정 설명
  hint: string;
};

const PASSAGE = [
  "Cities tend to be significantly warmer than the rural areas around them, a phenomenon known as the urban heat island effect.",
  "Asphalt and concrete absorb sunlight during the day and slowly release the stored heat after sunset.",
  "Tall buildings can also trap warm air at street level, preventing it from dispersing.",
  "As a result, nighttime temperatures in some major cities can be as much as seven degrees higher than in the nearby countryside.",
  "Planting trees and installing reflective roofs have been shown to reduce the difference, though only gradually.",
];

const QUESTIONS: Q[] = [
  {
    id: "q1",
    kind: "Factual",
    stem: "According to the passage, why do cities stay warm after sunset?",
    choices: ["Trees release moisture at night", "Surfaces give back heat they absorbed", "Air conditioners vent warm air", "Rural winds move into the city"],
    correct: 1,
    chosen: 1,
    confidence: "sure",
    evidence: 1,
    why: "2번째 문장이 직접 답입니다. 'slowly release the stored heat'를 'give back heat they absorbed'로 바꿔 말했습니다.",
    trap: {},
    hint: "낮에 흡수한 것을 밤에 어떻게 하는지 찾아보세요.",
  },
  {
    id: "q2",
    kind: "Inference",
    stem: "What can be inferred about tall buildings from the passage?",
    choices: ["They reduce daytime temperatures", "They make cities colder at night", "They keep heat from escaping", "They block sunlight from asphalt"],
    correct: 2,
    chosen: 0,
    confidence: "sure",
    evidence: 2,
    why: "'trap warm air ... preventing it from dispersing' = 열이 빠져나가지 못하게 한다. 글에는 낮 기온 이야기가 없습니다.",
    trap: { 0: "지문에 없는 내용(낮 기온)을 끌어와서 만든 함정입니다. 근거 문장 없이 '그럴 것 같다'로 고르면 틀립니다." },
    hint: "지문에서 tall buildings가 나오는 문장만 보세요. 낮 이야기가 있나요?",
  },
  {
    id: "q3",
    kind: "Vocabulary",
    stem: "The word “dispersing” in the passage is closest in meaning to",
    choices: ["gathering", "cooling", "spreading out", "rising"],
    correct: 2,
    chosen: 0,
    confidence: "unsure",
    evidence: 2,
    why: "preventing it from dispersing = 흩어지는 것을 막는다. 열이 '갇힌다'는 문맥이라 dispersing은 gathering의 반대입니다.",
    trap: { 0: "정반대 뜻을 고른 경우입니다. 'preventing from ~ing'는 뒤 동사를 막는 구조라서 뜻이 뒤집힙니다." },
    hint: "'막는다(preventing)'가 앞에 붙어 있습니다. 막는 대상은 어떤 방향의 움직임일까요?",
  },
  {
    id: "q4",
    kind: "Detail",
    stem: "How much warmer can some cities be at night?",
    choices: ["About two degrees", "About seven degrees", "About ten degrees", "It is not stated"],
    correct: 1,
    chosen: 1,
    confidence: "unsure",
    evidence: 3,
    why: "4번째 문장에 'as much as seven degrees'가 그대로 나옵니다.",
    trap: {},
    hint: "숫자를 찾는 문제입니다. 지문에서 숫자가 나오는 문장은 한 곳뿐입니다.",
  },
];

const STEPS = ["결과", "다시 풀기", "근거와 해설", "성찰", "복습 예약"];
const REASONS = ["단어를 몰랐다", "근거를 못 찾았다", "선택지 함정에 속았다", "시간이 부족했다", "그냥 실수"];

export default function ReadingReviewLab() {
  const [step, setStep] = useState(0);

  // 복습 대상: 틀린 문제 + 찍어서 맞춘 문제(불확실)
  const targets = useMemo(() => QUESTIONS.filter((q) => q.chosen !== q.correct || q.confidence === "unsure"), []);
  const correctCount = QUESTIONS.filter((q) => q.chosen === q.correct).length;
  const overconfident = QUESTIONS.filter((q) => q.chosen !== q.correct && q.confidence === "sure");

  // 다시 풀기 상태
  const [qi, setQi] = useState(0);
  const [retry, setRetry] = useState<Record<string, { picked: number | null; tries: number; hint: boolean; solved: boolean }>>({});
  // 해설 상태
  const [ei, setEi] = useState(0);
  const [showFull, setShowFull] = useState(false); // 모바일: 근거 문장만 / 전체 지문
  // 성찰 상태
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [booked, setBooked] = useState(false);

  const cur = targets[qi];
  const st = retry[cur?.id] ?? { picked: null, tries: 0, hint: false, solved: false };
  const setSt = (patch: Partial<typeof st>) => setRetry((m) => ({ ...m, [cur.id]: { ...st, ...patch } }));

  const answer = (i: number) => {
    if (st.solved) return;
    if (i === cur.correct) setSt({ picked: i, solved: true });
    else setSt({ picked: i, tries: st.tries + 1, hint: st.tries + 1 >= 1 });
  };

  const exhausted = !st.solved && st.tries >= 2;
  const canNextQ = st.solved || exhausted;

  const ex = targets[ei];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/40">
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        {/* 헤더 */}
        <header className="space-y-3">
          <Link href="/student/review/lab" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600">
            <ArrowLeft className="h-3.5 w-3.5" /> Review Lab
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Reading · Review</p>
              <h1 className="text-xl font-bold text-slate-900">Urban Heat Island</h1>
            </div>
            <Pill tone="slate">시뮬레이션 · 저장 안 됨</Pill>
          </div>
          <Stepper steps={STEPS} current={step} onJump={setStep} />
        </header>

        {/* ① 결과 */}
        {step === 0 && (
          <section className="space-y-4">
            <div className="flex flex-col items-center gap-5 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:gap-6 sm:text-left">
              <ScoreRing value={correctCount} total={QUESTIONS.length} label="정답" />
              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="text-lg font-bold text-slate-900 [word-break:keep-all]">Inference와 Vocabulary에서 놓쳤어요</h2>
                <p className="text-sm text-slate-600 [word-break:keep-all]">
                  확신하고 틀린 문제가 <b className="text-rose-600">{overconfident.length}개</b> 있습니다. 이런 문제가 가장 잘 고쳐지니, 먼저 다시 풀어 볼게요.
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  <Pill tone="rose">확신 + 오답 {overconfident.length}</Pill>
                  <Pill tone="amber">불확실 {QUESTIONS.filter((q) => q.confidence === "unsure").length}</Pill>
                  <Pill tone="emerald">정답 {correctCount}</Pill>
                </div>
              </div>
            </div>

            {/* 문항 카드: 확신도 × 정오 */}
            <div className="grid gap-3 sm:grid-cols-2">
              {QUESTIONS.map((q, i) => {
                const ok = q.chosen === q.correct;
                const tone = ok ? (q.confidence === "sure" ? "emerald" : "amber") : q.confidence === "sure" ? "rose" : "amber";
                const text = ok ? (q.confidence === "sure" ? "알고 맞힘" : "찍어서 맞힘") : q.confidence === "sure" ? "확신했지만 틀림" : "몰라서 틀림";
                const border = tone === "rose" ? "border-rose-200 bg-rose-50/60" : tone === "amber" ? "border-amber-200 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/50";
                return (
                  <div key={q.id} className={`rounded-2xl border p-4 ${border}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Q{i + 1}</span>
                      <Pill tone={tone as any}>{text}</Pill>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-900">{q.stem}</p>
                    <p className="mt-2 text-[11px] font-semibold text-slate-500">{q.kind}</p>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={() => setStep(1)} className="sticky bottom-3 z-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700">
              <RotateCcw className="h-4 w-4" /> 먼저 다시 풀어보기 ({targets.length}문제)
            </button>
            <p className="text-center text-[11px] text-slate-400">정답은 아직 보여 주지 않아요. 스스로 다시 떠올리는 것이 기억에 가장 오래 남습니다.</p>
          </section>
        )}

        {/* ② 다시 풀기 */}
        {step === 1 && cur && (
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>
                {qi + 1} / {targets.length}
              </span>
              <Pill tone="indigo">{cur.kind}</Pill>
            </div>
            {/* 문항 진행 점: 첫 시도 성공=초록, 재시도 성공=노랑, 정답 공개=빨강, 현재=테두리 */}
            <div className="flex items-center gap-2">
              {targets.map((t, i) => {
                const r = retry[t.id];
                const color = r?.solved ? (r.tries === 0 ? "bg-emerald-500" : "bg-amber-400") : r && r.tries >= 2 ? "bg-rose-400" : "bg-slate-200";
                return <span key={t.id} className={`h-2.5 flex-1 rounded-full transition-all ${color} ${i === qi ? "ring-2 ring-indigo-400 ring-offset-2" : ""}`} />;
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
                <h2 className="text-lg font-bold leading-snug text-slate-900">{cur.stem}</h2>
                <div className="space-y-2">
                  {cur.choices.map((c, i) => {
                    const picked = st.picked === i;
                    const right = st.solved && i === cur.correct;
                    const wrong = picked && i !== cur.correct;
                    const reveal = exhausted && i === cur.correct;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => answer(i)}
                        disabled={st.solved || exhausted}
                        className={[
                          "flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left text-sm transition",
                          right || reveal
                            ? "border-emerald-400 bg-emerald-50"
                            : wrong
                              ? "border-rose-300 bg-rose-50"
                              : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40",
                        ].join(" ")}
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{"ABCD"[i]}</span>
                        <span className="pt-0.5 font-medium text-slate-800">{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className="space-y-3 lg:col-span-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">남은 기회</p>
                    <div className="flex gap-1" aria-label={`남은 기회 ${Math.max(0, 2 - st.tries)}번`}>
                      {[0, 1].map((i) => (
                        <Heart key={i} className={`h-5 w-5 transition ${i < 2 - st.tries ? "fill-rose-500 text-rose-500" : "text-slate-300"}`} />
                      ))}
                    </div>
                  </div>
                  {st.solved ? (
                    <p className="mt-1 text-sm font-semibold text-emerald-600">✓ 맞았어요! {st.tries === 0 ? "한 번에 해결" : `${st.tries + 1}번째 시도`}</p>
                  ) : exhausted ? (
                    <p className="mt-1 text-sm font-semibold text-rose-600">정답을 알려 드렸어요. 왜 그런지 다음 단계에서 같이 봐요.</p>
                  ) : st.tries === 0 ? (
                    <p className="mt-1 text-sm text-slate-500">천천히 다시 골라 보세요. 기회는 2번이에요.</p>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-rose-600">아쉬워요. 한 번 더 해봐요!</p>
                  )}
                </div>
                {st.hint && !st.solved && !exhausted && (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                      <Lightbulb className="h-3.5 w-3.5" /> 힌트
                    </p>
                    <p className="mt-1 text-sm text-amber-900">{cur.hint}</p>
                  </div>
                )}
                {canNextQ && (
                  <button
                    type="button"
                    onClick={() => {
                      if (qi + 1 < targets.length) setQi(qi + 1);
                      else setStep(2);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                  >
                    {qi + 1 < targets.length ? "다음 문제" : "근거와 해설 보기"} <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </aside>
            </div>
          </section>
        )}

        {/* ③ 근거와 해설 */}
        {step === 2 && ex && (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {targets.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEi(i)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${i === ei ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-indigo-300"}`}
                >
                  Q{QUESTIONS.findIndex((q) => q.id === t.id) + 1} · {t.kind}
                </button>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              {/* 지문: 근거만 밝게 (신호화) */}
              <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <Target className="h-3.5 w-3.5" /> 근거 문장
                </p>
                <p className="text-[15px] leading-8 text-slate-800">
                  {PASSAGE.map((s, i) => (
                    <span
                      key={i}
                      className={
                        i === ex.evidence
                          ? "rounded-md bg-amber-200/80 px-1 py-0.5 font-semibold text-slate-900 shadow-[0_0_0_2px_rgba(251,191,36,0.35)]"
                          : showFull
                            ? "text-slate-400 transition"
                            : "hidden text-slate-400 transition lg:inline"
                      }
                    >
                      {s}{" "}
                    </span>
                  ))}
                </p>
                <button type="button" onClick={() => setShowFull((v) => !v)} className="text-xs font-semibold text-indigo-600 hover:underline lg:hidden">
                  {showFull ? "근거 문장만 보기" : "전체 지문 보기"}
                </button>
              </div>

              {/* 해설 */}
              <aside className="space-y-3 lg:col-span-2">
                <div className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-indigo-700">정답</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {"ABCD"[ex.correct]}. {ex.choices[ex.correct]}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{ex.why}</p>
                </div>
                {ex.chosen !== ex.correct && ex.trap[ex.chosen] && (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                    <p className="text-xs font-bold text-rose-700">내가 고른 {"ABCD"[ex.chosen]}는 왜 함정일까?</p>
                    <p className="mt-1 text-sm leading-relaxed text-rose-900">{ex.trap[ex.chosen]}</p>
                  </div>
                )}
                <button type="button" onClick={() => (ei + 1 < targets.length ? setEi(ei + 1) : setStep(3))} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700">
                  {ei + 1 < targets.length ? "다음 해설" : "성찰하기"} <ArrowRight className="h-4 w-4" />
                </button>
              </aside>
            </div>
          </section>
        )}

        {/* ④ 성찰 */}
        {step === 3 && (
          <section className="mx-auto max-w-2xl space-y-4">
            <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Sparkles className="h-5 w-5 text-indigo-500" /> 왜 틀렸는지 내 말로 정리해 봐요
                </h2>
                <p className="mt-1 text-xs text-slate-500">한 줄만 적어도 같은 실수가 훨씬 줄어듭니다.</p>
              </div>
              {targets
                .filter((t) => t.chosen !== t.correct)
                .map((t) => (
                  <div key={t.id} className="space-y-2">
                    <p className="text-sm font-semibold text-slate-800">
                      Q{QUESTIONS.findIndex((q) => q.id === t.id) + 1} · {t.kind}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReasons((m) => ({ ...m, [t.id]: r }))}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${reasons[t.id] === r ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-indigo-50"}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="예) preventing from ~ing 구조를 못 봐서 반대로 읽었다"
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <button type="button" onClick={() => setStep(4)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-base font-bold text-white hover:bg-indigo-700">
              복습 예약하기 <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        )}

        {/* ⑤ 복습 예약 */}
        {step === 4 && (
          <section className="mx-auto max-w-2xl space-y-4">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <CalendarClock className="h-5 w-5 text-indigo-500" /> 잊기 전에 다시 만나요
              </h2>
              <ul className="space-y-2">
                {[
                  { when: "내일", what: "확신했지만 틀린 문제", count: overconfident.length, tone: "rose" as const },
                  { when: "3일 뒤", what: "몰라서 틀린 문제", count: targets.filter((t) => t.chosen !== t.correct && t.confidence === "unsure").length, tone: "amber" as const },
                  { when: "1주 뒤", what: "찍어서 맞힌 문제", count: targets.filter((t) => t.chosen === t.correct).length, tone: "emerald" as const },
                ].map((r) => (
                  <li key={r.when} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Pill tone={r.tone}>{r.when}</Pill>
                      <span className="text-sm text-slate-700">{r.what}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{r.count}문제</span>
                  </li>
                ))}
              </ul>
              {note && (
                <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                  <span className="text-[11px] font-bold text-indigo-600">내 한 줄 메모</span>
                  <p className="mt-0.5">{note}</p>
                </div>
              )}
            </div>
            {!booked ? (
              <button type="button" onClick={() => setBooked(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700">
                이대로 예약
              </button>
            ) : (
              <div className="space-y-4 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-center text-white shadow-xl">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/20">
                  <Trophy className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">오늘의 Reading 복습 완료!</h2>
                  <p className="mt-1 text-sm text-indigo-100">내일 {overconfident.length}문제로 다시 만나요.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { v: targets.filter((t) => retry[t.id]?.solved && retry[t.id]?.tries === 0).length, l: "한 번에 해결" },
                    { v: targets.filter((t) => retry[t.id]?.solved && retry[t.id]?.tries > 0).length, l: "다시 도전 성공" },
                    { v: targets.filter((t) => retry[t.id] && !retry[t.id].solved).length, l: "더 볼 문제" },
                  ].map((s) => (
                    <div key={s.l} className="rounded-2xl bg-white/15 px-2 py-3">
                      <div className="text-2xl font-bold">{s.v}</div>
                      <div className="text-[11px] text-indigo-100">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                  <Flame className="h-4 w-4 text-amber-300" /> 3일 연속 복습 중
                </div>
                <div className="flex gap-2 pt-1">
                  <Link href="/student/review/lab" className="flex-1 rounded-2xl bg-white py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50">
                    Review Lab
                  </Link>
                  <button type="button" onClick={() => window.location.reload()} className="flex-1 rounded-2xl bg-white/15 py-3 text-sm font-bold text-white hover:bg-white/25">
                    처음부터 다시
                  </button>
                </div>
                <p className="text-[10px] text-indigo-200">시뮬레이션 · 저장되지 않았고 연속 일수는 예시입니다</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
