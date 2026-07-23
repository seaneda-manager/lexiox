'use client';

import { useEffect, useState } from 'react';
import { useCallback } from 'react';
import type { LearningStageData, LearningStageAttemptResponse } from '@/types/learning-stage';
import ProgressHeader from './ProgressHeader';
import SpellingTab from './SpellingTab';
import MeaningTab from './MeaningTab';
import QuizTab from './QuizTab';
import SidebarCard from './SidebarCard';

interface Props {
  wordId: string;
  onComplete: () => void;
}

export default function LearningStageLayout({ wordId, onComplete }: Props) {
  const [data, setData] = useState<LearningStageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'spelling' | 'meaning' | 'quiz'>('spelling');
  const [submitting, setSubmitting] = useState(false);

  // 데이터 페칭
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/vocab/learning-stage/${wordId}`);

        if (response.status === 422) {
          // 모지바케 감지
          const errorData = await response.json();
          setError('이 단어에 일부 오류가 있습니다. 뜻 학습으로 진행합니다.');
          setActiveTab('meaning');
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load learning data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [wordId]);

  // 시도 제출
  const handleAttempt = useCallback(
    async (tab: 'spelling' | 'meaning' | 'quiz', attemptData: any) => {
      try {
        setSubmitting(true);
        const response = await fetch(`/api/vocab/learning-stage/attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wordId,
            tab,
            data: attemptData,
          }),
        });

        if (response.status === 422) {
          const errorData = await response.json();
          setError(errorData.message);
          if (errorData.fallback?.tab) {
            setActiveTab(errorData.fallback.tab);
          }
          return { success: false, error: errorData };
        }

        if (!response.ok) {
          throw new Error(`Attempt failed: ${response.statusText}`);
        }

        const result: LearningStageAttemptResponse = await response.json().then(r => r.data);

        // 다음 탭으로 이동
        if (result.nextStep === 'meaning') {
          setActiveTab('meaning');
        } else if (result.nextStep === 'quiz') {
          setActiveTab('quiz');
        } else if (result.nextStep === 'complete') {
          onComplete();
        }

        return { success: true, ...result };
      } catch (err: any) {
        setError(err.message);
        return { success: false, error: err };
      } finally {
        setSubmitting(false);
      }
    },
    [wordId, onComplete]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로드 중...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold">데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-3 gap-6">
      {/* 왼쪽: 메인 콘텐츠 */}
      <div className="col-span-2 space-y-4">
        {/* 진도 헤더 */}
        <ProgressHeader
          course={data.course}
          wordPosition={data.progress.wordPosition}
          day={data.progress.currentDay}
          totalDays={data.progress.totalDays}
        />

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-yellow-700 text-sm">{error}</p>
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div className="flex gap-2 bg-white p-2 rounded-lg border border-gray-200">
          {(['spelling', 'meaning', 'quiz'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 rounded font-semibold text-sm transition ${
                activeTab === tab
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={submitting}
            >
              {tab === 'spelling' && '1️⃣ Spelling'}
              {tab === 'meaning' && '2️⃣ Meaning'}
              {tab === 'quiz' && '3️⃣ Quiz'}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="bg-white rounded-lg border-4 border-teal-400 p-8">
          {activeTab === 'spelling' && (
            <SpellingTab
              word={data.spelling.given}
              onSubmit={(spelling) =>
                handleAttempt('spelling', { spelling })
              }
              disabled={submitting}
            />
          )}

          {activeTab === 'meaning' && (
            <MeaningTab
              meanings={data.meaning.meanings}
              relatedWords={data.meaning.relatedWords}
              definition={data.meaning.definition}
              onReportBroken={() => {
                // TODO: Report broken 모달 구현
                alert('문제 보고 기능은 준비 중입니다.');
              }}
              onContinue={() => handleAttempt('meaning', { viewedMeaning: true })}
              disabled={submitting}
            />
          )}

          {activeTab === 'quiz' && (
            <QuizTab
              synonyms={data.quiz.synonyms}
              example={data.quiz.example}
              choices={data.quiz.choices}
              onSubmit={(choiceId) =>
                handleAttempt('quiz', {
                  selectedChoiceId: choiceId,
                  attemptNumber: 1,
                })
              }
              disabled={submitting}
            />
          )}
        </div>
      </div>

      {/* 오른쪽: 사이드바 */}
      <div className="space-y-4 h-fit sticky top-4">
        {/* 오늘의 진도 */}
        <SidebarCard
          title="🏆 오늘의 진도"
          words={data.todayProgress}
        />

        {/* 연속 학습 */}
        <div className="bg-white rounded-lg border-2 border-orange-300 p-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">연속 학습 중!</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl">🔥</span>
              <span className="text-3xl font-bold text-orange-600">{data.streak}일</span>
            </div>
          </div>
        </div>

        {/* 학습 진행률 */}
        <div className="bg-white rounded-lg border-2 border-blue-300 p-4">
          <p className="text-xs font-semibold text-gray-700 mb-3">학습 진행률</p>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">오늘</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-teal-500 h-2 rounded-full transition-all"
                  style={{ width: `${data.dailyProgressPercent}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{data.dailyProgressPercent}%</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">이번 주</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-teal-500 h-2 rounded-full transition-all"
                  style={{ width: `${data.weeklyProgressPercent}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{data.weeklyProgressPercent}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
