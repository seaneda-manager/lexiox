'use client';

import { useState } from 'react';
import { WritingStageExplanation } from './stages/WritingStageExplanation';
import { WritingStageReDo } from './stages/WritingStageReDo';
import { WritingStageReasonWriting } from './stages/WritingStageReasonWriting';
import { WritingStageCorrection } from './stages/WritingStageCorrection';
import { WritingStageFinalRevision } from './stages/WritingStageFinalRevision';
import { LXGymPTRecommendation } from '@/app/protected/student/_components/LXGymPTRecommendation';

interface WritingSession {
  id: string;
  test_id: string;
  raw_answers: Record<string, string>;
  review_attempts: any[];
  created_at: string;
}

interface ReviewProgressProps {
  sessionId: string;
  initialSession: WritingSession;
}

const STAGES = [
  { key: 'explanation_read', label: '설명 읽기', step: 1 },
  { key: 're_do', label: '다시 풀기', step: 2 },
  { key: 'reason_writing', label: '오답 이유 작성', step: 3 },
  { key: 'correction', label: '첨삭 보고 고쳐쓰기', step: 4 },
  { key: 'final_revision', label: '안보고 다시쓰기', step: 5 },
];

const MOCK_EXPLANATIONS: Record<string, string> = {
  '1': '동사의 시제를 일치시켜야 합니다. 전체 문맥에서 과거시제를 사용하고 있으므로, 이 동사도 과거시제로 맞춰야 합니다.',
  '2': '주어와 동사의 수(단수/복수)가 일치해야 합니다. 주어가 단수이므로 동사도 단수 형태를 사용해야 합니다.',
};

const MOCK_CORE_POINTS: Record<string, string[]> = {
  '1': ['문맥상 전체 시제 파악', '동사 시제 일치의 중요성', '일관성 있는 시제 사용'],
  '2': ['주어 파악하기', '주어와 동사의 수 일치', '영어 문법의 기본 규칙'],
};

export function WritingReviewClient({ sessionId, initialSession }: ReviewProgressProps) {
  const [session, setSession] = useState<WritingSession>(initialSession);
  const [selectedItem, setSelectedItem] = useState<string>('1');
  const [loading, setLoading] = useState(false);

  const getItemProgress = (itemNum: string) => {
    const itemAttempts = session.review_attempts.filter(
      (a) => a.itemKey === itemNum || a.stage
    );
    return itemAttempts[itemAttempts.length - 1] || null;
  };

  const currentProgress = getItemProgress(selectedItem);
  const currentStage = currentProgress?.stage || 'explanation_read';

  const handleProgressStage = async (
    nextStageName: string,
    grammarErrors?: any[]
  ) => {
    setLoading(true);
    try {
      const response = await fetch('/api/review/writing/add-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          stage: nextStageName,
          grammarErrors: grammarErrors || [],
        }),
      });

      if (!response.ok) throw new Error('Failed to save attempt');

      const reviewResponse = await fetch(
        `/api/review/get-review-data?type=writing&sessionId=${sessionId}`
      );
      const reviewData = await reviewResponse.json();

      setSession({
        ...session,
        review_attempts: reviewData.attempts,
      });
    } catch (error) {
      console.error('Error:', error);
      alert('오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const renderStageComponent = () => {
    const originalAnswer = session.raw_answers?.[selectedItem] || '';
    const explanation = MOCK_EXPLANATIONS[selectedItem] || 'Loading...';
    const corePoints = MOCK_CORE_POINTS[selectedItem] || [];

    const handleStageComplete = (nextStageName: string, data?: any) => {
      const nextStageIdx = STAGES.findIndex((s) => s.key === nextStageName);
      const nextStage = STAGES[nextStageIdx + 1];

      handleProgressStage(
        nextStage?.key || nextStageName,
        data?.grammarErrors
      );
    };

    switch (currentStage) {
      case 'explanation_read':
        return (
          <WritingStageExplanation
            itemNum={selectedItem}
            itemKey={selectedItem}
            explanation={explanation}
            corePoints={corePoints}
            onComplete={() => handleStageComplete('re_do')}
            loading={loading}
          />
        );
      case 're_do':
        return (
          <WritingStageReDo
            itemNum={selectedItem}
            originalAnswer={originalAnswer}
            onComplete={(newAnswer) => {
              handleStageComplete('reason_writing');
            }}
            loading={loading}
          />
        );
      case 'reason_writing':
        return (
          <WritingStageReasonWriting
            itemNum={selectedItem}
            originalAnswer={originalAnswer}
            explanation={explanation}
            onComplete={(reason, grammarErrors) => {
              handleStageComplete('correction', { grammarErrors });
            }}
            loading={loading}
          />
        );
      case 'correction':
        return (
          <WritingStageCorrection
            itemNum={selectedItem}
            originalAnswer={originalAnswer}
            feedback="(AI 첨삭 피드백이 여기에 표시됩니다)"
            onComplete={(correctedAnswer) => {
              handleStageComplete('final_revision');
            }}
            loading={loading}
          />
        );
      case 'final_revision':
        return (
          <WritingStageFinalRevision
            itemNum={selectedItem}
            originalAnswer={originalAnswer}
            onComplete={(finalAnswer) => {
              handleStageComplete('completed');
            }}
            loading={loading}
          />
        );
      default:
        return <div>리뷰 컴포넌트를 로드 중입니다...</div>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-1 px-6 pt-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Writing 리뷰</h2>
        <p className="text-sm text-slate-500">
          1-10번 문항: 설명 읽기 → 다시 풀기 → 오답 이유 → 첨삭 반영 → 최종 작성
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6 px-6 pb-8">
        <div className="col-span-8 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">문항 선택</h2>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => {
                const itemNum = String(i + 1);
                const isSelected = selectedItem === itemNum;
                const itemProg = getItemProgress(itemNum);
                const isCompleted =
                  itemProg && STAGES.findIndex((s) => s.key === itemProg.stage) >= STAGES.length - 1;

                return (
                  <button
                    key={itemNum}
                    onClick={() => setSelectedItem(itemNum)}
                    className={`relative rounded-lg border-2 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : isCompleted
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {itemNum}
                    {isCompleted && <span className="absolute -right-1 -top-1 text-lg">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {renderStageComponent()}
        </div>

        <div className="col-span-4 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">진행 상황</h2>
            <div className="space-y-3">
              {STAGES.map((stage) => {
                const stageIdx = STAGES.findIndex((s) => s.key === stage.key);
                const currentIdx = STAGES.findIndex((s) => s.key === currentStage);
                const isCompleted = stageIdx < currentIdx;
                const isCurrent = stage.key === currentStage;

                return (
                  <div
                    key={stage.key}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                      isCurrent
                        ? 'border-l-4 border-blue-500 bg-blue-50 text-blue-900'
                        : isCompleted
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                    }`}
                  >
                    {isCompleted ? '✓' : isCurrent ? '▶' : '·'} {stage.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">통계</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">리뷰 총 횟수:</span>
                <span className="font-semibold">{session.review_attempts?.length || 0}회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">완료한 문항:</span>
                <span className="font-semibold">
                  {Array.from({ length: 10 }, (_, i) => {
                    const itemProg = getItemProgress(String(i + 1));
                    return itemProg && STAGES.findIndex((s) => s.key === itemProg.stage) >= STAGES.length - 1 ? 1 : 0;
                  }).reduce((a, b) => a + b, 0)}/10
                </span>
              </div>
            </div>
          </div>

          {session.review_attempts && session.review_attempts.length > 0 && (
            <LXGymPTRecommendation
              sectionType="writing"
              reviewAttempts={session.review_attempts}
              resultId={sessionId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
