'use client';

import { useState } from 'react';

interface IncorrectAnswer {
  id: string;
  testId: string;
  question: string;
  yourAnswer: string;
  correctAnswer: string;
  section: string;
  explanation: string;
}

interface ReviewSection {
  name: string;
  totalQuestions: number;
  correctCount: number;
  icon: string;
}

interface PhaseReviewProps {
  studentId: string;
  sections: ReviewSection[];
  incorrectAnswers: IncorrectAnswer[];
  onComplete?: () => void;
}

export function PhaseReview({
  studentId,
  sections,
  incorrectAnswers,
  onComplete,
}: PhaseReviewProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(
    sections.length > 0 ? sections[0].name : null
  );

  const selectedSectionAnswers = selectedSection
    ? incorrectAnswers.filter(a => a.section === selectedSection)
    : [];

  const totalCorrect = sections.reduce((sum, s) => sum + s.correctCount, 0);
  const totalQuestions = sections.reduce((sum, s) => sum + s.totalQuestions, 0);
  const accuracy = Math.round((totalCorrect / totalQuestions) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-2xl font-bold text-amber-900 mb-2">🔍 복습</h2>
        <p className="text-sm text-amber-700 mb-4">
          풀이한 테스트의 오답을 검토합니다. 각 섹션별 약점을 파악하고 개선하세요.
        </p>

        {/* Overall Score */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-white border border-amber-200 p-4 text-center">
            <p className="text-xs text-amber-600 font-semibold mb-1">총 정답률</p>
            <p className="text-3xl font-bold text-amber-900">{accuracy}%</p>
          </div>
          <div className="rounded-lg bg-white border border-amber-200 p-4 text-center">
            <p className="text-xs text-amber-600 font-semibold mb-1">정답</p>
            <p className="text-3xl font-bold text-emerald-600">{totalCorrect}</p>
          </div>
          <div className="rounded-lg bg-white border border-amber-200 p-4 text-center">
            <p className="text-xs text-amber-600 font-semibold mb-1">오답</p>
            <p className="text-3xl font-bold text-red-600">
              {totalQuestions - totalCorrect}
            </p>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map(section => {
          const isSelected = selectedSection === section.name;
          const sectionAnswers = incorrectAnswers.filter(
            a => a.section === section.name
          );

          return (
            <button
              key={section.name}
              onClick={() => setSelectedSection(section.name)}
              className={`flex-shrink-0 rounded-lg px-4 py-2 font-semibold transition ${
                isSelected
                  ? 'bg-amber-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{section.icon}</span>
                <div className="text-left">
                  <p className="text-sm">{section.name}</p>
                  <p className="text-xs opacity-75">
                    {section.correctCount}/{section.totalQuestions}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Incorrect Answers */}
      {selectedSection && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">
            {selectedSection} - 오답 {selectedSectionAnswers.length}개
          </h3>

          {selectedSectionAnswers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center">
              <p className="text-emerald-700 font-semibold">
                ✓ 이 섹션에서 모든 문제를 맞혔습니다!
              </p>
            </div>
          ) : (
            selectedSectionAnswers.map((answer, idx) => (
              <div
                key={answer.id}
                className="rounded-lg border border-red-200 bg-red-50 p-4"
              >
                <div className="mb-3">
                  <p className="text-sm font-semibold text-red-900">
                    {idx + 1}. {answer.question.substring(0, 100)}...
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 text-red-600 font-semibold">
                      ✗ 당신의 답:
                    </span>
                    <span className="line-through text-red-700">
                      {answer.yourAnswer}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="flex-shrink-0 text-emerald-600 font-semibold">
                      ✓ 정답:
                    </span>
                    <span className="text-emerald-700 font-semibold">
                      {answer.correctAnswer}
                    </span>
                  </div>
                </div>

                {answer.explanation && (
                  <div className="mt-3 border-t border-red-200 pt-3">
                    <p className="text-xs font-semibold text-slate-600 mb-1">
                      💡 설명
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {answer.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tips */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>복습 팁:</strong> 오답을 다시 풀어보고, 왜 틀렸는지 이해하는 것이 중요합니다. 비슷한 유형의 문제도 찾아 연습하세요.
        </p>
      </div>

      {/* Next Button */}
      <button
        onClick={onComplete}
        className="w-full rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 transition"
      >
        ✓ 복습 완료 (하브루타로)
      </button>
    </div>
  );
}
