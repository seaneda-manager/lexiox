// 학생에게 보여줄 지문 출처 라벨 (교재 · 단원 · 유닛 · 문제 번호 등).
// 값이 있는 항목만 " · " 로 이어 붙인다.

export type PassageSourceMeta = {
  source_type?: string | null;
  school_name?: string | null;
  textbook_name?: string | null;
  unit_label?: string | null;
  book_name?: string | null;
  book_unit?: string | null;
  exam_year?: number | null;
  exam_month?: number | null;
  question_number?: number | null;
};

export function passageSourceLabel(p: PassageSourceMeta | null | undefined): string {
  if (!p) return '';
  const parts: Array<string | null | undefined> = [];
  if (p.source_type === 'mock_exam') {
    parts.push(
      p.exam_year ? `${p.exam_year}년` : null,
      p.exam_month ? `${p.exam_month}월 모의고사` : '모의고사',
      p.question_number ? `${p.question_number}번` : null,
    );
    return [parts[0], parts[1]].filter(Boolean).join(' ') + (parts[2] ? ` · ${parts[2]}` : '');
  }
  if (p.source_type === 'textbook') {
    parts.push(p.school_name, p.textbook_name, p.unit_label);
  } else {
    parts.push(p.book_name, p.book_unit);
  }
  return parts.map((s) => (s ?? '').trim()).filter(Boolean).join(' · ');
}

// ── 목록 그룹핑: 교재별 / 모의고사 회차별 ─────────────────────
export type PassageGroup = {
  key: string;
  title: string;      // 그룹 헤더 (예: "올림포스 영어독해 기본1", "2026년 10월 모의고사")
  sortKey: string;    // 그룹 정렬용
};

export function passageGroup(p: PassageSourceMeta | null | undefined): PassageGroup {
  if (p?.source_type === 'mock_exam') {
    const y = p.exam_year ?? 0;
    const m = p.exam_month ?? 0;
    return {
      key: `mock:${y}-${m}`,
      title: `${y ? `${y}년 ` : ''}${m ? `${m}월 ` : ''}모의고사`.trim(),
      // 최신 회차가 위로 (내림차순)
      sortKey: `0:${String(9999 - y).padStart(4, '0')}-${String(99 - m).padStart(2, '0')}`,
    };
  }
  if (p?.source_type === 'textbook') {
    const title = [p.school_name, p.textbook_name].map((s) => (s ?? '').trim()).filter(Boolean).join(' · ') || '교과서';
    return { key: `tb:${title}`, title, sortKey: `1:${title}` };
  }
  const book = (p?.book_name ?? '').trim() || '기타 교재';
  return { key: `bk:${book}`, title: book, sortKey: `2:${book}` };
}

/** 그룹 안에서 카드에 보여줄 짧은 위치 (단원/유닛/문제 번호) */
export function passageUnitLabel(p: PassageSourceMeta | null | undefined): string {
  if (!p) return '';
  if (p.source_type === 'mock_exam') return p.question_number ? `${p.question_number}번` : '';
  if (p.source_type === 'textbook') return (p.unit_label ?? '').trim();
  return (p.book_unit ?? '').trim();
}
