export const MIDDLE_NAESIN_GRADES = ['M1', 'M2', 'M3'] as const;
export type MiddleNaesinGrade = (typeof MIDDLE_NAESIN_GRADES)[number];

export const MIDDLE_NAESIN_CONTENT_TYPES = [
  'main_text',
  'dialogue',
  'more_reading',
  'vocab_en_en',
  'past_exam',
] as const;
export type MiddleNaesinContentType = (typeof MIDDLE_NAESIN_CONTENT_TYPES)[number];

export interface MiddleNaesinUnit {
  id: string;
  school_name: string | null;
  publisher: string;
  grade: MiddleNaesinGrade;
  semester: 1 | 2;
  lesson_number: number | null;
  lesson_title: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface MiddleNaesinContent {
  id: string;
  unit_id: string;
  content_type: MiddleNaesinContentType;
  title: string | null;
  body_text: string | null;
  translation_ko: string | null;
  extra_data: unknown;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function gradeLabel(g: MiddleNaesinGrade): string {
  switch (g) {
    case 'M1': return '중1';
    case 'M2': return '중2';
    case 'M3': return '중3';
  }
}

export function contentTypeLabel(t: MiddleNaesinContentType): string {
  switch (t) {
    case 'main_text':    return '교과서 본문';
    case 'dialogue':     return '대화문';
    case 'more_reading': return 'More Reading';
    case 'vocab_en_en':  return '영영 단어';
    case 'past_exam':    return '기출문제 분석';
  }
}

export function contentTypeColor(t: MiddleNaesinContentType): string {
  switch (t) {
    case 'main_text':    return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'dialogue':     return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'more_reading': return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'vocab_en_en':  return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'past_exam':    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
}
