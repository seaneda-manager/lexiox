// 단원 번호(챕터-유닛)는 책마다 겹치므로 어느 책인지 학년으로 붙여 보여 준다. grammar_books.grade: 'M1' → '중1'
export const UNIT_SELECT = "chapter_no, unit_no, title, page, book:grammar_books(grade)";

export type UnitWithBook = { chapter_no: number; unit_no: number; title: string; page: number | null; book?: { grade: string | null } | { grade: string | null }[] | null };

export function gradeLabel(book: UnitWithBook["book"]): string {
  const b = Array.isArray(book) ? book[0] : book;
  const g = b?.grade ?? "";
  return /^M[1-3]$/.test(g) ? `중${g[1]}` : g;
}

export function unitLabel(u: UnitWithBook): string {
  const g = gradeLabel(u.book);
  return `${g ? `${g} ` : ""}${u.chapter_no}-${u.unit_no} ${u.title}${u.page ? ` (p.${u.page})` : ""}`;
}
