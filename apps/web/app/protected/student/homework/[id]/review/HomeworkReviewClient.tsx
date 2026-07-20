'use client';

import { useCallback, useState } from 'react';
import type { GradeItem } from '@/app/api/homework/grade/route';

// ── 상태 타입 ──────────────────────────────────────────────────
type ItemStatus = 'wrong' | 'corrected' | 'revealed';

type ItemState = {
  number:        number;
  correctAnswer: string;
  wrongAnswer:   string;   // 원래 오답
  teacherHint:   string | null;
  input:         string;
  status:        ItemStatus;
  attempts:      number;
  hintLevel:     0 | 1 | 2 | 3;  // 0=미요청, 1~3=공개된 힌트 수
  hints:         string[];        // Claude가 생성한 힌트들 (최대 3)
  hintLoading:   boolean;
};

// ── 정답 체크 (대소문자 무시, 앞뒤 공백 무시) ──────────────────
function checkAnswer(input: string, correct: string): boolean {
  return input.trim().toLowerCase() === correct.trim().toLowerCase();
}

// ── 컴포넌트 Props ────────────────────────────────────────────
type Props = {
  homeworkId: string;
  subject:    string;
  wrongItems: Array<{
    item:       GradeItem;
    teacherHint: string | null;
  }>;
};

export default function HomeworkReviewClient({
  homeworkId,
  subject,
  wrongItems,
}: Props) {
  const [states, setStates] = useState<ItemState[]>(() =>
    wrongItems.map(({ item, teacherHint }) => ({
      number:        item.number,
      correctAnswer: item.correct_answer,
      wrongAnswer:   item.student_answer,
      teacherHint,
      input:         '',
      status:        'wrong',
      attempts:      0,
      hintLevel:     0,
      hints:         [],
      hintLoading:   false,
    })),
  );

  const correctedCount = states.filter((s) => s.status === 'corrected').length;
  const totalWrong     = states.length;
  const allDone        = states.every((s) => s.status !== 'wrong');

  // ── 입력 변경 ─────────────────────────────────────────────
  const setInput = (number: number, val: string) =>
    setStates((prev) =>
      prev.map((s) => (s.number === number ? { ...s, input: val } : s)),
    );

  // ── 답 제출 ───────────────────────────────────────────────
  const handleCheck = useCallback((number: number) => {
    setStates((prev) =>
      prev.map((s) => {
        if (s.number !== number) return s;
        if (s.status !== 'wrong') return s;

        const correct = checkAnswer(s.input, s.correctAnswer);
        return {
          ...s,
          attempts: s.attempts + 1,
          status:   correct ? 'corrected' : 'wrong',
          // 틀렸으면 input 유지 (학생이 볼 수 있게)
        };
      }),
    );
  }, []);

  // ── 힌트 요청 ─────────────────────────────────────────────
  const handleRequestHint = useCallback(async (number: number) => {
    const item = states.find((s) => s.number === number);
    if (!item || item.status !== 'wrong') return;

    // 이미 로드된 힌트가 있으면 다음 단계만 공개
    if (item.hints.length > 0) {
      const nextLevel = (item.hintLevel + 1) as 1 | 2 | 3;
      if (nextLevel <= item.hints.length) {
        setStates((prev) =>
          prev.map((s) =>
            s.number === number ? { ...s, hintLevel: nextLevel } : s,
          ),
        );
        return;
      }
    }

    // 아직 힌트 없으면 Claude 호출
    setStates((prev) =>
      prev.map((s) =>
        s.number === number ? { ...s, hintLoading: true } : s,
      ),
    );

    try {
      const res = await fetch('/api/homework/hint', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          correct_answer:    item.correctAnswer,
          student_wrong:     item.wrongAnswer,
          subject,
          question_context:  item.teacherHint ?? undefined,
        }),
      });

      const data = await res.json();
      const hints: string[] = data.hints ?? [];

      setStates((prev) =>
        prev.map((s) =>
          s.number === number
            ? { ...s, hints, hintLevel: 1, hintLoading: false }
            : s,
        ),
      );
    } catch {
      setStates((prev) =>
        prev.map((s) =>
          s.number === number ? { ...s, hintLoading: false } : s,
        ),
      );
    }
  }, [states, subject]);

  // ── 정답 공개 ─────────────────────────────────────────────
  const handleReveal = useCallback((number: number) => {
    setStates((prev) =>
      prev.map((s) =>
        s.number === number ? { ...s, status: 'revealed' } : s,
      ),
    );
  }, []);

  // ── 완료 화면 ─────────────────────────────────────────────
  if (allDone) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-2">
          <p className="text-3xl">🎉</p>
          <p className="text-base font-bold text-emerald-800">오답 교정 완료!</p>
          <p className="text-sm text-emerald-700">
            {correctedCount}개 스스로 교정 ·{' '}
            {totalWrong - correctedCount}개 정답 확인
          </p>
        </div>
        <a
          href={`/student/homework`}
          className="block w-full rounded-xl bg-neutral-900 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800"
        >
          숙제 목록으로
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 진행 상황 */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-neutral-100">
          <div
            className="h-2 rounded-full bg-emerald-400 transition-all"
            style={{ width: `${(correctedCount / totalWrong) * 100}%` }}
          />
        </div>
        <span className="text-xs text-neutral-500 shrink-0">
          {correctedCount} / {totalWrong} 교정
        </span>
      </div>

      {/* 오답 목록 */}
      {states.map((s) => (
        <ItemCard
          key={s.number}
          state={s}
          onInputChange={(val) => setInput(s.number, val)}
          onCheck={() => handleCheck(s.number)}
          onRequestHint={() => handleRequestHint(s.number)}
          onReveal={() => handleReveal(s.number)}
        />
      ))}
    </div>
  );
}

// ── 개별 오답 카드 ─────────────────────────────────────────────
function ItemCard({
  state,
  onInputChange,
  onCheck,
  onRequestHint,
  onReveal,
}: {
  state:          ItemState;
  onInputChange:  (val: string) => void;
  onCheck:        () => void;
  onRequestHint:  () => void;
  onReveal:       () => void;
}) {
  const s = state;

  // 교정 완료
  if (s.status === 'corrected') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
            ○
          </span>
          <span className="text-xs text-neutral-400">Q{s.number}</span>
          <span className="text-sm font-semibold text-emerald-800">{s.input}</span>
          <span className="ml-auto text-xs text-emerald-600">스스로 교정!</span>
        </div>
      </div>
    );
  }

  // 정답 공개됨
  if (s.status === 'revealed') {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-400 text-xs font-bold text-white">
            ✓
          </span>
          <span className="text-xs text-neutral-400">Q{s.number}</span>
          <span className="text-sm font-semibold text-neutral-600">{s.correctAnswer}</span>
          <span className="ml-auto text-xs text-neutral-400">정답 확인</span>
        </div>
      </div>
    );
  }

  // 교정 중
  const canNextHint = s.hintLevel < 3 && s.hintLevel < s.hints.length;
  const canLoadHint = s.hints.length === 0 && !s.hintLoading;
  const showHintBtn = canLoadHint || canNextHint;
  const canReveal   = s.attempts >= 1 || s.hintLevel > 0;

  return (
    <div className="rounded-2xl border border-red-200 bg-white p-4 space-y-3">
      {/* 문항 헤더 */}
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
          {s.number}
        </span>
        <span className="text-xs text-neutral-400">
          내 오답:{' '}
          <span className="text-red-500 line-through">{s.wrongAnswer || '(미기입)'}</span>
        </span>
      </div>

      {/* 힌트 표시 */}
      {s.hintLevel > 0 && (
        <div className="space-y-1.5">
          {s.hints.slice(0, s.hintLevel).map((hint, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 leading-relaxed"
            >
              <span className="font-semibold text-amber-600">힌트 {idx + 1}</span>
              {'  '}
              {hint}
            </div>
          ))}
        </div>
      )}

      {/* 입력 + 확인 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={s.input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && s.input.trim() && onCheck()}
          placeholder="정답을 입력하세요"
          className={[
            'flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition',
            s.attempts > 0 && !checkAnswer(s.input, s.correctAnswer)
              ? 'border-red-300 focus:border-red-400'
              : 'border-neutral-200 focus:border-neutral-400',
          ].join(' ')}
        />
        <button
          type="button"
          onClick={onCheck}
          disabled={!s.input.trim()}
          className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
        >
          확인
        </button>
      </div>

      {/* 틀렸을 때 피드백 */}
      {s.attempts > 0 && !checkAnswer(s.input, s.correctAnswer) && s.input.trim() && (
        <p className="text-xs text-red-500">
          아직 틀렸습니다. 힌트를 참고해 다시 시도해 보세요.
        </p>
      )}

      {/* 하단 버튼: 힌트 + 정답 보기 */}
      <div className="flex gap-2">
        {showHintBtn && (
          <button
            type="button"
            onClick={onRequestHint}
            disabled={s.hintLoading}
            className="flex-1 rounded-xl border border-amber-200 bg-amber-50 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            {s.hintLoading
              ? '힌트 생성 중…'
              : s.hints.length === 0
              ? '💡 힌트 보기'
              : `💡 힌트 ${s.hintLevel + 1} 보기`}
          </button>
        )}

        {canReveal && (
          <button
            type="button"
            onClick={onReveal}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-xs text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"
          >
            정답 보기
          </button>
        )}
      </div>
    </div>
  );
}
