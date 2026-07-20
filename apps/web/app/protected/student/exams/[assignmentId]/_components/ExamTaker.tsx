'use client';

import { useState, useTransition } from 'react';
import { saveExamAnswers, submitExam } from '../_actions/submit';
import type { ExamQuestion } from '../../../../teacher/exam-generator/_actions/generate';

type Props = {
  assignmentId: string;
  questions: ExamQuestion[];
  savedAnswers: Record<string, string>;
  submitted: boolean;
};

const typeColor: Record<string, string> = {
  '글의 목적': 'bg-sky-100 text-sky-700', '심경': 'bg-violet-100 text-violet-700',
  '심경 변화': 'bg-violet-100 text-violet-700', '필자 주장': 'bg-indigo-100 text-indigo-700',
  '요지': 'bg-indigo-100 text-indigo-700', '주제': 'bg-indigo-100 text-indigo-700',
  '제목': 'bg-indigo-100 text-indigo-700', '내용 일치': 'bg-green-100 text-green-700',
  '내용 불일치': 'bg-green-100 text-green-700', '어법': 'bg-blue-100 text-blue-700',
  '어휘': 'bg-purple-100 text-purple-700', '빈칸 추론': 'bg-amber-100 text-amber-700',
  '빈칸추론': 'bg-amber-100 text-amber-700', '문단 순서': 'bg-rose-100 text-rose-700',
  '순서': 'bg-rose-100 text-rose-700', '문장 삽입': 'bg-pink-100 text-pink-700',
  '문장삽입': 'bg-pink-100 text-pink-700', '서술형': 'bg-orange-100 text-orange-700',
};

export default function ExamTaker({ assignmentId, questions, savedAnswers, submitted: initialSubmitted }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(savedAnswers);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  if (questions.length === 0) return <p className="text-sm text-neutral-400">문제가 없습니다.</p>;

  const q = questions[currentIdx];
  const qKey = String(q.number);
  const isObjective = q.type !== '서술형';

  function handleSelect(option: string) {
    if (submitted) return;
    const val = option.slice(0, 1); // ① ② ③ ④ ⑤
    setAnswers((prev) => ({ ...prev, [qKey]: val }));
  }

  function handleTextAnswer(val: string) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qKey]: val }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveExamAnswers(assignmentId, answers);
      setMessage(result.error ? '저장 실패: ' + result.error : '임시 저장됐습니다.');
    });
  }

  function handleSubmit() {
    const answered = Object.keys(answers).length;
    if (answered < questions.length) {
      if (!confirm(`아직 ${questions.length - answered}문제가 미답입니다. 제출하시겠습니까?`)) return;
    }
    startTransition(async () => {
      const result = await submitExam(assignmentId, answers);
      if (result.error) { setMessage('제출 실패: ' + result.error); return; }
      setSubmitted(true);
      setMessage('제출 완료!');
    });
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-4">
      {/* 진행상황 */}
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>답변 {answeredCount} / {questions.length}</span>
        <div className="flex gap-2">
          {!submitted && (
            <button onClick={handleSave} disabled={isPending}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-40 transition">
              💾 임시저장
            </button>
          )}
          {!submitted && (
            <button onClick={handleSubmit} disabled={isPending}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition">
              {isPending ? '처리 중...' : '📤 최종 제출'}
            </button>
          )}
        </div>
      </div>

      {message && <p className="text-sm font-medium text-indigo-600">{message}</p>}

      {/* 네비게이션 */}
      <div className="flex items-center gap-2">
        <button onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-30 transition">
          ← 이전
        </button>
        <div className="flex items-center gap-1">
          <input type="number" min={1} max={questions.length} value={currentIdx + 1}
            onChange={(e) => { const n = Number(e.target.value) - 1; if (n >= 0 && n < questions.length) setCurrentIdx(n); }}
            className="w-14 rounded-lg border border-neutral-200 px-2 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <span className="text-sm text-neutral-500">/ {questions.length}</span>
        </div>
        <button onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))} disabled={currentIdx === questions.length - 1}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-30 transition">
          다음 →
        </button>
      </div>

      {/* 문제 카드 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {q.number}
          </span>
          <div className="flex-1 space-y-3">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[q.type] ?? 'bg-neutral-100 text-neutral-600'}`}>
              {q.type}
            </span>
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4 text-sm leading-relaxed whitespace-pre-wrap text-neutral-800">
              {q.passageOverride ?? q.passageText}
            </div>
            <p className="text-sm font-medium text-neutral-700">{q.question}</p>

            {/* 객관식 */}
            {isObjective && q.options && q.options.length > 0 && (
              <ul className="space-y-2">
                {q.options.map((opt, i) => {
                  const val = opt.slice(0, 1);
                  const selected = answers[qKey] === val;
                  const isCorrect = submitted && val === q.answer.slice(0, 1);
                  const isWrong = submitted && selected && !isCorrect;
                  return (
                    <li key={i}>
                      <button
                        onClick={() => handleSelect(opt)}
                        disabled={submitted}
                        className={`w-full text-left rounded-lg border px-4 py-2.5 text-sm transition
                          ${isCorrect ? 'border-green-400 bg-green-50 text-green-800 font-medium' :
                            isWrong ? 'border-red-400 bg-red-50 text-red-800' :
                            selected ? 'border-indigo-400 bg-indigo-50 text-indigo-800 font-medium' :
                            'border-neutral-200 hover:bg-neutral-50'}`}
                      >
                        {opt}
                        {isCorrect && ' ✓'}
                        {isWrong && ' ✗'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* 서술형 */}
            {!isObjective && (
              <textarea
                rows={4}
                value={answers[qKey] ?? ''}
                onChange={(e) => handleTextAnswer(e.target.value)}
                disabled={submitted}
                placeholder="답안을 작성하세요."
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-neutral-50 resize-none"
              />
            )}

            {/* 제출 후 정답/해설 */}
            {submitted && (
              <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 space-y-1">
                <p className="text-xs font-semibold text-indigo-700">정답: {q.answer}</p>
                <p className="text-xs text-indigo-600 leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 문제 번호 그리드 */}
      <div className="flex flex-wrap gap-2">
        {questions.map((_, i) => {
          const key = String(questions[i].number);
          const hasAnswer = !!answers[key];
          return (
            <button key={i} onClick={() => setCurrentIdx(i)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition
                ${i === currentIdx ? 'bg-indigo-600 text-white' :
                  hasAnswer ? 'bg-indigo-100 text-indigo-700' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
