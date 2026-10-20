'use server';

import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { getServerSupabase } from '@/lib/supabase/server';
import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { logAnthropicUsage } from '@/lib/ai/logAnthropicUsage';
import {
  AI_READING_JSON_SCHEMA,
  AI_READING_MODEL,
  AiReadingSchema,
  buildSystemPrompt,
  buildUserPrompt,
  normalizeReading,
  toContentRows,
} from '@/lib/middle-naesin/aiReading';
import type { AiReading, AiReadingStatus } from '@/lib/middle-naesin/aiReading';

const MAX_PASSAGE_CHARS = 5000;

async function requireStaff(): Promise<string | null> {
  const { user, profile } = await getUserAndProfile();
  if (!user) return '로그인이 필요합니다.';
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') return '관리자/선생님만 사용할 수 있습니다.';
  return null;
}

export type GenerateResult =
  | { ok: true; reading: AiReading; warnings: string[]; passage: string }
  | { ok: false; error: string };

// 이미 있는 지문 → 드릴 데이터(문장별 해석 · 구조 · 문법 · 단어). 저장은 하지 않고 미리보기만 돌려준다.
export async function generateAiReadingAction(input: {
  unitId: string;
  title: string;
  passage: string;
  koreanHint?: string;
}): Promise<GenerateResult> {
  const denied = await requireStaff();
  if (denied) return { ok: false, error: denied };

  const passage = input.passage.trim();
  if (passage.length < 20) return { ok: false, error: '지문이 너무 짧습니다.' };
  if (passage.length > MAX_PASSAGE_CHARS) return { ok: false, error: `지문이 너무 깁니다. (${MAX_PASSAGE_CHARS}자 이하)` };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY 가 설정돼 있지 않습니다.' };

  const supabase = await getServerSupabase();
  const [{ data: unit }, { data: grammar }] = await Promise.all([
    supabase.from('middle_naesin_units').select('lesson_title').eq('id', input.unitId).maybeSingle(),
    supabase.from('middle_naesin_contents').select('title').eq('unit_id', input.unitId).eq('content_type', 'grammar_point'),
  ]);

  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: AI_READING_MODEL,
      max_tokens: 16000,
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: buildUserPrompt({
            title: input.title,
            passage,
            koreanHint: input.koreanHint,
            lessonTitle: unit?.lesson_title ?? null,
            grammarTopics: (grammar ?? []).map((g) => g.title as string).filter(Boolean),
          }),
        },
      ],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: AI_READING_JSON_SCHEMA as unknown as Record<string, unknown> } },
    });
    void logAnthropicUsage('middle-naesin/ai-reading', AI_READING_MODEL, res.usage);

    if (res.stop_reason === 'refusal') return { ok: false, error: 'AI 가 이 지문의 처리를 거절했습니다. 지문 내용을 확인해 주세요.' };
    if (res.stop_reason === 'max_tokens') return { ok: false, error: '결과가 너무 길어 잘렸습니다. 지문을 나누어 시도해 주세요.' };

    const block = res.content.find((b) => b.type === 'text');
    const text = block && block.type === 'text' ? block.text : '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: 'AI 응답을 읽지 못했습니다. 다시 시도해 주세요.' };
    }
    const checked = AiReadingSchema.safeParse(parsed);
    if (!checked.success) return { ok: false, error: 'AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.' };

    const { reading, warnings } = normalizeReading(checked.data, passage);
    if (input.title.trim()) reading.title = input.title.trim();
    return { ok: true, reading, warnings, passage };
  } catch (e) {
    const status = (e as { status?: number } | null)?.status;
    if (status === 429) return { ok: false, error: '요청이 많아 잠시 후 다시 시도해 주세요.' };
    if (status === 401) return { ok: false, error: 'ANTHROPIC_API_KEY 가 올바르지 않습니다.' };
    return { ok: false, error: `AI 호출 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}` };
  }
}

const vocabWordsOf = (body: string | null) =>
  (body ?? '')
    .split(/\r?\n/)
    .map((l) => l.split(/[:|]/)[0]?.trim())
    .filter((w): w is string => !!w);

export type SaveResult = { ok: true; message: string } | { ok: false; error: string };

// 미리보기(선생님이 고친 결과 포함)를 more_reading(+ 단어) 콘텐츠로 저장한다.
export async function saveAiReadingAction(input: {
  unitId: string;
  title: string;
  reading: AiReading;
  passage: string;
  status: AiReadingStatus;
  withVocab: boolean;
  source?: string;
}): Promise<SaveResult> {
  const denied = await requireStaff();
  if (denied) return { ok: false, error: denied };

  const checked = AiReadingSchema.safeParse(input.reading);
  if (!checked.success) return { ok: false, error: '저장할 내용의 형식이 올바르지 않습니다.' };
  const { reading } = normalizeReading(checked.data); // 클라이언트 값이므로 서버에서 다시 정리한다
  if (reading.sentences.length < 2) return { ok: false, error: '문장이 2개 이상이어야 합니다.' };

  const supabase = await getServerSupabase();
  const { data: existing, error: selErr } = await supabase
    .from('middle_naesin_contents')
    .select('content_type, body_text, sort_order, extra_data')
    .eq('unit_id', input.unitId);
  if (selErr) return { ok: false, error: selErr.message };

  const rows = existing ?? [];
  const aiCount = rows.filter((r) => (r.extra_data as { aiReading?: unknown } | null)?.aiReading && r.content_type === 'more_reading').length;
  const maxSort = rows.reduce((m, r) => Math.max(m, (r.sort_order as number) ?? 0), 0);
  const existingVocabWords = rows
    .filter((r) => r.content_type === 'vocab_en_en' || r.content_type === 'vocab_ko')
    .flatMap((r) => vocabWordsOf(r.body_text as string | null));

  const title = input.title.trim() || reading.title || `AI Reading ${aiCount + 1}`;
  const { passage, vocab } = toContentRows(reading, {
    unitId: input.unitId,
    status: input.status,
    sortOrder: maxSort + 1,
    title,
    withVocab: input.withVocab,
    existingVocabWords,
    meta: { source: input.source ?? 'pasted' },
  });

  const { error } = await supabase.from('middle_naesin_contents').insert(vocab ? [passage, vocab] : [passage]);
  if (error) return { ok: false, error: error.message };

  revalidateUnit(input.unitId);
  return {
    ok: true,
    message:
      input.status === 'final'
        ? '저장하고 확정했습니다. 이제 학생 드릴에 보입니다.'
        : '초안으로 저장했습니다. 관리자 드릴에서 확인한 뒤 확정하세요.',
  };
}

function revalidateUnit(unitId: string) {
  revalidatePath(`/admin/middle-naesin/units/${unitId}`);
  revalidatePath(`/admin/middle-naesin/units/${unitId}/ai-reading`);
  revalidatePath(`/naesin/middle/${unitId}/drill`);
}

// 같은 생성 건(generatedAt)으로 만든 지문 + 단어 콘텐츠를 함께 다룬다.
async function siblingsOf(unitId: string, contentId: string) {
  const supabase = await getServerSupabase();
  const { data: rows } = await supabase.from('middle_naesin_contents').select('id, extra_data').eq('unit_id', unitId);
  const all = rows ?? [];
  const me = all.find((r) => r.id === contentId);
  const stamp = (me?.extra_data as { aiReading?: { generatedAt?: string } } | null)?.aiReading?.generatedAt;
  if (!me || !stamp) return { supabase, items: [] as typeof all };
  return {
    supabase,
    items: all.filter((r) => (r.extra_data as { aiReading?: { generatedAt?: string } } | null)?.aiReading?.generatedAt === stamp),
  };
}

export async function setAiReadingStatusAction(formData: FormData) {
  if (await requireStaff()) return;
  const unitId = String(formData.get('unit_id'));
  const contentId = String(formData.get('content_id'));
  const status = formData.get('status') === 'final' ? 'final' : 'draft';
  const { supabase, items } = await siblingsOf(unitId, contentId);
  for (const it of items) {
    const extra = (it.extra_data as Record<string, unknown>) ?? {};
    const ai = (extra.aiReading as Record<string, unknown>) ?? {};
    await supabase.from('middle_naesin_contents').update({ extra_data: { ...extra, aiReading: { ...ai, status } } }).eq('id', it.id);
  }
  revalidateUnit(unitId);
}

export async function deleteAiReadingAction(formData: FormData) {
  if (await requireStaff()) return;
  const unitId = String(formData.get('unit_id'));
  const contentId = String(formData.get('content_id'));
  const { supabase, items } = await siblingsOf(unitId, contentId);
  if (items.length > 0) await supabase.from('middle_naesin_contents').delete().in('id', items.map((i) => i.id));
  revalidateUnit(unitId);
}
