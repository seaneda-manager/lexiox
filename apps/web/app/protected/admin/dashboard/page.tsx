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
  has_hi_naesin: boolean;
};

const GRADE_ORDER = ["중1", "중2", "중3", "고1", "고2", "고3", "미지정"] as const;

// academy_students.grade는 관리자가 자유 입력한 값이라 "고1"/"H1"/"3학년" 등 형식이
// 제각각이다. 확실히 판별되는 것만 6개 학년으로 묶고, 애매한 건 "미지정"으로 둔다.
function normalizeGrade(raw: string | null | undefined): (typeof GRADE_ORDER)[number] {
  const s = (raw ?? "").trim();
  if (/^중\s*1|^M1/i.test(s)) return "중1";
  if (/^중\s*2|^M2/i.test(s)) return "중2";
  if (/^중\s*3|^M3/i.test(s)) return "중3";
  if (/^고\s*1|^H1/i.test(s)) return "고1";
  if (/^고\s*2|^H2/i.test(s)) return "고2";
  if (/^고\s*3|^H3/i.test(s)) return "고3";
  return "미지정";
}

export default async function StudentListDashboard() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 전체 학생 목록. 예전엔 "완료된 시험이 있는 유저"만 auth.users에서 추려서
  // 대부분이 "Unknown Student"로 뜨고, 시험을 아직 안 본 학생은 아예 안 보였다.
  // profiles가 실제 학생 전체 명단이고 이름도 여기(full_name/name)에 있다.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, name, email, program")
    .eq("role", "student")
    .order("full_name", { ascending: true });

  const students = profiles ?? [];
  const studentIds = students.map((s) => s.id);

  // academy_students가 실제로 관리자가 채워 넣는 학년 정보를 갖고 있다
  // (profiles.grade는 대부분 비어있다).
  const { data: academyRows } =
    studentIds.length > 0
      ? await supabase
          .from("academy_students")
          .select("auth_user_id, grade")
          .in("auth_user_id", studentIds)
      : { data: [] as { auth_user_id: string; grade: string | null }[] };

  const gradeByAuthId = new Map((academyRows ?? []).map((r) => [r.auth_user_id, r.grade]));

  // "Lexiox"는 프로그램명이 아니라 브랜드명이라 그 자체로는 학생이 뭘 하는지 알 수 없다.
  // profiles.program이 "toefl"이 아닌 학생들이 실제로 Hi-내신 과제를 배정받았는지로 구분한다.
  const { data: hiNaesinRows } =
    studentIds.length > 0
      ? await supabase.from("hi_naesin_assignments").select("student_id").in("student_id", studentIds)
      : { data: [] as { student_id: string }[] };
  const hiNaesinIds = new Set((hiNaesinRows ?? []).map((r) => r.student_id));

  // 완료 개수 (기존 로직 그대로 — 학생 수가 적어 N+1이어도 감내할 수준)
  const studentSummaries: StudentSummary[] = [];
  for (const s of students) {
    const [readingCount, listeningCount, speakingCount, writingCount] = await Promise.all([
      supabase.from("reading_results_2026").select("id", { count: "exact", head: true }).eq("user_id", s.id),
      supabase.from("listening_results_2026").select("id", { count: "exact", head: true }).eq("user_id", s.id),
      supabase.from("speaking_results_2026").select("id", { count: "exact", head: true }).eq("user_id", s.id),
      supabase.from("writing_2026_sessions").select("id", { count: "exact", head: true }).eq("user_id", s.id),
    ]);

    const reading = readingCount.count || 0;
    const listening = listeningCount.count || 0;
    const speaking = speakingCount.count || 0;
    const writing = writingCount.count || 0;

    studentSummaries.push({
      id: s.id,
      name: s.full_name || s.name || s.email || "이름 미설정",
      reading_count: reading,
      listening_count: listening,
      speaking_count: speaking,
      writing_count: writing,
      total_completed: reading + listening + speaking + writing,
      has_hi_naesin: hiNaesinIds.has(s.id),
    });
  }

  const summaryById = new Map(studentSummaries.map((s) => [s.id, s]));
  const byName = (a: { id: string }, b: { id: string }) =>
    (summaryById.get(a.id)?.name ?? "").localeCompare(summaryById.get(b.id)?.name ?? "");

  const toeflStudents = students.filter((s) => s.program === "toefl").sort(byName);
  const lexioxStudents = students.filter((s) => s.program === "lexiox").sort(byName);
  const otherStudents = students.filter((s) => s.program !== "toefl" && s.program !== "lexiox").sort(byName);

  const lexioxByGrade = new Map<(typeof GRADE_ORDER)[number], typeof lexioxStudents>();
  for (const g of GRADE_ORDER) lexioxByGrade.set(g, []);
  for (const s of lexioxStudents) {
    const grade = normalizeGrade(gradeByAuthId.get(s.id));
    lexioxByGrade.get(grade)!.push(s);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">👨‍🎓 학생별 진행 현황</h1>
        <p className="text-sm text-gray-600">
          학생을 선택하여 상세한 시험 결과를 확인하세요. 총 {students.length}명.
        </p>
      </div>

      <CategorySection title="🎯 TOEFL" students={toeflStudents} summaryById={summaryById} />

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">📘 내신 / Junior</h2>
        {GRADE_ORDER.map((grade) => {
          const list = lexioxByGrade.get(grade) ?? [];
          if (list.length === 0) return null;
          return (
            <CategorySection
              key={grade}
              title={grade === "미지정" ? "학년 미지정" : `${grade.startsWith("중") ? "중학생" : "고등학생"} ${grade}`}
              students={list}
              summaryById={summaryById}
              muted={grade === "미지정"}
              showToeflStats={false}
            />
          );
        })}
        {lexioxStudents.length === 0 && (
          <p className="text-sm text-gray-400">내신/Junior 프로그램 학생이 없습니다.</p>
        )}
      </div>

      {otherStudents.length > 0 && (
        <CategorySection
          title="프로그램 미지정"
          students={otherStudents}
          summaryById={summaryById}
          muted
          showToeflStats={false}
        />
      )}

      {students.length === 0 && (
        <div className="rounded-lg border border-dashed bg-gray-50 p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">등록된 학생이 없습니다.</p>
        </div>
      )}
    </main>
  );
}

function CategorySection({
  title,
  students,
  summaryById,
  muted = false,
  showToeflStats = true,
}: {
  title: string;
  students: { id: string }[];
  summaryById: Map<string, StudentSummary>;
  muted?: boolean;
  /** TOEFL 섹션 R/L/S/W 통계 표시 여부. 내신/Junior 학생은 이 값들이 항상 0이라 대신 Hi-내신 배지를 보여준다. */
  showToeflStats?: boolean;
}) {
  if (students.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className={`text-sm font-semibold ${muted ? "text-gray-400" : "text-gray-700"}`}>
        {title} <span className="font-normal text-gray-400">({students.length}명)</span>
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => {
          const summary = summaryById.get(s.id);
          if (!summary) return null;
          return (
            <Link
              key={s.id}
              href={`/admin/dashboard/students/${s.id}`}
              className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate group-hover:text-blue-600">
                    {summary.name}
                  </h4>
                  {showToeflStats ? (
                    <p className="text-xs text-gray-500 mt-1">
                      총 {summary.total_completed}개 과제 완료
                    </p>
                  ) : (
                    summary.has_hi_naesin && (
                      <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700">
                        Hi-내신 배정됨
                      </span>
                    )
                    // 단어(Voca) 배정 여부는 DB에서 신뢰성 있게 조회할 방법이 아직 없어
                    // "미배정"처럼 단정하는 표시는 넣지 않는다 (오탐 위험).
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 flex-shrink-0 mt-0.5" />
              </div>

              {showToeflStats && (
                <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                  <StatItem label="📖 Reading" count={summary.reading_count} />
                  <StatItem label="🎧 Listening" count={summary.listening_count} />
                  <StatItem label="🎤 Speaking" count={summary.speaking_count} />
                  <StatItem label="✍️ Writing" count={summary.writing_count} />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
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
