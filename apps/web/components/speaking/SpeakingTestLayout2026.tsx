'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { SpeakingETSFrame } from './SpeakingETSFrame';
import { StudyLangToggle, useStudyLang } from '@/lib/ui/studyLang';

/** true이면 Study 모드: 헤더에 한/영 전환 버튼 표시, 안내 문구 번역 */
export const SpeakingStudyContext = createContext(false);

/** 시험 모드는 항상 영어, Study 모드는 선택한 언어 */
export function useSpeakingTx() {
  const isStudy = useContext(SpeakingStudyContext);
  const { t } = useStudyLang();
  return (en: string, ko: string) => (isStudy ? t(en, ko) : en);
}

type Props = {
  /** 상단 헤더 좌측: 섹션 라벨(+태스크 배지) */
  headerLeft: ReactNode;
  /** 상단 헤더 우측: Volume 컨트롤 + 조건부 Next/Begin 버튼 */
  headerRight: ReactNode;
  /** 서브헤더 좌측: "Speaking" 또는 "Speaking | Question X of Y". 문제 풀이 전 화면은 null. */
  subHeaderLeft?: ReactNode;
  /** 서브헤더 우측: 응답 타이머 등 */
  subHeaderRight?: ReactNode;
  children: ReactNode;
};

/** 헤더 좌측에 쓰는 공통 라벨: "Speaking" (+ 태스크 배지). Listening 헤더 배지와 같은 스타일. */
// 실제 ETS 화면은 헤더 왼쪽이 비어 있다(오른쪽에 Volume / Next 버튼만 있음).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SpeakingHeaderLabel(_props: { task?: 1 | 2 }) {
  return <span />;
}

/** 서브헤더 좌측: "Speaking" 또는 "Speaking | Question X of Y" */
export function SpeakingSubHeaderLabel({ questionInfo }: { questionInfo?: string }) {
  return (
    <span style={{ fontSize: 12, color: '#444' }}>
      <strong style={{ fontSize: 14, color: '#222' }}>Speaking</strong>
      {questionInfo ? <><span style={{ margin: '0 10px', color: '#BBB' }}>|</span>{questionInfo}</> : null}
    </span>
  );
}

/**
 * ETS 스펙 Speaking 레이아웃.
 * Listening과 동일한 구조 — 단일 본문 영역, Next 버튼은 하단이 아니라 상단 헤더에 있으며
 * (응답이 없으면 숨김), 서브헤더에 "Question X of Y"가 표시된다.
 * - Header: #1A2B4C, height 60px
 * - Sub-header: #FFFFFF, height 44px, border-bottom
 * - Body: #FFFFFF, flex-1, 중앙 정렬
 */
export default function SpeakingTestLayout2026({ headerLeft, headerRight, subHeaderLeft, subHeaderRight, children }: Props) {
  const isStudy = useContext(SpeakingStudyContext);
  return (
    <SpeakingETSFrame>
      {/* ── ETS Header ── */}
      <header style={{
        height: 60,
        backgroundColor: '#1E7B7D',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 24px',
        flexShrink: 0,
        gap: 16,
      }}>
        {headerLeft}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isStudy && (
            <StudyLangToggle className="h-8 rounded-full border border-white/40 bg-transparent px-3 text-xs font-medium text-white hover:bg-white/10" />
          )}
          {headerRight}
        </div>
      </header>

      {/* ── Sub-header ── */}
      {subHeaderLeft && (
        <div style={{
          height: 40,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E0E0E0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 36px',
          flexShrink: 0,
        }}>
          {subHeaderLeft}
          {subHeaderRight}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: '#FFFFFF',
        padding: '22px 36px',
        position: 'relative',
      }}>
        {children}
      </div>
    </SpeakingETSFrame>
  );
}
