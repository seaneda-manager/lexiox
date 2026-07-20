// apps/web/app/(protected)/dev/listening-sample/page.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  Mode,
  ListeningTrack,
  NormalizedListeningTrack,
  ConsumePlayRow,
} from '@/types/types-listening';
import {
  normalizeTrack,
  getAudioUrl,
  normalizeConsumePlayRow,
} from '@/types/types-listening';

/** 이 페이지 전용 응답 타입 */
type LocalConsumePlaySuccess = {
  ok: true;
  data: ConsumePlayRow;
};

type LocalConsumePlayFailure = {
  ok: false;
  error: string;
};

type LocalConsumePlayResponse = LocalConsumePlaySuccess | LocalConsumePlayFailure;

// 타입 가드: 에러 응답인지 확인
function isErrorResponse(res: LocalConsumePlayResponse): res is LocalConsumePlayFailure {
  return res.ok === false;
}

/* ----------------------- 데모 트랙 ----------------------- */
const demoTrack: ListeningTrack = {
  id: 't-demo-1',
  title: 'Campus Conversation',
  audioUrl:
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/4f/Fr%C3%A9d%C3%A9ric_Chopin_-_Waltz_in_A_flat_major%2C_Op._69%2C_No._1_%28Roubier%29.ogg/Fr%C3%A9d%C3%A9ric_Chopin_-_Waltz_in_A_flat_major%2C_Op._69%2C_No._1_%28Roubier%29.ogg.mp3',
  timeLimitSec: 0,
  durationSec: 0,
  questions: [
    {
      id: 'q1',
      number: 1,
      prompt: 'What is the woman mainly concerned about?',
      choices: [
        { id: 'a', text: 'Submitting her assignment on time.', correct: false },
        { id: 'b', text: 'Choosing a topic for her paper.', correct: true },
        { id: 'c', text: 'Changing her major.', correct: false },
        { id: 'd', text: 'Finding a study partner.', correct: false },
      ],
    },
    {
      id: 'q2',
      number: 2,
      stem: 'Why does the man mention the library?',
      choices: [
        { id: 'a', text: 'To suggest a quiet place to study.', is_correct: true },
        { id: 'b', text: 'To return a book.', is_correct: false },
        { id: 'c', text: 'To complain about noise.', is_correct: false },
        { id: 'd', text: 'To ask for directions.', is_correct: false },
      ],
      meta: { snippetFirstThenChoices: true },
    },
  ],
};

/* ----------------------- API 래퍼 ----------------------- */
async function consumePlay(params: {
  sessionId: string;
}): Promise<LocalConsumePlayResponse> {
  try {
    const res = await fetch('/api/listening/consume-play', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} ${res.statusText}` };
    }

    const json = await res.json();

    // 서버가 이미 { ok, data } | { ok, error } 형태로 주는 경우
    if (json && typeof json.ok === 'boolean') {
      if (json.ok) {
        return { ok: true, data: normalizeConsumePlayRow(json.data) };
      }
      return { ok: false, error: String(json.error ?? 'Unknown error') };
    }

    // row만 넘어오는 경우 → normalize해서 성공으로 처리
    const row = normalizeConsumePlayRow(json);
    return { ok: true, data: row };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e ?? 'Network error') };
  }
}

/* ----------------------- 페이지 컴포넌트 ----------------------- */
export default function ListeningSamplePage() {
  const [mode, setMode] = useState<Mode>('study');
  const [err, setErr] = useState<string | null>(null);
  const [row, setRow] = useState<ConsumePlayRow | null>(null);
  const [busy, setBusy] = useState(false);

  const track: NormalizedListeningTrack = useMemo(
    () => normalizeTrack(demoTrack),
    []
  );

  const audioUrl = useMemo(() => getAudioUrl(track), [track]);

  const switchToTest = useCallback(() => {
    setMode('test');
  }, []);

  const handleConsume = useCallback(async () => {
    setBusy(true);
    setErr(null);
    setRow(null);

    const res = await consumePlay({ sessionId: 'dev-session-1' });

    // 에러 응답 처리 (타입 가드 사용)
    if (isErrorResponse(res)) {
      setErr(res.error);
      setBusy(false);
      return;
    }

    // 성공 응답 → camelCase만 사용
    const normalized = normalizeConsumePlayRow(res.data);
    setRow(normalized);
    setBusy(false);
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Listening Sample (Dev)</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-80">Mode:</span>
          <span className="rounded bg-gray-800/5 px-2 py-1 text-sm">{mode}</span>
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
            onClick={switchToTest}
          >
            Switch to test
          </button>
        </div>
      </header>

      {/* 오디오 영역 */}
      <section className="space-y-2">
        <div className="text-sm font-medium">{track.title ?? 'Untitled'}</div>
        <audio controls src={audioUrl} className="w-full">
          Your browser does not support the audio element.
        </audio>
      </section>

      {/* 질문 영역 */}
      <section className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-semibold">Questions</h2>
        <ol className="space-y-3">
          {track.questions.map((q) => (
            <li key={q.id} className="space-y-2">
              <div className="font-medium">
                {q.number}. {q.text}
              </div>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {q.choices.map((c) => (
                  <li
                    key={c.id}
                    className="rounded border px-3 py-2 text-sm"
                    aria-label={c.is_correct ? 'correct' : 'choice'}
                  >
                    {c.id}) {c.text}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {/* Consume Play 디버그 영역 */}
      <section className="rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Play Counter</h2>
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={handleConsume}
            disabled={busy}
          >
            {busy ? 'Working...' : 'Consume 1 play'}
          </button>
        </div>

        {err && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </p>
        )}

        {row && (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded border p-3">
              <div className="opacity-60">Session</div>
              <div className="break-all font-semibold">{row.sessionId}</div>
            </div>
            <div className="rounded border p-3">
              <div className="opacity-60">Allowed</div>
              <div className="font-semibold">{row.playsAllowed}</div>
            </div>
            <div className="rounded border p-3">
              <div className="opacity-60">Used</div>
              <div className="font-semibold">{row.playsUsed}</div>
            </div>
            <div className="rounded border p-3">
              <div className="opacity-60">Remaining</div>
              <div className="font-semibold">{row.remaining}</div>
            </div>
          </div>
        )}
      </section>

      <footer className="pt-2 text-xs opacity-60">
        This is a dev-only sample. Replace the API endpoint and wiring as needed.
      </footer>
    </main>
  );
}
