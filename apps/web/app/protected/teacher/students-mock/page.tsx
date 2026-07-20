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

const mockStudentRows: StudentRow[] = [
  {
    id: "s-minsu",
    name: "김민수",
    school: "○○중학교",
    grade: "중2",
    level: "중급",
    trend: "up",
    latestTestLabel: "Reading 2026 – Placement v1",
    latestTestDate: "2025-11-24",
    latestScore: 75,
    latestMaxScore: 100,
    focusTag: "Detail 근거 체크",
  },
  {
    id: "s-seoyeon",
    name: "이서연",
    school: "△△여중",
    grade: "중3",
    level: "상급",
    trend: "up",
    latestTestLabel: "Full TOEFL Demo #1",
    latestTestDate: "2025-11-22",
    latestScore: 88,
    latestMaxScore: 120,
    focusTag: "Speaking 심화 토픽",
  },
  {
    id: "s-junho",
    name: "박준호",
    school: "□□중학교",
    grade: "중1",
    level: "초급",
    trend: "flat",
    latestTestLabel: "Basic Reading Set – Starter",
    latestTestDate: "2025-11-15",
    latestScore: null,
    latestMaxScore: null,
    focusTag: "단어/기본문장",
  },
];

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

export default async function TeacherStudentsMockPage() {
  // TODO: 나중에 Supabase에서 실제 학생 리스트 가져오기
  const students = mockStudentRows;

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
              {students.filter((s) => s.latestScore !== null).length}
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
            학생 리스트 (Mock Data)
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
            {students.map((s) => {
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
                    <span className="hidden md:inline">{getTrendBadge(s.trend)}</span>
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
            })}
          </div>
        </div>

        <p className="mt-1 text-[11px] text-gray-500">
          ※ 실제 서비스에서는 이 리스트를 Supabase{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">students</code> /
          <code className="rounded bg-gray-100 px-1 py-0.5">
            reading_results_2026
          </code>{" "}
          등과 연결해서 자동으로 불러오게 됩니다.
        </p>
      </section>
    </main>
  );
}
