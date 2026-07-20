'use server';

import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';

type Result =
  | { ok: true; inserted: number }
  | { ok: false; error: string };

export async function bulkInsertVocabAction(fd: FormData): Promise<Result> {
  const passageId = (fd.get('passage_id') as string | null)?.trim() ?? '';
  const raw = (fd.get('words_text') as string | null) ?? '';

  if (!passageId) return { ok: false, error: '지문을 선택해주세요.' };

  // 줄 파싱: word\t뜻[\t표현|숙어]
  const rows = raw
    .split('\n')
    .map((line) => line.split('\t').map((c) => c.trim()))
    .filter((cols) => cols[0] && cols[1]);

  if (rows.length === 0) return { ok: false, error: '단어가 없습니다. 형식을 확인해주세요.' };

  const supabase = await getServerSupabase();

  // 현재 최대 order_index 조회
  const { data: existing } = await supabase
    .from('hi_naesin_drills')
    .select('order_index')
    .eq('passage_id', passageId)
    .eq('drill_type', 'vocab')
    .order('order_index', { ascending: false })
    .limit(1);

  let nextOrder = existing?.[0]?.order_index != null ? existing[0].order_index + 1 : 0;

  const inserts = rows.map((cols) => {
    const isExpression = ['표현', '숙어', 'expression', 'true'].includes(
      (cols[2] ?? '').toLowerCase(),
    );
    const payload: Record<string, unknown> = {
      word: cols[0],
      meaningKo: cols[1],
    };
    if (cols[3]) payload.exampleSentence = cols[3];
    if (isExpression) payload.isExpression = true;

    return {
      passage_id: passageId,
      drill_type: 'vocab',
      order_index: nextOrder++,
      payload,
      is_published: false,
    };
  });

  const { error } = await supabase.from('hi_naesin_drills').insert(inserts);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/hi-naesin/passages/${passageId}/edit`);
  return { ok: true, inserted: inserts.length };
}
