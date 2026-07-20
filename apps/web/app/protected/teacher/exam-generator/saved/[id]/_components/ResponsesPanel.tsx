'use client';

import { useState } from 'react';
import type { ExamQuestion } from '../../../_actions/generate';

type Student = { id: string; name: string };
type Response = {
  studentId: string;
  answers: Record<string, string>;
  submittedAt: string | null;
};
type Props = {
  students: Student[];
  responses: Response[];
  questions: ExamQuestion[];
};

const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'];

function getScore(answers: Record<string, string>, questions: ExamQuestion[]) {
  let correct = 0;
  const objective = questions.filter((q) => q.type !== '서술형');
  for (const q of objective) {
    const sa = answers[String(q.number)]?.trim();
    const ca = q.answer?.trim().slice(0, 1);
    if (sa && ca && sa === ca) correct++;
  }
  return { correct, total: objective.length };
}

function getWeakTypes(answers: Record<string, string>, questions: ExamQuestion[]) {
  const wrongTypes: Record<string, number> = {};
  for (const q of questions) {
    if (q.type === '서술형') continue;
    const sa = answers[String(q.number)]?.trim();
    const ca = q.answer?.trim().slice(0, 1);
    if (sa && ca && sa !== ca) {
      wrongTypes[q.type] = (wrongTypes[q.type] ?? 0) + 1;
    }
  }
  return Object.entries(wrongTypes).sort((a, b) => b[1] - a[1]);
}

const typeColor: Record<string, string> = {
  '글의 목적': 'bg-sky-100 text-sky-700', '필자 주장': 'bg-indigo-100 text-indigo-700',
  '요지': 'bg-indigo-100 text-indigo-700', '주제': 'bg-indigo-100 text-indigo-700',
  '제목': 'bg-indigo-100 text-indigo-700', '내용 일치': 'bg-green-100 text-green-700',
  '내용 불일치': 'bg-green-100 text-green-700', '어법': 'bg-blue-100 text-blue-700',
  '어휘': 'bg-purple-100 text-purple-700', '빈칸 추론': 'bg-amber-100 text-amber-700',
  '빈칸추론': 'bg-amber-100 text-amber-700', '문단 순서': 'bg-rose-100 text-rose-700',
  '순서': 'bg-rose-100 text-rose-700', '문장 삽입': 'bg-pink-100 text-pink-700',
  '문장삽입': 'bg-pink-100 text-pink-700', '서술형': 'bg-orange-100 text-orange-700',
};

type Tab = 'overview' | 'distribution' | 'student';

export default function ResponsesPanel({ students, responses, questions }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const responseMap = Object.fromEntries(responses.map((r) => [r.studentId, r]));
  const submitted = responses.filter((r) => r.submittedAt);
  const submittedCount = submitted.length;
  const objective = questions.filter((q) => q.type !== '서술형');

  // 오답 분포 계산
  const distribution = objective.map((q) => {
    const counts: Record<string, number> = {};
    let answered = 0;
    for (const r of submitted) {
      const ans = r.answers[String(q.number)]?.trim();
      if (ans) { counts[ans] = (counts[ans] ?? 0) + 1; answered++; }
    }
    const correctAns = q.answer?.trim().slice(0, 1);
    const correctCount = counts[correctAns ?? ''] ?? 0;
    const accuracy = answered > 0 ? Math.round((correctCount / answered) * 100) : null;
    return { q, counts, answered, correctAns, accuracy };
  });

  const selectedStudentData = selectedStudent ? responseMap[selectedStudent] : null;
  const selectedStudentName = students.find((s) => s.id === selectedStudent)?.name ?? '';

  return (
    <div className="print:hidden rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
        <h2 className="text-base font-bold text-neutral-900">📊 답안 분석</h2>
        <span className="text-sm text-neutral-500">제출 {submittedCount} / {students.length}명</span>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-neutral-100">
        {([['overview', '현황'], ['distribution', '오답 분포'], ['student', '학생별 상세']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm font-medium transition border-b-2 ${tab === key ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="p-5">

        {/* ── 현황 탭 ── */}
        {tab === 'overview' && (
          <div className="space-y-3">
            {students.length === 0 && <p className="text-sm text-neutral-400">배정된 학생이 없습니다.</p>}
            {students.map((s) => {
              const res = responseMap[s.id];
              const isSubmitted = !!res?.submittedAt;
              const score = isSubmitted ? getScore(res.answers, questions) : null;
              const pct = score ? Math.round((score.correct / score.total) * 100) : 0;
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 px-4 py-3">
                  <span className="w-24 text-sm font-medium text-neutral-800 truncate">{s.name}</span>
                  {isSubmitted && score ? (
                    <>
                      <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-right text-sm font-semibold text-neutral-700">
                        {score.correct}/{score.total} ({pct}%)
                      </span>
                      <button onClick={() => { setSelectedStudent(s.id); setTab('student'); }}
                        className="text-xs text-indigo-500 hover:underline whitespace-nowrap">상세 →</button>
                    </>
                  ) : (
                    <span className="text-xs text-neutral-400 ml-2">미제출</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── 오답 분포 탭 ── */}
        {tab === 'distribution' && (
          <div className="space-y-4">
            {submittedCount === 0 && <p className="text-sm text-neutral-400">제출한 학생이 없습니다.</p>}
            {distribution.map(({ q, counts, answered, correctAns, accuracy }) => (
              <div key={q.number} className="rounded-xl border border-neutral-100 p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{q.number}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[q.type] ?? 'bg-neutral-100 text-neutral-600'}`}>{q.type}</span>
                  {accuracy !== null && (
                    <span className={`ml-auto text-sm font-bold ${accuracy >= 80 ? 'text-green-600' : accuracy >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      정답률 {accuracy}%
                    </span>
                  )}
                </div>
                {answered > 0 && (
                  <div className="space-y-1.5">
                    {CHOICE_LABELS.map((label, idx) => {
                      const key = label;
                      const count = counts[key] ?? 0;
                      const pct = Math.round((count / answered) * 100);
                      const isCorrect = key === correctAns;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className={`w-5 font-bold ${isCorrect ? 'text-green-600' : 'text-neutral-400'}`}>{label}</span>
                          <div className="flex-1 h-5 rounded bg-neutral-100 overflow-hidden relative">
                            <div className={`h-full rounded transition-all ${isCorrect ? 'bg-green-300' : count > 0 ? 'bg-red-200' : ''}`}
                              style={{ width: `${pct}%` }} />
                            {count > 0 && (
                              <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-neutral-700">
                                {count}명 ({pct}%)
                              </span>
                            )}
                          </div>
                          {isCorrect && <span className="text-green-600 font-bold text-[10px]">정답</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 학생별 상세 탭 ── */}
        {tab === 'student' && (
          <div className="space-y-4">
            {/* 학생 선택 */}
            <div className="flex flex-wrap gap-2">
              {students.filter((s) => responseMap[s.id]?.submittedAt).map((s) => (
                <button key={s.id} onClick={() => setSelectedStudent(s.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition ${selectedStudent === s.id ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}>
                  {s.name}
                </button>
              ))}
              {students.filter((s) => responseMap[s.id]?.submittedAt).length === 0 && (
                <p className="text-sm text-neutral-400">제출한 학생이 없습니다.</p>
              )}
            </div>

            {selectedStudentData && (() => {
              const score = getScore(selectedStudentData.answers, questions);
              const pct = Math.round((score.correct / score.total) * 100);
              const weakTypes = getWeakTypes(selectedStudentData.answers, questions);
              return (
                <div className="space-y-4">
                  {/* 점수 요약 */}
                  <div className="flex items-center gap-4 rounded-xl bg-indigo-50 border border-indigo-100 px-5 py-4">
                    <div>
                      <p className="text-xs text-indigo-500 font-medium">{selectedStudentName}</p>
                      <p className="text-3xl font-black text-indigo-800">{score.correct}<span className="text-base font-normal text-indigo-400">/{score.total}</span></p>
                      <p className="text-sm text-indigo-600">{pct}점</p>
                    </div>
                    <div className="flex-1">
                      <div className="h-3 rounded-full bg-indigo-100 overflow-hidden">
                        <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      {weakTypes.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-semibold text-indigo-600">취약 유형</p>
                          <div className="flex flex-wrap gap-1.5">
                            {weakTypes.map(([type, count]) => (
                              <span key={type} className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[type] ?? 'bg-neutral-100 text-neutral-600'}`}>
                                {type} ({count}개 오답)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 문항별 상세 */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {questions.map((q) => {
                      const sa = selectedStudentData.answers[String(q.number)]?.trim();
                      const ca = q.answer?.trim().slice(0, 1);
                      const isObjective = q.type !== '서술형';
                      const isCorrect = isObjective && sa === ca;
                      const isWrong = isObjective && !!sa && sa !== ca;
                      const isBlank = !sa;
                      return (
                        <div key={q.number} className={`rounded-xl border p-3 space-y-1 text-xs
                          ${isCorrect ? 'border-green-200 bg-green-50' : isWrong ? 'border-red-200 bg-red-50' : isBlank ? 'border-neutral-200 bg-neutral-50' : 'border-neutral-200 bg-white'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-neutral-600">#{q.number}</span>
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColor[q.type] ?? 'bg-neutral-100 text-neutral-600'}`}>{q.type}</span>
                            </div>
                            <span className={`font-bold ${isCorrect ? 'text-green-600' : isWrong ? 'text-red-600' : 'text-neutral-400'}`}>
                              {isCorrect ? '✓ 정답' : isWrong ? '✗ 오답' : isBlank ? '미답' : '서술형'}
                            </span>
                          </div>
                          {isObjective && (
                            <p className="text-neutral-600">
                              학생: <span className={`font-semibold ${isWrong ? 'text-red-700' : 'text-neutral-800'}`}>{sa || '—'}</span>
                              {isWrong && <span className="text-neutral-400"> / 정답: <span className="font-semibold text-green-700">{ca}</span></span>}
                            </p>
                          )}
                          {!isObjective && sa && <p className="text-neutral-600 line-clamp-2">{sa}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
