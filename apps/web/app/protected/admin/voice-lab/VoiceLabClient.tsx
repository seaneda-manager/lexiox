'use client';

import { useEffect, useRef, useState } from 'react';

type Model = { model_id: string; name: string; description: string; languageCount: number; hasKorean: boolean };
type Mode = 'whole' | 'auto' | 'tags';
type Result = { key: string; label: string; url?: string; parts?: { lang: string; text: string }[]; ms?: number; error?: string };

const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: 'whole', label: '① 한 번에', hint: '문장 전체를 한 번에 (지금까지의 방식)' },
  { mode: 'auto', label: '② 영어 자동 분리', hint: '알파벳 구간을 찾아 영어로 따로 읽음' },
  { mode: 'tags', label: '③ [en] 표시 기준', hint: '[en]…[/en] 로 감싼 구간을 영어로 따로 읽음 (대본 AI가 이 표시를 붙임)' },
];

const SAMPLE_TAGGED =
  "[en]he[/en]는 '그는'이라는 뜻이고, [en]her[/en]는 '그녀의'예요. 예를 들어 [en]He likes apples.[/en] 처럼 쓰죠. 주어가 단수면 [en]is[/en]를 써요.";

const input = 'w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200';

export default function VoiceLabClient() {
  const [models, setModels] = useState<Model[]>([]);
  const [modelErr, setModelErr] = useState('');
  const [modelId, setModelId] = useState('');
  const [koVoice, setKoVoice] = useState('');
  const [enVoice, setEnVoice] = useState('');
  const [text, setText] = useState(SAMPLE_TAGGED);
  const [stability, setStability] = useState(0.5);
  const [similarity, setSimilarity] = useState(0.75);
  const [speed, setSpeed] = useState(1);
  const [useContext, setUseContext] = useState(true);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    try {
      setKoVoice(localStorage.getItem('voicelab.ko') ?? '');
      setEnVoice(localStorage.getItem('voicelab.en') ?? '');
      setModelId(localStorage.getItem('voicelab.model') ?? '');
    } catch {}
    fetch('/api/admin/voice-lab/models')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setModels(d.models);
        else setModelErr(d.error ?? '모델 목록을 불러오지 못했습니다.');
      })
      .catch(() => setModelErr('모델 목록을 불러오지 못했습니다.'));
    return () => urls.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const remember = (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  };

  async function run(modes: Mode[]) {
    setBusy(true);
    const next: Result[] = [];
    for (const m of modes) {
      const label = `${MODES.find((x) => x.mode === m)!.label} · ${modelId}`;
      const started = Date.now();
      try {
        const res = await fetch('/api/admin/voice-lab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, koVoiceId: koVoice, enVoiceId: enVoice, modelId, mode: m, stability, similarityBoost: similarity, speed, useContext }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          next.push({ key: `${m}-${Date.now()}`, label, error: d.error ?? `오류 ${res.status}` });
        } else {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          urls.current.push(url);
          const parts = JSON.parse(decodeURIComponent(res.headers.get('X-Voice-Parts') ?? '[]'));
          next.push({ key: `${m}-${Date.now()}`, label, url, parts, ms: Date.now() - started });
        }
      } catch (e) {
        next.push({ key: `${m}-${Date.now()}`, label, error: e instanceof Error ? e.message : '오류' });
      }
      setResults((prev) => [...next, ...prev.filter((p) => !next.some((n) => n.key === p.key))]);
    }
    setBusy(false);
  }

  const ready = !!koVoice.trim() && !!modelId.trim() && !!text.trim() && !busy;

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-gray-600">
            한국어 목소리 Voice ID (선생님 클론)
            <input value={koVoice} onChange={(e) => { setKoVoice(e.target.value); remember('voicelab.ko', e.target.value); }} className={input} placeholder="jFtI4l1a…" />
          </label>
          <label className="space-y-1 text-xs text-gray-600">
            영어 목소리 Voice ID (선택 — 비우면 위 목소리)
            <input value={enVoice} onChange={(e) => { setEnVoice(e.target.value); remember('voicelab.en', e.target.value); }} className={input} placeholder="미국 원어민 목소리 등" />
          </label>
        </div>

        <label className="block space-y-1 text-xs text-gray-600">
          모델
          {models.length > 0 ? (
            <select value={modelId} onChange={(e) => { setModelId(e.target.value); remember('voicelab.model', e.target.value); }} className={input}>
              <option value="">— 선택 —</option>
              {models.map((m) => (
                <option key={m.model_id} value={m.model_id}>
                  {m.name} ({m.model_id}){m.hasKorean ? '' : ' · 한국어 미지원?'}
                </option>
              ))}
            </select>
          ) : (
            <input value={modelId} onChange={(e) => { setModelId(e.target.value); remember('voicelab.model', e.target.value); }} className={input} placeholder="모델 ID 직접 입력 (예: eleven_multilingual_v2)" />
          )}
          {modelErr && <span className="text-[11px] text-amber-600">{modelErr} — 모델 ID를 직접 입력하세요.</span>}
        </label>

        <label className="block space-y-1 text-xs text-gray-600">
          읽을 문장 (영어 구간을 <code>[en]…[/en]</code> 로 감싸면 ③번에서 그대로 쓰이고, ①②번에서는 표시가 지워집니다)
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className={input} />
        </label>

        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 sm:grid-cols-4">
          <label className="space-y-1">
            안정성 {stability}
            <input type="range" min={0} max={1} step={0.05} value={stability} onChange={(e) => setStability(Number(e.target.value))} className="w-full" />
          </label>
          <label className="space-y-1">
            유사도 {similarity}
            <input type="range" min={0} max={1} step={0.05} value={similarity} onChange={(e) => setSimilarity(Number(e.target.value))} className="w-full" />
          </label>
          <label className="space-y-1">
            속도 {speed}
            <input type="range" min={0.7} max={1.2} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full" />
          </label>
          <label className="flex items-end gap-1.5 pb-1">
            <input type="checkbox" checked={useContext} onChange={(e) => setUseContext(e.target.checked)} />
            앞뒤 문맥 전달
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button key={m.mode} disabled={!ready} onClick={() => run([m.mode])} title={m.hint} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-40">
              {m.label}
            </button>
          ))}
          <button disabled={!ready} onClick={() => run(['whole', 'auto', 'tags'])} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
            {busy ? '생성 중…' : '세 가지 모두 만들어 비교'}
          </button>
        </div>
        <p className="text-[11px] text-gray-400">
          ① 한 번에는 요금이 1회분, ②③은 구간 수만큼 요청이 나갑니다. 한국어 목소리 · 모델 · 문장을 모두 넣어야 버튼이 켜집니다.
        </p>
      </section>

      <section className="space-y-2">
        {results.length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-gray-400">결과가 여기에 쌓입니다. 같은 문장을 다른 모델이나 설정으로 다시 만들어 비교해 보세요.</p>}
        {results.map((r) => (
          <div key={r.key} className={`rounded-xl border bg-white p-3 ${r.error ? 'border-red-200' : ''}`}>
            <div className="flex items-center justify-between text-xs">
              <b className="text-gray-800">{r.label}</b>
              {r.ms != null && <span className="text-gray-400">{(r.ms / 1000).toFixed(1)}초</span>}
            </div>
            {r.error && <p className="mt-1 break-words text-xs text-red-600">{r.error}</p>}
            {r.url && (
              <>
                <audio controls src={r.url} className="mt-2 w-full" />
                <p className="mt-1 flex flex-wrap gap-1 text-[10px]">
                  {r.parts?.map((p, i) => (
                    <span key={i} className={`rounded px-1.5 py-0.5 ${p.lang === 'en' ? 'bg-sky-50 text-sky-700' : p.lang === 'ko' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.lang}: {p.text}
                    </span>
                  ))}
                </p>
              </>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
