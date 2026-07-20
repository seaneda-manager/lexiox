'use client';

import { useState } from 'react';
import { MIDDLE_DRILL_STAGES, MIDDLE_DRILL_STAGE_ORDER, type MiddleDrillStageId } from '@/models/middle-naesin/drill';
import type { MiddleDrillData } from '@/components/middle-naesin/drill/types';
import MiddleDrillTopBar from '@/components/middle-naesin/drill/DrillTopBar';
import VocabStage from '@/components/middle-naesin/drill/stages/VocabStage';
import ReadingStage from '@/components/middle-naesin/drill/stages/ReadingStage';
import StructureAnalysisStage from '@/components/middle-naesin/drill/stages/StructureAnalysisStage';
import GrammarLabelStage from '@/components/middle-naesin/drill/stages/GrammarLabelStage';
import TranslationStage from '@/components/middle-naesin/drill/stages/TranslationStage';
import FillBlankStage from '@/components/middle-naesin/drill/stages/FillBlankStage';
import CompositionStage from '@/components/middle-naesin/drill/stages/CompositionStage';
import ReadAloudStage from '@/components/middle-naesin/drill/stages/ReadAloudStage';

type Props = {
  drillData: MiddleDrillData;
  unitTitle: string;
};

export default function MiddleNaesinDrillShell({ drillData, unitTitle }: Props) {
  const [currentStage, setCurrentStage] = useState<MiddleDrillStageId>('vocab');
  const [readAloudEnabled, setReadAloudEnabled] = useState(false);

  const visibleStages = MIDDLE_DRILL_STAGES.filter(
    (s) => !s.optional || readAloudEnabled,
  );
  const visibleOrder = visibleStages.map((s) => s.id);

  const currentIdx = visibleOrder.indexOf(currentStage);

  const goNext = () => {
    if (currentIdx < visibleOrder.length - 1) {
      setCurrentStage(visibleOrder[currentIdx + 1]);
    }
  };

  const goPrev = () => {
    if (currentIdx > 0) {
      setCurrentStage(visibleOrder[currentIdx - 1]);
    }
  };

  const toggleReadAloud = () => {
    setReadAloudEnabled((v) => {
      const next = !v;
      // If turning off and currently on read_aloud, jump back to composition
      if (!next && currentStage === 'read_aloud') {
        setCurrentStage('composition');
      }
      return next;
    });
  };

  const contentLabel = drillData.contentTitle
    ? `${unitTitle} · ${drillData.contentTitle}`
    : unitTitle;

  return (
    <div className="space-y-4">
      <MiddleDrillTopBar
        title={contentLabel}
        currentStage={currentStage}
        readAloudEnabled={readAloudEnabled}
        onToggleReadAloud={toggleReadAloud}
        onPrev={goPrev}
        onNext={goNext}
      />

      <div className="min-h-[60vh]">
        {currentStage === 'vocab' && (
          <VocabStage vocab={drillData.vocab} />
        )}
        {currentStage === 'reading' && (
          <ReadingStage sentences={drillData.sentences} />
        )}
        {currentStage === 'structure_analysis' && (
          <StructureAnalysisStage sentences={drillData.sentences} />
        )}
        {currentStage === 'grammar_label' && (
          <GrammarLabelStage sentences={drillData.sentences} />
        )}
        {currentStage === 'translation' && (
          <TranslationStage sentences={drillData.sentences} />
        )}
        {currentStage === 'fill_blank' && (
          <FillBlankStage sentences={drillData.sentences} />
        )}
        {currentStage === 'composition' && (
          <CompositionStage sentences={drillData.sentences} />
        )}
        {currentStage === 'read_aloud' && readAloudEnabled && (
          <ReadAloudStage sentences={drillData.sentences} />
        )}
      </div>
    </div>
  );
}
