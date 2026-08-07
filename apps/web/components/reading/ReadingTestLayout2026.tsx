'use client';

import type { ReactNode } from 'react';
import { ReadingETSFrame } from './ReadingETSFrame';

type Props = {
  header: ReactNode;
  left: ReactNode;
  right?: ReactNode | null;
  footer?: ReactNode;
};

/**
 * ETS 스펙 레이아웃.
 * 실제 ETS 시험처럼 브라우저 전체가 아니라 중앙의 고정 크기 창(ReadingETSFrame) 안에 그린다.
 * - Header: #1A2B4C, height 60px
 * - Body: #FFFFFF panels (left 50% / right 50%)
 * - Footer: #F4F6F9, height 60px
 */
export default function ReadingTestLayout2026({ header, left, right, footer }: Props) {
  const isSingleColumn = right == null;

  return (
    <ReadingETSFrame>
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
        {header}
      </header>

      {/* ── Body ── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: isSingleColumn ? '1fr' : '1fr 1fr',
        overflow: 'hidden',
        backgroundColor: '#F4F6F9',
        gap: 0,
      }}>
        {/* 왼쪽 패널 */}
        <section style={{
          height: '100%',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          padding: '32px 36px',
          borderRight: isSingleColumn ? 'none' : '1px solid #E0E0E0',
        }}>
          {left}
        </section>

        {/* 오른쪽 패널 */}
        {!isSingleColumn && (
          <section style={{
            height: '100%',
            overflowY: 'auto',
            backgroundColor: '#FFFFFF',
            padding: '32px 36px',
          }}>
            {right}
          </section>
        )}
      </div>

      {/* ── ETS Footer ── */}
      {footer && (
        <footer style={{
          height: 60,
          backgroundColor: '#F4F6F9',
          borderTop: '1px solid #E0E0E0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
        }}>
          {footer}
        </footer>
      )}
    </ReadingETSFrame>
  );
}
