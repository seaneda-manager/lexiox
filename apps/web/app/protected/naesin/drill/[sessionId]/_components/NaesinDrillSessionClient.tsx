'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import NaesinDrillShell, { type Stage3TranslationLog } from '@/components/naesin/drill/NaesinDrillShell';
import {
  DRILL_STAGE_ORDER,
  type NaesinPassage,
  type DrillStage,
  type SentenceStructureLog,
  type SentenceCompositionLog,
  type SentenceFunctionLog,
} from '@/components/naesin/drill/types';
import {
  saveNaesinSessionProgressAction,
  completeNaesinSessionAction,
} from '../../actions';

// Stage7(문법판정)만 제외 — 저작 스키마(labelAxes)와 컴포넌트가 참조하는 데모 타입(labelOptions)이
// 서로 다른 데이터 모델이라 어댑터로 해결 안 됨. 나머지 7개 스테이지는 지원.
const STAGE_ORDER = DRILL_STAGE_ORDER.filter((s) => s !== 'grammar_blank');

type Props = {
  sessionId: string;
  passage: NaesinPassage;
  initialStage: DrillStage;
  initialSentenceIndex: number;
  initialStructureLogs: SentenceStructureLog[];
  initialTranslationLogs: Stage3TranslationLog[];
  initialCompositionLogs: SentenceCompositionLog[];
  initialSentenceFunctionLogs: SentenceFunctionLog[];
};

export default function NaesinDrillSessionClient({
  sessionId,
  passage,
  initialStage,
  initialSentenceIndex,
  initialStructureLogs,
  initialTranslationLogs,
  initialCompositionLogs,
  initialSentenceFunctionLogs,
}: Props) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  const handleAutosave = useCallback((snapshot: {
    currentStage: DrillStage;
    currentSentenceIndex: number;
    structureLogs: SentenceStructureLog[];
    translationLogs: Stage3TranslationLog[];
    compositionLogs: SentenceCompositionLog[];
    sentenceFunctionLogs: SentenceFunctionLog[];
  }) => {
    saveNaesinSessionProgressAction(sessionId, snapshot).catch((e) => {
      console.error('naesin 진행상황 저장 실패', e);
    });
  }, [sessionId]);

  const handleComplete = useCallback(async () => {
    await completeNaesinSessionAction(sessionId);
    setDone(true);
  }, [sessionId]);

  if (done) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center space-y-6">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-neutral-900">드릴 완료!</h1>
        <p className="text-neutral-500">수고했어요. 결과가 저장됐습니다.</p>
        <button
          onClick={() => router.push('/naesin/drill')}
          className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          목록으로
        </button>
      </main>
    );
  }

  return (
    <NaesinDrillShell
      initialPassage={passage}
      stageOrder={STAGE_ORDER}
      initialStage={initialStage}
      initialSentenceIndex={initialSentenceIndex}
      initialStructureLogs={initialStructureLogs}
      initialTranslationLogs={initialTranslationLogs}
      initialCompositionLogs={initialCompositionLogs}
      initialSentenceFunctionLogs={initialSentenceFunctionLogs}
      onAutosave={handleAutosave}
      onComplete={handleComplete}
    />
  );
}
