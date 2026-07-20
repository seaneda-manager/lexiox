// apps/web/app/(protected)/admin/results/page.tsx
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

function getTab(sp: Record<string, string | string[] | undefined>) {
  const v = sp["tab"];
  const val = Array.isArray(v) ? v[0] : v;
  if (val === "naesin" || val === "hi-naesin") return val;
  return "toefl";
}

function fmt(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function TabLink({ tab, current, label }: { tab: string; current: string; label: string }) {
  return (
    <Link
      href={`/admin/results?tab=${tab}`}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        tab === current ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

// ── TOEFL Reading ─────────────────────────────────────────────────────────────

async function ToeflTab() {
  const supabase = await getServerSupabase();

  const { data: sessions, error } = await supabase
    .from("reading_sessions")
    .select("id, user_id, mode, band_score, legacy_score, started_at, finished_at, reading_passages(id, title)")
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) return <p className="text-sm text-rose-600">{error.message}</p>;

  const userIds = Array.from(new Set((sessions ?? []).map((s) => s.user_id)));
  const nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, name, email")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      const label = (p as any).full_name || (p as any).name || p.email;
      if (label) nameMap.set(p.id, label);
    }
  }

  const rows = (sessions ?? []).map((s) => {
    const passage = Array.isArray(s.reading_passages) ? s.reading_passages[0] : s.reading_passages;
    return {
      id: s.id,
      student: nameMap.get(s.user_id) ?? `…${s.user_id.slice(-6)}`,
      passage: (passage as any)?.title ?? "-",
      mode: s.mode,
      score: s.band_score ?? s.legacy_score,
      startedAt: s.started_at,
      finishedAt: s.finished_at,
    };
  });

  return <ResultTable rows={rows} detailHref={(id) => `/admin/results/${id}`} scoreLabel="점수" />;
}

// ── 내신 ──────────────────────────────────────────────────────────────────────

async function NaesinTab() {
  const supabase = await getServerSupabase();

  const { data: sessions, error } = await supabase
    .from("naesin_reading_sessions")
    .select("id, student_id, mode, status, total_score, started_at, submitted_at, set_id")
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) return <p className="text-sm text-rose-600">{error.message}</p>;

  const userIds = Array.from(new Set((sessions ?? []).map((s) => s.student_id)));
  const nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, name, email")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      const label = (p as any).full_name || (p as any).name || p.email;
      if (label) nameMap.set(p.id, label);
    }
  }

  // 세트 이름 조회
  const setIds = Array.from(new Set((sessions ?? []).map((s) => s.set_id).filter(Boolean)));
  const setMap = new Map<string, string>();
  if (setIds.length > 0) {
    const { data: sets } = await supabase
      .from("naesin_reading_sets")
      .select("id, title")
      .in("id", setIds);
    for (const s of sets ?? []) setMap.set(s.id, (s as any).title ?? s.id);
  }

  const rows = (sessions ?? []).map((s) => {
    return {
      id: s.id,
      student: nameMap.get(s.student_id) ?? `…${s.student_id.slice(-6)}`,
      passage: setMap.get(s.set_id ?? "") ?? s.set_id ?? "-",
      mode: s.mode ?? "-",
      score: s.total_score,
      startedAt: s.started_at,
      finishedAt: s.submitted_at,
      status: s.status,
    };
  });

  return <ResultTable rows={rows} detailHref={(id) => `/admin/results/naesin/${id}`} scoreLabel="점수" />;
}

// ── Hi-naesin ─────────────────────────────────────────────────────────────────

async function HiNaesinTab() {
  const supabase = await getServerSupabase();

  const { data: sessions, error } = await supabase
    .from("hi_naesin_sessions")
    .select("id, student_id, passage_id, session_type, status, started_at, submitted_at")
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) return <p className="text-sm text-rose-600">{error.message}</p>;

  const userIds = Array.from(new Set((sessions ?? []).map((s) => s.student_id)));
  const nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, name, email")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      const label = (p as any).full_name || (p as any).name || p.email;
      if (label) nameMap.set(p.id, label);
    }
  }

  // 지문 이름 조회
  const passageIds = Array.from(new Set((sessions ?? []).map((s) => s.passage_id).filter(Boolean)));
  const passageMap = new Map<string, string>();
  if (passageIds.length > 0) {
    const { data: passages } = await supabase
      .from("hi_naesin_passages")
      .select("id, title, school_name")
      .in("id", passageIds);
    for (const p of passages ?? []) {
      passageMap.set(p.id, (p as any).title || (p as any).school_name || p.id);
    }
  }

  // 세션별 드릴 응답 정답률
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const scoreMap = new Map<string, { correct: number; total: number }>();
  if (sessionIds.length > 0) {
    const { data: responses } = await supabase
      .from("hi_naesin_drill_responses")
      .select("session_id, is_correct")
      .in("session_id", sessionIds);
    for (const r of responses ?? []) {
      const prev = scoreMap.get(r.session_id) ?? { correct: 0, total: 0 };
      scoreMap.set(r.session_id, {
        correct: prev.correct + (r.is_correct ? 1 : 0),
        total: prev.total + 1,
      });
    }
  }

  const rows = (sessions ?? []).map((s) => {
    const stat = scoreMap.get(s.id);
    const score = stat && stat.total > 0
      ? Math.round((stat.correct / stat.total) * 100)
      : null;
    return {
      id: s.id,
      student: nameMap.get(s.student_id) ?? `…${s.student_id.slice(-6)}`,
      passage: passageMap.get(s.passage_id ?? "") ?? s.passage_id ?? "-",
      mode: s.session_type ?? "-",
      score,
      startedAt: s.started_at,
      finishedAt: s.submitted_at,
      status: s.status,
    };
  });

  return <ResultTable rows={rows} scoreLabel="정답률" scoreUnit="%" />;
}

// ── 공통 테이블 컴포넌트 ──────────────────────────────────────────────────────

type Row = {
  id: string;
  student: string;
  passage: string;
  mode: string;
  score: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  status?: string;
};

function ResultTable({
  rows,
  detailHref,
  scoreLabel,
  scoreUnit = "",
}: {
  rows: Row[];
  detailHref?: (id: string) => string;
  scoreLabel: string;
  scoreUnit?: string;
}) {
  const doneCount = rows.filter((r) => !!r.finishedAt || r.status === "submitted").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">전체 세션</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">완료</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{doneCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">학생 수</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {new Set(rows.map((r) => r.student)).size}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th className="w-24">학생</th>
                <th>지문/세트</th>
                <th className="w-16">모드</th>
                <th>{scoreLabel}</th>
                <th>시작</th>
                <th>완료</th>
                <th>상태</th>
                {detailHref && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const done = !!row.finishedAt || row.status === "submitted";
                  return (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50 [&>td]:px-4 [&>td]:py-3">
                      <td className="font-medium text-slate-900">{row.student}</td>
                      <td className="text-slate-700">{row.passage}</td>
                      <td className="text-slate-500">{row.mode}</td>
                      <td className="font-semibold text-slate-900">
                        {row.score != null ? `${row.score}${scoreUnit}` : "-"}
                      </td>
                      <td className="text-slate-500">{fmt(row.startedAt)}</td>
                      <td className="text-slate-500">{fmt(row.finishedAt)}</td>
                      <td>
                        {done ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">완료</span>
                        ) : (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">진행중</span>
                        )}
                      </td>
                      {detailHref && (
                        <td>
                          <Link
                            href={detailHref(row.id)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            상세
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminResultsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const tab = getTab(sp);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-violet-700">Admin</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">학생 풀이 결과</h1>
        <div className="mt-4 flex gap-2">
          <TabLink tab="toefl" current={tab} label="TOEFL Reading" />
          <TabLink tab="naesin" current={tab} label="내신" />
          <TabLink tab="hi-naesin" current={tab} label="Hi-naesin" />
        </div>
      </header>

      {tab === "toefl" && <ToeflTab />}
      {tab === "naesin" && <NaesinTab />}
      {tab === "hi-naesin" && <HiNaesinTab />}
    </main>
  );
}
