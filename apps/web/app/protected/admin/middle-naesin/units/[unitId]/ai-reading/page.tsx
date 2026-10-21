import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { gradeLabel } from '@/models/middle-naesin';
import type { MiddleNaesinUnit } from '@/models/middle-naesin';
import { AiReadingClient } from './AiReadingClient';
import { setAiReadingStatusAction, deleteAiReadingAction } from './actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // AI 호출이 길어질 수 있다

type AiMeta = { status?: string; generatedAt?: string };

export default async function AiReadingPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const supabase = await getServerSupabase();

  const [{ data: unit }, { data: contents }, { data: jr }] = await Promise.all([
    supabase.from('middle_naesin_units').select('*').eq('id', unitId).single(),
    supabase.from('middle_naesin_contents').select('id, content_type, title, body_text, extra_data, sort_order').eq('unit_id', unitId).order('sort_order'),
    supabase
      .from('jr_reading_passages')
      .select('id, title, content, korean_translation')
      .order('created_at', { ascending: false })
      .limit(40),
  ]);
  if (!unit) return <div className="p-8 text-red-600">단원을 찾을 수 없습니다.</div>;
  const u = unit as MiddleNaesinUnit;

  const aiReadings = (contents ?? []).filter(
    (c) => c.content_type === 'more_reading' && (c.extra_data as { aiReading?: AiMeta } | null)?.aiReading,
  );

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">중학내신 / AI 읽기 드릴</div>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900">
            {u.publisher} · {gradeLabel(u.grade)} {u.semester}학기{u.lesson_number != null && ` · Lesson ${u.lesson_number}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            이미 넣어 둔 지문을 AI가 문장별 해석 · 구조(S/V/O/C) · 문법 · 핵심 단어로 가공해서, 이 단원의 More Reading 드릴로 만듭니다.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={`/admin/middle-naesin/units/${unitId}`} className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
            ← 단원
          </Link>
          <Link href={`/admin/middle-naesin/units/${unitId}/drill`} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">
            드릴 열기 →
          </Link>
        </div>
      </header>

      <AiReadingClient
        unitId={unitId}
        jrPassages={(jr ?? []).map((p) => ({
          id: p.id as string,
          title: (p.title as string) ?? '',
          content: (p.content as string) ?? '',
          korean_translation: (p.korean_translation as string | null) ?? null,
        }))}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-800">이 단원의 AI 읽기 ({aiReadings.length})</h2>
        {aiReadings.length === 0 && <p className="text-sm text-neutral-400">아직 없습니다.</p>}
        {aiReadings.map((c) => {
          const ai = (c.extra_data as { aiReading?: AiMeta }).aiReading ?? {};
          const final = ai.status === 'final';
          const sentences = ((c.body_text as string) ?? '').split(/\r?\n/).filter(Boolean).length;
          return (
            <div key={c.id as string} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div>
                <div className="text-sm font-semibold text-neutral-900">{c.title as string}</div>
                <div className="text-xs text-neutral-500">
                  {sentences}문장 ·{' '}
                  <span className={final ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>
                    {final ? '확정 (학생에게 보임)' : '초안 (학생에게 안 보임)'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <form action={setAiReadingStatusAction}>
                  <input type="hidden" name="unit_id" value={unitId} />
                  <input type="hidden" name="content_id" value={c.id as string} />
                  <input type="hidden" name="status" value={final ? 'draft' : 'final'} />
                  <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-neutral-50">{final ? '초안으로 되돌리기' : '확정'}</button>
                </form>
                <form action={deleteAiReadingAction}>
                  <input type="hidden" name="unit_id" value={unitId} />
                  <input type="hidden" name="content_id" value={c.id as string} />
                  <button className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">삭제</button>
                </form>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
