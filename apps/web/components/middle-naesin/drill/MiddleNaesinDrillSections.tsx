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
import VocabTestStage from '@/components/middle-naesin/drill/stages/VocabTestStage';
import VocabCramStage from '@/components/middle-naesin/drill/stages/VocabCramStage';
import GrammarStage from '@/components/middle-naesin/drill/stages/GrammarStage';

type SectionId = 'vocab' | 'dialogue' | 'grammar' | 'main_text' | 'more_reading';
type DrillId = 'translation' | 'composition' | 'grammar_analysis';
type VocabDrillId = 'check' | 'test' | 'cram';

const SECTION_LABEL: Record<SectionId, string> = {
  vocab: '단어',
  dialogue: '대화문',
  grammar: '문법',
  main_text: '본문',
  more_reading: 'More Reading',
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
  part?: string;
  basePath?: string;
};

export default function MiddleNaesinDrillSections({
  unitId,
  unitTitle,
  drillData,
  section,
  drill,
  part,
  basePath = `/admin/middle-naesin/units/${unitId}/drill`,
}: Props) {
  const activeSection = (section as SectionId | undefined) ?? null;
  const activeDrill = (drill as DrillId | undefined) ?? null;
  const baseHref = () => basePath;

  // ── 최상위: 섹션 카드 ──────────────────────────────────────────
  if (!activeSection) {
    const cards: { id: SectionId; count: number; parts?: number; ready: boolean }[] = [
      { id: 'vocab', count: drillData.vocab.length, ready: drillData.vocab.length > 0 },
      { id: 'dialogue', count: drillData.dialogue?.sentences.length ?? 0, parts: drillData.dialogue?.parts.length, ready: !!drillData.dialogue },
      { id: 'grammar', count: drillData.grammar.length, ready: drillData.grammar.length > 0 },
      { id: 'main_text', count: drillData.mainText?.sentences.length ?? 0, parts: drillData.mainText?.parts.length, ready: !!drillData.mainText },
      { id: 'more_reading', count: drillData.moreReading?.sentences.length ?? 0, parts: drillData.moreReading?.parts.length, ready: !!drillData.moreReading },
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
              href={c.ready ? `${baseHref()}?section=${c.id}` : '#'}
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
                {c.ready
                  ? c.parts && c.parts > 1
                    ? `${c.parts}개 · ${c.count}문장`
                    : `${c.count}개 항목`
                  : '준비 중 · 콘텐츠 없음'}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const backToSections = (
    <Link href={baseHref()} className="text-sm text-neutral-500 hover:text-neutral-800">
      ← 섹션으로
    </Link>
  );

  // ── 단어 섹션 (단어 확인 / 단어 시험) ────────────────────────
  if (activeSection === 'vocab') {
    const vocabDrill = (drill as VocabDrillId | undefined) ?? null;

    if (!vocabDrill) {
      return (
        <div className="space-y-4">
          {backToSections}
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href={`${baseHref()}?section=vocab&drill=check`}
              className="rounded-2xl border bg-white p-5 text-center font-medium hover:border-sky-300 hover:bg-sky-50/50"
            >
              단어 확인
            </Link>
            <Link
              href={`${baseHref()}?section=vocab&drill=test`}
              className="rounded-2xl border bg-white p-5 text-center font-medium hover:border-sky-300 hover:bg-sky-50/50"
            >
              단어 시험 (영영/영한/한영)
            </Link>
            <Link
              href={`${baseHref()}?section=vocab&drill=cram`}
              className="rounded-2xl border bg-white p-5 text-center font-medium hover:border-sky-300 hover:bg-sky-50/50"
            >
              디지털 깜지
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          {backToSections}
          <Link
            href={`${baseHref()}?section=vocab`}
            className="text-sm text-neutral-500 hover:text-neutral-800"
          >
            드릴 선택으로 →
          </Link>
        </div>
        {vocabDrill === 'check' && <VocabStage vocab={drillData.vocab} unitId={unitId} />}
        {vocabDrill === 'test' && <VocabTestStage vocab={drillData.vocab} unitId={unitId} />}
        {vocabDrill === 'cram' && <VocabCramStage vocab={drillData.vocab} unitId={unitId} />}
      </div>
    );
  }

  // ── 문법 섹션 (설명 + 간단 퀴즈) ───────────────────────────────
  if (activeSection === 'grammar') {
    return (
      <div className="space-y-4">
        {backToSections}
        <GrammarStage points={drillData.grammar} unitId={unitId} />
      </div>
    );
  }

  // ── 대화문 / 본문 섹션 ─────────────────────────────────────────
  const textSection =
    activeSection === 'dialogue'
      ? drillData.dialogue
      : activeSection === 'more_reading'
        ? drillData.moreReading
        : drillData.mainText;

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

  // 콘텐츠가 여러 개(No. 1, No. 2 …)면 먼저 하나를 고른다
  if (textSection.parts.length > 1 && !part) {
    return (
      <div className="space-y-4">
        {backToSections}
        <div className="rounded-2xl border bg-white px-5 py-4 text-sm text-neutral-500">
          {SECTION_LABEL[activeSection]} — 연습할 항목을 선택하세요
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {textSection.parts.map((p) => (
            <Link
              key={p.contentId}
              href={`${baseHref()}?section=${activeSection}&part=${p.contentId}`}
              className="rounded-2xl border bg-white p-4 hover:border-sky-300 hover:bg-sky-50/50"
            >
              <div className="font-medium">{p.title}</div>
              <div className="mt-1 text-xs text-neutral-500">{p.sentences.length}문장</div>
            </Link>
          ))}
          <Link
            href={`${baseHref()}?section=${activeSection}&part=all`}
            className="rounded-2xl border border-dashed bg-white p-4 text-neutral-500 hover:border-sky-300 hover:bg-sky-50/50"
          >
            <div className="font-medium">전체 이어서</div>
            <div className="mt-1 text-xs">{textSection.sentences.length}문장</div>
          </Link>
        </div>
      </div>
    );
  }

  const chosenPart = textSection.parts.find((p) => p.contentId === part);
  const activeSentences = chosenPart ? chosenPart.sentences : textSection.sentences;
  const activeTitle = chosenPart ? chosenPart.title : textSection.contentTitle;
  const partQuery = part && textSection.parts.length > 1 ? `&part=${part}` : '';

  if (!activeDrill) {
    return (
      <div className="space-y-4">
        {backToSections}
        <div className="rounded-2xl border bg-white px-5 py-4 text-sm text-neutral-500">
          {SECTION_LABEL[activeSection]}
          {activeTitle ? ` · ${activeTitle}` : ''} — 드릴을 선택하세요
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {TEXT_SECTION_DRILLS.map((d) => (
            <Link
              key={d.id}
              href={`${baseHref()}?section=${activeSection}${partQuery}&drill=${d.id}`}
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
          href={`${baseHref()}?section=${activeSection}${partQuery}`}
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          드릴 선택으로 →
        </Link>
      </div>

      {activeDrill === 'translation' && <TranslationStage sentences={activeSentences} unitId={unitId} />}
      {activeDrill === 'composition' && <CompositionStage sentences={activeSentences} unitId={unitId} />}
      {activeDrill === 'grammar_analysis' && <GrammarAnalysisPanel sentences={activeSentences} />}
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
