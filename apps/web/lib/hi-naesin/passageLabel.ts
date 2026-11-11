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
