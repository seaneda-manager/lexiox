"use client";

import React, { useMemo, useState } from "react";
import { Radar, Ring, Sparkline, SECTION_COLOR, TrendChart, type TrendSeries } from "./charts";
import { bySubsection, detectPatterns, summarizeSection, type SubsectionStat } from "@/lib/performance/analyze";
import {
  SECTION_LABEL,
  SECTION_ORDER,
  SEVERITY_LABEL,
  type AttemptRecord,
  type FeedbackRow,
  type PerformanceReportData,
  type SectionKey,
  type Severity,
} from "@/lib/performance/types";

type Mode = "staff" | "student";

const SEV_STYLE: Record<Severity, { bar: string; chip: string }> = {
  complete: { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-200" },
  partial: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-200" },
  slight: { bar: "bg-sky-400", chip: "bg-sky-50 text-sky-700 ring-sky-200" },
};
const SEVERITIES: Severity[] = ["complete", "partial", "slight"];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function pctColor(p: number | null) {
  if (p === null) return "text-slate-400";
  return p >= 80 ? "text-emerald-600" : p >= 60 ? "text-amber-600" : "text-rose-600";
}

/* ─────────── 피드백 편집기 ─────────── */

function FeedbackBox({
  mode,
  studentId,
  section,
  subsection = "",
  questionKey = "",
  feedback,
  onChange,
  placeholder,
  compact,
}: {
  mode: Mode;
  studentId: string;
  section: SectionKey;
  subsection?: string;
  questionKey?: string;
  feedback: FeedbackRow[];
  onChange: (next: FeedbackRow[]) => void;
  placeholder: string;
  compact?: boolean;
}) {
  const existing = feedback.find(
    (f) => f.section === section && f.subsection === subsection && f.question_key === questionKey,
  );
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(existing?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const target = { studentId, section, subsection, questionKey };

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/performance/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, body: text }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "저장 실패");
      const row = j.feedback as FeedbackRow;
      onChange([...feedback.filter((f) => f.id !== row.id && !(f.section === section && f.subsection === subsection && f.question_key === questionKey)), row]);
      setEditing(false);
    } catch (e: any) {
      setErr(e?.message ?? "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("이 피드백을 삭제할까요?")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/performance/feedback", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "삭제 실패");
      onChange(feedback.filter((f) => !(f.section === section && f.subsection === subsection && f.question_key === questionKey)));
      setText("");
      setEditing(false);
    } catch (e: any) {
      setErr(e?.message ?? "삭제 실패");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "student") {
    if (!existing) return null;
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-900">
        <div className="text-[11px] font-semibold text-emerald-700 mb-0.5">선생님 코멘트 · {fmtDate(existing.updated_at)}</div>
        <p className="whitespace-pre-wrap leading-relaxed">{existing.body}</p>
      </div>
    );
  }

  if (!editing) {
    return existing ? (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-900">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[11px] font-semibold text-emerald-700">선생님 코멘트 · {fmtDate(existing.updated_at)}</span>
          <button className="text-xs text-emerald-700 underline" onClick={() => { setText(existing.body); setEditing(true); }}>
            수정
          </button>
        </div>
        <p className="whitespace-pre-wrap leading-relaxed">{existing.body}</p>
      </div>
    ) : (
      <button
        onClick={() => { setText(""); setEditing(true); }}
        className={`rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition ${compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"}`}
      >
        + {placeholder}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-white p-2 space-y-2">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={compact ? 2 : 3}
        maxLength={4000}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <div className="flex items-center gap-2">
        <button disabled={busy || !text.trim()} onClick={save} className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">
          {busy ? "저장 중…" : "저장"}
        </button>
        <button disabled={busy} onClick={() => { setEditing(false); setErr(null); }} className="text-xs text-slate-500">취소</button>
        {existing && (
          <button disabled={busy} onClick={remove} className="ml-auto text-xs text-rose-600">삭제</button>
        )}
      </div>
    </div>
  );
}

/* ─────────── 본체 ─────────── */

export default function PerformanceReport({ data, mode }: { data: PerformanceReportData; mode: Mode }) {
  const [feedback, setFeedback] = useState<FeedbackRow[]>(data.feedback);
  const [selected, setSelected] = useState<SectionKey | null>(null);
  const [subSel, setSubSel] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState<Severity | "all">("all");

  const summaries = useMemo(() => data.sections.map((s) => ({ data: s, sum: summarizeSection(s) })), [data.sections]);
  const doneCount = summaries.filter((s) => s.sum.done).length;

  const trendSeries: TrendSeries[] = summaries
    .filter((s) => s.sum.done)
    .map(({ data: d }) => ({
      key: d.section,
      label: SECTION_LABEL[d.section],
      color: SECTION_COLOR[d.section],
      points: d.sessions.filter((x) => x.pct !== null).map((x) => ({ t: new Date(x.at).getTime(), v: x.pct as number })),
    }));

  const active = selected ? summaries.find((s) => s.data.section === selected) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6 text-slate-900">
      {/* 헤더 */}
      <header className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-500 p-5 sm:p-7 text-white shadow-sm">
        <p className="text-xs font-semibold tracking-widest text-indigo-100">LEARNING REPORT</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold">{data.studentName} 학습 리포트</h1>
        <p className="mt-2 text-sm text-indigo-100">
          수행한 분야 {doneCount}/{SECTION_ORDER.length} · 기준일 {fmtDate(data.generatedAt)}
        </p>
      </header>

      {doneCount === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="text-4xl mb-2">📭</div>
          <p className="font-semibold text-slate-700">아직 저장된 수행 기록이 없습니다</p>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "student" ? "시험이나 학습을 마치면 이곳에 결과와 오답 분석이 쌓입니다." : "학생이 시험·학습을 완료하면 분야별 결과와 오답 경향이 표시됩니다."}
          </p>
        </div>
      )}

      {/* 분야 카드 */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-600">분야별 한눈에 보기</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summaries.map(({ data: d, sum }) => {
            const color = SECTION_COLOR[d.section];
            const isActive = selected === d.section;
            const spark = d.sessions
              .filter((x) => x.pct !== null)
              .sort((a, b) => a.at.localeCompare(b.at))
              .slice(-8)
              .map((x) => x.pct as number);
            return (
              <button
                key={d.section}
                onClick={() => { setSelected(isActive ? null : d.section); setSubSel(null); setSevFilter("all"); }}
                className={`text-left rounded-2xl border bg-white p-4 transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300 ${isActive ? "border-indigo-500 ring-2 ring-indigo-200" : "border-slate-200"} ${sum.done ? "" : "opacity-70"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    <span className="font-bold">{SECTION_LABEL[d.section]}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sum.done ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {sum.done ? "수행함" : "미수행"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <Ring value={sum.avgPct} color={color} />
                  <div className="min-w-0 flex-1 text-xs text-slate-500 space-y-1">
                    <div>
                      {d.attempts.length ? "정답률" : "평균 점수"}{" "}
                      <b className={`text-sm ${pctColor(sum.avgPct)}`}>{sum.avgPct === null ? "–" : `${sum.avgPct}%`}</b>
                    </div>
                    <div>수행 {sum.sessionCount}회 · 최근 30일 {sum.last30}회</div>
                    <div>최근 {fmtDate(sum.lastAt)}</div>
                    {sum.delta !== null && (
                      <div className={sum.delta >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                        {sum.delta >= 0 ? "▲" : "▼"} {Math.abs(sum.delta)}%p 최근 추이
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2"><Sparkline values={spark} color={color} width={240} /></div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 레이더 + 전체 추이 */}
      {doneCount > 0 && (
        <section className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-600 mb-1">분야 밸런스</h2>
            <Radar axes={summaries.map((s) => ({ label: SECTION_LABEL[s.data.section], value: s.sum.avgPct }))} />
          </div>
          <div className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-600 mb-2">성취도 추이</h2>
            <TrendChart series={trendSeries} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {trendSeries.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.label}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 분야 드릴다운 */}
      {active && (
        <SectionDetail
          key={active.data.section}
          mode={mode}
          studentId={data.studentId}
          section={active.data.section}
          sessions={active.data.sessions}
          attempts={active.data.attempts}
          feedback={feedback}
          setFeedback={setFeedback}
          subSel={subSel}
          setSubSel={setSubSel}
          sevFilter={sevFilter}
          setSevFilter={setSevFilter}
        />
      )}
      {!active && doneCount > 0 && (
        <p className="text-center text-sm text-slate-400">위 카드를 눌러 분야별 상세 분석과 오답 경향을 확인하세요.</p>
      )}
    </div>
  );
}

/* ─────────── 분야 상세 ─────────── */

function SectionDetail({
  mode, studentId, section, sessions, attempts, feedback, setFeedback, subSel, setSubSel, sevFilter, setSevFilter,
}: {
  mode: Mode;
  studentId: string;
  section: SectionKey;
  sessions: { id: string; at: string; label: string; pct: number | null; scoreText?: string }[];
  attempts: AttemptRecord[];
  feedback: FeedbackRow[];
  setFeedback: (f: FeedbackRow[]) => void;
  subSel: string | null;
  setSubSel: (s: string | null) => void;
  sevFilter: Severity | "all";
  setSevFilter: (s: Severity | "all") => void;
}) {
  const color = SECTION_COLOR[section];
  const subs = useMemo(() => bySubsection(attempts), [attempts]);
  const patterns = useMemo(() => detectPatterns(attempts), [attempts]);
  const wrongTotal = attempts.filter((a) => !a.correct).length;
  const maxWrong = Math.max(1, ...subs.map((s) => s.total - s.correct));
  const sorted = [...sessions].sort((a, b) => a.at.localeCompare(b.at));

  const wrongList = attempts
    .filter((a) => !a.correct)
    .filter((a) => (subSel ? a.subsection === subSel : true))
    .filter((a) => (sevFilter === "all" ? true : a.severity === sevFilter))
    .sort((a, b) => b.at.localeCompare(a.at));

  const subLabel = subSel ? subs.find((s) => s.subsection === subSel)?.label : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
        <h2 className="text-xl font-bold">{SECTION_LABEL[section]} 상세 분석</h2>
      </div>

      <FeedbackBox
        mode={mode} studentId={studentId} section={section} feedback={feedback} onChange={setFeedback}
        placeholder={`${SECTION_LABEL[section]} 전체에 대한 코멘트 남기기`}
      />

      {/* 분야 추이 */}
      <div>
        <h3 className="text-sm font-bold text-slate-600 mb-2">회차별 추이</h3>
        <TrendChart
          height={170}
          series={[{ key: section, label: SECTION_LABEL[section], color, points: sorted.filter((s) => s.pct !== null).map((s) => ({ t: new Date(s.at).getTime(), v: s.pct as number })) }]}
        />
        <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-xs text-slate-500">
          {[...sorted].reverse().slice(0, 6).map((s) => (
            <li key={s.id} className="flex justify-between rounded-md bg-slate-50 px-2 py-1">
              <span className="truncate">{fmtDate(s.at)} · {s.label}</span>
              <b className={pctColor(s.pct)}>{s.pct === null ? "채점 전" : `${s.pct}%`}{s.scoreText ? ` (${s.scoreText})` : ""}</b>
            </li>
          ))}
        </ul>
      </div>

      {attempts.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          {section === "speaking" || section === "writing"
            ? "이 분야는 문항 단위 정오답 대신 점수·피드백으로 평가합니다. 선생님 코멘트를 남겨 보완하세요."
            : "문항 단위 기록이 아직 없습니다."}
        </div>
      ) : (
        <>
          {/* 오답 경향 */}
          <div>
            <h3 className="text-sm font-bold text-slate-600 mb-2">오답 경향 분석</h3>
            {patterns.length === 0 ? (
              <p className="text-sm text-slate-400">뚜렷한 경향을 판단하기에는 기록이 아직 적습니다.</p>
            ) : (
              <ul className="space-y-1.5">
                {patterns.map((p, i) => (
                  <li key={i} className={`rounded-lg px-3 py-2 text-sm ${p.tone === "bad" ? "bg-rose-50 text-rose-800" : p.tone === "warn" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                    {p.tone === "good" ? "✅ " : p.tone === "warn" ? "⚠️ " : "🔎 "}{p.text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 유형별 오답 빈도 (심각도 누적 막대) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-600">상세 분야별 오답 (클릭하면 해당 유형만 보기)</h3>
              <div className="hidden sm:flex gap-3 text-[11px] text-slate-500">
                {SEVERITIES.map((s) => (
                  <span key={s} className="flex items-center gap-1"><i className={`h-2 w-2 rounded-sm ${SEV_STYLE[s].bar}`} />{SEVERITY_LABEL[s]}</span>
                ))}
              </div>
            </div>
            <ul className="space-y-2">
              {subs.map((s) => (
                <SubRow key={s.subsection} s={s} maxWrong={maxWrong} active={subSel === s.subsection} onClick={() => { setSubSel(subSel === s.subsection ? null : s.subsection); setSevFilter("all"); }} />
              ))}
            </ul>
          </div>

          {/* 틀린 문제 목록 */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-sm font-bold text-slate-600">
                틀린 문제 {subLabel ? `· ${subLabel}` : ""} <span className="text-slate-400 font-normal">({wrongList.length}/{wrongTotal})</span>
              </h3>
              <div className="flex gap-1 ml-auto">
                {(["all", ...SEVERITIES] as const).map((s) => (
                  <button key={s} onClick={() => setSevFilter(s)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${sevFilter === s ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200"}`}>
                    {s === "all" ? "전체" : SEVERITY_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {subSel && (
              <div className="mb-3">
                <FeedbackBox
                  mode={mode} studentId={studentId} section={section} subsection={subSel} feedback={feedback} onChange={setFeedback}
                  placeholder={`'${subLabel}' 유형 코멘트 남기기`}
                />
              </div>
            )}

            {wrongList.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 p-4 text-center text-sm text-emerald-700">
                {wrongTotal === 0 ? "🎉 틀린 문제가 없습니다!" : "조건에 맞는 오답이 없습니다."}
              </p>
            ) : (
              <ul className="space-y-2">
                {wrongList.slice(0, 40).map((a) => (
                  <li key={a.key} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {a.severity && <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${SEV_STYLE[a.severity].chip}`}>{SEVERITY_LABEL[a.severity]}</span>}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{a.subsectionLabel}</span>
                      <span className="text-slate-400">{fmtDate(a.at)}</span>
                    </div>
                    <p className="text-sm font-medium leading-snug">{a.stem}</p>
                    <div className="grid gap-1 text-xs sm:grid-cols-2">
                      <div className="rounded-md bg-rose-50 px-2 py-1 text-rose-800">내 답: {a.userAnswer ?? "무응답"}</div>
                      {a.correctAnswer && <div className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">정답: {a.correctAnswer}</div>}
                    </div>
                    <FeedbackBox
                      compact mode={mode} studentId={studentId} section={section} subsection={a.subsection} questionKey={a.key}
                      feedback={feedback} onChange={setFeedback} placeholder="이 문제에 코멘트 남기기"
                    />
                  </li>
                ))}
              </ul>
            )}
            {wrongList.length > 40 && <p className="mt-2 text-center text-xs text-slate-400">최근 40개만 표시합니다. 위의 유형·심각도 필터로 좁혀 보세요.</p>}
          </div>
        </>
      )}
    </section>
  );
}

function SubRow({ s, maxWrong, active, onClick }: { s: SubsectionStat; maxWrong: number; active: boolean; onClick: () => void }) {
  const wrong = s.total - s.correct;
  return (
    <li>
      <button onClick={onClick} className={`w-full rounded-xl border p-3 text-left transition hover:bg-slate-50 ${active ? "border-indigo-500 bg-indigo-50/40" : "border-slate-200"}`}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-sm">{s.label}</span>
          <span className="text-xs text-slate-500">
            <b className={pctColor(s.pct)}>{s.pct}%</b> · {s.correct}/{s.total}
          </span>
        </div>
        <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-slate-100" title={`오답 ${wrong}개`}>
          {SEVERITIES.map((sev) =>
            s.severity[sev] ? (
              <div key={sev} className={SEV_STYLE[sev].bar} style={{ width: `${(s.severity[sev] / maxWrong) * 100}%` }} title={`${SEVERITY_LABEL[sev]} ${s.severity[sev]}`} />
            ) : null,
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
          {wrong === 0 ? <span className="text-emerald-600">오답 없음</span> : SEVERITIES.map((sev) => s.severity[sev] ? <span key={sev}>{SEVERITY_LABEL[sev]} {s.severity[sev]}</span> : null)}
          {s.recentPct !== null && s.earlierPct !== null && <span className="ml-auto">최근 {s.earlierPct}% → {s.recentPct}%</span>}
        </div>
      </button>
    </li>
  );
}
