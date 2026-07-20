// apps/web/app/(protected)/teacher/students/page.tsx
import Link from "next/link";
import {
  BarChart2,
  BookOpenCheck,
  Filter,
  Search,
  TrendingDown,
  TrendingUp,
  Activity,
  Users2,
} from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";

type Level = "초급" | "중급" | "상급";
type Trend = "up" | "down" | "flat";

type StudentRow = {
  id: string;
  name: string;
  school: string;
  grade: string;
  level: Level;
  trend: Trend;
  latestTestLabel: string;
  latestTestDate: string;
  latestScore: number | null;
  latestMaxScore: number | null;
  focusTag: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  school: string | null;
  grade: string | null;
  level: string | null;
  role: string | null;
};

type ReadingResultRow = {
  user_id: string;
  label: string | null;
  finished_at: string | null;
  total_questions: number | null;
  correct_count: number | null;
};

function getTrendBadge(trend: Trend) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
        <TrendingUp className="h-3 w-3" />
        상승
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
        <TrendingDown className="h-3 w-3" />
        하락
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
      <Activity className="h-3 w-3" />
      유지
    </span>
  );
}

function getLevelBadge(level: Level) {
  if (level === "초급") {
    return (
      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
        초급
      </span>
    );
  }
  if (level === "중급") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        중급
      </span>
    );
  }
  return (
    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
      상급
    </span>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherStudentsPage() {
  const supabase = await getServerSupabase();

  // 1) academy_students에서 학생 목록 (profiles RLS 우회)
  const { data: studentRows } = await supabase
    .from("academy_students")
    .select("id, display_name, school, grade, level, user_id, auth_user_id")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  const safeProfiles: ProfileRow[] = (studentRows ?? []).map((s: any) => ({
    id:        (s.user_id ?? s.auth_user_id ?? s.id) as string,
    full_name: s.display_name,
    school:    s.school,
    grade:     s.grade,
    level:     s.level,
    role:      "student",
  }));

  const studentIds = safeProfiles.map((p) => p.id).filter(Boolean);

  // 2) 각 학생의 최근 Reading 결과
  let latestReadingMap: Record<string, ReadingResultRow> = {};

  if (studentIds.length > 0) {
    const { data: readingRows } = await supabase
      .from("reading_results_2026")
      .select("user_id, label, finished_at, total_questions, correct_count")
      .in("user_id", studentIds)
      .order("finished_at", { ascending: false });

    (readingRows ?? []).forEach((row) => {
      if (!row.user_id) return;
      if (!latestReadingMap[row.user_id]) {
        latestReadingMap[row.user_id] = row as ReadingResultRow;
      }
    });
  }

  // 3) UI용 StudentRow로 매핑
  const students: StudentRow[] = safeProfiles.map((p) => {
    const latest = latestReadingMap[p.id];

    const levelFromDb = (p.level as Level | null) ?? "중급";
    const latestDate  = latest?.finished_at ? latest.finished_at.slice(0, 10) : "-";
    const latestLabel = latest?.label ?? "최근 시험 없음";
    const latestScore = latest?.correct_count ?? null;
    const latestMaxScore = latest?.total_questions ?? null;

    return {
      id: p.id,
      name: p.full_name ?? "이름 미입력",
      school: p.school ?? "-",
      grade:  p.grade  ?? "-",
      level:  levelFromDb,
      trend:  "flat",
      latestTestLabel: latestLabel,
      latestTestDate:  latestDate,
      latestScore,
      latestMaxScore,
      focusTag: latest ? "Reading 2026 복습" : "레벨링/Placement 예정",
    };
  });

  const studentsWithScore = students.filter(
    (s) => s.latestScore !== null && s.latestMaxScore !== null
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* 상단 헤더 */}
      <header className="space-y-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
              <Users2 className="h-3.5 w-3.5" />
              Teacher · Students
            </div>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-gray-900">
              학생 관리
            </h1>
            <p className="mt-1 text-xs text-gray-600">
              반/학교/레벨별 학생을 한눈에 보고, 각 학생 상세 페이지에서
              성적·약점·메모를 관리합니다.
            </p>
          </div>

          {/* 검색 + 필터 (UI만, 아직 기능 없음) */}
          <div className="flex flex-col gap-2 sm:w-72">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="이름, 학교, 메모 키워드 검색 (준비 중)"
                className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                readOnly
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-700"
              >
                <Filter className="h-3.5 w-3.5" />
                필터 (Coming Soon)
              </button>
            </div>
          </div>
        </div>

        {/* 간단 요약 카드 */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-3 text-xs shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-500">
                전체 학생 수
              </span>
              <Users2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-gray-900">
              {students.length}
            </div>
            <p className="mt-1 text-[11px] text-gray-600">
              추후 반/학교/레벨별 그룹으로도 볼 수 있게 확장할 예정입니다.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-3 text-xs shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-500">
                최근 시험 응시 학생
              </span>
              <BookOpenCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-xl font-bold text-gray-900">
              {studentsWithScore.length}
            </div>
            <p className="mt-1 text-[11px] text-gray-600">
              Reading/Listening/Full Demo 등 최근 시험 기록이 있는 학생 수입니다.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-3 text-xs shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-500">
                커리큘럼/레벨 요약
              </span>
              <BarChart2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-[11px] text-gray-700">
              나중에 여기서
              <br />
              · 초급/중급/상급 인원 비율
              <br />
              · RLSP/내신/토플 코스 분포
              <br />
              를 간단 그래프로 보여줄 수 있습니다.
            </p>
          </div>
        </div>
      </header>

      {/* 학생 리스트 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">
            학생 리스트
          </h2>
          <span className="text-[11px] text-gray-500">
            클릭하면 학생별 상세 페이지로 이동합니다.
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="hidden border-b bg-gray-50 px-4 py-2 text-[11px] font-medium text-gray-500 md:grid md:grid-cols-6">
            <div className="col-span-2">학생</div>
            <div>레벨/추세</div>
            <div>최근 시험</div>
            <div>포커스</div>
            <div className="text-right">액션</div>
          </div>

          <div className="divide-y">
            {students.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-500">
                현재 등록된 학생이 없습니다.
                <br />
                학생 프로필이 생성되면 이곳에 자동으로 표시됩니다.
              </div>
            ) : (
              students.map((s) => {
                const scoreText =
                  s.latestScore !== null && s.latestMaxScore !== null
                    ? `${s.latestScore}/${s.latestMaxScore}`
                    : "점수 정보 없음";

                return (
                  <article
                    key={s.id}
                    className="px-3 py-3 text-xs hover:bg-emerald-50/40 md:grid md:grid-cols-6 md:items-center md:px-4"
                  >
                    {/* 학생 기본 정보 */}
                    <div className="col-span-2 space-y-1">
                      <div className="flex items-center justify-between gap-2 md:block">
                        <div className="font-semibold text-gray-900">
                          {s.name}
                        </div>
                        <div className="md:hidden">
                          {getTrendBadge(s.trend)}
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-600">
                        {s.school} · {s.grade}
                      </div>
                    </div>

                    {/* 레벨 / 추세 */}
                    <div className="mt-2 flex items-center gap-2 md:mt-0">
                      {getLevelBadge(s.level)}
                      <span className="hidden md:inline">
                        {getTrendBadge(s.trend)}
                      </span>
                    </div>

                    {/* 최근 시험 */}
                    <div className="mt-2 space-y-0.5 md:mt-0">
                      <div className="text-[11px] font-medium text-gray-700">
                        {s.latestTestLabel}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {s.latestTestDate} · {scoreText}
                      </div>
                    </div>

                    {/* 포커스 태그 */}
                    <div className="mt-2 md:mt-0">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        {s.focusTag}
                      </span>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="mt-3 flex justify-end md:mt-0">
                      <Link
                        href={`/teacher/students/${s.id}`}
                        className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50"
                      >
                        상세 보기
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <p className="mt-1 text-[11px] text-gray-500">
          현재는 Supabase{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">profiles</code> /
          <code className="rounded bg-gray-100 px-1 py-0.5">
            reading_results_2026
          </code>{" "}
          를 기반으로 간단히 구성한 버전입니다.
        </p>
      </section>
    </main>
  );
}
