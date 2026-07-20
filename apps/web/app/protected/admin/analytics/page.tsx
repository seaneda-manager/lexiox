// apps/web/app/(protected)/admin/analytics/page.tsx
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getTab(sp: Record<string, string | string[] | undefined>): string {
  const v = sp["tab"];
  const val = Array.isArray(v) ? v[0] : v;
  if (val === "passages" || val === "classes" || val === "trend") return val;
  return "overview";
}

function weekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekLabel(key: string): string {
  const [year, w] = key.split("-W");
  return `${year}/${w}주`;
}

function MiniBar({ value, max, color = "bg-violet-400" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function TabLink({ tab, current, label }: { tab: string; current: string; label: string }) {
  return (
    <Link
      href={`/admin/analytics?tab=${tab}`}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        tab === current ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

async function OverviewTab() {
  const supabase = await getServerSupabase();

  const [
    { data: toeflSessions },
    { data: naesinSessions },
    { data: hiSessions },
    { data: students },
  ] = await Promise.all([
    supabase.from("reading_sessions").select("id, user_id, band_score, legacy_score, started_at, finished_at"),
    supabase.from("naesin_reading_sessions").select("id, student_id, total_score, started_at, submitted_at"),
    supabase.from("hi_naesin_sessions").select("id, student_id, started_at, submitted_at"),
    supabase.from("academy_students").select("id, is_active"),
  ]);

  const activeStudents = (students ?? []).filter((s) => s.is_active !== false).length;

  const toeflDone = (toeflSessions ?? []).filter((s) => !!s.finished_at);
  const naesinDone = (naesinSessions ?? []).filter((s) => !!s.submitted_at);
  const hiDone = (hiSessions ?? []).filter((s) => !!s.submitted_at);

  const toeflScores = toeflDone.map((s) => s.band_score ?? s.legacy_score).filter((v): v is number => v != null);
  const toeflAvg = toeflScores.length > 0 ? Math.round(toeflScores.reduce((a, b) => a + b, 0) / toeflScores.length) : null;

  const naesinScores = (naesinSessions ?? []).map((s) => s.total_score).filter((v): v is number => v != null);
  const naesinAvg = naesinScores.length > 0 ? Math.round(naesinScores.reduce((a, b) => a + b, 0) / naesinScores.length) : null;

  // 프로그램별 요약
  const programs = [
    { label: "TOEFL Reading", total: (toeflSessions ?? []).length, done: toeflDone.length, avg: toeflAvg, avgUnit: "점", color: "bg-sky-400" },
    { label: "내신", total: (naesinSessions ?? []).length, done: naesinDone.length, avg: naesinAvg, avgUnit: "점", color: "bg-violet-400" },
    { label: "Hi-naesin", total: (hiSessions ?? []).length, done: hiDone.length, avg: null, avgUnit: "", color: "bg-emerald-400" },
  ];
  const maxTotal = Math.max(...programs.map((p) => p.total), 1);

  // 최근 8주 전체 세션 합산
  const now = new Date();
  const eightWeeksAgo = new Date(now.getTime() - 56 * 86400000);
  const weekMap = new Map<string, { toefl: number; naesin: number; hi: number }>();
  const initBucket = () => ({ toefl: 0, naesin: 0, hi: 0 });

  for (const s of toeflSessions ?? []) {
    if (!s.started_at || new Date(s.started_at) < eightWeeksAgo) continue;
    const k = weekKey(s.started_at);
    if (!weekMap.has(k)) weekMap.set(k, initBucket());
    weekMap.get(k)!.toefl += 1;
  }
  for (const s of naesinSessions ?? []) {
    if (!s.started_at || new Date(s.started_at) < eightWeeksAgo) continue;
    const k = weekKey(s.started_at);
    if (!weekMap.has(k)) weekMap.set(k, initBucket());
    weekMap.get(k)!.naesin += 1;
  }
  for (const s of hiSessions ?? []) {
    if (!s.started_at || new Date(s.started_at) < eightWeeksAgo) continue;
    const k = weekKey(s.started_at);
    if (!weekMap.has(k)) weekMap.set(k, initBucket());
    weekMap.get(k)!.hi += 1;
  }

  const weekEntries = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const maxWeek = Math.max(...weekEntries.map(([, v]) => v.toefl + v.naesin + v.hi), 1);

  const totalAll = (toeflSessions ?? []).length + (naesinSessions ?? []).length + (hiSessions ?? []).length;
  const doneAll = toeflDone.length + naesinDone.length + hiDone.length;
  const uniqueUsers = new Set([
    ...(toeflSessions ?? []).map((s) => s.user_id),
    ...(naesinSessions ?? []).map((s) => s.student_id),
    ...(hiSessions ?? []).map((s) => s.student_id),
  ]).size;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="전체 세션 (합산)" value={totalAll} />
        <KpiCard label="완료 세션" value={doneAll} />
        <KpiCard label="활동 학생 수" value={uniqueUsers} />
        <KpiCard label="등록 학생 수 (active)" value={activeStudents} />
      </div>

      {/* 프로그램별 세션 현황 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">프로그램별 세션 현황</h3>
        <div className="space-y-4">
          {programs.map((p) => (
            <div key={p.label}>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{p.label}</span>
                <span>전체 {p.total} · 완료 {p.done}{p.avg != null ? ` · 평균 ${p.avg}${p.avgUnit}` : ""}</span>
              </div>
              <MiniBar value={p.total} max={maxTotal} color={p.color} />
            </div>
          ))}
        </div>
      </div>

      {/* 주간 세션 추이 (프로그램별 스택) */}
      {weekEntries.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-slate-900">주간 세션 수 (최근 8주)</h3>
          <div className="mb-3 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-full bg-sky-400" />TOEFL</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-full bg-violet-400" />내신</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-full bg-emerald-400" />Hi-naesin</span>
          </div>
          <div className="space-y-2">
            {weekEntries.map(([key, counts]) => {
              const total = counts.toefl + counts.naesin + counts.hi;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-slate-500">{weekLabel(key)}</span>
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    {counts.toefl > 0 && <div className="h-full bg-sky-400" style={{ width: `${(counts.toefl / maxWeek) * 100}%` }} />}
                    {counts.naesin > 0 && <div className="h-full bg-violet-400" style={{ width: `${(counts.naesin / maxWeek) * 100}%` }} />}
                    {counts.hi > 0 && <div className="h-full bg-emerald-400" style={{ width: `${(counts.hi / maxWeek) * 100}%` }} />}
                  </div>
                  <span className="w-6 text-right text-xs font-semibold text-slate-700">{total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Passages ────────────────────────────────────────────────────────────────

async function PassagesTab() {
  const supabase = await getServerSupabase();

  // TOEFL
  const { data: toeflSessions } = await supabase
    .from("reading_sessions")
    .select("id, passage_id, reading_passages(id, title)")
    .not("finished_at", "is", null);

  const toeflSessionIds = (toeflSessions ?? []).map((s) => s.id);
  const { data: toeflAnswers } = toeflSessionIds.length > 0
    ? await supabase
        .from("reading_answers")
        .select("session_id, reading_questions(passage_id), reading_choices(is_correct)")
        .in("session_id", toeflSessionIds)
    : { data: [] };

  type PassageStat = { label: string; program: string; sessions: number; correct: number; total: number };
  const statMap = new Map<string, PassageStat>();

  for (const s of toeflSessions ?? []) {
    const p = Array.isArray(s.reading_passages) ? s.reading_passages[0] : s.reading_passages;
    if (!statMap.has(s.passage_id)) {
      statMap.set(s.passage_id, { label: (p as any)?.title ?? s.passage_id, program: "TOEFL", sessions: 0, correct: 0, total: 0 });
    }
    statMap.get(s.passage_id)!.sessions += 1;
  }
  for (const a of toeflAnswers ?? []) {
    const q = Array.isArray(a.reading_questions) ? a.reading_questions[0] : a.reading_questions;
    const c = Array.isArray(a.reading_choices) ? a.reading_choices[0] : a.reading_choices;
    const pid = (q as any)?.passage_id;
    if (!pid || !statMap.has(pid)) continue;
    statMap.get(pid)!.total += 1;
    if ((c as any)?.is_correct) statMap.get(pid)!.correct += 1;
  }

  // 내신
  const { data: naesinSessions } = await supabase
    .from("naesin_reading_sessions")
    .select("id, set_id")
    .not("submitted_at", "is", null);

  const naesinSetIds = Array.from(new Set((naesinSessions ?? []).map((s) => s.set_id).filter(Boolean)));
  const naesinSetMap = new Map<string, string>();
  if (naesinSetIds.length > 0) {
    const { data: sets } = await supabase.from("naesin_reading_sets").select("id, title").in("id", naesinSetIds);
    for (const s of sets ?? []) naesinSetMap.set(s.id, (s as any).title ?? s.id);
  }

  const naesinSessionIds = (naesinSessions ?? []).map((s) => s.id);
  const { data: naesinAnswers } = naesinSessionIds.length > 0
    ? await supabase.from("naesin_reading_answers").select("session_id, is_correct").in("session_id", naesinSessionIds)
    : { data: [] };

  // set_id별 집계
  const naesinSessionSetMap = new Map((naesinSessions ?? []).map((s) => [s.id, s.set_id]));
  for (const s of naesinSessions ?? []) {
    const key = `naesin_${s.set_id}`;
    if (!statMap.has(key)) {
      statMap.set(key, { label: naesinSetMap.get(s.set_id ?? "") ?? s.set_id ?? "-", program: "내신", sessions: 0, correct: 0, total: 0 });
    }
    statMap.get(key)!.sessions += 1;
  }
  for (const a of naesinAnswers ?? []) {
    const setId = naesinSessionSetMap.get(a.session_id);
    const key = `naesin_${setId}`;
    if (!statMap.has(key)) continue;
    statMap.get(key)!.total += 1;
    if (a.is_correct) statMap.get(key)!.correct += 1;
  }

  // Hi-naesin
  const { data: hiSessions } = await supabase
    .from("hi_naesin_sessions")
    .select("id, passage_id")
    .not("submitted_at", "is", null);

  const hiPassageIds = Array.from(new Set((hiSessions ?? []).map((s) => s.passage_id).filter(Boolean)));
  const hiPassageMap = new Map<string, string>();
  if (hiPassageIds.length > 0) {
    const { data: passages } = await supabase.from("hi_naesin_passages").select("id, title, school_name").in("id", hiPassageIds);
    for (const p of passages ?? []) hiPassageMap.set(p.id, (p as any).title || (p as any).school_name || p.id);
  }

  const hiSessionIds = (hiSessions ?? []).map((s) => s.id);
  const { data: hiResponses } = hiSessionIds.length > 0
    ? await supabase.from("hi_naesin_drill_responses").select("session_id, is_correct").in("session_id", hiSessionIds)
    : { data: [] };

  const hiSessionPassageMap = new Map((hiSessions ?? []).map((s) => [s.id, s.passage_id]));
  for (const s of hiSessions ?? []) {
    const key = `hi_${s.passage_id}`;
    if (!statMap.has(key)) {
      statMap.set(key, { label: hiPassageMap.get(s.passage_id ?? "") ?? s.passage_id ?? "-", program: "Hi-naesin", sessions: 0, correct: 0, total: 0 });
    }
    statMap.get(key)!.sessions += 1;
  }
  for (const r of hiResponses ?? []) {
    const passageId = hiSessionPassageMap.get(r.session_id);
    const key = `hi_${passageId}`;
    if (!statMap.has(key)) continue;
    statMap.get(key)!.total += 1;
    if (r.is_correct) statMap.get(key)!.correct += 1;
  }

  const rows = Array.from(statMap.entries())
    .map(([, stat]) => ({
      ...stat,
      errorRate: stat.total > 0 ? Math.round(((stat.total - stat.correct) / stat.total) * 100) : null,
      accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : null,
    }))
    .sort((a, b) => (b.errorRate ?? 0) - (a.errorRate ?? 0));

  const maxSessions = Math.max(...rows.map((r) => r.sessions), 1);
  const programColor: Record<string, string> = { TOEFL: "text-sky-600", "내신": "text-violet-600", "Hi-naesin": "text-emerald-600" };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">지문/세트별 오답률 (높은 순)</h3>
        <p className="text-xs text-slate-400">TOEFL · 내신 · Hi-naesin 통합</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr className="[&>th]:px-4 [&>th]:py-3">
              <th>프로그램</th>
              <th className="min-w-[200px]">지문/세트</th>
              <th>세션</th>
              <th>정답률</th>
              <th className="min-w-[140px]">오답률</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">데이터가 없습니다.</td></tr>
            ) : rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-100 [&>td]:px-4 [&>td]:py-3">
                <td className={`text-xs font-semibold ${programColor[row.program] ?? "text-slate-600"}`}>{row.program}</td>
                <td className="max-w-[220px] truncate font-medium text-slate-800">{row.label}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-16"><MiniBar value={row.sessions} max={maxSessions} color="bg-slate-300" /></div>
                    <span className="text-xs text-slate-600">{row.sessions}</span>
                  </div>
                </td>
                <td>
                  {row.accuracy != null ? (
                    <span className={`font-semibold ${row.accuracy >= 70 ? "text-emerald-600" : row.accuracy >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                      {row.accuracy}%
                    </span>
                  ) : <span className="text-slate-400">-</span>}
                </td>
                <td>
                  {row.errorRate != null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-20"><MiniBar value={row.errorRate} max={100} color={row.errorRate >= 50 ? "bg-rose-400" : row.errorRate >= 30 ? "bg-amber-400" : "bg-emerald-400"} /></div>
                      <span className="text-xs font-semibold text-slate-600">{row.errorRate}%</span>
                    </div>
                  ) : <span className="text-slate-400">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Classes ─────────────────────────────────────────────────────────────────

async function ClassesTab() {
  const supabase = await getServerSupabase();

  const [{ data: classes }, { data: memberships }] = await Promise.all([
    supabase.from("academy_classes").select("id, name"),
    supabase.from("academy_class_students").select("class_id, student_id"),
  ]);

  const allStudentIds = Array.from(new Set((memberships ?? []).map((m) => m.student_id)));

  const [{ data: toeflSessions }, { data: naesinSessions }, { data: hiSessions }] = await Promise.all([
    allStudentIds.length > 0
      ? supabase.from("reading_sessions").select("user_id, band_score, legacy_score").in("user_id", allStudentIds).not("finished_at", "is", null)
      : { data: [] },
    allStudentIds.length > 0
      ? supabase.from("naesin_reading_sessions").select("student_id, total_score").in("student_id", allStudentIds).not("submitted_at", "is", null)
      : { data: [] },
    allStudentIds.length > 0
      ? supabase.from("hi_naesin_sessions").select("student_id").in("student_id", allStudentIds).not("submitted_at", "is", null)
      : { data: [] },
  ]);

  const classStudents = new Map<string, Set<string>>();
  for (const m of memberships ?? []) {
    if (!classStudents.has(m.class_id)) classStudents.set(m.class_id, new Set());
    classStudents.get(m.class_id)!.add(m.student_id);
  }

  const classRows = (classes ?? []).map((cls) => {
    const sids = Array.from(classStudents.get(cls.id) ?? []);
    const sidSet = new Set(sids);

    const toeflScores = (toeflSessions ?? []).filter((s) => sidSet.has(s.user_id)).map((s) => s.band_score ?? s.legacy_score).filter((v): v is number => v != null);
    const naesinScores = (naesinSessions ?? []).filter((s) => sidSet.has(s.student_id)).map((s) => s.total_score).filter((v): v is number => v != null);
    const hiCount = (hiSessions ?? []).filter((s) => sidSet.has(s.student_id)).length;

    const allScores = [...toeflScores, ...naesinScores];
    const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;

    return {
      id: cls.id,
      name: cls.name,
      studentCount: sids.length,
      toeflCount: toeflScores.length,
      naesinCount: naesinScores.length,
      hiCount,
      avgScore,
    };
  });

  const maxScore = Math.max(...classRows.map((r) => r.avgScore ?? 0), 1);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">클래스별 비교</h3>
        <p className="text-xs text-slate-400">TOEFL + 내신 합산 평균 점수</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr className="[&>th]:px-4 [&>th]:py-3">
              <th>클래스</th>
              <th>학생</th>
              <th>TOEFL</th>
              <th>내신</th>
              <th>Hi-naesin</th>
              <th className="min-w-[180px]">평균 점수</th>
            </tr>
          </thead>
          <tbody>
            {classRows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">클래스 데이터가 없습니다.</td></tr>
            ) : classRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 [&>td]:px-4 [&>td]:py-3">
                <td className="font-medium text-slate-900">{row.name}</td>
                <td className="text-slate-600">{row.studentCount}명</td>
                <td className="text-sky-600 font-semibold">{row.toeflCount}</td>
                <td className="text-violet-600 font-semibold">{row.naesinCount}</td>
                <td className="text-emerald-600 font-semibold">{row.hiCount}</td>
                <td>
                  {row.avgScore != null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-28"><MiniBar value={row.avgScore} max={maxScore} color="bg-violet-400" /></div>
                      <span className="text-xs font-semibold text-slate-800">{row.avgScore}점</span>
                    </div>
                  ) : <span className="text-xs text-slate-400">데이터 없음</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Trend ───────────────────────────────────────────────────────────────────

async function TrendTab() {
  const supabase = await getServerSupabase();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const from = sixMonthsAgo.toISOString();

  const [{ data: toeflSessions }, { data: naesinSessions }, { data: hiSessions }] = await Promise.all([
    supabase.from("reading_sessions").select("user_id, started_at, finished_at").gte("started_at", from).order("started_at"),
    supabase.from("naesin_reading_sessions").select("student_id, started_at, submitted_at").gte("started_at", from).order("started_at"),
    supabase.from("hi_naesin_sessions").select("student_id, started_at, submitted_at").gte("started_at", from).order("started_at"),
  ]);

  type Bucket = { toefl: number; naesin: number; hi: number; users: Set<string> };
  const weekMap = new Map<string, Bucket>();
  const getBucket = (k: string) => { if (!weekMap.has(k)) weekMap.set(k, { toefl: 0, naesin: 0, hi: 0, users: new Set() }); return weekMap.get(k)!; };

  for (const s of toeflSessions ?? []) { if (s.started_at) { const b = getBucket(weekKey(s.started_at)); b.toefl += 1; b.users.add(s.user_id); } }
  for (const s of naesinSessions ?? []) { if (s.started_at) { const b = getBucket(weekKey(s.started_at)); b.naesin += 1; b.users.add(s.student_id); } }
  for (const s of hiSessions ?? []) { if (s.started_at) { const b = getBucket(weekKey(s.started_at)); b.hi += 1; b.users.add(s.student_id); } }

  const weekEntries = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, b]) => ({ key, label: weekLabel(key), toefl: b.toefl, naesin: b.naesin, hi: b.hi, total: b.toefl + b.naesin + b.hi, users: b.users.size }));

  const maxTotal = Math.max(...weekEntries.map((e) => e.total), 1);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-bold text-slate-900">주간 세션 수 (최근 6개월)</h3>
        <div className="mb-3 flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-full bg-sky-400" />TOEFL</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-full bg-violet-400" />내신</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-full bg-emerald-400" />Hi-naesin</span>
        </div>
        {weekEntries.length === 0 ? <p className="text-sm text-slate-400">데이터가 없습니다.</p> : (
          <div className="space-y-2">
            {weekEntries.map((e) => (
              <div key={e.key} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-slate-500">{e.label}</span>
                <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  {e.toefl > 0 && <div className="h-full bg-sky-400" style={{ width: `${(e.toefl / maxTotal) * 100}%` }} />}
                  {e.naesin > 0 && <div className="h-full bg-violet-400" style={{ width: `${(e.naesin / maxTotal) * 100}%` }} />}
                  {e.hi > 0 && <div className="h-full bg-emerald-400" style={{ width: `${(e.hi / maxTotal) * 100}%` }} />}
                </div>
                <span className="w-6 text-right text-xs font-semibold text-slate-700">{e.total}</span>
                <span className="text-xs text-slate-400">({e.users}명)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">주별 상세</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th>주</th>
                <th>전체</th>
                <th className="text-sky-600">TOEFL</th>
                <th className="text-violet-600">내신</th>
                <th className="text-emerald-600">Hi-naesin</th>
                <th>활동 학생</th>
              </tr>
            </thead>
            <tbody>
              {weekEntries.map((e) => (
                <tr key={e.key} className="border-t border-slate-100 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-medium text-slate-700">{e.label}</td>
                  <td className="font-semibold text-slate-900">{e.total}</td>
                  <td className="text-sky-600">{e.toefl}</td>
                  <td className="text-violet-600">{e.naesin}</td>
                  <td className="text-emerald-600">{e.hi}</td>
                  <td className="text-slate-600">{e.users}명</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const tab = getTab(sp);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-violet-700">Admin</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">TOEFL · 내신 · Hi-naesin 통합 분석</p>
        <div className="mt-4 flex gap-2">
          <TabLink tab="overview" current={tab} label="전체 현황" />
          <TabLink tab="passages" current={tab} label="지문·문제별" />
          <TabLink tab="classes" current={tab} label="클래스별" />
          <TabLink tab="trend" current={tab} label="기간별 추이" />
        </div>
      </header>

      {tab === "overview" && <OverviewTab />}
      {tab === "passages" && <PassagesTab />}
      {tab === "classes" && <ClassesTab />}
      {tab === "trend" && <TrendTab />}
    </main>
  );
}
