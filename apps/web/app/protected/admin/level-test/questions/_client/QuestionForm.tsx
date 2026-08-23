'use client';

import { useState } from 'react';
import { addQuestionAction, generateQuestionAction, type NewQuestionInput } from '../actions';
import { TRACK_LABEL, TRACK_LEVELS, subLevelLabel, type Track, type SubLevel, type Section } from '@/lib/level-test/proficiencyLevels';

const SECTION_OPTIONS: { value: Section; label: string }[] = [
  { value: 'grammar', label: '📚 문법' },
  { value: 'vocab', label: '🔤 어휘' },
  { value: 'listening', label: '🎧 듣기' },
  { value: 'reading', label: '📖 읽기' },
  { value: 'speaking', label: '🎤 말하기' },
  { value: 'writing', label: '✍️ 쓰기' },
];

const TRACK_OPTIONS = Object.entries(TRACK_LABEL) as [Track, string][];

const OPEN_RESPONSE_SECTIONS: Section[] = ['speaking', 'writing'];

export default function QuestionForm() {
  const [section, setSection] = useState<Section>('grammar');
  const [track, setTrack] = useState<Track>('toefl');
  const [subLevel, setSubLevel] = useState<SubLevel>('mid');
  const [topic, setTopic] = useState('');
  const [prompt, setPrompt] = useState('');
  const [passageText, setPassageText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [choices, setChoices] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [generatedByAi, setGeneratedByAi] = useState(false);
  const [topicLabel, setTopicLabel] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isOpenResponse = OPEN_RESPONSE_SECTIONS.includes(section);
  const subLevelOptions = TRACK_LEVELS[track].map((v) => [v, subLevelLabel(track, v)] as [SubLevel, string]);

  const handleTrackChange = (nextTrack: Track) => {
    setTrack(nextTrack);
    if (!TRACK_LEVELS[nextTrack].includes(subLevel)) setSubLevel('mid');
  };

  const resetFields = () => {
    setPrompt('');
    setPassageText('');
    setAudioUrl('');
    setChoices(['', '', '', '']);
    setCorrectIndex(0);
    setGeneratedByAi(false);
    setTopicLabel(null);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setMessage(null);
    const result = await generateQuestionAction(section, track, subLevel, topic);
    setGenerating(false);
    if ('error' in result) { setError(result.error); return; }

    const q = result.question;
    setPrompt(q.prompt);
    setPassageText(q.passageText ?? '');
    setAudioUrl(q.audioUrl ?? '');
    setTopicLabel(q.topicLabel);
    if (q.choices) {
      setChoices([...q.choices.map((c) => c.text), '', '', '', ''].slice(0, 4));
      setCorrectIndex(q.correctIndex ?? 0);
    }
    setGeneratedByAi(true);
    setMessage(q.audioUrl ? 'AI가 대본을 만들고 음성까지 합성했습니다 — 들어보고 검토 후 저장하세요.' : 'AI가 생성했습니다 — 검토 후 저장하세요.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const input: NewQuestionInput = {
      section, prompt, passageText, audioUrl, choices, correctIndex,
      track, subLevel, generatedByAi, topicLabel,
    };
    const result = await addQuestionAction(input);
    setSaving(false);
    if ('error' in result) { setError(result.error); return; }
    setMessage('문제가 추가되었습니다.');
    resetFields();
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">문제 추가</h2>

      <div className="flex flex-wrap gap-1.5">
        {SECTION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { setSection(opt.value); resetFields(); }}
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

      {/* AI 생성 패널 */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
        <p className="text-xs font-bold text-indigo-600">🤖 AI로 생성 (레벨 기준표 기반)</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-500">트랙</label>
            <select value={track} onChange={(e) => handleTrackChange(e.target.value as Track)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white outline-none focus:border-neutral-400">
              {TRACK_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-neutral-500">단계</label>
            <select value={subLevel} onChange={(e) => setSubLevel(e.target.value as SubLevel)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white outline-none focus:border-neutral-400">
              {subLevelOptions.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
        </div>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="주제/소재 (선택, 비우면 AI가 자유롭게 선정)"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm bg-white outline-none focus:border-neutral-400"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {generating ? (section === 'listening' ? '대본 생성 + 음성 합성 중… (몇 초 소요)' : '생성 중…') : '이 레벨로 문제 생성'}
        </button>
      </div>

      {section === 'reading' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-600">지문</label>
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
            placeholder="https://... (AI 생성 시 자동으로 채워짐)"
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
          {audioUrl && <audio controls src={audioUrl} className="w-full" />}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-neutral-600">
          {isOpenResponse ? '프롬프트 *' : '문제 *'}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder={isOpenResponse ? '예: 가장 기억에 남는 여행 경험을 30초 동안 영어로 설명해 보세요.' : '문제 내용'}
          className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400 resize-none"
        />
      </div>

      {!isOpenResponse && (
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

      {topicLabel && (
        <p className="text-[11px] text-neutral-400">
          🏷️ 주제 라벨: <span className="font-medium text-neutral-600">{topicLabel}</span> (중복 방지용으로 저장됨)
        </p>
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
