'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Track = {
  id: string;
  taskKind: string;
  title?: string;
  transcript: string;
  audioUrl?: string;
  audioSeconds?: number;
  illustrationUrl?: string;
  segments?: Array<{ speaker: string; text: string; audioUrl: string }>;
  questions?: any[];
};

type Test = {
  meta: { id: string; label: string };
  // 신규 구조
  modules?: Array<{ stage: 1 | 2; items: Track[] }>;
  stage2Pool?: {
    cutScore: number;
    hard: { items: Track[] };
    easy: { items: Track[] };
  };
  // 레거시 구조
  tracks?: Track[];
  hard?: { tracks: Track[] };
  easy?: { tracks: Track[] };
};

type Group = { label: string; tracks: Track[] };

function getGroups(test: Test): Group[] {
  const groups: Group[] = [];

  if (test.modules?.[0]?.items?.length) {
    groups.push({ label: '📘 Module 1 (공통)', tracks: test.modules[0].items });
  }
  if (test.stage2Pool?.hard?.items?.length) {
    groups.push({ label: '🔴 Module 2 - Hard', tracks: test.stage2Pool.hard.items });
  }
  if (test.stage2Pool?.easy?.items?.length) {
    groups.push({ label: '🟢 Module 2 - Easy', tracks: test.stage2Pool.easy.items });
  }

  // 신규 구조가 없으면 레거시 구조로 폴백
  if (groups.length === 0) {
    if (test.tracks?.length) {
      groups.push({ label: '트랙', tracks: test.tracks });
    }
    if (test.hard?.tracks?.length) {
      groups.push({ label: '🔴 Hard Module', tracks: test.hard.tracks });
    }
    if (test.easy?.tracks?.length) {
      groups.push({ label: '🟢 Easy Module', tracks: test.easy.tracks });
    }
  }

  return groups;
}

function findTrack(test: Test, trackId: string): Track | undefined {
  for (const group of getGroups(test)) {
    const found = group.tracks.find(t => t.id === trackId);
    if (found) return found;
  }
  return undefined;
}

function updateQuestionField(
  test: Test,
  trackId: string,
  questionId: string,
  patch: Partial<{ transcript: string; audioUrl: string }>
): Test {
  return updateTrackEverywhere(test, trackId, (t) => ({
    ...t,
    questions: t.questions?.map((q: any) => (q.id === questionId ? { ...q, ...patch } : q)),
  }));
}

function updateTrackEverywhere(test: Test, trackId: string, updater: (t: Track) => Track): Test {
  const next: Test = { ...test };

  if (next.modules) {
    next.modules = next.modules.map(m => ({
      ...m,
      items: m.items.map(t => (t.id === trackId ? updater(t) : t)),
    }));
  }
  if (next.stage2Pool) {
    next.stage2Pool = {
      ...next.stage2Pool,
      hard: { ...next.stage2Pool.hard, items: next.stage2Pool.hard.items.map(t => (t.id === trackId ? updater(t) : t)) },
      easy: { ...next.stage2Pool.easy, items: next.stage2Pool.easy.items.map(t => (t.id === trackId ? updater(t) : t)) },
    };
  }
  if (next.tracks) {
    next.tracks = next.tracks.map(t => (t.id === trackId ? updater(t) : t));
  }
  if (next.hard) {
    next.hard = { ...next.hard, tracks: next.hard.tracks.map(t => (t.id === trackId ? updater(t) : t)) };
  }
  if (next.easy) {
    next.easy = { ...next.easy, tracks: next.easy.tracks.map(t => (t.id === trackId ? updater(t) : t)) };
  }

  return next;
}

export default function ListeningTestEditPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [imageGenerating, setImageGenerating] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [difficulty, setDifficulty] = useState<Record<string, 'easy' | 'hard'>>({});
  const [error, setError] = useState<string | null>(null);
  const [questionGenerating, setQuestionGenerating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await fetch(`/api/admin/updated-listening/${testId}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);
        setTest(data.payload);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId]);

  const generateAudio = async (trackId: string) => {
    if (!test) return;
    const track = findTrack(test, trackId);
    if (!track) return;

    const diff = difficulty[trackId] || 'easy';
    setGenerating(prev => ({ ...prev, [trackId]: true }));
    try {
      const res = await fetch('/api/admin/updated-listening/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          tracks: [{ trackId, transcript: track.transcript, taskKind: track.taskKind }],
          difficulty: diff
        })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const result = data.results[trackId];
      setTest(prev => prev ? updateTrackEverywhere(prev, trackId, t => ({
        ...t,
        audioUrl: result.audioUrl,
        segments: result.segments,
      })) : prev);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(prev => ({ ...prev, [trackId]: false }));
    }
  };

  const generateImage = async (trackId: string) => {
    if (!test) return;
    const track = findTrack(test, trackId);
    if (!track) return;

    setImageGenerating(prev => ({ ...prev, [trackId]: true }));
    try {
      const res = await fetch('/api/admin/updated-listening/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: [{ trackId, taskKind: track.taskKind }],
        })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const result = data.results[trackId];
      setTest(prev => prev ? updateTrackEverywhere(prev, trackId, t => ({
        ...t,
        illustrationUrl: result.illustrationUrl,
      })) : prev);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImageGenerating(prev => ({ ...prev, [trackId]: false }));
    }
  };

  const setQuestionTranscript = (trackId: string, questionId: string, val: string) => {
    setTest(prev => prev ? updateQuestionField(prev, trackId, questionId, { transcript: val }) : prev);
  };

  const generateQuestionAudio = async (trackId: string, questionId: string) => {
    if (!test) return;
    const track = findTrack(test, trackId);
    const question = track?.questions?.find((q: any) => q.id === questionId);
    if (!question?.transcript?.trim()) {
      setError('스크립트를 먼저 입력해주세요.');
      return;
    }

    const key = `${trackId}:${questionId}`;
    setQuestionGenerating(prev => ({ ...prev, [key]: true }));
    try {
      const virtualId = `${trackId}__${questionId}`;
      const res = await fetch('/api/admin/updated-listening/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          tracks: [{ trackId: virtualId, transcript: question.transcript, taskKind: 'single' }],
          difficulty: difficulty[trackId] || 'easy',
        })
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      const result = data.results[virtualId];
      setTest(prev => prev ? updateQuestionField(prev, trackId, questionId, { audioUrl: result.audioUrl }) : prev);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuestionGenerating(prev => ({ ...prev, [key]: false }));
    }
  };

  const uploadAudio = async (trackId: string, file: File) => {
    if (!file.type.includes('audio')) {
      setError('MP3 파일만 업로드 가능합니다');
      return;
    }

    setUploading(prev => ({ ...prev, [trackId]: true }));
    try {
      const formData = new FormData();
      formData.append('testId', testId);
      formData.append('trackId', trackId);
      formData.append('file', file);

      const res = await fetch('/api/admin/updated-listening/upload-audio', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setTest(prev => prev ? updateTrackEverywhere(prev, trackId, t => ({
        ...t,
        audioUrl: data.audioUrl,
      })) : prev);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(prev => ({ ...prev, [trackId]: false }));
    }
  };

  const handleSave = async () => {
    if (!test) return;
    try {
      const res = await fetch('/api/admin/updated-listening/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      router.push('/admin/content/updated-listening');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-6">로딩 중...</div>;
  if (error) return <div className="p-6 text-red-600">에러: {error}</div>;
  if (!test) return <div className="p-6">시험을 찾을 수 없습니다.</div>;

  const groups = getGroups(test);
  if (groups.length === 0) {
    return <div className="p-6 text-red-600">트랙을 찾을 수 없습니다.</div>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/admin/content/updated-listening" className="text-sm text-blue-600 hover:underline">
            ← 목록으로
          </Link>
          <h1 className="mt-2 text-xl font-bold">{test.meta.label}</h1>
        </div>
        <button
          onClick={handleSave}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          저장
        </button>
      </header>

      {groups.map(group => (
        <div key={group.label} className="space-y-4">
          <h2 className="text-sm font-bold text-gray-700">{group.label}</h2>
          {group.tracks.map(track => (
            <div key={track.id} className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {track.illustrationUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.illustrationUrl} alt="" className="h-14 w-14 rounded-lg object-cover border" />
                  )}
                  <div>
                    <h2 className="font-semibold text-gray-900">{track.title}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {track.taskKind}
                      {track.questions && ` · ${track.questions.length}문항`}
                    </p>
                    <button
                      onClick={() => generateImage(track.id)}
                      disabled={imageGenerating[track.id]}
                      className="mt-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {imageGenerating[track.id] ? '생성 중...' : track.illustrationUrl ? '🖼️ 이미지 재생성' : '🖼️ 이미지생성'}
                    </button>
                  </div>
                </div>
                {track.taskKind !== 'choose_response' && (
                  <div className="flex gap-2 items-center flex-wrap">
                    <select
                      value={difficulty[track.id] || 'easy'}
                      onChange={(e) => setDifficulty(prev => ({ ...prev, [track.id]: e.target.value as 'easy' | 'hard' }))}
                      disabled={generating[track.id] || uploading[track.id]}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-medium disabled:opacity-50"
                    >
                      <option value="easy">Easy</option>
                      <option value="hard">Hard</option>
                    </select>
                    <button
                      onClick={() => generateAudio(track.id)}
                      disabled={generating[track.id] || uploading[track.id]}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {generating[track.id] ? '생성 중...' : '🎧 음성생성'}
                    </button>
                    <label className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
                      📤 파일업로드
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        disabled={uploading[track.id]}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadAudio(track.id, file);
                        }}
                      />
                    </label>
                    {track.audioUrl && (
                      <audio controls className="h-7 max-w-xs">
                        <source src={track.audioUrl} type="audio/mpeg" />
                      </audio>
                    )}
                    {track.segments && track.segments.length > 0 && (
                      <span className="text-xs text-gray-500 px-2 py-1 bg-blue-50 rounded">
                        {track.segments.length} segments
                      </span>
                    )}
                  </div>
                )}
              </div>

              {track.taskKind === 'choose_response' ? (
                <div className="space-y-3">
                  {(track.questions ?? []).map((q: any, qi: number) => {
                    const key = `${track.id}:${q.id}`;
                    return (
                      <div key={q.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">Q{q.number ?? qi + 1} (질문 없음 — 오디오에 대한 응답 고르기)</span>
                          {q.audioUrl && <span className="text-[11px] text-emerald-600">🎧 음성 완료</span>}
                        </div>
                        <textarea
                          rows={2}
                          className="w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
                          value={q.transcript ?? ""}
                          placeholder="이 질문의 발화 스크립트 (1문장)"
                          onChange={(e) => setQuestionTranscript(track.id, q.id, e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => generateQuestionAudio(track.id, q.id)}
                            disabled={questionGenerating[key]}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {questionGenerating[key] ? '생성 중...' : '🎧 이 질문 음성생성'}
                          </button>
                          {q.audioUrl && (
                            <audio controls className="h-7 max-w-xs">
                              <source src={q.audioUrl} type="audio/mpeg" />
                            </audio>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{track.transcript}</p>
                  </div>

                  {track.segments && track.segments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h3 className="text-sm font-semibold text-gray-900">음성 세그먼트 ({track.segments.length})</h3>
                      <div className="space-y-2">
                        {track.segments.map((seg, idx) => (
                          <div key={idx} className="rounded-lg border border-gray-200 bg-white p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-semibold text-blue-600">{seg.speaker}</span>
                              <span className="text-xs text-gray-500">Seg {idx}</span>
                            </div>
                            <p className="mb-2 text-xs text-gray-700">{seg.text}</p>
                            <audio controls className="h-6 max-w-full">
                              <source src={seg.audioUrl} type="audio/mpeg" />
                            </audio>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}
