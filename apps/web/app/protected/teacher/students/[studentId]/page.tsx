// apps/web/app/(protected)/teacher/students/[studentId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  Headphones,
  Mic2,
  PenLine,
  NotebookText,
  CalendarDays,
} from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ studentId: string }>;
};

function fmtDate(iso: string | null) {
  if (!iso) return "날짜 정보 없음";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "날짜 정보 없음";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function scoreColor(pct: number) {
  if (pct >= 70) return "bg-emerald-50 text-emerald-700";
  if (pct >= 50) return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

async function fetchLabels(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  table: string,
  ids: (string | null)[],
) {
  const uniqueIds = [...new Set(ids.filter((id): id is string => !!id))];
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;

  const { data, error } = await supabase.from(table).select("id, label").in("id", uniqueIds);
  if (error) {
    console.error(`TeacherStudentDetailPage ${table} label lookup error`, error);
    return map;
  }
  (data ?? []).forEach((row: any) => map.set(row.id, row.label ?? "시험"));
  return map;
}

export default async function TeacherStudentDetailPage({ params }: PageProps) {
  const { studentId } = await params;
  const supabase = await getServerSupabase();

  // 1) 학생 프로필
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", studentId)
    .maybeSingle();

  if (profileError || !profile) {
    notFound();
  }

  const studentName = profile!.full_name ?? "이름 미등록";

  // 2) R/L/S/W 결과 (각 최신 10건)
  const [
    { data: readingRows, error: readingError },
    { data: listeningRows, error: listeningError },
    { data: speakingRows, error: speakingError },
    { data: writingRows, error: writingError },
  ] = await Promise.all([
    supabase
      .from("reading_results_2026")
      .select("id, test_id, total_questions, finished_at")
      .eq("user_id", studentId)
      .order("finished_at", { ascending: false })
      .limit(10),
    supabase
      .from("listening_results_2026")
      .select("id, test_id, module, difficulty, correct_count, total_questions, finished_at")
      .eq("user_id", studentId)
      .order("finished_at", { ascending: false })
      .limit(10),
    supabase
      .from("speaking_results_2026")
      .select("id, test_id, final_total_score, ai_total_score, grading_status, created_at")
      .eq("user_id", studentId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("writing_2026_sessions")
      .select("id, test_id, final_total_score, grading_status, created_at")
      .eq("user_id", studentId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  for (const [name, error] of [
    ["reading_results_2026", readingError],
    ["listening_results_2026", listeningError],
    ["speaking_results_2026", speakingError],
    ["writing_2026_sessions", writingError],
  ] as const) {
    if (error) console.error(`TeacherStudentDetailPage ${name} error`, error);
  }

  const reading = readingRows ?? [];
  const listening = listeningRows ?? [];
  const speaking = speakingRows ?? [];
  const writing = writingRows ?? [];

  // 3) 시험 라벨 (test_id → label)
  const [readingLabels, listeningLabels, speakingLabels, writingLabels] = await Promise.all([
    fetchLabels(supabase, "reading_tests_2026", reading.map((r: any) => r.test_id)),
    fetchLabels(supabase, "listening_tests_2026", listening.map((r: any) => r.test_id)),
    fetchLabels(supabase, "speaking_tests", speaking.map((r: any) => r.test_id)),
    fetchLabels(supabase, "writing_tests", writing.map((r: any) => r.test_id)),
  ]);

  // 4) 요약 통계
  const listeningAvg = listening.length
    ? Math.round(
        listening.reduce(
          (sum: number, r: any) =>
            sum + (r.total_questions ? (r.correct_count / r.total_questions) * 100 : 0),
          0,
        ) / listening.length,
      )
    : null;

  const gradedSpeaking = speaking.filter(
    (r: any) => r.final_total_score != null || r.ai_total_score != null,
  );
  const speakingAvg = gradedSpeaking.length
    ? Math.round(
        gradedSpeaking.reduce(
          (sum: number, r: any) => sum + (r.final_total_score ?? r.ai_total_score ?? 0),
          0,
        ) / gradedSpeaking.length,
      )
    : null;

  const gradedWriting = writing.filter((r: any) => r.final_total_score != null);
  const writingAvg = gradedWriting.length
    ? Math.round(
        gradedWriting.reduce((sum: number, r: any) => sum + (r.final_total_score ?? 0), 0) /
          gradedWriting.length,
      )
    : null;

  const hasAnyResult = reading.length + listening.length + speaking.length + writing.length > 0;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* 상단 헤더 */}
      <header className="space-y-3">
        <Link
          href="/teacher/students"
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-500 hover:text-emerald-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          학생 목록으로
        </Link>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-500">Student Profile</div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">{studentName}</h1>
        </div>
      </header>

      {/* 섹션별 요약 카드 */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Reading"
          count={reading.length}
          sub="응시 횟수"
        />
        <StatCard
          icon={<Headphones className="h-4 w-4" />}
          label="Listening"
          count={listening.length}
          sub={listeningAvg !== null ? `평균 정답률 ${listeningAvg}%` : "응시 횟수"}
        />
        <StatCard
          icon={<Mic2 className="h-4 w-4" />}
          label="Speaking"
          count={speaking.length}
          sub={
            speakingAvg !== null
              ? `평균 점수 ${speakingAvg}/30`
              : speaking.length > 0
                ? "채점 대기중"
                : "응시 횟수"
          }
        />
        <StatCard
          icon={<PenLine className="h-4 w-4" />}
          label="Writing"
          count={writing.length}
          sub={
            writingAvg !== null
              ? `평균 점수 ${writingAvg}/30`
              : writing.length > 0
                ? "채점 대기중"
                : "응시 횟수"
          }
        />
      </div>

      {!hasAnyResult && (
        <div className="rounded-xl border border-dashed bg-gray-50 p-8 text-center text-sm text-gray-500">
          아직 응시한 R/L/S/W 시험 기록이 없습니다. 학생이 시험을 완료하면 이곳에 자동으로 표시됩니다.
        </div>
      )}

      {/* 섹션별 히스토리 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ResultSection title="Reading" icon={<BookOpen className="h-4 w-4 text-sky-600" />} empty={reading.length === 0}>
          {reading.map((r: any) => (
            <ResultRow
              key={r.id}
              label={readingLabels.get(r.test_id) ?? "Reading 시험"}
              date={fmtDate(r.finished_at)}
              rightLabel={r.total_questions != null ? `${r.total_questions}문항` : "-"}
              href={`/student/review/reading/${r.id}`}
            />
          ))}
        </ResultSection>

        <ResultSection title="Listening" icon={<Headphones className="h-4 w-4 text-violet-600" />} empty={listening.length === 0}>
          {listening.map((r: any) => {
            const pct =
              r.total_questions != null ? Math.round((r.correct_count / r.total_questions) * 100) : null;
            return (
              <ResultRow
                key={r.id}
                label={listeningLabels.get(r.test_id) ?? "Listening 시험"}
                date={fmtDate(r.finished_at)}
                rightLabel={pct !== null ? `${pct}%` : "-"}
                rightClass={pct !== null ? scoreColor(pct) : undefined}
                href={`/student/review/listening/${r.id}`}
              />
            );
          })}
        </ResultSection>

        <ResultSection title="Speaking" icon={<Mic2 className="h-4 w-4 text-amber-600" />} empty={speaking.length === 0}>
          {speaking.map((r: any) => {
            const score = r.final_total_score ?? r.ai_total_score;
            return (
              <ResultRow
                key={r.id}
                label={speakingLabels.get(r.test_id) ?? "Speaking 시험"}
                date={fmtDate(r.created_at)}
                rightLabel={score != null ? `${score}/30` : "채점 대기중"}
                href={`/student/review/speaking/${r.id}`}
              />
            );
          })}
        </ResultSection>

        <ResultSection title="Writing" icon={<PenLine className="h-4 w-4 text-emerald-600" />} empty={writing.length === 0}>
          {writing.map((r: any) => (
            <ResultRow
              key={r.id}
              label={writingLabels.get(r.test_id) ?? "Writing 시험"}
              date={fmtDate(r.created_at)}
              rightLabel={r.final_total_score != null ? `${r.final_total_score}/30` : "채점 대기중"}
              href={`/student/review/writing/${r.id}`}
            />
          ))}
        </ResultSection>
      </div>

      {/* 약점 & 메모 — 아직 별도 테이블 없음 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <BarChart2 className="h-4 w-4 text-emerald-600" />
            약점 요약 (Coming Soon)
          </h2>
          <div className="mt-2 rounded-lg border border-dashed bg-gray-50 p-3 text-[11px] text-gray-600">
            영역별 약점 자동 분석은 아직 준비 중입니다. 위 시험 기록의 상세보기에서 문항별 정오답을 확인할 수
            있습니다.
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <NotebookText className="h-4 w-4 text-emerald-600" />
            메모 & 코멘트 (Coming Soon)
          </h2>
          <div className="mt-2 rounded-lg border border-dashed bg-gray-50 p-3 text-[11px] text-gray-600">
            수업 메모/코멘트 기능은 아직 준비 중입니다.
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  count,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  sub: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{count}</div>
      <div className="mt-0.5 text-[11px] text-gray-500">{sub}</div>
    </div>
  );
}

function ResultSection({
  title,
  icon,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        {icon}
        {title}
      </h2>
      {empty ? (
        <div className="rounded-lg border border-dashed bg-gray-50 p-3 text-[11px] text-gray-600">
          아직 {title} 시험 기록이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function ResultRow({
  label,
  date,
  rightLabel,
  rightClass,
  href,
}: {
  label: string;
  date: string;
  rightLabel: string;
  rightClass?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 p-2.5 text-xs hover:border-emerald-400 hover:bg-emerald-50"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1 truncate font-medium text-gray-900">
          <CalendarDays className="h-3 w-3 shrink-0 text-gray-400" />
          {label}
        </div>
        <div className="mt-0.5 text-[10px] text-gray-500">{date}</div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
          rightClass ?? "bg-gray-100 text-gray-700"
        }`}
      >
        {rightLabel}
      </span>
    </Link>
  );
}
