// admin/content/listening/jr/page.tsx
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ListeningJrAdminPage() {
  const supabase = await getServerSupabase();

  const { data: sets } = await supabase
    .from('listening_sets')
    .select('id, title, source, source_year, source_month, default_difficulty, created_at')
    .eq('program', 'jr')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-500">LEXiOX-Jr.</p>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-neutral-900">Listening (Jr.) 편집기</h1>
          <Link
            href="/admin/listening/new?program=jr"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            + 새 세트
          </Link>
        </div>
        <p className="text-sm text-neutral-500">
          Junior 리스닝 세트 관리 — 중등·초등 수준의 대화·안내방송·짧은 강의
        </p>
      </header>

      {/* 문제 유형 가이드 */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p className="text-xs font-semibold text-emerald-700 mb-2">Jr. 리스닝 문제 유형</p>
        <div className="flex flex-wrap gap-2">
          {['중심 내용','세부사항','추론','어휘/표현'].map((t) => (
            <span key={t} className="rounded-full bg-white border border-emerald-200 px-2.5 py-0.5 text-[11px] text-emerald-700">{t}</span>
          ))}
        </div>
      </div>

      {/* 세트 목록 */}
      <section className="space-y-2">
        {!sets || sets.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
            아직 등록된 Jr. 리스닝 세트가 없습니다.
          </div>
        ) : (
          sets.map((s: any) => (
            <Link
              key={s.id}
              href={`/admin/listening/${s.id}`}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:bg-neutral-50 transition"
            >
              <div>
                <p className="text-sm font-semibold text-neutral-800">{s.title ?? s.id}</p>
                <p className="text-[11px] text-neutral-400">
                  {s.source} {s.source_year && `${s.source_year}년`} {s.source_month && `${s.source_month}월`}
                  {s.default_difficulty && ` · ${s.default_difficulty}`}
                </p>
              </div>
              <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
