import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ studentId: string }> };

export default async function StudentDetailDashboard({ params }: PageProps) {
  const { studentId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get student name
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const student = authUsers?.users.find((u) => u.id === studentId);
  const studentName =
    student?.user_metadata?.name ||
    student?.user_metadata?.full_name ||
    student?.email ||
    "Unknown Student";

  // Get Reading results
  const { data: readingResults } = await supabase
    .from("reading_results_2026")
    .select("id, test_id, finished_at, correct_count, total_questions")
    .eq("user_id", studentId)
    .order("finished_at", { ascending: false });

  // Get Listening results
  const { data: listeningResults } = await supabase
    .from("listening_results_2026")
    .select("id, test_id, module, finished_at, correct_count, total_questions")
    .eq("user_id", studentId)
    .order("finished_at", { ascending: false });

  // Get Speaking results
  const { data: speakingResults } = await supabase
    .from("speaking_results_2026")
    .select("id, test_id, finished_at, score")
    .eq("user_id", studentId)
    .order("finished_at", { ascending: false });

  // Get Writing results
  const { data: writingResults } = await supabase
    .from("writing_2026_sessions")
    .select("id, test_id, finished_at, score")
    .eq("user_id", studentId)
    .order("finished_at", { ascending: false });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScore = (result: any) => {
    if (result.correct_count !== undefined) {
      return Math.round((result.correct_count / result.total_questions) * 100);
    }
    return result.score;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-700 bg-emerald-50";
    if (score >= 50) return "text-amber-700 bg-amber-50";
    return "text-rose-700 bg-rose-50";
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Back Button & Header */}
      <div className="space-y-4">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">{studentName}의 학습 현황</h1>
          <p className="text-sm text-gray-600 mt-1">
            Student ID: {studentId.slice(0, 8)}…
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          icon="📖"
          label="Reading"
          count={readingResults?.length || 0}
          avgScore={
            readingResults?.length
              ? Math.round(
                  readingResults.reduce((sum, r: any) => {
                    const score = Math.round(
                      (r.correct_count / r.total_questions) * 100
                    );
                    return sum + score;
                  }, 0) / readingResults.length
                )
              : 0
          }
        />
        <StatCard
          icon="🎧"
          label="Listening"
          count={listeningResults?.length || 0}
          avgScore={
            listeningResults?.length
              ? Math.round(
                  listeningResults.reduce((sum, r: any) => {
                    const score = Math.round(
                      (r.correct_count / r.total_questions) * 100
                    );
                    return sum + score;
                  }, 0) / listeningResults.length
                )
              : 0
          }
        />
        <StatCard
          icon="🎤"
          label="Speaking"
          count={speakingResults?.length || 0}
          avgScore={
            speakingResults?.length
              ? Math.round(
                  speakingResults.reduce((sum, r: any) => sum + r.score, 0) /
                    speakingResults.length
                )
              : 0
          }
        />
        <StatCard
          icon="✍️"
          label="Writing"
          count={writingResults?.length || 0}
          avgScore={
            writingResults?.length
              ? Math.round(
                  writingResults.reduce((sum, r: any) => sum + r.score, 0) /
                    writingResults.length
                )
              : 0
          }
        />
      </div>

      {/* Results Sections */}
      <div className="space-y-6">
        {/* Reading */}
        {readingResults && readingResults.length > 0 && (
          <ResultSection title="📖 Reading" icon="📖">
            <div className="space-y-2">
              {readingResults.map((result: any, idx: number) => (
                <ResultRow
                  key={result.id}
                  number={idx + 1}
                  score={getScore(result)}
                  date={formatDate(result.finished_at)}
                  href={`/student/review/reading/${result.id}`}
                />
              ))}
            </div>
          </ResultSection>
        )}

        {/* Listening */}
        {listeningResults && listeningResults.length > 0 && (
          <ResultSection title="🎧 Listening" icon="🎧">
            <div className="space-y-2">
              {listeningResults.map((result: any, idx: number) => (
                <ResultRow
                  key={result.id}
                  number={idx + 1}
                  score={getScore(result)}
                  date={formatDate(result.finished_at)}
                  subtitle={`Module ${result.module}`}
                  href={`/student/review/listening/${result.id}`}
                />
              ))}
            </div>
          </ResultSection>
        )}

        {/* Speaking */}
        {speakingResults && speakingResults.length > 0 && (
          <ResultSection title="🎤 Speaking" icon="🎤">
            <div className="space-y-2">
              {speakingResults.map((result: any, idx: number) => (
                <ResultRow
                  key={result.id}
                  number={idx + 1}
                  score={result.score}
                  date={formatDate(result.finished_at)}
                  href={`/student/review/speaking/${result.id}`}
                />
              ))}
            </div>
          </ResultSection>
        )}

        {/* Writing */}
        {writingResults && writingResults.length > 0 && (
          <ResultSection title="✍️ Writing" icon="✍️">
            <div className="space-y-2">
              {writingResults.map((result: any, idx: number) => (
                <ResultRow
                  key={result.id}
                  number={idx + 1}
                  score={result.score}
                  date={formatDate(result.finished_at)}
                  href={`/student/review/writing/${result.id}`}
                />
              ))}
            </div>
          </ResultSection>
        )}
      </div>

      {!readingResults?.length &&
        !listeningResults?.length &&
        !speakingResults?.length &&
        !writingResults?.length && (
          <div className="rounded-lg border border-dashed bg-gray-50 p-12 text-center">
            <p className="text-gray-500">아직 완료된 과제가 없습니다.</p>
          </div>
        )}
    </main>
  );
}

function StatCard({
  icon,
  label,
  count,
  avgScore,
}: {
  icon: string;
  label: string;
  count: number;
  avgScore: number;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{icon} {label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
        </div>
        {count > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">평균</p>
            <p className="text-lg font-semibold text-blue-600">{avgScore}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="rounded-lg border bg-white shadow-sm p-4">{children}</div>
    </div>
  );
}

function ResultRow({
  number,
  score,
  date,
  subtitle,
  href,
}: {
  number: number;
  score: number;
  date: string;
  subtitle?: string;
  href: string;
}) {
  const scoreColor =
    score >= 70 ? "text-emerald-700" : score >= 50 ? "text-amber-700" : "text-rose-700";

  return (
    <Link
      href={href}
      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition group"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            #{number} {subtitle && `(${subtitle})`}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{date}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={`text-xl font-bold ${scoreColor}`}>{score}%</p>
        </div>
        <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-blue-600" />
      </div>
    </Link>
  );
}
