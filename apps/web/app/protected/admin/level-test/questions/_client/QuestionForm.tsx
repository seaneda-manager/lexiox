'use client';

import { useState } from 'react';
import { addQuestionAction, type NewQuestionInput } from '../actions';

const SECTION_OPTIONS: { value: NewQuestionInput['section']; label: string }[] = [
  { value: 'grammar', label: '📚 문법' },
  { value: 'vocab', label: '🔤 어휘' },
  { value: 'listening', label: '🎧 듣기' },
  { value: 'reading', label: '📖 읽기' },
  { value: 'speaking', label: '🎤 말하기' },
];

export default function QuestionForm() {
  const [section, setSection] = useState<NewQuestionInput['section']>('grammar');
  const [prompt, setPrompt] = useState('');
  const [passageText, setPassageText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isSpeaking = section === 'speaking';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const result = await addQuestionAction({ section, prompt, passageText, audioUrl, choices, correctIndex });
    setSaving(false);
    if ('error' in result) { setError(result.error); return; }
    setMessage('문제가 추가되었습니다.');
    setPrompt('');
    setPassageText('');
    setAudioUrl('');
    setChoices(['', '', '', '']);
    setCorrectIndex(0);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">문제 추가</h2>

      <div className="flex flex-wrap gap-1.5">
        {SECTION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSection(opt.value)}
            className={[
              'rounded-full border px-3 py-1.5 text-xs font-medium transition',
              section === opt.value
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {section === 'reading' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-600">지문 (선택)</label>
          <textarea
            value={passageText}
            onChange={(e) => setPassageText(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400 resize-none"
          />
        </div>
      )}

      {section === 'listening' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-600">오디오 URL</label>
          <input
            type="text"
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-neutral-600">
          {isSpeaking ? '말하기 프롬프트 *' : '문제 *'}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder={isSpeaking ? '예: 가장 기억에 남는 여행 경험을 30초 동안 영어로 설명해 보세요.' : '문제 내용'}
          className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400 resize-none"
        />
      </div>

      {!isSpeaking && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-600">보기 (정답에 라디오 체크)</label>
          <div className="space-y-1.5">
            {choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                  className="h-4 w-4"
                />
                <input
                  type="text"
                  value={c}
                  onChange={(e) => setChoices((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                  placeholder={`보기 ${i + 1}`}
                  className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {saving ? '저장 중…' : '문제 추가'}
      </button>
    </form>
  );
}
