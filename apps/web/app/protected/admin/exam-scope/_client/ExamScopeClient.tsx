"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyNaesinAction,
  listConceptsAction,
  listPeriodsAction,
  loadPeriodAction,
  saveHoldsAction,
  saveScopeAction,
  type ConceptOption,
  type DomainHolds,
  type PeriodDetail,
  type PeriodOption,
} from "../actions";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DOMAIN_LABEL: Record<keyof DomainHolds, string> = { vocab: "단어", homework: "숙제", grammar_regular: "정규 문법" };
const box = "rounded-2xl border border-neutral-200 bg-white p-4 space-y-3";
const inp = "rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400";

export default function ExamScopeClient() {
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [concepts, setConcepts] = useState<ConceptOption[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [detail, setDetail] = useState<PeriodDetail | null>(null);
  const [grade, setGrade] = useState("");
  const [level, setLevel] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [holds, setHolds] = useState<DomainHolds>({ vocab: true, homework: true, grammar_regular: true });
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4]);
  const [perSession, setPerSession] = useState(1);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [p, c] = await Promise.all([listPeriodsAction(), listConceptsAction()]);
      if ("error" in p) return setMsg({ ok: false, text: p.error });
      setPeriods(p.periods);
      if (!("error" in c)) setConcepts(c.concepts);
    })();
  }, []);

  async function pickPeriod(id: string) {
    setPeriodId(id);
    setDetail(null);
    setGrade("");
    setPicked([]);
    setMsg(null);
    if (!id) return;
    const d = await loadPeriodAction(id);
    if ("error" in d) return setMsg({ ok: false, text: d.error });
    setDetail(d);
    setHolds(d.holds);
  }

  function pickGrade(g: string) {
    setGrade(g);
    const s = detail?.scope.find((x) => x.grade === g);
    setPicked(s?.conceptIds ?? []);
    setLevel(s?.level ?? 1);
  }

  const byId = useMemo(() => new Map(concepts.map((c) => [c.id, c])), [concepts]);
  const shown = concepts.filter((c) => !picked.includes(c.id) && (!q || c.title.includes(q)));
  const move = (i: number, d: number) =>
    setPicked((p) => {
      const n = [...p];
      const j = i + d;
      if (j < 0 || j >= n.length) return p;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const notReady = picked.filter((id) => !byId.get(id)?.finalLevels.includes(level));
  const period = periods.find((p) => p.id === periodId);
  const studentCount = detail?.grades.find((g) => g.grade === grade)?.students ?? 0;

  async function run(fn: () => Promise<any>, ok: (r: any) => string) {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    setBusy(false);
    if (r && "error" in r && r.error) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: ok(r) });
  }

  return (
    <div className="mt-5 space-y-4">
      <div className={box}>
        <label className="block text-xs font-semibold text-neutral-600">
          시험기간 (학교 관리에서 먼저 등록)
          <select value={periodId} onChange={(e) => void pickPeriod(e.target.value)} className={`${inp} mt-1 w-full`}>
            <option value="">선택하세요</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {periods.length === 0 && <p className="text-sm text-amber-700">등록된 시험기간이 없습니다. 학교 관리 → 학교별 시험기간에서 먼저 입력하세요.</p>}
        {period && (
          <p className="text-xs text-neutral-500">
            준비기간 {period.prepStartDate} ~ 시험 {period.startDate}. 준비기간이 시작되면 정규 일정이 보류됩니다.
          </p>
        )}
      </div>

      {detail && (
        <>
          <div className={box}>
            <h2 className="text-sm font-bold">1. 보류할 영역 (기본은 전부 보류, 끄면 시험기간에도 계속)</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              {(Object.keys(DOMAIN_LABEL) as (keyof DomainHolds)[]).map((d) => (
                <label key={d} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={holds[d]} onChange={(e) => setHolds((h) => ({ ...h, [d]: e.target.checked }))} />
                  {DOMAIN_LABEL[d]} 보류
                </label>
              ))}
            </div>
            <button
              disabled={busy}
              onClick={() => run(() => saveHoldsAction({ periodId, holds }), () => "보류 설정을 저장했습니다. (이미 보류가 시작된 뒤 바꾼 설정은 다음 보류부터 적용됩니다)")}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              보류 설정 저장
            </button>
          </div>

          <div className={box}>
            <h2 className="text-sm font-bold">2. 학년별 시험 범위</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select value={grade} onChange={(e) => pickGrade(e.target.value)} className={inp}>
                <option value="">학년 선택</option>
                {detail.grades.map((g) => (
                  <option key={g.grade} value={g.grade}>
                    {g.grade} ({g.students}명)
                  </option>
                ))}
              </select>
              <label className="text-xs text-neutral-600">
                레벨
                <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className={`${inp} ml-1`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      L{n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {detail.grades.length === 0 && <p className="text-sm text-amber-700">이 학교에 연결된 학생이 없습니다. 학교 관리에서 학생의 학교를 연결하세요.</p>}

            {grade && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs font-semibold text-neutral-600">개념 찾기</div>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색 (예: 현재완료)" className={`${inp} w-full`} />
                  <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl border text-sm">
                    {shown.slice(0, 80).map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2 border-b px-3 py-1.5 last:border-0">
                        <span className="truncate">{c.title}</span>
                        <span className="flex items-center gap-2">
                          {!c.finalLevels.includes(level) && <span className="text-[11px] text-amber-600">미확정</span>}
                          <button onClick={() => setPicked((p) => [...p, c.id])} className="rounded-lg border px-2 py-0.5 text-xs hover:bg-neutral-50">
                            추가
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-neutral-600">시험 범위 ({picked.length}개, 이 순서로 배정)</div>
                  <ol className="max-h-72 overflow-y-auto rounded-xl border text-sm">
                    {picked.map((id, i) => (
                      <li key={id} className="flex items-center justify-between gap-2 border-b px-3 py-1.5 last:border-0">
                        <span className="truncate">
                          {i + 1}. {byId.get(id)?.title ?? id}
                          {!byId.get(id)?.finalLevels.includes(level) && <span className="ml-1 text-[11px] text-amber-600">미확정</span>}
                        </span>
                        <span className="flex gap-1">
                          <button onClick={() => move(i, -1)} className="rounded border px-1.5 text-xs">↑</button>
                          <button onClick={() => move(i, 1)} className="rounded border px-1.5 text-xs">↓</button>
                          <button onClick={() => setPicked((p) => p.filter((x) => x !== id))} className="rounded border px-1.5 text-xs text-rose-600">삭제</button>
                        </span>
                      </li>
                    ))}
                    {picked.length === 0 && <li className="px-3 py-4 text-center text-xs text-neutral-400">왼쪽에서 개념을 추가하세요</li>}
                  </ol>
                </div>
              </div>
            )}
            {notReady.length > 0 && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                ⚠️ L{level} 레슨이 확정되지 않은 개념 {notReady.length}개: 학생 화면에서 &quot;준비 중&quot;으로 보입니다. 시험 전에 확정해야 합니다.
              </p>
            )}
            {grade && (
              <button
                disabled={busy}
                onClick={() => run(() => saveScopeAction({ periodId, grade, level, conceptIds: picked }), () => "시험 범위를 저장했습니다.")}
                className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                시험 범위 저장
              </button>
            )}
          </div>

          {grade && (
            <div className={box}>
              <h2 className="text-sm font-bold">3. 이 학교·{grade} 학생 {studentCount}명에게 내신 일정 배정</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {WEEKDAYS.map((label, d) => (
                  <button
                    key={d}
                    onClick={() => setWeekdays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()))}
                    className={`h-9 w-9 rounded-full border text-xs ${weekdays.includes(d) ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200"}`}
                  >
                    {label}
                  </button>
                ))}
                <label className="ml-3 text-xs text-neutral-600">
                  하루
                  <input type="number" min={1} max={10} value={perSession} onChange={(e) => setPerSession(Math.max(1, Number(e.target.value) || 1))} className={`${inp} mx-1 w-16`} />
                  개념
                </label>
              </div>
              <p className="text-xs text-neutral-500">먼저 위 &quot;시험 범위 저장&quot;을 누른 뒤 배정하세요. 이미 있는 내신 일정은 새 범위로 다시 만들어집니다. 정규 일정은 건드리지 않습니다.</p>
              <button
                disabled={busy || picked.length === 0}
                onClick={() =>
                  run(
                    () => applyNaesinAction({ periodId, grade, weekdays, perSession }),
                    (r) =>
                      `${r.students}명에게 배정했습니다 (${r.firstDate ?? "-"} ~ ${r.lastDate ?? "-"}).` +
                      (r.overflow ? " ⚠️ 마지막 배정일이 시험일 이후입니다. 요일이나 하루 개수를 늘리세요." : "") +
                      (r.skipped?.length ? ` 제외 ${r.skipped.length}명: ${r.skipped.map((s: any) => `${s.name}(${s.reason})`).join(", ")}` : ""),
                  )
                }
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                내신 일정 배정하기
              </button>
            </div>
          )}
        </>
      )}

      {msg && <div className={`rounded-xl border px-4 py-3 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{msg.text}</div>}
    </div>
  );
}
