'use server';

import { revalidatePath } from 'next/cache';
import { getServiceSupabase } from '@/lib/supabase/service';
import { getUserAndProfile } from '@/lib/getUserAndProfile';

const PATH = '/admin/content/grammar-2026/textbooks';
const LEVELS = ['all', 'ms', 'hs', 'toefl'];
type Result = { ok: true } | { error: string };

async function requireStaff(): Promise<{ error: string } | null> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return { error: '로그인이 필요합니다.' };
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') return { error: '관리자/선생님만 사용할 수 있습니다.' };
  return null;
}

const finish = (error?: { message: string } | null): Result => {
  if (error) return { error: error.message };
  revalidatePath(PATH);
  revalidatePath('/admin/content/grammar-2026/plans');
  return { ok: true };
};

export async function createTextbookAction(name: string, level: string): Promise<Result> {
  const denied = await requireStaff();
  if (denied) return denied;
  const n = name.trim();
  if (!n) return { error: '교재 이름을 입력하세요.' };
  if (!LEVELS.includes(level)) return { error: '레벨 값이 올바르지 않습니다.' };
  const { error } = await getServiceSupabase().from('grammar_textbooks').insert({ name: n, level });
  return finish(error);
}

export async function deleteTextbookAction(textbookId: string): Promise<Result> {
  const denied = await requireStaff();
  if (denied) return denied;
  const { error } = await getServiceSupabase().from('grammar_textbooks').delete().eq('id', textbookId);
  return finish(error);
}

/**
 * 목차를 한 번에 붙여넣는다. 한 줄에 단원 하나: "3. 수동태" 또는 "3 수동태" 또는 "수동태"(번호 생략 시 이어서 자동 부여).
 * 이미 있는 번호는 제목만 갱신하고, 연결된 챕터는 그대로 둔다.
 */
export async function addTextbookUnitsAction(textbookId: string, bulk: string): Promise<Result> {
  const denied = await requireStaff();
  if (denied) return denied;
  const db = getServiceSupabase();
  const { data: last } = await db
    .from('grammar_textbook_units')
    .select('unit_no')
    .eq('textbook_id', textbookId)
    .order('unit_no', { ascending: false })
    .limit(1)
    .maybeSingle();
  let next = (last?.unit_no ?? 0) + 1;

  const rows: { textbook_id: string; unit_no: number; title: string }[] = [];
  for (const raw of bulk.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d+)\s*[.)\-:]?\s*(.+)$/);
    if (m) {
      rows.push({ textbook_id: textbookId, unit_no: Number(m[1]), title: m[2].trim() });
      next = Math.max(next, Number(m[1]) + 1);
    } else {
      rows.push({ textbook_id: textbookId, unit_no: next++, title: line });
    }
  }
  if (rows.length === 0) return { error: '추가할 단원이 없습니다.' };
  const { error } = await db.from('grammar_textbook_units').upsert(rows, { onConflict: 'textbook_id,unit_no' });
  return finish(error);
}

export async function deleteTextbookUnitAction(textbookUnitId: string): Promise<Result> {
  const denied = await requireStaff();
  if (denied) return denied;
  const { error } = await getServiceSupabase().from('grammar_textbook_units').delete().eq('id', textbookUnitId);
  return finish(error);
}

// 교재 단원에 연결된 Universal 챕터를 통째로 바꾼다. 배열 순서가 단원 안의 배정 순서가 된다.
export async function setTextbookUnitChaptersAction(textbookUnitId: string, chapterIds: string[]): Promise<Result> {
  const denied = await requireStaff();
  if (denied) return denied;
  const db = getServiceSupabase();
  const { error: delErr } = await db.from('grammar_textbook_unit_chapters').delete().eq('textbook_unit_id', textbookUnitId);
  if (delErr) return { error: delErr.message };
  if (chapterIds.length > 0) {
    const { error } = await db
      .from('grammar_textbook_unit_chapters')
      .insert(chapterIds.map((unit_id, position) => ({ textbook_unit_id: textbookUnitId, unit_id, position })));
    return finish(error);
  }
  return finish();
}
