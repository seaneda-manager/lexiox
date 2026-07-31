'use client';

import { useState } from 'react';

interface ReasonWritingStageProps {
  itemNum: string;
  originalAnswer: string;
  explanation: string;
  onComplete: (reason: string, grammarErrors: any[]) => void;
  loading: boolean;
}

const COMMON_ERRORS = [
  { type: 'tense', label: '시제 오류' },
  { type: 'subject_verb_agreement', label: '주어-동사 일치' },
  { type: 'article', label: '관사 (a/the)' },
  { type: 'preposition', label: '전치사' },
  { type: 'word_choice', label: '어휘 선택' },
  { type: 'spelling', label: '철자' },
  { type: 'punctuation', label: '구두점' },
  { type: 'parallelism', label: '병렬 구조' },
];

export function WritingStageReasonWriting({
  itemNum,
  originalAnswer,
  explanation,
  onComplete,
  loading,
}: ReasonWritingStageProps) {
  const [reason, setReason] = useState('');
  const [selectedErrors, setSelectedErrors] = useState<string[]>([]);

  const toggleError = (errorType: string) => {
    setSelectedErrors((prev) =>
      prev.includes(errorType)
        ? prev.filter((e) => e !== errorType)
        : [...prev, errorType]
    );
  };

  const handleSubmit = () => {
    if (!reason.trim() && selectedErrors.length === 0) {
      alert('오답 이유와 오류 유형을 선택해주세요');
      return;
    }

    const grammarErrors = selectedErrors.map((type) => ({
      type,
      count: 1, // 처음에는 1회로 기록
    }));

    onComplete(reason, grammarErrors);
  };

  return (
    <div className="space-y-6">
      {/* 원래 답변 */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">원래 답변</h3>
        <div className="rounded-lg bg-white p-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            {originalAnswer}
          </p>
        </div>
      </div>

      {/* 왜 틀렸는가? */}
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-rose-900">
          왜 틀렸나요? (설명을 읽고 본인의 언어로)
        </h3>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="설명을 읽고 이해한 내용을 바탕으로 오답 이유를 작성하세요..."
          className="w-full rounded-lg border border-rose-200 bg-white p-4 text-sm leading-relaxed focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          rows={6}
        />
      </div>

      {/* 오류 유형 선택 */}
      <div className="rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-orange-900">
          어떤 종류의 오류인가요?
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {COMMON_ERRORS.map((error) => (
            <button
              key={error.type}
              onClick={() => toggleError(error.type)}
              className={`rounded-lg border-2 px-3 py-2 text-sm font-semibold transition ${
                selectedErrors.includes(error.type)
                  ? 'border-orange-500 bg-orange-100 text-orange-700'
                  : 'border-orange-200 bg-white text-orange-700 hover:border-orange-300'
              }`}
            >
              {selectedErrors.includes(error.type) ? '✓ ' : ''}{error.label}
            </button>
          ))}
        </div>
      </div>

      {/* 선택 현황 */}
      {(reason.trim() || selectedErrors.length > 0) && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-900">
            <span className="font-semibold">작성됨:</span> {reason.trim() ? '✓' : '-'}
            {' | '}
            <span className="font-semibold">오류 선택:</span> {selectedErrors.length}개
          </p>
        </div>
      )}

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={loading || (!reason.trim() && selectedErrors.length === 0)}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        {loading ? '저장 중...' : '다음 단계로 진행'}
      </button>
    </div>
  );
}
