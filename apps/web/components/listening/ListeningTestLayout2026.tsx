'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { ListeningETSFrame } from './ListeningETSFrame';
import { StudyLangToggle, useStudyLang } from '@/lib/ui/studyLang';

/** true이면 Study 모드: 헤더에 한/영 전환 버튼 표시, 안내 문구 번역 */
export const ListeningStudyContext = createContext(false);

/** 시험 모드는 항상 영어, Study 모드는 선택한 언어 */
export function useListeningTx() {
  const isStudy = useContext(ListeningStudyContext);
  const { t } = useStudyLang();
  return (en: string, ko: string) => (isStudy ? t(en, ko) : en);
}

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
  /** 시험이 끝난 화면(완료)에서는 false 로 두어 Exit 경고창을 없앤다. 기본 true. */
  confirmExit?: boolean;
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
// 실제 ETS 화면은 헤더 왼쪽이 비어 있다(오른쪽에 Volume / Next 버튼만 있음).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ListeningHeaderLabel(_props: { module?: 1 | 2 }) {
  return <span />;
}

/** 서브헤더 좌측: "Listening" 또는 "Listening | Question X of Y" */
export function ListeningSubHeaderLabel({ questionInfo }: { questionInfo?: string }) {
  return (
    <span style={{ fontSize: 12, color: '#444' }}>
      <strong style={{ fontSize: 14, color: '#222' }}>Listening</strong>
      {questionInfo ? <><span style={{ margin: '0 10px', color: '#BBB' }}>|</span>{questionInfo}</> : null}
    </span>
  );
}

export default function ListeningTestLayout2026({ headerLeft, headerRight, subHeaderLeft, subHeaderRight, children, confirmExit = true }: Props) {
  const isStudy = useContext(ListeningStudyContext);
  return (
    <ListeningETSFrame confirmExit={confirmExit}>
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
        padding: '22px 36px',
        position: 'relative',
      }}>
        {children}
      </div>
    </ListeningETSFrame>
  );
}
