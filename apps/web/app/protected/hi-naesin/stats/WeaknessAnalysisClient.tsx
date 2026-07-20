'use client';

import { useState, useTransition } from 'react';
import { analyzeWeaknessAction } from './analyzeWeaknessAction';

// 간단한 마크다운 → JSX 렌더러 (굵은 글씨, 헤더, 목록)
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const k = key++;

    // 빈 줄
    if (line.trim() === '') {
      elements.push(<div key={k} className="h-2" />);
      continue;
    }

    // ### 헤더
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={k} className="mt-3 text-sm font-bold text-neutral-800">
          {inline(line.slice(4))}
        </h3>,
      );
      continue;
    }

    // ## 헤더
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={k} className="mt-4 text-base font-bold text-neutral-900">
          {inline(line.slice(3))}
        </h2>,
      );
      continue;
    }

    // # 헤더
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={k} className="mt-4 text-lg font-bold text-neutral-900">
          {inline(line.slice(2))}
        </h1>,
      );
      continue;
    }

    // 숫자. 목록
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <p key={k} className="ml-2 text-sm text-neutral-700 leading-relaxed">
          {inline(line)}
        </p>,
      );
      continue;
    }

    // - 목록
    if (line.startsWith('- ') || line.startsWith('  - ')) {
      const indent = line.startsWith('  - ') ? 'ml-6' : 'ml-3';
      elements.push(
        <p key={k} className={`${indent} text-sm text-neutral-700 leading-relaxed`}>
          {'• '}{inline(line.replace(/^\s*-\s/, ''))}
        </p>,
      );
      continue;
    }

    // 일반 텍스트
    elements.push(
      <p key={k} className="text-sm text-neutral-700 leading-relaxed">
        {inline(line)}
      </p>,
    );
  }

  return elements;
}

// 인라인: **굵게** 처리
function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-neutral-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function WeaknessAnalysisClient() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    setAnalysis(null);
    setError(null);
    startTransition(async () => {
      const result = await analyzeWeaknessAction();
      if ('analysis' in result) {
        setAnalysis(result.analysis);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="rounded-2xl border bg-white p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h2 className="text-sm font-semibold text-neutral-800">클러윙 AI 약점 분석</h2>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isPending}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              분석 중...
            </span>
          ) : (
            analysis ? '다시 분석하기' : '약점 분석 시작'
          )}
        </button>
      </div>

      {/* 설명 (결과 없을 때만) */}
      {!analysis && !error && !isPending && (
        <p className="text-xs text-neutral-400">
          지금까지 풀었던 드릴 결과를 AI가 분석해서 약점과 학습 방향을 알려드립니다.
        </p>
      )}

      {/* 로딩 */}
      {isPending && (
        <div className="rounded-xl bg-neutral-50 p-4 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-200" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-200" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-200" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-200" />
          <p className="text-xs text-neutral-400 mt-3">AI가 학습 데이터를 분석하고 있어요... (10~20초)</p>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 결과 */}
      {analysis && (
        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 space-y-1">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-medium text-violet-600 bg-violet-100 rounded-full px-2 py-0.5">
              클러윙 분석 결과
            </span>
          </div>
          <div className="space-y-0.5">
            {renderMarkdown(analysis)}
          </div>
        </div>
      )}
    </section>
  );
}
