// apps/web/app/(protected)/reading/test/ClientPage.tsx
'use client';

import { useId, useMemo, useState } from 'react';
import type { RPassage } from '@/models/reading';
import SkimGate from '@/components/reading/SkimGate';
import ClientRunner from './ClientRunner';

function getSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams('');
  return new URLSearchParams(window.location.search);
}

export default function ClientPage({ passage }: { passage: RPassage }) {
  // ?skipGate=1 → 초기 상태에서 바로 반영 (effect 금지)
  const initialGateDone =
    typeof window !== 'undefined' && getSearchParams().get('skipGate') === '1';
  const [gateDone, setGateDone] = useState<boolean>(initialGateDone);

  // paragraphs → content 문자열 브릿지
  const contentStr = useMemo(
    () =>
      Array.isArray(passage.paragraphs) ? passage.paragraphs.join('\n\n') : '',
    [passage.paragraphs]
  );

  // sessionId: 쿼리 우선, 없으면 useId로 결정적 생성 (Math.random/crypto.randomUUID 사용 금지)
  const rid = useId();
  const paramSid =
    typeof window !== 'undefined'
      ? getSearchParams().get('sessionId') || getSearchParams().get('sid')
      : null;
  const sessionId = paramSid ?? `${String(passage.id)}-${rid}`;

  if (!gateDone) {
    return (
      <SkimGate
        content={contentStr}
        onUnlockAction={() => setGateDone(true)}
      />
    );
  }

  // ClientRunner가 content(string)를 기대하므로 런타임 브릿지 타입 구성
  type StrictPassage = {
    id: string;
    title: string;
    content: string;
    questions: any[];
  };

  const passageStrict: StrictPassage = {
    id: String(passage.id),
    title: passage.title ?? '',
    content: contentStr,
    questions: Array.isArray(passage.questions) ? passage.questions : [],
  };

  return <ClientRunner passage={passageStrict} sessionId={sessionId} />;
}
