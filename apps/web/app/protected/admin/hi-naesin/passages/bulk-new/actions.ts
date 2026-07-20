'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { HI_NAESIN_SOURCE_TYPES, HI_NAESIN_GRADES } from '@/models/hi-naesin';

function str(fd: FormData, key: string): string {
  return (fd.get(key) as string | null)?.trim() ?? '';
}

function numOrNull(s: string): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * 지문 블록 파싱:
 * - `===` (3개 이상 등호) 로 구분
 * - 첫 줄이 `#숫자` 이면 question_number
 * - 첫 줄이 `#` 없으면 title
 * - 나머지가 passage_text
 */
function parseBlocks(raw: string): Array<{
  title: string | null;
  questionNumber: number | null;
  passageText: string;
}> {
  const blocks = raw
    .split(/={3,}/g)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const lines = block.split('\n');
    const firstLine = lines[0].trim();

    let title: string | null = null;
    let questionNumber: number | null = null;
    let bodyStart = 0;

    if (/^#\d+/.test(firstLine)) {
      questionNumber = numOrNull(firstLine.replace('#', '').trim());
      bodyStart = 1;
    } else if (firstLine && firstLine.length < 100 && lines.length > 1) {
      // 첫 줄이 짧으면 제목으로 처리 (영어/한글 모두 지원)
      title = firstLine;
      bodyStart = 1;
    }

    const passageText = lines
      .slice(bodyStart)
      .join('\n')
      .trim();

    return { title, questionNumber, passageText };
  }).filter((b) => b.passageText.length > 0);
}

export async function bulkCreateHiNaesinPassagesAction(
  fd: FormData,
): Promise<void> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인 필요');

  const sourceType = str(fd, 'source_type');
  const grade = str(fd, 'grade');

  if (!HI_NAESIN_SOURCE_TYPES.includes(sourceType as never))
    throw new Error('출처 종류를 선택해주세요.');
  if (!HI_NAESIN_GRADES.includes(grade as never))
    throw new Error('학년을 선택해주세요.');

  const rawText = str(fd, 'passages_raw');
  if (!rawText) throw new Error('지문 내용을 입력해주세요.');

  const blocks = parseBlocks(rawText);
  if (blocks.length === 0) throw new Error('파싱된 지문이 없습니다. === 구분자를 확인해주세요.');

  // 국문 파싱 (없으면 빈 배열)
  const rawKo = str(fd, 'passages_ko_raw');
  const koBlocks = rawKo ? rawKo.split(/={3,}/g).map((b) => b.trim()).filter(Boolean) : [];

  // 공통 메타
  const commonMeta = {
    source_type: sourceType,
    grade,
    exam_year:     numOrNull(str(fd, 'exam_year')),
    exam_month:    numOrNull(str(fd, 'exam_month')),
    school_name:   str(fd, 'school_name') || null,
    textbook_name: str(fd, 'textbook_name') || null,
    unit_label:    str(fd, 'unit_label') || null,
    book_name:     str(fd, 'book_name') || null,
    book_unit:     str(fd, 'book_unit') || null,
    is_published:  false,
    created_by:    user.id,
  };

  const rows = blocks.map((b, i) => ({
    ...commonMeta,
    title:           b.title,
    question_number: b.questionNumber,
    passage_text:    b.passageText,
    translation_ko:  koBlocks[i] ?? null,
  }));

  const { error } = await supabase
    .from('hi_naesin_passages')
    .insert(rows);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/hi-naesin/passages');
  redirect(`/admin/hi-naesin/passages?bulk=${rows.length}`);
}
