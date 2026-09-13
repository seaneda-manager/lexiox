'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase/client';
import { TypingMemorizeGame } from '../../_lib/games/TypingMemorizeGame';
import { TypingSession } from '@/lib/typing/engine';
import {
  getVocabTypingUnits,
  getPracticeContent,
  listPracticeContent,
  listCompletedPassages,
  completedPassageLabel,
  splitContentIntoUnits,
  type TypingContentRecord,
  type CompletedPassage,
} from '@/lib/typing/contentAdapters';
import type { RevealMode, TypingUnit } from '@/lib/typing/types';
import TypingCanvas from '@/components/typing/TypingCanvas';
import TypingStatsBar from '@/components/typing/TypingStatsBar';

type Stage = 'setup' | 'loading' | 'playing' | 'complete';
type ContentSourceChoice = 'vocab' | 'content' | 'completed';

const REVEAL_LABEL: Record<RevealMode, string> = {
  full: '전체 보기 (따라치기)',
  partial: '일부 빈칸 (기억 채우기)',
  blind: '한글만 보고 암기',
};

export default function TypingMemorizePlay() {
  const [stage, setStage] = useState<Stage>('setup');
  const [contentSource, setContentSource] = useState<ContentSourceChoice>('vocab');
  const [contentList, setContentList] = useState<TypingContentRecord[]>([]);
  const [selectedContentId, setSelectedContentId] = useState('');
  const [completedList, setCompletedList] = useState<CompletedPassage[]>([]);
  const [selectedCompletedId, setSelectedCompletedId] = useState('');
  const [revealMode, setRevealMode] = useState<RevealMode>('full');
  const [blankRatio, setBlankRatio] = useState(0.3);
  const [shuffled, setShuffled] = useState(false);
  const [strict, setStrict] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gameRef = useRef<TypingMemorizeGame | null>(null);
  const sessionRef = useRef<TypingSession | null>(null);
  const [, setTick] = useState(0);
  const rerender = () => setTick((n) => n + 1);

  useEffect(() => {
    listPracticeContent().then(setContentList).catch(() => setContentList([]));
    listCompletedPassages().then(setCompletedList).catch(() => setCompletedList([]));
  }, []);

  const handleStart = async () => {
    setError(null);
    setStage('loading');
    try {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? 'user-id-placeholder';

      let units: TypingUnit[] = [];
      if (contentSource === 'vocab') {
        units = await getVocabTypingUnits(userId);
      } else if (contentSource === 'content') {
        if (!selectedContentId) {
          setError('타이핑할 지문을 선택해주세요.');
          setStage('setup');
          return;
        }
        const content = await getPracticeContent(selectedContentId);
        if (!content) {
          setError('지문을 불러오지 못했습니다.');
          setStage('setup');
          return;
        }
        units = splitContentIntoUnits(content);
      } else {
        if (!selectedCompletedId) {
          setError('타이핑할 지문을 선택해주세요.');
          setStage('setup');
          return;
        }
        const passage = completedList.find((p) => p.id === selectedCompletedId);
        if (!passage) {
          setError('지문을 불러오지 못했습니다.');
          setStage('setup');
          return;
        }
        units = splitContentIntoUnits({ body_en: passage.body_en, body_ko: null });
      }

      if (units.length === 0) {
        setError('타이핑할 콘텐츠가 없습니다. 다른 소스를 선택해주세요.');
        setStage('setup');
        return;
      }

      const game = new TypingMemorizeGame(userId, 'typing-memorize-session');
      game.initialize(1);
      game.start();
      gameRef.current = game;

      const session = new TypingSession({ units, revealMode, blankRatio, shuffled, strict });
      session.start();
      sessionRef.current = session;

      setStage('playing');
    } catch (e) {
      console.error(e);
      setError('시작 중 오류가 발생했습니다.');
      setStage('setup');
    }
  };

  const handleKey = (key: string) => {
    const session = sessionRef.current;
    const game = gameRef.current;
    if (!session || !game) return;

    session.pressKey(key);

    if (session.isCurrentUnitComplete()) {
      const result = session.completeUnit();
      void game.recordUnitCompletion(result);

      if (session.isSessionComplete()) {
        void game.completeSession({
          contentSource,
          contentId: contentSource === 'content' ? selectedContentId : null,
          contentRef: contentSource === 'completed' ? selectedCompletedId : null,
          revealMode,
          shuffled,
          strict,
        });
        setStage('complete');
        return;
      }
    }

    rerender();
  };

  if (stage === 'setup' || stage === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
          <div className="text-5xl mb-3 text-center">⌨️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1 text-center">타자 암기 스피드 훈련</h1>
          <p className="text-gray-600 mb-6 text-center text-sm">
            단어·지문을 타이핑하며 속도와 정확도를 훈련하고 암기하세요
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">콘텐츠</label>
              <div className="grid grid-cols-3 gap-2">
                <SourceButton label="내 단어장" active={contentSource === 'vocab'} onClick={() => setContentSource('vocab')} />
                <SourceButton label="내가 푼 지문" active={contentSource === 'completed'} onClick={() => setContentSource('completed')} />
                <SourceButton label="등록된 지문" active={contentSource === 'content'} onClick={() => setContentSource('content')} />
              </div>
            </div>

            {contentSource === 'completed' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">지문 선택</label>
                {completedList.length === 0 ? (
                  <p className="text-sm text-gray-500">아직 완료한 Reading/Listening/Hi-내신 지문이 없습니다. 시험/드릴을 먼저 풀어보세요.</p>
                ) : (
                  <select
                    value={selectedCompletedId}
                    onChange={(e) => setSelectedCompletedId(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg p-2 text-sm"
                  >
                    <option value="">선택하세요</option>
                    {completedList.map((p) => (
                      <option key={p.id} value={p.id}>{completedPassageLabel(p)}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {contentSource === 'content' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">지문 선택</label>
                {contentList.length === 0 ? (
                  <p className="text-sm text-gray-500">등록된 지문이 없습니다. 관리자에게 등록을 요청하세요.</p>
                ) : (
                  <select
                    value={selectedContentId}
                    onChange={(e) => setSelectedContentId(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-lg p-2 text-sm"
                  >
                    <option value="">선택하세요</option>
                    {contentList.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">모드</label>
              <div className="space-y-2">
                {(Object.keys(REVEAL_LABEL) as RevealMode[]).map((mode) => (
                  <SourceButton key={mode} label={REVEAL_LABEL[mode]} active={revealMode === mode} onClick={() => setRevealMode(mode)} full />
                ))}
              </div>
            </div>

            {revealMode === 'partial' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  빈칸 비율: {Math.round(blankRatio * 100)}%
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={0.7}
                  step={0.1}
                  value={blankRatio}
                  onChange={(e) => setBlankRatio(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}

            <div className="flex gap-4">
              {contentSource !== 'vocab' && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={shuffled} onChange={(e) => setShuffled(e.target.checked)} />
                  문장 순서 섞기
                </label>
              )}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} />
                Strict 모드 (오타 시 진행 차단)
              </label>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

          <button
            onClick={handleStart}
            disabled={stage === 'loading'}
            className="w-full mt-6 bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-all"
          >
            {stage === 'loading' ? '불러오는 중...' : '시작 ⌨️'}
          </button>

          <Link href="/protected/langgym" className="block mt-4 text-orange-600 hover:underline text-center text-sm">
            ← 게임 허브로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (stage === 'complete') {
    const summary = gameRef.current?.getSessionMetrics();
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">훈련 완료!</h2>

          <div className="grid grid-cols-2 gap-4 mb-6 text-left">
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600">평균 WPM</p>
              <p className="text-2xl font-bold text-orange-600">{summary?.wpm ?? 0}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600">정확도</p>
              <p className="text-2xl font-bold text-emerald-600">{summary?.accuracy ?? 0}%</p>
            </div>
          </div>

          {summary && summary.weakWords.length > 0 && (
            <div className="mb-6 text-left">
              <p className="text-sm font-semibold text-gray-700 mb-2">느려진(익숙치 않은) 단어</p>
              <div className="flex flex-wrap gap-2">
                {summary.weakWords.map((w) => (
                  <span key={w} className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/protected/langgym"
            className="w-full block bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition-all"
          >
            게임 허브로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const session = sessionRef.current;
  const game = gameRef.current;
  if (!session || !game) return null;

  const progress = session.getProgress();
  const metrics = session.getLiveMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-100 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">타자 암기 스피드 훈련</h2>
          <button
            onClick={() => setStage('setup')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            설정으로 돌아가기
          </button>
        </div>

        <TypingStatsBar
          metrics={metrics}
          strict={strict}
          onToggleStrict={() => {
            setStrict((v) => {
              const next = !v;
              session.setStrict(next);
              return next;
            });
          }}
          progress={progress}
        />

        <TypingCanvas
          chars={session.getRenderChars()}
          translationKo={session.getCurrentTranslation()}
          showTranslation={revealMode === 'blind'}
          onKey={handleKey}
        />
      </div>
    </div>
  );
}

function SourceButton({ label, active, onClick, full }: { label: string; active: boolean; onClick: () => void; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${full ? 'w-full text-left' : ''} py-2 px-3 rounded-lg font-semibold text-sm transition-all border-2 ${
        active ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-300'
      }`}
    >
      {label}
    </button>
  );
}
