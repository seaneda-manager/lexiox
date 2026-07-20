// models/hi-naesin/passage.ts

export const HI_NAESIN_SOURCE_TYPES = ['mock_exam', 'textbook', 'external_book'] as const;
export type HiNaesinSourceType = (typeof HI_NAESIN_SOURCE_TYPES)[number];

export const HI_NAESIN_GRADES = ['M1', 'M2', 'M3', 'H1', 'H2', 'H3'] as const;
export type HiNaesinGrade = (typeof HI_NAESIN_GRADES)[number];

export type HiNaesinPassage = {
  id: string;
  sourceType: HiNaesinSourceType;
  grade: HiNaesinGrade;

  // mock_exam
  examYear?: number | null;
  examMonth?: number | null;
  questionNumber?: number | null;

  // textbook
  schoolName?: string | null;
  textbookName?: string | null;
  unitLabel?: string | null;

  // external_book
  bookName?: string | null;
  bookUnit?: string | null;

  title?: string | null;
  passageText: string;
  translationKo?: string | null;
  wordCount?: number | null;

  topicTags: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HiNaesinPassageRow = {
  id: string;
  source_type: string;
  grade: string;
  exam_year: number | null;
  exam_month: number | null;
  question_number: number | null;
  school_name: string | null;
  textbook_name: string | null;
  unit_label: string | null;
  book_name: string | null;
  book_unit: string | null;
  title: string | null;
  passage_text: string;
  translation_ko: string | null;
  word_count: number | null;
  topic_tags: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export function passageRowToModel(row: HiNaesinPassageRow): HiNaesinPassage {
  return {
    id: row.id,
    sourceType: row.source_type as HiNaesinSourceType,
    grade: row.grade as HiNaesinGrade,
    examYear: row.exam_year,
    examMonth: row.exam_month,
    questionNumber: row.question_number,
    schoolName: row.school_name,
    textbookName: row.textbook_name,
    unitLabel: row.unit_label,
    bookName: row.book_name,
    bookUnit: row.book_unit,
    title: row.title,
    passageText: row.passage_text,
    translationKo: row.translation_ko,
    wordCount: row.word_count,
    topicTags: row.topic_tags ?? [],
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sourceTypeLabel(t: HiNaesinSourceType): string {
  switch (t) {
    case 'mock_exam':     return '모의고사';
    case 'textbook':      return '교과서';
    case 'external_book': return '외부교재';
  }
}

export function gradeLabel(g: HiNaesinGrade): string {
  switch (g) {
    case 'M1': return '중1';
    case 'M2': return '중2';
    case 'M3': return '중3';
    case 'H1': return '고1';
    case 'H2': return '고2';
    case 'H3': return '고3';
  }
}
