'use client';

import { useState } from 'react';
import { generateAiReadingAction, saveAiReadingAction } from './actions';
import type { AiReading } from '@/lib/middle-naesin/aiReading';

type JrPassage = { id: string; title: string; content: string; korean_translation: string | null };

export function AiReadingClient({ unitId, jrPassages }: { unitId: string; jrPassages: JrPassage[] }) {
  const [source, setSource] = useState('');
  const [title, setTitle] = useState('');
  const [passage, setPassage] = useState('');
  const [koHint, setKoHint] = useState('');
  const [busy, setBusy] = useState<'gen' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState<AiReading | null>(null);
  const [grammarText, setGrammarText] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [withVocab, setWithVocab] = useState(true);

  function pickSource(id: string) {
    setSource(id);
    const p = jrPassages.find((x) => x.id === id);
    if (p) {
      setTitle(p.title);
      setPassage(p.content);
      setKoHint(p.korean_translation ?? '');
    }
  }

  async function generate() {
    setBusy('gen');
    setError('');
    setMessage('');
    const res = await generateAiReadingAction({ unitId, title, passage, koreanHint: koHint });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setReading(res.reading);
    setGrammarText(res.reading.sentences.map((s) => s.grammar.join(', ')));
    setWarnings(res.warnings);
  }

  async function save(status: 'draft' | 'final') {
    if (!reading) return;
    setBusy('save');
    setError('');
    setMessage('');
    const edited: AiReading = {
      ...reading,
      sentences: reading.sentences.map((s, i) => ({
        ...s,
        grammar: grammarText[i].split(/[,，]/).map((g) => g.trim()).filter(Boolean),
      })),
    };
    const res = await saveAiReadingAction({
      unitId,
      title,
      reading: edited,
      passage,
      status,
      withVocab,
      source: source ? `jr:${source}` : 'pasted',
    });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setMessage(res.message);
    setReading(null);
  }

  const setSentence = (i: number, patch: Partial<AiReading['sentences'][number]>) =>
    setReading((r) => (r ? { ...r, sentences: r.sentences.map((s, k) => (k === i ? { ...s, ...patch } : s)) } : r));

  const input = 'w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-200';

  return (
    <section className="space-y-4 rounded-2xl border bg-white p-5">
      <h2 className="text-sm font-semibold text-neutral-800">① 지문 고르기</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-neutral-600">
          JR 에 저장된 지문 불러오기
          <select value={source} onChange={(e) => pickSource(e.target.value)} className={input}>
            <option value="">— 직접 붙여넣기 —</option>
            {jrPassages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || '(제목 없음)'}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-neutral-600">
          제목
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} placeholder="예: Mosquitoes" />
        </label>
      </div>

      <label className="block space-y-1 text-xs text-neutral-600">
        영어 지문
        <textarea value={passage} onChange={(e) => setPassage(e.target.value)} rows={7} className={`${input} font-mono`} />
      </label>
      <label className="block space-y-1 text-xs text-neutral-600">
        참고 한국어 해석 (있으면 — 없어도 됩니다)
        <textarea value={koHint} onChange={(e) => setKoHint(e.target.value)} rows={3} className={input} />
      </label>

      <button
        type="button"
        onClick={generate}
        disabled={busy !== null || passage.trim().length < 20}
        className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
      >
        {busy === 'gen' ? 'AI 가 가공하는 중… (최대 1~2분)' : 'AI 로 드릴 데이터 만들기'}
      </button>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      {reading && (
        <div className="space-y-4 border-t pt-4">
          <h2 className="text-sm font-semibold text-neutral-800">② 확인하고 고치기</h2>

          {warnings.length > 0 && (
            <ul className="list-disc space-y-0.5 rounded-lg bg-amber-50 p-3 pl-7 text-xs text-amber-800">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}

          <div className="space-y-3">
            {reading.sentences.map((s, i) => (
              <div key={i} className="space-y-2 rounded-xl border p-3">
                <div className="text-xs font-bold text-neutral-400">{i + 1}</div>
                <textarea value={s.en} onChange={(e) => setSentence(i, { en: e.target.value })} rows={2} className={`${input} font-mono`} />
                <textarea value={s.ko} onChange={(e) => setSentence(i, { ko: e.target.value })} rows={2} className={input} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ['subject', 'S 주어'],
                      ['verb', 'V 동사'],
                      ['object', 'O 목적어'],
                      ['complement', 'C 보어'],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k} className="space-y-0.5 text-[10px] font-semibold text-neutral-500">
                      {label}
                      <input value={s[k]} onChange={(e) => setSentence(i, { [k]: e.target.value })} className={`${input} font-normal`} />
                    </label>
                  ))}
                </div>
                <label className="block space-y-0.5 text-[10px] font-semibold text-neutral-500">
                  문법 태그 (쉼표로 구분 · 예: 5형식, 과거)
                  <input
                    value={grammarText[i] ?? ''}
                    onChange={(e) => setGrammarText((g) => g.map((v, k) => (k === i ? e.target.value : v)))}
                    className={`${input} font-normal`}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="rounded-xl border p-3">
            <div className="mb-1 text-xs font-semibold text-neutral-700">핵심 단어 ({reading.vocabulary.length})</div>
            <ul className="columns-2 text-xs text-neutral-700">
              {reading.vocabulary.map((v, i) => (
                <li key={i}>
                  <b>{v.word}</b> {v.meaning_ko}
                </li>
              ))}
            </ul>
            <label className="mt-2 flex items-center gap-1.5 text-xs text-neutral-600">
              <input type="checkbox" checked={withVocab} onChange={(e) => setWithVocab(e.target.checked)} />
              단어도 함께 저장 (이 단원 단어 드릴에 추가, 이미 있는 단어는 제외)
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => save('draft')}
              disabled={busy !== null}
              className="rounded-xl border px-5 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:opacity-40"
            >
              초안으로 저장 (학생에게 안 보임)
            </button>
            <button
              type="button"
              onClick={() => save('final')}
              disabled={busy !== null}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {busy === 'save' ? '저장 중…' : '저장하고 확정 (학생에게 공개)'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
