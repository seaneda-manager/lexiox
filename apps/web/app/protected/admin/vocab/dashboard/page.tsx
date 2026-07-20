import { getServiceSupabase } from "@/lib/supabase/service";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

type StudentProgress = {
  studentId: string;
  studentName: string;
  totalAttempts: number;
  weakWordCount: number;
  averageSuccessRate: number;
  knowSuccessRate: number;
  spellingSuccessRate: number;
  speedSuccessRate: number;
  weakWords: Array<{ id: string; text: string }>;
  activeGoals: number;
  lastActivityDate: string | null;
};

type ClassStats = {
  className: string;
  studentCount: number;
  totalAttempts: number;
  averageProgress: number;
  averageSuccessRate: number;
};

export default async function TeacherDashboardPage() {
  const supabase = getServiceSupabase();

  try {
    // 1. 모든 활성 학생 조회
    const { data: teacherStudents } = await supabase
      .from("academy_students")
      .select("id, full_name")
      .eq("is_active", true);

    if (!teacherStudents || teacherStudents.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 p-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-4xl font-bold text-slate-900">선생님 대시보드</h1>
            <div className="mt-8 rounded-lg bg-slate-50 p-6 text-center text-slate-600">
              아직 학생이 없습니다.
            </div>
          </div>
        </div>
      );
    }

    // 2. 단어 정보 미리 로드
    const { data: wordsData } = await supabase.from("words").select("id, text");
    const wordMap = new Map((wordsData ?? []).map((w: any) => [w.id, w.text]));

    // 3. 각 학생별 통계 수집
    const studentStats: StudentProgress[] = [];

    for (const student of teacherStudents) {
      // 학습 시도 조회
      const { data: attempts } = await supabase
        .from("vocab_learning_attempts")
        .select("wrong_word_ids, stage, attempted_at")
        .eq("student_id", student.id);

      const totalAttempts = attempts?.length || 0;

      // 약한 단어 수집 및 단계별 통계
      const weakWordIds = new Set<string>();
      const stageWrongCounts = { know: 0, spelling: 0, speed: 0 };
      const stageCounts = { know: 0, spelling: 0, speed: 0 };

      if (attempts) {
        for (const attempt of attempts) {
          const wrongIds = Array.isArray(attempt.wrong_word_ids) ? attempt.wrong_word_ids : [];
          wrongIds.forEach((id) => weakWordIds.add(id));

          if (attempt.stage === "know") {
            stageCounts.know++;
            stageWrongCounts.know += wrongIds.length;
          } else if (attempt.stage === "spelling") {
            stageCounts.spelling++;
            stageWrongCounts.spelling += wrongIds.length;
          } else if (attempt.stage === "speed") {
            stageCounts.speed++;
            stageWrongCounts.speed += wrongIds.length;
          }
        }
      }

      // 단계별 성공률 계산
      const knowSuccessRate = stageCounts.know > 0 ? Math.round(((stageCounts.know - stageWrongCounts.know / stageCounts.know) / stageCounts.know) * 100) : 0;
      const spellingSuccessRate = stageCounts.spelling > 0 ? Math.round(((stageCounts.spelling - stageWrongCounts.spelling / stageCounts.spelling) / stageCounts.spelling) * 100) : 0;
      const speedSuccessRate = stageCounts.speed > 0 ? Math.round(((stageCounts.speed - stageWrongCounts.speed / stageCounts.speed) / stageCounts.speed) * 100) : 0;

      const totalStages = stageCounts.know + stageCounts.spelling + stageCounts.speed;
      const averageSuccessRate = totalStages > 0 ? Math.round(((stageCounts.know + stageCounts.spelling + stageCounts.speed - (stageWrongCounts.know + stageWrongCounts.spelling + stageWrongCounts.speed)) / totalStages) * 100) : 0;

      // 약한 단어 리스트
      const weakWordList = Array.from(weakWordIds)
        .map((id) => ({ id, text: wordMap.get(id) || "[Unknown]" }))
        .sort((a, b) => (a.text || "").localeCompare(b.text || ""));

      // 활성 목표 수
      const { data: goalsData } = await supabase
        .from("vocab_student_goals")
        .select("id", { count: "exact" })
        .eq("student_id", student.id)
        .eq("status", "active");

      const lastActivity = attempts?.[attempts.length - 1]?.attempted_at || null;

      studentStats.push({
        studentId: student.id,
        studentName: student.full_name || "Unknown",
        totalAttempts,
        weakWordCount: weakWordIds.size,
        averageSuccessRate: Math.max(0, averageSuccessRate),
        knowSuccessRate: Math.max(0, knowSuccessRate),
        spellingSuccessRate: Math.max(0, spellingSuccessRate),
        speedSuccessRate: Math.max(0, speedSuccessRate),
        weakWords: weakWordList,
        activeGoals: goalsData?.count || 0,
        lastActivityDate: lastActivity ? new Date(lastActivity).toLocaleDateString("ko-KR") : null,
      });
    }

    // 3. 클래스별 통계
    const classStatsObj: ClassStats = {
      className: "전체 학생",
      studentCount: studentStats.length,
      totalAttempts: studentStats.reduce((sum, s) => sum + s.totalAttempts, 0),
      averageProgress: Math.round(studentStats.reduce((sum, s) => sum + s.totalAttempts, 0) / (studentStats.length * 50) * 100) || 0,
      averageSuccessRate: Math.round(studentStats.reduce((sum, s) => sum + s.averageSuccessRate, 0) / studentStats.length) || 0,
    };

    return (
      <DashboardClient
        students={studentStats.sort((a, b) => b.totalAttempts - a.totalAttempts)}
        classStats={[classStatsObj]}
      />
    );
  } catch (e) {
    console.error("Error loading teacher dashboard:", e);
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold text-slate-900">선생님 대시보드</h1>
          <div className="mt-8 rounded-lg bg-red-50 p-6 text-center text-red-600">
            데이터를 불러오는 중에 오류가 발생했습니다.
          </div>
        </div>
      </div>
    );
  }
}
