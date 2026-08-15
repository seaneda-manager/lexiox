'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VocabStudyCards } from './VocabStudyCards';

type CurriculumMeta = {
  key: string;
  label: string;
  sub: string;
  badge: string;
  accentBg: string;
  accentText: string;
};

type Phase = 'postCheckup' | 'vocabTest' | 'dailyTests' | 'review' | 'havruta';

const PHASES: Record<Phase, { label: string; icon: string; color: string; desc: string }> = {
  postCheckup: { label: 'PostCheckup', icon: '📋', color: 'from-blue-500 to-blue-600', desc: '수업 후 확인' },
  vocabTest: { label: 'Vocab Test', icon: '📚', color: 'from-purple-500 to-purple-600', desc: '단어 시험' },
  dailyTests: { label: 'Daily Tests', icon: '📝', color: 'from-amber-500 to-amber-600', desc: '일일 테스트' },
  review: { label: 'Review', icon: '🔍', color: 'from-emerald-500 to-emerald-600', desc: '복습' },
  havruta: { label: 'Havruta', icon: '💬', color: 'from-rose-500 to-rose-600', desc: '토론' },
};

export function DashboardLayout({
  userId,
  studentName,
  curriculum,
  lvBadge,
  program,
  academyStudentId,
  gamification,
  vocaTodayCount,
  vocaPlanCount,
  isToefl,
  readingDone,
  listeningDone,
  speakingDone,
  writingDone,
  pendingLectures,
  pendingTests,
  examList,
  firstChapterBySkill,
  nextExamDate,
  isClassDay,
  dayOfWeek,
  assignedPassageIds,
  naesinDonePassages,
  homeworkItems,
  moduleProgress,
}: any) {
  const [currentPhase, setCurrentPhase] = useState<Phase>('postCheckup');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const phaseSequence: Phase[] = isToefl
    ? ['postCheckup', 'vocabTest', 'dailyTests', 'review', 'havruta']
    : ['vocabTest', 'dailyTests', 'review', 'havruta'];

  const currentPhaseIndex = phaseSequence.indexOf(currentPhase);
  const phaseProgress = Math.round(((currentPhaseIndex + 1) / phaseSequence.length) * 100);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* ── 좌측 사이드바 (20%) ────────────────────────────────── */}
          <aside className="col-span-12 md:col-span-2.5">
            {/* 프로필 카드 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-neutral-900 truncate">{studentName}</p>
                  {lvBadge && (
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${lvBadge.cls}`}>
                      {lvBadge.label}
                    </span>
                  )}
                </div>
              </div>
              <p className={`text-xs ${curriculum.accentText}`}>{curriculum.label}</p>
            </div>

            {/* Phase 네비게이션 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-3 mb-4">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">학습 단계</p>
              <div className="space-y-2">
                {phaseSequence.map((phase, idx) => {
                  const p = PHASES[phase];
                  const isDone = idx < currentPhaseIndex;
                  const isActive = phase === currentPhase;

                  return (
                    <button
                      key={phase}
                      onClick={() => setCurrentPhase(phase)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : isDone
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                        {isDone && <span className="ml-auto">✓</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 진행 바 */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>전체 진행</span>
                  <span>{phaseProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-200">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${phaseProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 포인트 & 레벨 */}
            {gamification && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-amber-50 px-2 py-2 text-center">
                    <p className="text-[10px] text-amber-600 font-medium">포인트</p>
                    <p className="text-sm font-bold text-amber-700">{(gamification.total_points / 1000).toFixed(1)}K</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 px-2 py-2 text-center">
                    <p className="text-[10px] text-indigo-600 font-medium">레벨</p>
                    <p className="text-sm font-bold text-indigo-700">Lv {gamification.level}</p>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* ── 중앙 메인 콘텐츠 (50%) ────────────────────────────── */}
          <main className="col-span-12 md:col-span-6">
            {/* Phase 헤더 */}
            <div className={`rounded-2xl bg-gradient-to-br ${PHASES[currentPhase].color} text-white p-6 mb-6`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold opacity-90">{PHASES[currentPhase].desc}</p>
                  <h1 className="text-3xl font-bold mt-1">{PHASES[currentPhase].label}</h1>
                </div>
                <span className="text-4xl">{PHASES[currentPhase].icon}</span>
              </div>
            </div>

            {/* Phase 콘텐츠 */}
            <div className="space-y-4">
              {currentPhase === 'postCheckup' && (
                <PostCheckupContent isToefl={isToefl} vocaTodayCount={vocaTodayCount} />
              )}
              {currentPhase === 'vocabTest' && (
                <VocabTestContent vocaTodayCount={vocaTodayCount} vocaPlanCount={vocaPlanCount} userId={userId} />
              )}
              {currentPhase === 'dailyTests' && (
                <DailyTestsContent isToefl={isToefl} examList={examList} pendingTests={pendingTests} />
              )}
              {currentPhase === 'review' && (
                <ReviewContent readingDone={readingDone} listeningDone={listeningDone} />
              )}
              {currentPhase === 'havruta' && (
                <HavrutaContent />
              )}
            </div>
          </main>

          {/* ── 우측 통계 (30%) ────────────────────────────────────── */}
          <aside className="col-span-12 md:col-span-3.5">
            {/* 오늘의 학습 요약 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 mb-4">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">오늘의 학습</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">단어 학습</span>
                  <span className={`text-sm font-bold ${vocaTodayCount > 0 ? 'text-amber-600' : 'text-neutral-400'}`}>
                    {vocaTodayCount > 0 ? `${vocaTodayCount}개` : '없음'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">테스트</span>
                  <span className={`text-sm font-bold ${pendingTests > 0 ? 'text-rose-600' : 'text-neutral-400'}`}>
                    {pendingTests > 0 ? `${pendingTests}개 남음` : '완료'}
                  </span>
                </div>
              </div>
            </div>

            {/* 스킬 진행 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 mb-4">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">스킬 진행</p>
              <div className="space-y-3">
                {[
                  { name: 'Reading', done: readingDone, color: 'bg-sky-400' },
                  { name: 'Listening', done: listeningDone, color: 'bg-violet-400' },
                  { name: 'Speaking', done: speakingDone, color: 'bg-amber-400' },
                  { name: 'Writing', done: writingDone, color: 'bg-emerald-400' },
                ].map((skill) => (
                  <div key={skill.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-neutral-700">{skill.name}</span>
                      <span className="text-xs font-bold text-neutral-500">{skill.done > 0 ? '✓' : '-'}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-neutral-100">
                      <div
                        className={`h-1.5 rounded-full ${skill.color} transition-all`}
                        style={{ width: `${skill.done > 0 ? 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 다음 시험일 */}
            {nextExamDate && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">다음 시험</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-700">D-</span>
                  <span className="text-3xl font-bold text-amber-700">
                    {Math.ceil(
                      (new Date(nextExamDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    )}
                  </span>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  {new Date(nextExamDate).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )}

            {/* 연속 학습 */}
            {gamification && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">연속 학습</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-emerald-700">{gamification.current_streak}</span>
                  <span className="text-sm text-emerald-600">일</span>
                </div>
                <p className="text-xs text-emerald-600 mt-2">최장: {gamification.longest_streak}일</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

// ── Phase별 콘텐츠 컴포넌트들 ────────────────────────────────────

function PostCheckupContent({ isToefl, vocaTodayCount }: any) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h3 className="font-semibold text-neutral-900 mb-4">이전 수업 확인</h3>
      <div className="space-y-3">
        {vocaTodayCount > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
            <div>
              <p className="font-medium text-blue-900">단어 복습</p>
              <p className="text-sm text-blue-700">{vocaTodayCount}개 단어 남음</p>
            </div>
            <Link
              href="/vocab/session"
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
            >
              시작
            </Link>
          </div>
        )}
        <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-4">
          <p className="text-sm text-neutral-600">이전 수업 내용을 확인하고 진행하세요.</p>
        </div>
      </div>
    </div>
  );
}

function VocabTestContent({ vocaTodayCount, vocaPlanCount, userId }: any) {
  const [skipLearningCheck, setSkipLearningCheck] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // skip_learning_check 설정 가져오기
    fetch("/api/admin/vocab/test-config")
      .then((r) => r.json())
      .then((configs) => {
        const globalConfig = configs.find((c: any) => c.scope === "global");
        setSkipLearningCheck(globalConfig?.skip_learning_check ?? false);
      })
      .catch(() => {
        // API 오류 무시, 기본값 사용
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // TODO: API에서 실제 진행도 데이터 가져오기
  const dayNumber = 1; // 예시
  const trackId = "default-track"; // 예시

  const stage1Progress = 75;
  const stage1Complete = true;
  const stage2Progress = 30;
  const stage2Complete = false;
  const testScore = undefined;
  const testDate = undefined;

  if (loading) {
    return <div className="text-center py-6 text-gray-600">로드 중...</div>;
  }

  return (
    <div className="space-y-6">
      <VocabStudyCards
        dayNumber={dayNumber}
        trackId={trackId}
        stage1Progress={stage1Progress}
        stage1Complete={stage1Complete}
        stage2Progress={stage2Progress}
        stage2Complete={stage2Complete}
        testScore={testScore}
        testDate={testDate}
        skipLearningCheck={skipLearningCheck}
      />

      {/* 통계 정보 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h3 className="font-semibold text-neutral-900 mb-4">학습 통계</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-sm text-blue-600 font-medium">오늘 단어</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{vocaTodayCount}개</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4 text-center">
            <p className="text-sm text-purple-600 font-medium">전체 계획</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{vocaPlanCount}개</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DailyTestsContent({ isToefl, examList, pendingTests }: any) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h3 className="font-semibold text-neutral-900 mb-4">일일 테스트</h3>
      <div className="space-y-2">
        {pendingTests > 0 ? (
          <>
            <p className="text-sm text-neutral-600 mb-3">
              {pendingTests}개의 테스트가 기다리고 있습니다.
            </p>
            {(examList || []).slice(0, 3).map((exam: any) => (
              <Link
                key={exam.id}
                href={`/student/exams/${exam.id}`}
                className="block rounded-lg border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-amber-900">{exam.title}</span>
                  <span className="text-amber-700">→</span>
                </div>
              </Link>
            ))}
          </>
        ) : (
          <p className="text-sm text-neutral-600">모든 테스트를 완료했습니다! 🎉</p>
        )}
      </div>
    </div>
  );
}

function ReviewContent({ readingDone, listeningDone }: any) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h3 className="font-semibold text-neutral-900 mb-4">복습</h3>
      <div className="space-y-3">
        <Link
          href="/updated-reading/study"
          className="flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 p-4 hover:bg-sky-100 transition"
        >
          <div>
            <p className="font-medium text-sky-900">Reading 복습</p>
            <p className="text-sm text-sky-700">{readingDone}회 완료</p>
          </div>
          <span className="text-sky-700">→</span>
        </Link>
        <Link
          href="/updated-listening/study"
          className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 p-4 hover:bg-violet-100 transition"
        >
          <div>
            <p className="font-medium text-violet-900">Listening 복습</p>
            <p className="text-sm text-violet-700">{listeningDone}회 완료</p>
          </div>
          <span className="text-violet-700">→</span>
        </Link>
      </div>
    </div>
  );
}

function HavrutaContent() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h3 className="font-semibold text-neutral-900 mb-4">하브루타 토론</h3>
      <div className="rounded-lg bg-rose-50 p-4">
        <p className="text-sm text-rose-700">
          📢 선생님과 함께 배운 내용에 대해 토론하는 시간입니다.
        </p>
        <Link
          href="/havruta"
          className="mt-3 inline-block rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
        >
          토론 시작
        </Link>
      </div>
    </div>
  );
}
