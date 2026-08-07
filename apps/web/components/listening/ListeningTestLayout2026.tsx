'use client';

import type { ReactNode } from 'react';
import { ListeningETSFrame } from './ListeningETSFrame';

type Props = {
  /** 상단 헤더 좌측: 섹션 라벨(+모듈 배지) */
  headerLeft: ReactNode;
  /** 상단 헤더 우측: Volume 컨트롤 + 조건부 Next/Begin 버튼 */
  headerRight: ReactNode;
  /** 서브헤더 좌측: "Listening" 또는 "Listening | Question X of Y". 문제 풀이 전 화면은 null. */
  subHeaderLeft?: ReactNode;
  /** 서브헤더 우측: 문항별 카운트다운 타이머 등 */
  subHeaderRight?: ReactNode;
  children: ReactNode;
};

/**
 * ETS 스펙 Listening 레이아웃.
 * Reading(ReadingTestLayout2026)과 달리 좌우 패널 분할이 아니라 단일 본문 영역이고,
 * Next 버튼이 하단 footer가 아니라 상단 헤더에 있으며(답을 고르기 전엔 숨김),
 * 서브헤더에 "Question X of Y"가 표시된다 — 실제 ETS 화면 구조를 그대로 따른다.
 * - Header: #1A2B4C, height 60px
 * - Sub-header: #FFFFFF, height 44px, border-bottom
 * - Body: #FFFFFF, flex-1, 중앙 정렬
 */
/** 헤더 좌측에 쓰는 공통 라벨: "Listening" (+ 모듈 배지). Reading 헤더 배지와 같은 스타일. */
export function ListeningHeaderLabel({ module }: { module?: 1 | 2 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>Listening</span>
      {module && (
        <span style={{
          backgroundColor: module === 1 ? 'rgba(255,255,255,0.15)' : '#4F6BCD',
          color: '#FFFFFF', fontSize: 11, fontWeight: 700,
          padding: '2px 10px', borderRadius: 20, letterSpacing: 1,
        }}>
          MODULE {module}
        </span>
      )}
    </div>
  );
}

/** 서브헤더 좌측: "Listening" 또는 "Listening | Question X of Y" */
export function ListeningSubHeaderLabel({ questionInfo }: { questionInfo?: string }) {
  return (
    <span style={{ fontSize: 13, color: '#555' }}>
      Listening{questionInfo ? <>&nbsp;|&nbsp;{questionInfo}</> : null}
    </span>
  );
}

export default function ListeningTestLayout2026({ headerLeft, headerRight, subHeaderLeft, subHeaderRight, children }: Props) {
  return (
    <ListeningETSFrame>
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
    </ListeningETSFrame>
  );
}
