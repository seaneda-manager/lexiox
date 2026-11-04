import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { countDueReviewByTrack } from "@/lib/vocab/review/reviewItems";

export const dynamic = "force-dynamic";

/**
 * 시험 센터 — 흩어져 있던 시험 메뉴(예상문제 / 시험 목록 / 선생님 단어 시험 / Daily Tests / 단어 시험)를
 * 한 곳에서 보고, 종류별로 "아직 안 본 것"이 몇 개인지 한눈에 알려 준다.
 * 각 카드는 기존 페이지로 연결만 한다 (기존 경로·데이터는 그대로).
 */

type Card = {
  key: string;
  href: string;
  icon: string;
  title: string;
  desc: string;
  pending: number | null; // null = 집계 불가(표시 안 함)
  pendingLabel: string;
  tone: string; // 아이콘 배경
};

async function safeCount(fn: () => Promise<number>): Promise<number | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export default async function StudentTestCenterPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const uid = user.id;

  const [reviewDue, vocabExams, expected, tests, daily] = await Promise.all([
    // 오늘 복습할 단어 수 (prescreen 모름 + speed 오답 → 복습 회차 규칙)
    safeCount(async () => {
      const admin = getServiceRoleClient();
      const { data: st } = await admin
        .from("academy_students")
        .select("id")
        .or(`user_id.eq.${uid},auth_user_id.eq.${uid},profile_id.eq.${uid}`)
        .maybeSingle();
      if (!st?.id) return 0;
      const byTrack = await countDueReviewByTrack(admin, { studentId: String(st.id) });
      return Object.values(byTrack).reduce((a, b) => a + b, 0);
    }),
    // 선생님이 낸 단어 시험: 배정됐지만 아직 제출/채점 안 된 것
    safeCount(async () => {
      const admin = getServiceRoleClient();
      const { data: targets } = await admin.from("vocab_teacher_exam_targets").select("exam_id").eq("student_id", uid);
      const ids = (targets ?? []).map((t: any) => String(t.exam_id));
      if (ids.length === 0) return 0;
      const { data: sessions } = await admin
        .from("vocab_test_sessions")
        .select("exam_id, status")
        .eq("student_id", uid)
        .in("exam_id", ids);
      const done = new Set(
        (sessions ?? [])
          .filter((s: any) => s.status === "submitted" || s.status === "graded")
          .map((s: any) => String(s.exam_id)),
      );
      return ids.filter((id) => !done.has(id)).length;
    }),
    // 예상문제: 배정됐지만 제출 안 한 것
    safeCount(async () => {
      const { data: assignments } = await supabase
        .from("generated_exam_assignments")
        .select("id")
        .eq("student_id", uid);
      const ids = (assignments ?? []).map((a: any) => String(a.id));
      if (ids.length === 0) return 0;
      const { data: responses } = await supabase
        .from("generated_exam_responses")
        .select("assignment_id, submitted_at")
        .in("assignment_id", ids);
      const submitted = new Set(
        (responses ?? []).filter((r: any) => r.submitted_at).map((r: any) => String(r.assignment_id)),
      );
      return ids.filter((id) => !submitted.has(id)).length;
    }),
    // TOEFL Full/Half/Individual 테스트: 배정됨 / 진행 중
    safeCount(async () => {
      const { data } = await supabase
        .from("test_assignments")
        .select("id, status, expires_at")
        .eq("student_id", uid)
        .in("status", ["assigned", "in_progress"]);
      const now = Date.now();
      return (data ?? []).filter((r: any) => !r.expires_at || new Date(r.expires_at).getTime() >= now).length;
    }),
    // Daily Tests: 시작 전 / 진행 중
    safeCount(async () => {
      const { count } = await supabase
        .from("daily_tests")
        .select("id", { count: "exact", head: true })
        .eq("student_id", uid)
        .in("status", ["assigned", "in_progress"]);
      return count ?? 0;
    }),
  ]);

  const cards: Card[] = [
    {
      key: "vocab-review",
      href: "/vocab/test",
      icon: "📚",
      title: "오늘의 복습",
      desc: "학습할 때 틀렸거나 몰랐던 단어를 다시 확인해요. 이틀은 꼭 해야 해요.",
      pending: reviewDue,
      pendingLabel: "복습할 단어",
      tone: "bg-rose-100",
    },
    {
      key: "vocab-exams",
      href: "/vocab/exams",
      icon: "📝",
      title: "선생님 단어 시험",
      desc: "선생님이 낸 단어 시험이에요. 한 번만 볼 수 있어요.",
      pending: vocabExams,
      pendingLabel: "안 본 시험",
      tone: "bg-violet-100",
    },
    {
      key: "expected",
      href: "/student/exams",
      icon: "📋",
      title: "예상문제",
      desc: "학교별 기출을 바탕으로 선생님이 배정한 모의고사예요.",
      pending: expected,
      pendingLabel: "안 푼 시험",
      tone: "bg-rose-100",
    },
    {
      key: "tests",
      href: "/student/tests",
      icon: "🎯",
      title: "TOEFL 테스트",
      desc: "Full·Half·개별 TOEFL 테스트 목록과 점수예요.",
      pending: tests,
      pendingLabel: "진행할 테스트",
      tone: "bg-blue-100",
    },
    {
      key: "daily",
      href: "/student/daily-tests",
      icon: "✅",
      title: "Daily Tests",
      desc: "매일 푸는 짧은 과제예요. 기한 안에 끝내 보세요.",
      pending: daily,
      pendingLabel: "오늘 할 과제",
      tone: "bg-emerald-100",
    },
    {
      key: "vocab-test",
      href: "/vocab/test",
      icon: "🔤",
      title: "단어 시험",
      desc: "내가 학습한 단어 중 약한 단어로 보는 시험이에요.",
      pending: null,
      pendingLabel: "",
      tone: "bg-amber-100",
    },
  ];

  const totalPending = cards.reduce((n, c) => n + (c.pending ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">시험</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {totalPending > 0 ? (
            <>
              아직 안 본 시험이 <span className="font-bold text-rose-600">{totalPending}개</span> 있어요.
            </>
          ) : (
            "지금 해야 할 시험이 없어요. 👏"
          )}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="group flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${c.tone}`}>
              {c.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-base font-bold text-neutral-900">{c.title}</span>
                {c.pending != null && c.pending > 0 && (
                  <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600">
                    {c.pendingLabel} {c.pending}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-sm leading-snug text-neutral-500">{c.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
