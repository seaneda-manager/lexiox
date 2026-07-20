import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { gradeLabel, contentTypeLabel, contentTypeColor } from '@/models/middle-naesin';
import type { MiddleNaesinUnit, MiddleNaesinContent, MiddleNaesinContentType } from '@/models/middle-naesin';
import { confirmUnitAction } from '../../../actions';

export const dynamic = 'force-dynamic';

export default async function UnitPreviewPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const supabase = await getServerSupabase();

  const [{ data: unit, error: unitErr }, { data: contents }] = await Promise.all([
    supabase.from('middle_naesin_units').select('*').eq('id', unitId).single(),
    supabase
      .from('middle_naesin_contents')
      .select('*')
      .eq('unit_id', unitId)
      .order('sort_order')
      .order('content_type'),
  ]);

  if (unitErr || !unit) return <div className="p-8 text-red-600">단원을 찾을 수 없습니다.</div>;

  const u = unit as MiddleNaesinUnit;
  const items = (contents ?? []) as MiddleNaesinContent[];

  const typeOrder: MiddleNaesinContentType[] = ['main_text', 'dialogue', 'more_reading', 'vocab_en_en', 'past_exam'];

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-8">

      {/* 헤더 */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-400">미리보기</div>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900">
            {u.publisher} · {gradeLabel(u.grade)} {u.semester}학기
            {u.lesson_number != null && ` · Lesson ${u.lesson_number}`}
          </h1>
          {u.lesson_title && <p className="mt-0.5 text-sm text-neutral-500">"{u.lesson_title}"</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {u.is_published && (
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              ✓ 공개됨
            </span>
          )}
          <Link
            href={`/admin/middle-naesin/units/${unitId}`}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            ← 에디터로
          </Link>
        </div>
      </header>

      {/* 콘텐츠 없을 때 */}
      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          아직 등록된 콘텐츠가 없습니다.{' '}
          <Link href={`/admin/middle-naesin/units/${unitId}`} className="underline">
            에디터로 돌아가기
          </Link>
        </div>
      )}

      {/* 콘텐츠 타입별 미리보기 */}
      {typeOrder.map((type) => {
        const typeItems = items.filter((c) => c.content_type === type);
        if (typeItems.length === 0) return null;
        const colorClass = contentTypeColor(type);

        return (
          <section key={type} className="space-y-4">
            {/* 섹션 라벨 */}
            <div className="flex items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${colorClass}`}>
                {contentTypeLabel(type)}
              </span>
              <div className="h-px flex-1 bg-neutral-100" />
            </div>

            {typeItems.map((item) => (
              <div key={item.id}>
                {type === 'vocab_en_en' ? (
                  <VocabPreview item={item} />
                ) : type === 'past_exam' ? (
                  <PastExamPreview item={item} />
                ) : (
                  <PassagePreview item={item} />
                )}
              </div>
            ))}
          </section>
        );
      })}

      {/* 확정 버튼 */}
      {items.length > 0 && (
        <div className="sticky bottom-6 flex justify-center pt-4">
          <div className="rounded-2xl border bg-white shadow-lg px-6 py-4 flex items-center gap-6">
            <div className="text-sm text-neutral-600">
              {u.is_published ? (
                <span className="text-emerald-600 font-medium">이미 공개된 단원입니다.</span>
              ) : (
                <span>검수 완료 후 학생에게 공개하세요.</span>
              )}
            </div>
            {!u.is_published && (
              <form action={confirmUnitAction}>
                <input type="hidden" name="id" value={unitId} />
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  확정 · 공개
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function PassagePreview({ item }: { item: MiddleNaesinContent }) {
  return (
    <div className="rounded-2xl border bg-white p-6 space-y-4">
      {item.title && (
        <div className="text-sm font-semibold text-neutral-700">{item.title}</div>
      )}
      {item.body_text && (
        <p className="text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap font-serif">
          {item.body_text}
        </p>
      )}
      {item.translation_ko && (
        <details className="rounded-xl border bg-neutral-50 p-3">
          <summary className="cursor-pointer text-xs font-medium text-neutral-500">
            해석 보기
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap">
            {item.translation_ko}
          </p>
        </details>
      )}
    </div>
  );
}

function VocabPreview({ item }: { item: MiddleNaesinContent }) {
  const lines = (item.body_text ?? '').split('\n').filter(Boolean);
  const words = lines.map((line) => {
    const parts = line.split('|').map((s) => s.trim());
    return { word: parts[0], def: parts[1], example: parts[2] };
  });

  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      {item.title && (
        <div className="border-b bg-neutral-50 px-5 py-3 text-sm font-semibold text-neutral-700">
          {item.title}
        </div>
      )}
      <div className="divide-y">
        {words.map((w, i) => (
          <div key={i} className="px-5 py-3 grid sm:grid-cols-[160px_1fr] gap-2">
            <span className="text-sm font-semibold text-neutral-900">{w.word}</span>
            <div>
              <p className="text-sm text-neutral-700">{w.def}</p>
              {w.example && (
                <p className="mt-0.5 text-xs italic text-neutral-400">{w.example}</p>
              )}
            </div>
          </div>
        ))}
        {words.length === 0 && (
          <div className="px-5 py-4 text-sm text-neutral-400">단어 없음</div>
        )}
      </div>
    </div>
  );
}

function PastExamPreview({ item }: { item: MiddleNaesinContent }) {
  return (
    <div className="rounded-2xl border bg-white p-6 space-y-4">
      {item.title && (
        <div className="text-sm font-semibold text-neutral-700">{item.title}</div>
      )}
      {item.body_text && (
        <div className="rounded-xl bg-neutral-50 p-4">
          <p className="text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap">
            {item.body_text}
          </p>
        </div>
      )}
      {item.translation_ko && (
        <details className="rounded-xl border bg-amber-50 p-3">
          <summary className="cursor-pointer text-xs font-medium text-amber-700">
            해설 보기
          </summary>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600 whitespace-pre-wrap">
            {item.translation_ko}
          </p>
        </details>
      )}
    </div>
  );
}
