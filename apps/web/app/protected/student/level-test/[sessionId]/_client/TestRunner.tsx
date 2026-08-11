'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AudioRecorder from '@/components/common/AudioRecorder';
import { submitLevelTestAction, type LevelTestAnswer } from '../../actions';

export type PublicQuestion = {
  id: string;
  section: string;
  order_index: number;
  prompt: string;
  passage_text: string | null;
  audio_url: string | null;
  choices: { id: string; text: string }[] | null;
};

const SECTION_META: Record<string, { label: string; icon: string }> = {
  grammar: { label: '문법', icon: '📚' },
  vocab: { label: '어휘', icon: '🔤' },
  listening: { label: '듣기', icon: '🎧' },
  reading: { label: '읽기', icon: '📖' },
  speaking: { label: '말하기', icon: '🎤' },
};

type Answer = { choiceId?: string; audioUrl?: string };

export default function TestRunner({
  sessionId,
  questionsBySection,
  sectionOrder,
}: {
  sessionId: string;
  questionsBySection: Record<string, PublicQuestion[]>;
  sectionOrder: string[];
}) {
  const router = useRouter();
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const currentSection = sectionOrder[sectionIdx];
  const currentQuestions = questionsBySection[currentSection] ?? [];
  const isLastSection = sectionIdx === sectionOrder.length - 1;

  const answeredInSection = useMemo(
    () => currentQuestions.filter((q) => answers[q.id]?.choiceId || answers[q.id]?.audioUrl).length,
    [currentQuestions, answers],
  );

  const setChoice = (questionId: string, choiceId: string) =>
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], choiceId } }));

  const handleRecorded = async (questionId: string, blob: Blob) => {
    setUploadingId(questionId);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', blob, 'recording.webm');
      fd.append('sessionId', sessionId);
      fd.append('questionId', questionId);
      const res = await fetch('/api/level-test/upload-audio', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? '업로드 실패');
      setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], audioUrl: data.publicUrl } }));
    } catch (e: any) {
      setError(e?.message ?? '녹음 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploadingId(null);
    }
  };

  const goNext = () => {
    setError(null);
    if (!isLastSection) {
      setSectionIdx((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const allAnswers: LevelTestAnswer[] = Object.entries(answers).map(([questionId, a]) => ({
      questionId,
      choiceId: a.choiceId,
      audioUrl: a.audioUrl,
    }));
    const result = await submitLevelTestAction(sessionId, allAnswers);
    setSubmitting(false);
    if ('error' in result) { setError(result.error); return; }
    router.refresh();
  };

  const meta = SECTION_META[currentSection] ?? { label: currentSection, icon: '📝' };

  return (
    <div className="space-y-6">
      {/* 섹션 진행 표시 */}
      <div className="flex items-center gap-1.5">
        {sectionOrder.map((sec, idx) => (
          <div
            key={sec}
            className={[
              'flex-1 h-1.5 rounded-full',
              idx < sectionIdx ? 'bg-emerald-400' : idx === sectionIdx ? 'bg-neutral-900' : 'bg-neutral-200',
            ].join(' ')}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-900">{meta.icon} {meta.label}</h2>
        <span className="text-xs text-neutral-400">{answeredInSection}/{currentQuestions.length} 완료</span>
      </div>

      <div className="space-y-4">
        {currentQuestions.map((q, idx) => (
          <div key={q.id} className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
            <p className="text-[11px] text-neutral-400">문항 {idx + 1}</p>

            {q.passage_text && (
              <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                {q.passage_text}
              </div>
            )}
            {q.audio_url && (
              <audio controls src={q.audio_url} className="w-full" />
            )}

            <p className="text-sm font-medium text-neutral-900">{q.prompt}</p>

            {q.choices ? (
              <div className="space-y-1.5">
                {q.choices.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setChoice(q.id, c.id)}
                    className={[
                      'w-full rounded-xl border px-4 py-2.5 text-left text-sm transition',
                      answers[q.id]?.choiceId === c.id
                        ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                        : 'border-neutral-200 text-neutral-700 hover:border-neutral-400',
                    ].join(' ')}
                  >
                    {c.text}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <AudioRecorder
                  label={answers[q.id]?.audioUrl ? '다시 녹음하기' : '녹음 시작'}
                  onRecorded={(blob) => handleRecorded(q.id, blob)}
                  disabled={uploadingId === q.id}
                />
                {uploadingId === q.id && <p className="text-xs text-neutral-400">업로드 중…</p>}
                {answers[q.id]?.audioUrl && !uploadingId && (
                  <p className="text-xs text-emerald-600">✓ 녹음 완료</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {isLastSection ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? '제출 중…' : '테스트 제출하기'}
        </button>
      ) : (
        <button
          type="button"
          onClick={goNext}
          className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          다음 영역 →
        </button>
      )}
    </div>
  );
}
