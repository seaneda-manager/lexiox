'use client';

import type { ReactNode } from 'react';
import { SpeakingETSFrame } from './SpeakingETSFrame';

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
export function SpeakingHeaderLabel({ task }: { task?: 1 | 2 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>Speaking</span>
      {task && (
        <span style={{
          backgroundColor: task === 1 ? 'rgba(255,255,255,0.15)' : '#4F6BCD',
          color: '#FFFFFF', fontSize: 11, fontWeight: 700,
          padding: '2px 10px', borderRadius: 20, letterSpacing: 1,
        }}>
          TASK {task}
        </span>
      )}
    </div>
  );
}

/** 서브헤더 좌측: "Speaking" 또는 "Speaking | Question X of Y" */
export function SpeakingSubHeaderLabel({ questionInfo }: { questionInfo?: string }) {
  return (
    <span style={{ fontSize: 13, color: '#555' }}>
      Speaking{questionInfo ? <>&nbsp;|&nbsp;{questionInfo}</> : null}
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
  return (
    <SpeakingETSFrame>
      {/* ── ETS Header ── */}
      <header style={{
        height: 60,
        backgroundColor: '#1A2B4C',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
        gap: 16,
      }}>
        {headerLeft}
        {headerRight}
      </header>

      {/* ── Sub-header ── */}
      {subHeaderLeft && (
        <div style={{
          height: 44,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E0E0E0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
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
        padding: '32px 36px',
        position: 'relative',
      }}>
        {children}
      </div>
    </SpeakingETSFrame>
  );
}
