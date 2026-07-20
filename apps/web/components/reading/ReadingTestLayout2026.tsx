'use client';

import type { ReactNode } from 'react';

type Props = {
  header: ReactNode;
  left: ReactNode;
  right?: ReactNode | null;
  footer?: ReactNode;
};

/**
 * ETS 스펙 레이아웃: 1920×1080 기준
 * - Header: #1A2B4C, height 60px
 * - Body: #FFFFFF panels (left 50% / right 50%)
 * - Footer: #F4F6F9, height 60px
 */
export default function ReadingTestLayout2026({ header, left, right, footer }: Props) {
  const isSingleColumn = right == null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Arial, Helvetica, sans-serif' }}>

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
    </div>
  );
}
