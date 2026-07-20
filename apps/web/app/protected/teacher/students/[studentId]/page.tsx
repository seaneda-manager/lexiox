// apps/web/app/(protected)/teacher/students/[studentId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  CalendarDays,
  Mic2,
  NotebookText,
  TrendingDown,
  TrendingUp,
  Activity,
} from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Trend = "up" | "down" | "flat";

type StudentDetail = {
  id: string;
  name: string;
  school: string;
  grade: string;
  levelLabel: string;
  trend: Trend;
  currentFocus: string;
  nextGoal: string;
};

type TestResult = {
  id: string;
  label: string;
  date: string;
  totalQuestions: number | null;
};

type StudentNote = {
  id: string;
  date: string;
  author: string;
  type: "teacher" | "parent" | "student";
  content: string;
};

function getTrendLabel(trend: Trend) {
  if (trend === "up") return "최근 상승 추세";
  if (trend === "down") return "최근 하락 추세";
  return "점수 변화 거의 없음";
}

function getTrendIcon(trend: Trend) {
  if (trend === "up") {
    return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  }
  if (trend === "down") {
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  }
  return <Activity className="h-4 w-4 text-gray-400" />;
}

type PageProps = {
  params: Promise<{ studentId: string }>;
};

export default async function TeacherStudentDetailPage({ params }: PageProps) {
  const { studentId } = await params;

  const supabase = await getServerSupabase();

  // 1) 학생 프로필 가져오기 (profiles)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", studentId)
    .maybeSingle();

  if (profileError || !profile) {
    notFound();
  }

  // 2) Reading 2026 결과 가져오기 (최신 10개)
  const { data: readingRows, error: readingError } = await supabase
    .from("reading_results_2026")
    .select("id, label, total_questions, finished_at")
    .eq("user_id", studentId)
    .order("finished_at", { ascending: false })
    .limit(10);

  if (readingError) {
    console.error("TeacherStudentDetailPage reading_results_2026 error", readingError);
  }

  const safeReading = readingRows ?? [];

  const testResults: TestResult[] = safeReading.map((r) => ({
    id: (r as any).id,
    label: (r as any).label ?? "Reading 2026 Test",
    date: (r as any).finished_at ? String((r as any).finished_at).slice(0, 10) : "날짜 정보 없음",
    totalQuestions: (r as any).total_questions ?? null,
  }));

  const latestTest = testResults[0];

  // 3) 학생 기본 정보 (지금은 프로필 + placeholder)
  const student: StudentDetail = {
    id: profile.id,
    name: profile.full_name ?? "이름 미등록",
    school: "학교 정보 없음",
    grade: "학년 정보 없음",
    levelLabel: "레벨 미지정",
    trend: "flat", // 추후 성적 추이 계산해서 바꾸기
    currentFocus:
      "아직 설정된 포커스가 없습니다. 상담 후 이 학생의 주요 지도 포인트를 정해 주세요.",
    nextGoal:
      "다음 목표를 정한 뒤, 메모/노트 테이블과 연동해서 이 영역에 보여줄 예정입니다.",
  };

  // 4) 약점/메모는 아직 DB 없음 → 빈 배열 + 안내 문구
  const weaknesses: never[] = [];
  const notes: StudentNote[] = [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* 상단 헤더 */}
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/teacher/students"
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-500 hover:text-emerald-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              학생 목록으로
            </Link>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row md:items-center">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500">Student Profile</div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">{student.name}</h1>
            <div className="text-xs text-gray-600">
              {student.school} · {student.grade} · {student.levelLabel}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              {getTrendIcon(student.trend)}
              <span>{getTrendLabel(student.trend)}</span>
            </div>
          </div>

          {latestTest && (
            <div className="flex gap-2 text-xs sm:text-sm">
              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-left">
                <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                  <CalendarDays className="h-3 w-3" />
                  <span>최근 Reading 시험</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-gray-900">{latestTest.label}</div>
                <div className="mt-1 text-[11px] text-gray-600">
                  {latestTest.date}
                  {latestTest.totalQuestions !== null && ` · 문항 수 ${latestTest.totalQuestions}문항`}
                </div>
              </div>

              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-left">
                <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                  <BarChart2 className="h-3 w-3" />
                  <span>다음 목표</span>
                </div>
                <p className="mt-1 max-w-xs text-[11px] text-gray-700">{student.nextGoal}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 메인 2컬럼 레이아웃 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 왼쪽: 시험 히스토리 */}
        <section className="space-y-3 lg:col-span-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-800">최근 Reading 2026 시험 히스토리</h2>
          </div>

          {testResults.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-gray-50 p-3 text-xs text-gray-600">
              아직 Reading 2026 시험 기록이 없습니다. 시험이 쌓이면 이곳에 자동으로 표시됩니다.
            </div>
          ) : (
            <div className="space-y-2">
              {testResults.map((t) => (
                <article
                  key={t.id}
                  className="flex flex-col gap-2 rounded-xl border bg-white p-3 text-xs shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="text-[11px] font-medium text-gray-500">{t.date} · Reading</div>
                    <div className="text-sm font-semibold text-gray-900">{t.label}</div>
                    <p className="text-[11px] text-gray-600">
                      {t.totalQuestions !== null
                        ? `총 ${t.totalQuestions}문항 · 세부 문항별 분석은 추후 리포트 화면에서 제공 예정입니다.`
                        : "문항 수 정보 없음"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* 오른쪽: 현재 포커스 & 약점 요약 */}
        <section className="space-y-3">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <BarChart2 className="h-4 w-4 text-emerald-600" />
              현재 포커스 & 목표
            </h2>
            <div className="mt-2 space-y-2 text-xs">
              <div>
                <div className="text-[11px] font-medium text-gray-500">현재 지도 포인트</div>
                <p className="mt-1 text-gray-700">{student.currentFocus}</p>
              </div>
              <div className="mt-2 border-t pt-2">
                <div className="text-[11px] font-medium text-gray-500">다음 목표</div>
                <p className="mt-1 text-gray-700">{student.nextGoal}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <NotebookText className="h-4 w-4 text-emerald-600" />
              약점 요약
            </h2>
            {weaknesses.length === 0 ? (
              <div className="mt-2 rounded-lg border border-dashed bg-gray-50 p-3 text-[11px] text-gray-600">
                아직 영역별 약점 데이터가 없습니다.
                <br />
                나중에 RLSP/내신/TOEFL 결과와 연결해서 자동으로 생성할 수 있습니다.
              </div>
            ) : (
              <ul className="mt-2 space-y-2 text-xs">{/* 향후 DB 연결 시 map 추가 */}</ul>
            )}
          </div>
        </section>
      </div>

      {/* 하단: 영역별 약점 상세 + 메모 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 약점 상세 (placeholder) */}
        <section className="space-y-3 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Mic2 className="h-4 w-4 text-emerald-600" />
            영역별 약점 & 수업 플랜 (Coming Soon)
          </h2>
          <div className="rounded-xl border border-dashed bg-white p-3 text-xs text-gray-600">
            나중에 이 영역에는 문법/구문/Reading/Listening/Speaking/Writing 별로 약점과 구체적인 수업 플랜을
            보여줄 수 있습니다.
            <br />
            현재는 DB 스키마 설계 후 연동 예정입니다.
          </div>
        </section>

        {/* 메모 / 코멘트 */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <NotebookText className="h-4 w-4 text-emerald-600" />
            메모 & 코멘트
          </h2>

          <div className="space-y-2 text-xs">
            {notes.length === 0 && (
              <div className="rounded-xl border border-dashed bg-gray-50 p-3 text-[11px] text-gray-600">
                아직 등록된 메모가 없습니다.
                <br />
                수업 중 느낀 점, 학부모와의 대화, 학생 자기 코멘트를 기록할 수 있는 별도 테이블을 만든 뒤 이
                영역에 연결할 예정입니다.
              </div>
            )}

            {notes.map((n) => (
              <article key={n.id} className="rounded-xl border bg-white p-3 text-xs shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-medium text-gray-500">{n.date}</div>
                  <div className="text-[11px] font-semibold text-gray-700">
                    {n.author}
                    <span className="ml-1 text-[10px] text-gray-500">
                      {n.type === "teacher" && "선생님 메모"}
                      {n.type === "parent" && "학부모 코멘트"}
                      {n.type === "student" && "학생 코멘트"}
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-gray-700">{n.content}</p>
              </article>
            ))}
          </div>

          <div className="rounded-xl border border-dashed bg-white p-3 text-xs text-gray-600">
            <div className="text-[11px] font-semibold text-gray-800">메모 추가 (Coming Soon)</div>
            <p className="mt-1 text-[11px]">
              추후 이 영역에 간단한 메모 입력 폼을 넣어서, 선생님이 바로 기록하고 저장할 수 있도록 Supabase
              테이블과 연결할 예정입니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
