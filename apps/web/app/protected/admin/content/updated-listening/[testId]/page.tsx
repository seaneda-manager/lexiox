'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Track = {
  id: string;
  taskKind: string;
  title: string;
  transcript: string;
  audioUrl?: string;
  audioSeconds?: number;
  segments?: Array<{ speaker: string; text: string; audioUrl: string }>;
};

type Test = {
  meta: { id: string; label: string };
  tracks: Track[];
};

export default function ListeningTestEditPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [difficulty, setDifficulty] = useState<Record<string, 'easy' | 'hard'>>({});
  const [error, setError] = useState<string | null>(null);

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
    const track = test?.tracks.find(t => t.id === trackId);
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
      setTest(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tracks: prev.tracks.map(t =>
            t.id === trackId ? {
              ...t,
              audioUrl: result.audioUrl,
              segments: result.segments
            } : t
          )
        };
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(prev => ({ ...prev, [trackId]: false }));
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

      setTest(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tracks: prev.tracks.map(t =>
            t.id === trackId ? { ...t, audioUrl: data.audioUrl } : t
          )
        };
      });
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

      <div className="space-y-4">
        {test.tracks.map(track => (
          <div key={track.id} className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{track.title}</h2>
                <p className="text-xs text-gray-500 mt-1">{track.taskKind}</p>
              </div>
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
            </div>
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
          </div>
        ))}
      </div>
    </main>
  );
}
