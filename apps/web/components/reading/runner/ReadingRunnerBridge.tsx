// apps/web/components/reading/runner/ReadingRunnerBridge.tsx
'use client';

import { useMemo } from 'react';
import TestRunnerV2 from '@/components/reading/runner/TestRunnerV2';
import type { RPassage, RQuestion, RChoice } from '@/models/reading';

type LegacyChoice = { id: string; text: string; is_correct?: boolean; isCorrect?: boolean };
type LegacyQuestion = {
  id: string;
  number: number;
  type:
    | 'vocab'
    | 'detail'
    | 'negative_detail'
    | 'paraphrasing'
    | 'insertion'
    | 'inference'
    | 'purpose'
    | 'pronoun_ref'
    | 'summary'
    | 'organization'
    | 'single';
  stem: string;
  choices: LegacyChoice[];
  meta?: any;
  explanation?: any;
  clue_quote?: string;
};
type LegacyPassage = {
  id?: string;
  title: string;
  content?: string;      // 레거시: 단일 문자열
  paragraphs?: string[]; // 최신: 배열
  questions: LegacyQuestion[];
  ui?: any;
};

type Props = {
  data: LegacyPassage; // 입력은 레거시/최신 둘 다 허용
  mode?: 'study' | 'test' | 'exam' | 'review';
  onFinish?: (sessionId: string) => void; // 현재 TestRunnerV2로는 전달하지 않음
};

// ✅ 순수한 slugify (impure 함수/시간 의존 없음)
function slugifyTitle(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .slice(0, 50) || 'passage';
}

// ✅ 순수한 해시 (djb2 변형, 렌더 중 호출 OK)
function hashString(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  // 고정 길이 8자리 hex
  return (h >>> 0).toString(16).padStart(8, '0');
}

const normalizeType = (t: LegacyQuestion['type']): RQuestion['type'] => {
  if (t === 'single') return 'detail';
  const ok: RQuestion['type'][] = [
    'vocab',
    'detail',
    'negative_detail',
    'paraphrasing',
    'inference',
    'purpose',
    'pronoun_ref',
    'insertion',
    'summary',
    'organization',
  ];
  return (ok as string[]).includes(String(t)) ? (t as RQuestion['type']) : 'detail';
};

export default function ReadingRunnerBridge({ data, mode = 'study' }: Props) {
  // content→paragraphs, is_correct→isCorrect, meta 보존
  const passage: RPassage = useMemo(() => {
    const slug = slugifyTitle(data.title ?? '');
    const stableHashSeed =
      (data.title ?? '') +
      '|' +
      (Array.isArray(data.questions) ? data.questions.map(q => q.id).join(',') : '');
    const stableHash = hashString(stableHashSeed);
    const fallbackId = `${slug}-${stableHash}`;

    const paragraphs =
      Array.isArray(data.paragraphs)
        ? data.paragraphs
        : typeof data.content === 'string' && data.content.length
        ? data.content.split(/\r?\n\r?\n+/g)
        : [];

    const questions: RQuestion[] = (data.questions ?? []).map((q) => {
      const meta =
        q.meta || q.explanation || q.clue_quote
          ? {
              ...(q.meta ?? {}),
              ...(q.explanation ? { explanation: q.explanation } : {}),
              ...(q.clue_quote ? { clue_quote: q.clue_quote } : {}),
            }
          : undefined;

      const choices: RChoice[] = (q.choices ?? []).map((c) => ({
        id: c.id,
        text: c.text ?? '',
        isCorrect: (c as any).isCorrect ?? !!c.is_correct,
      }));

      return {
        id: q.id,
        number: q.number ?? 0,
        stem: q.stem ?? '',
        type: normalizeType(q.type),
        meta,
        choices,
      } as RQuestion;
    });

    return {
      id: String(data.id ?? fallbackId),
      title: data.title ?? '',
      paragraphs,
      questions,
    };
  }, [data]);

  // ⚠️ React Compiler 규칙상 렌더에서 impure 사용 금지 → 세션ID를 안정적으로 고정
  // 고유 세션이 꼭 필요하면 상위에서 prop으로 주입하거나, 효과에서 ref로 설정하세요.
  const sessionId = `${passage.id}-local`;

  return <TestRunnerV2 passage={passage} sessionId={sessionId} mode={mode} />;
}
