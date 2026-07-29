import Link from "next/link";

type Props = {
  program: "toefl" | "gap" | "lexiox" | null;
  vocaTodayCount: number;
  vocaPlanCount: number;
  pendingTests: number;
  pendingLectures: number;
  nextExamDate: string | null;
  isClassDay: boolean;
  dayOfWeek: number; // 0=sun, 6=sat
};

const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];

export default function PrimaryFocusCard({
  program,
  vocaTodayCount,
  pendingTests,
  pendingLectures,
  nextExamDate,
  isClassDay,
  dayOfWeek,
}: Props) {
  const isToefl = program === "toefl" || program === "gap";

  // ── TOEFL: 우선 학습 (강좌 > 시험 > 단어)
  if (isToefl) {
    if (pendingLectures > 0) {
      return (
        <Link
          href="/student/toefl/chapter"
          className="block rounded-3xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-sky-600 font-semibold mb-0.5 uppercase tracking-wide">
                우선 학습
              </p>
              <p className="text-2xl font-bold text-neutral-900">
                강좌 {pendingLectures}개 완료하기
              </p>
              <p className="text-sm text-sky-700 mt-1">
                기초 다지고 실전 문제로 나아가요
              </p>
            </div>
            <span className="shrink-0 rounded-2xl bg-sky-600 px-6 py-3 text-lg font-bold text-white">
              시작 →
            </span>
          </div>
        </Link>
      );
    }

    if (pendingTests > 0) {
      return (
        <Link
          href="/student/toefl/tests"
          className="block rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-amber-600 font-semibold mb-0.5 uppercase tracking-wide">
                실전 준비
              </p>
              <p className="text-2xl font-bold text-neutral-900">
                모의고사 {pendingTests}개 풀기
              </p>
              <p className="text-sm text-amber-700 mt-1">
                실제 시험처럼 풀어보고 약점을 파악하세요
              </p>
            </div>
            <span className="shrink-0 rounded-2xl bg-amber-600 px-6 py-3 text-lg font-bold text-white">
              응시 →
            </span>
          </div>
        </Link>
      );
    }

    if (vocaTodayCount > 0) {
      return (
        <Link
          href="/vocab/session"
          className="block rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-emerald-600 font-semibold mb-0.5 uppercase tracking-wide">
                어휘 강화
              </p>
              <p className="text-2xl font-bold text-neutral-900">
                오늘 단어 {vocaTodayCount}개 학습
              </p>
              <p className="text-sm text-emerald-700 mt-1">
                매일 차근차근 어휘를 쌓아가세요
              </p>
            </div>
            <span className="shrink-0 rounded-2xl bg-emerald-600 px-6 py-3 text-lg font-bold text-white">
              학습 →
            </span>
          </div>
        </Link>
      );
    }

    // 모두 완료
    return (
      <div className="rounded-3xl border-2 border-dashed border-neutral-200 bg-white p-6 text-center">
        <p className="text-2xl font-bold text-neutral-900 mb-2">🎉 오늘의 학습 완료!</p>
        <p className="text-sm text-neutral-500">
          훌륭한 노력! 내일도 꾸준히 학습하세요.
        </p>
      </div>
    );
  }

  // ── 내신/LEXiOX: 시험 준비 중심
  if (nextExamDate) {
    const exam = new Date(nextExamDate);
    const today = new Date();
    const daysLeft = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <Link
        href="/hi-naesin"
        className="block rounded-3xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-rose-600 font-semibold mb-0.5 uppercase tracking-wide">
              시험 준비
            </p>
            <p className="text-2xl font-bold text-neutral-900">
              D-{daysLeft < 0 ? 0 : daysLeft} 내신 드릴
            </p>
            <p className="text-sm text-rose-700 mt-1">
              시험 전까지 남은 시간, 지금이 중요합니다
            </p>
          </div>
          <span className="shrink-0 rounded-2xl bg-rose-600 px-6 py-3 text-lg font-bold text-white">
            드릴 →
          </span>
        </div>
      </Link>
    );
  }

  if (isClassDay) {
    return (
      <Link
        href="/student/session"
        className="block rounded-3xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-sky-600 font-semibold mb-0.5 uppercase tracking-wide">
              {DOW_KO[dayOfWeek]}요일 · 수업 있는 날 🎯
            </p>
            <p className="text-2xl font-bold text-neutral-900">
              오늘 수업 시작하기
            </p>
            <p className="text-sm text-sky-700 mt-1">
              숙제 → 단어 → 드릴 → 복습
            </p>
          </div>
          <span className="shrink-0 rounded-2xl bg-sky-600 px-6 py-3 text-lg font-bold text-white">
            입장 →
          </span>
        </div>
      </Link>
    );
  }

  // 기본값: 자율 학습
  return (
    <Link
      href="/student/session"
      className="block rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-neutral-500 font-semibold mb-0.5 uppercase tracking-wide">
            {DOW_KO[dayOfWeek]}요일 · 자율 학습
          </p>
          <p className="text-2xl font-bold text-neutral-900">
            원하는 과목 선택하기
          </p>
          <p className="text-sm text-neutral-600 mt-1">
            당신의 페이스로 학습하세요
          </p>
        </div>
        <span className="shrink-0 rounded-2xl bg-neutral-700 px-6 py-3 text-lg font-bold text-white">
          시작 →
        </span>
      </div>
    </Link>
  );
}
