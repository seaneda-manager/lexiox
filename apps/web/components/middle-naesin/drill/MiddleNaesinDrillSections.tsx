'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MiddleNaesinDrillSections as DrillSections } from '@/components/middle-naesin/drill/types';
import type { MiddleDrillSentence } from '@/models/middle-naesin/drill';
import TranslationStage from '@/components/middle-naesin/drill/stages/TranslationStage';
import CompositionStage from '@/components/middle-naesin/drill/stages/CompositionStage';
import StructureAnalysisStage from '@/components/middle-naesin/drill/stages/StructureAnalysisStage';
import GrammarLabelStage from '@/components/middle-naesin/drill/stages/GrammarLabelStage';
import VocabStage from '@/components/middle-naesin/drill/stages/VocabStage';

type SectionId = 'vocab' | 'dialogue' | 'grammar' | 'main_text';
type DrillId = 'translation' | 'composition' | 'grammar_analysis';

const SECTION_LABEL: Record<SectionId, string> = {
  vocab: '단어',
  dialogue: '대화문',
  grammar: '문법',
  main_text: '본문',
};

const TEXT_SECTION_DRILLS: { id: DrillId; label: string }[] = [
  { id: 'translation', label: '영한번역' },
  { id: 'composition', label: '한영작문' },
  { id: 'grammar_analysis', label: '문법분석' },
];

type Props = {
  unitId: string;
  unitTitle: string;
  drillData: DrillSections;
  section?: string;
  drill?: string;
};

function baseHref(unitId: string) {
  return `/admin/middle-naesin/units/${unitId}/drill`;
}

export default function MiddleNaesinDrillSections({ unitId, unitTitle, drillData, section, drill }: Props) {
  const activeSection = (section as SectionId | undefined) ?? null;
  const activeDrill = (drill as DrillId | undefined) ?? null;

  // ── 최상위: 4섹션 카드 ──────────────────────────────────────────
  if (!activeSection) {
    const cards: { id: SectionId; count: number; ready: boolean }[] = [
      { id: 'vocab', count: drillData.vocab.length, ready: drillData.vocab.length > 0 },
      { id: 'dialogue', count: drillData.dialogue?.sentences.length ?? 0, ready: !!drillData.dialogue },
      { id: 'grammar', count: 0, ready: false },
      { id: 'main_text', count: drillData.mainText?.sentences.length ?? 0, ready: !!drillData.mainText },
    ];

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-white px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-neutral-400">Middle Naesin Drill</div>
          <div className="mt-1 text-lg font-semibold text-neutral-900">{unitTitle}</div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <Link
              key={c.id}
              href={c.ready ? `${baseHref(unitId)}?section=${c.id}` : '#'}
              aria-disabled={!c.ready}
              className={[
                'rounded-2xl border p-6 transition',
                c.ready
                  ? 'bg-white hover:border-sky-300 hover:bg-sky-50/50 cursor-pointer'
                  : 'bg-neutral-50 text-neutral-400 cursor-not-allowed pointer-events-none',
              ].join(' ')}
            >
              <div className="text-lg font-semibold">{SECTION_LABEL[c.id]}</div>
              <div className="mt-1 text-sm text-neutral-500">
                {c.ready ? `${c.count}개 항목` : '준비 중 · 콘텐츠 없음'}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const backToSections = (
    <Link href={baseHref(unitId)} className="text-sm text-neutral-500 hover:text-neutral-800">
      ← 섹션으로
    </Link>
  );

  // ── 단어 섹션 (Phase 1: 기존 VocabStage만) ────────────────────
  if (activeSection === 'vocab') {
    return (
      <div className="space-y-4">
        {backToSections}
        <VocabStage vocab={drillData.vocab} />
      </div>
    );
  }

  // ── 문법 섹션 (Phase 4 예정, 지금은 준비중) ───────────────────
  if (activeSection === 'grammar') {
    return (
      <div className="space-y-4">
        {backToSections}
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          문법 섹션은 준비 중입니다.
        </div>
      </div>
    );
  }

  // ── 대화문 / 본문 섹션 ─────────────────────────────────────────
  const textSection = activeSection === 'dialogue' ? drillData.dialogue : drillData.mainText;

  if (!textSection) {
    return (
      <div className="space-y-4">
        {backToSections}
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          등록된 {SECTION_LABEL[activeSection]} 콘텐츠가 없습니다.
        </div>
      </div>
    );
  }

  if (!activeDrill) {
    return (
      <div className="space-y-4">
        {backToSections}
        <div className="rounded-2xl border bg-white px-5 py-4 text-sm text-neutral-500">
          {SECTION_LABEL[activeSection]}
          {textSection.contentTitle ? ` · ${textSection.contentTitle}` : ''} — 드릴을 선택하세요
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {TEXT_SECTION_DRILLS.map((d) => (
            <Link
              key={d.id}
              href={`${baseHref(unitId)}?section=${activeSection}&drill=${d.id}`}
              className="rounded-2xl border bg-white p-5 text-center font-medium hover:border-sky-300 hover:bg-sky-50/50"
            >
              {d.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {backToSections}
        <Link
          href={`${baseHref(unitId)}?section=${activeSection}`}
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          드릴 선택으로 →
        </Link>
      </div>

      {activeDrill === 'translation' && <TranslationStage sentences={textSection.sentences} />}
      {activeDrill === 'composition' && <CompositionStage sentences={textSection.sentences} />}
      {activeDrill === 'grammar_analysis' && <GrammarAnalysisPanel sentences={textSection.sentences} />}
    </div>
  );
}

function GrammarAnalysisPanel({ sentences }: { sentences: MiddleDrillSentence[] }) {
  const [tab, setTab] = useState<'structure' | 'label'>('structure');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-2xl border bg-white p-1.5">
        <button
          type="button"
          onClick={() => setTab('structure')}
          className={[
            'flex-1 rounded-xl px-4 py-2 text-sm font-medium transition',
            tab === 'structure' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50',
          ].join(' ')}
        >
          구조 분석 (S/V/O/C)
        </button>
        <button
          type="button"
          onClick={() => setTab('label')}
          className={[
            'flex-1 rounded-xl px-4 py-2 text-sm font-medium transition',
            tab === 'label' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50',
          ].join(' ')}
        >
          문법 레이블링
        </button>
      </div>

      {tab === 'structure' ? (
        <StructureAnalysisStage sentences={sentences} />
      ) : (
        <GrammarLabelStage sentences={sentences} />
      )}
    </div>
  );
}
