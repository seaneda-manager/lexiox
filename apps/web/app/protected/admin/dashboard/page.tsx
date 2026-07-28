import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChevronRight, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

type StudentSummary = {
  id: string;
  name: string;
  reading_count: number;
  listening_count: number;
  speaking_count: number;
  writing_count: number;
  total_completed: number;
};

export default async function StudentListDashboard() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get all students (users who have taken any test)
  const { data: allResults } = await supabase
    .from("reading_results_2026")
    .select("user_id")
    .limit(1000);

  const { data: listeningResults } = await supabase
    .from("listening_results_2026")
    .select("user_id")
    .limit(1000);

  const { data: speakingResults } = await supabase
    .from("speaking_results_2026")
    .select("user_id")
    .limit(1000);

  const { data: writingResults } = await supabase
    .from("writing_2026_sessions")
    .select("user_id")
    .limit(1000);

  const uniqueUserIds = new Set<string>();
  [allResults, listeningResults, speakingResults, writingResults].forEach(
    (results) => results?.forEach((r: any) => uniqueUserIds.add(r.user_id))
  );

  // Get student names
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const userMap = new Map(
    authUsers?.users.map((u) => [
      u.id,
      u.user_metadata?.name ||
        u.user_metadata?.full_name ||
        u.email ||
        "Unknown",
    ]) || []
  );

  // Count results for each student
  const studentSummaries: StudentSummary[] = [];

  for (const studentId of uniqueUserIds) {
    const readingCount = await supabase
      .from("reading_results_2026")
      .select("id", { count: "exact" })
      .eq("user_id", studentId);

    const listeningCount = await supabase
      .from("listening_results_2026")
      .select("id", { count: "exact" })
      .eq("user_id", studentId);

    const speakingCount = await supabase
      .from("speaking_results_2026")
      .select("id", { count: "exact" })
      .eq("user_id", studentId);

    const writingCount = await supabase
      .from("writing_2026_sessions")
      .select("id", { count: "exact" })
      .eq("user_id", studentId);

    const reading = readingCount.count || 0;
    const listening = listeningCount.count || 0;
    const speaking = speakingCount.count || 0;
    const writing = writingCount.count || 0;

    studentSummaries.push({
      id: studentId,
      name: userMap.get(studentId) || "Unknown Student",
      reading_count: reading,
      listening_count: listening,
      speaking_count: speaking,
      writing_count: writing,
      total_completed: reading + listening + speaking + writing,
    });
  }

  // Sort by total completed (desc), then by name
  studentSummaries.sort((a, b) => {
    if (b.total_completed !== a.total_completed) {
      return b.total_completed - a.total_completed;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">👨‍🎓 학생별 진행 현황</h1>
        <p className="text-sm text-gray-600">
          학생을 선택하여 상세한 시험 결과를 확인하세요.
        </p>
      </div>

      {/* Student Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {studentSummaries.map((student) => (
          <Link
            key={student.id}
            href={`/admin/dashboard/students/${student.id}`}
            className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600">
                  {student.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  총 {student.total_completed}개 과제 완료
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 flex-shrink-0 mt-0.5" />
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
              <StatItem label="📖 Reading" count={student.reading_count} />
              <StatItem label="🎧 Listening" count={student.listening_count} />
              <StatItem label="🎤 Speaking" count={student.speaking_count} />
              <StatItem label="✍️ Writing" count={student.writing_count} />
            </div>
          </Link>
        ))}
      </div>

      {studentSummaries.length === 0 && (
        <div className="rounded-lg border border-dashed bg-gray-50 p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">아직 완료된 과제가 없습니다.</p>
        </div>
      )}
    </main>
  );
}

function StatItem({ label, count }: { label: string; count: number }) {
  return (
    <div className="text-center p-2 rounded bg-gray-50">
      <div className="font-semibold text-gray-900">{count}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
