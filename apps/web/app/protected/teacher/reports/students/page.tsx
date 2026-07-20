// apps/web/app/(protected)/teacher/reports/students/page.tsx
import { getServiceSupabase } from "@/lib/supabase/service";
import StudentReportClient from "./StudentReportClient";

export const dynamic = "force-dynamic";

type AcademyStudentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  school: string | null;
  grade: string | null;
  program: string | null;
  auth_user_id: string | null;
};

export default async function TeacherStudentsReportPage() {
  const supabase = getServiceSupabase();

  // academy_students에서 school + grade 포함해서 가져오기
  const { data: academyStudents } = await supabase
    .from("academy_students")
    .select("id, full_name, email, school, grade, program, auth_user_id")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  const students: AcademyStudentRow[] = academyStudents ?? [];

  // 활동 데이터 조회용 ID: auth_user_id (profiles.id와 동일)
  const studentIds = students
    .map((s) => s.auth_user_id)
    .filter((id): id is string => !!id);

  if (studentIds.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-neutral-900">학생 활동 리포트</h1>
        <p className="mt-4 text-sm text-neutral-500">등록된 학생이 없습니다.</p>
      </main>
    );
  }

  // academy_students 테이블에서 student_id 추출
  const academyStudentIds = students.map((s) => s.id).filter((id): id is string => !!id);

  const [{ data: hiSessions }, { data: jrResults }, { data: vocabAttempts }, { data: vocabLearningAttempts }, { data: weakWords }] = await Promise.all([
    supabase.from("hi_naesin_sessions").select("student_id, status, submitted_at").in("student_id", studentIds),
    supabase.from("lexiox_jr_drill_results").select("student_id, stage, score_pct, completed_at").in("student_id", studentIds),
    supabase.from("vocab_drill_attempts").select("user_id, is_correct, created_at").in("user_id", studentIds),
    supabase.from("vocab_learning_attempts").select("student_id, wrong_word_ids, stage").in("student_id", academyStudentIds),
    supabase.from("words").select("id, text"),
  ]);

  const hiSessionRows = hiSessions ?? [];
  const jrRows = jrResults ?? [];
  const vocabRows = vocabAttempts ?? [];
  const vocabLearningRows = vocabLearningAttempts ?? [];
  const wordMap = new Map((weakWords ?? []).map((w) => [w.id, w.text]));

  const summaries = students.map((s) => {
    const uid = s.auth_user_id; // 활동 데이터는 auth_user_id 기준

    const sessions = uid ? hiSessionRows.filter((r) => r.student_id === uid) : [];
    const completed = sessions.filter((r) => r.status === "completed" || r.status === "submitted");
    const inProgress = sessions.filter((r) => r.status === "started");
    const lastHi = sessions.map((r) => r.submitted_at).filter(Boolean).sort().at(-1) ?? null;

    const jr = uid ? jrRows.filter((r) => r.student_id === uid) : [];
    const jrScores = jr.map((r) => r.score_pct).filter((v): v is number => v !== null);
    const jrAvg = jrScores.length > 0
      ? Math.round(jrScores.reduce((a, b) => a + b, 0) / jrScores.length)
      : null;
    const lastJr = jr.map((r) => r.completed_at).sort().at(-1) ?? null;

    const vAttempts = uid ? vocabRows.filter((r) => r.user_id === uid) : [];
    const vCorrect = vAttempts.filter((r) => r.is_correct).length;
    const lastVocab = vAttempts.map((r) => r.created_at).sort().at(-1) ?? null;

    // 새로운 vocab_learning_attempts 데이터
    const vocabLearning = s.id ? vocabLearningRows.filter((r) => r.student_id === s.id) : [];
    const allWeakWordIds = new Set<string>();
    vocabLearning.forEach((attempt) => {
      const wrongIds = Array.isArray(attempt.wrong_word_ids) ? attempt.wrong_word_ids : [];
      wrongIds.forEach((id) => allWeakWordIds.add(id));
    });

    const weakWordList = Array.from(allWeakWordIds)
      .map((id) => ({ id, text: wordMap.get(id) || "[Unknown]" }))
      .sort((a, b) => (a.text || "").localeCompare(b.text || ""));

    return {
      id: s.id,
      name: s.full_name ?? "(이름 없음)",
      email: s.email ?? "",
      school: s.school,       // 학교명
      grade: s.grade,         // 고1 / 중2 / 초5 등
      program: s.program,
      hiNaeSin: { total: sessions.length, completed: completed.length, inProgress: inProgress.length, lastAt: lastHi },
      jrNaesin: { total: jr.length, avgScore: jrAvg, lastAt: lastJr },
      vocab: { total: vAttempts.length, correct: vCorrect, lastAt: lastVocab },
      vocabLearning: { attempts: vocabLearning.length, weakWords: weakWordList },
    };
  });

  // 프로그램별 카운트 (요약 카드용)
  const programCounts = summaries.reduce<Record<string, number>>((acc, s) => {
    const key = s.program ?? "미지정";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header>
        <div className="text-xs uppercase tracking-widest text-neutral-400">선생님 / 리포트</div>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">학생 활동 리포트</h1>
        <p className="mt-1 text-sm text-neutral-500">
          학교급 버튼으로 필터링하고, 프로그램에 따라 해당 컬럼만 활성화됩니다
        </p>
      </header>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">전체 학생</div>
          <div className="mt-2 text-3xl font-bold text-neutral-900">{students.length}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">LEXiOX-내신</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">{programCounts["lexiox"] ?? 0}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">TOEFL</div>
          <div className="mt-2 text-3xl font-bold text-blue-700">{programCounts["toefl"] ?? 0}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">미지정</div>
          <div className="mt-2 text-3xl font-bold text-neutral-400">{programCounts["미지정"] ?? 0}</div>
        </div>
      </div>

      {/* 필터 + 테이블 (클라이언트) */}
      <StudentReportClient
        summaries={summaries}
        hiSessionTotal={hiSessionRows.length}
        vocabTotal={vocabRows.length}
      />

      <p className="text-xs text-neutral-400">
        * TOEFL Reading / Listening / Speaking / Writing 결과는 순차적으로 추가 예정
      </p>
    </main>
  );
}
