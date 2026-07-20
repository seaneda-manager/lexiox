'use client';

import { useState } from 'react';

export default function GenerateReadingPage() {
  const [title, setTitle] = useState('');
  const [passage, setPassage] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/jr/content/generate/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Untitled',
          english_passage: passage,
          difficulty,
          level: parseInt(String(level)),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">📖 Reading 콘텐츠 생성</h1>
        <p className="text-slate-600 mb-8">영문 지문을 입력하면 자동으로 한글, 단어, 직독직해를 생성합니다</p>

        <div className="grid grid-cols-2 gap-8">
          {/* 입력 폼 */}
          <div>
            <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-8 space-y-6 sticky top-8">
              <div>
                <label className="block font-semibold mb-2">제목</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: The Future of AI"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">영문 지문</label>
                <textarea
                  value={passage}
                  onChange={(e) => setPassage(e.target.value)}
                  placeholder="영문을 붙여넣기..."
                  rows={12}
                  className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">{passage.length} 자</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-2">난이도</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="easy">쉬움</option>
                    <option value="medium">중간</option>
                    <option value="hard">어려움</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-2">레벨</label>
                  <input
                    type="number"
                    value={level}
                    onChange={(e) => setLevel(parseInt(e.target.value))}
                    min="1"
                    max="5"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {error && <div className="p-4 bg-red-100 text-red-700 rounded">{error}</div>}

              <button
                type="submit"
                disabled={loading || !passage}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '생성 중...' : '콘텐츠 생성'}
              </button>
            </form>
          </div>

          {/* 결과 */}
          {result && (
            <div className="space-y-6">
              {/* 한글 해석 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="font-bold text-lg mb-3">📝 한글 해석</h3>
                <p className="text-slate-700 leading-relaxed text-sm">{result.translation?.full_text}</p>
              </div>

              {/* 단어 책업 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="font-bold text-lg mb-3">📚 단어 책업</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.vocabulary?.map((v: any, i: number) => (
                    <div key={i} className="text-sm border-b pb-2">
                      <p className="font-semibold text-blue-600">{v.word}</p>
                      <p className="text-slate-600">{v.pos} - {v.meaning}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 직독직해 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="font-bold text-lg mb-3">🔍 직독직해</h3>
                <div className="space-y-3 text-sm">
                  {result.jikdok_jihae_base?.map((line: any, i: number) => (
                    <p key={i} className="text-slate-700">
                      {line.text.split('/').map((seg: string, j: number) => (
                        <span key={j}>
                          {j > 0 && <span className="text-blue-400 font-bold"> / </span>}
                          {seg}
                        </span>
                      ))}
                    </p>
                  ))}
                </div>
              </div>

              {/* JSON 전체 */}
              <details className="bg-white shadow rounded-lg p-6">
                <summary className="font-bold cursor-pointer">📋 전체 결과 보기</summary>
                <pre className="mt-4 bg-slate-50 p-4 rounded overflow-auto text-xs max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
