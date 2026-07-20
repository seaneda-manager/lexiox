'use client';

import React, { useState } from 'react';
import { Wand2, AlertCircle, CheckCircle } from 'lucide-react';

type ContentType = 'reading' | 'grammar' | 'listening' | 'speaking-writing';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GenerationResult {
  ok: boolean;
  id?: string;
  reviewScore?: number;
  reviewStatus?: string;
  reviewNotes?: string[];
  error?: string;
}

export default function ContentGeneratorClient() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    contentType: 'reading' as ContentType,
    difficulty: 'medium' as Difficulty,
    level: 3,
    textbook: '',
    page: ''
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/jr/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          contentType: formData.contentType,
          difficulty: formData.difficulty,
          level: formData.level,
          source: {
            textbook: formData.textbook || undefined,
            page: formData.page ? parseInt(formData.page) : undefined
          }
        })
      });

      const data: GenerationResult = await response.json();

      if (!response.ok) {
        setResult({ ok: false, error: data.error || 'Generation failed' });
      } else {
        setResult(data);
        // Reset form
        setFormData({
          title: '',
          content: '',
          contentType: 'reading',
          difficulty: 'medium',
          level: 3,
          textbook: '',
          page: ''
        });
      }
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Wand2 className="w-8 h-8" />
            AI 콘텐츠 생성기
          </h1>
          <p className="text-slate-600 mt-2">
            교재 내용을 입력하면 AI가 학습 콘텐츠를 자동으로 생성합니다
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-blue-600">⚡</div>
            <div className="text-sm font-semibold text-slate-900">빠른 생성</div>
            <div className="text-xs text-slate-600">2-3분 만에 완성</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-green-600">✅</div>
            <div className="text-sm font-semibold text-slate-900">AI 검수</div>
            <div className="text-xs text-slate-600">자동 품질 평가</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow">
            <div className="text-2xl font-bold text-purple-600">👤</div>
            <div className="text-sm font-semibold text-slate-900">최종 확인</div>
            <div className="text-xs text-slate-600">당신이 승인 후 게시</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">기본 정보</h2>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                콘텐츠 유형
              </label>
              <select
                value={formData.contentType}
                onChange={(e) =>
                  setFormData({ ...formData, contentType: e.target.value as ContentType })
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                <option value="reading">📖 Reading</option>
                <option value="grammar">📚 Grammar</option>
                <option value="listening">🎧 Listening</option>
                <option value="speaking-writing">🎤 Speaking-Writing</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="예: The Entrepreneur's Journey"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  난이도
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData({ ...formData, difficulty: e.target.value as Difficulty })
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
                >
                  <option value="easy">쉬움</option>
                  <option value="medium">중간</option>
                  <option value="hard">어려움</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  레벨
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  교재 (선택)
                </label>
                <input
                  type="text"
                  value={formData.textbook}
                  onChange={(e) => setFormData({ ...formData, textbook: e.target.value })}
                  placeholder="예: 능률 영어독해 Level 3"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  페이지 (선택)
                </label>
                <input
                  type="number"
                  value={formData.page}
                  onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                  placeholder="42"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              콘텐츠 (지문/스크립트/설명)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="교재에서 복사한 지문, 대사, 또는 설명을 붙여넣으세요..."
              rows={10}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-mono"
              required
            />
            <p className="text-xs text-slate-600 mt-1">
              Tip: Google Lens로 OCR한 텍스트를 직접 붙여넣어도 됩니다
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  생성 중...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  AI로 생성하기
                </>
              )}
            </button>
          </div>
        </form>

        {/* Results */}
        {result && (
          <div className="mt-8">
            {result.ok ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-900 mb-2">
                      ✅ 콘텐츠 생성 완료!
                    </h3>
                    <div className="space-y-2 text-sm text-green-800">
                      <p>
                        <strong>AI 평가 점수:</strong> {result.reviewScore}%
                      </p>
                      <p>
                        <strong>검수 상태:</strong> {result.reviewStatus}
                      </p>
                      {result.reviewNotes && result.reviewNotes.length > 0 && (
                        <div>
                          <strong>피드백:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {result.reviewNotes.map((note, idx) => (
                              <li key={idx}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-green-700 mt-4 p-3 bg-white rounded">
                      💡 콘텐츠가 생성되어 검토 대기 중입니다. 관리자 대시보드에서 확인하고
                      승인해주세요.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold text-red-900 mb-2">❌ 생성 실패</h3>
                    <p className="text-sm text-red-800">{result.error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
