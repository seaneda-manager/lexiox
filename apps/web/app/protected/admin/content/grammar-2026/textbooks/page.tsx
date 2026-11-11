import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase/service';
import TextbookEditor, { type BookData } from './_client/TextbookEditor';

export const dynamic = 'force-dynamic';

export default async function GrammarTextbooksPage() {
  const db = getServiceSupabase();
  const { data: books, error } = await db.from('grammar_textbooks').select('id, name, level').order('name');
  const missingTable = !!error && /grammar_textbooks|does not exist|schema cache/i.test(error.message);

  const [{ data: tbUnits }, { data: maps }, { data: chapters }] = missingTable
    ? [{ data: [] }, { data: [] }, { data: [] }]
    : await Promise.all([
        db.from('grammar_textbook_units').select('id, textbook_id, unit_no, title').order('unit_no'),
        db.from('grammar_textbook_unit_chapters').select('textbook_unit_id, unit_id, position'),
        db.from('grammar_2026_units').select('id, label_ko, level, order_index, status').order('order_index'),
      ]);

  const chapterList = ((chapters ?? []) as { id: string; label_ko: string; level: string; order_index: number; status: string }[]).map((c) => ({
    id: c.id,
    label: `${c.order_index}. ${c.label_ko}`,
    level: c.level,
    published: c.status === 'published',
  }));

  const data: BookData[] = ((books ?? []) as { id: string; name: string; level: string }[]).map((b) => ({
    id: b.id,
    name: b.name,
    level: b.level,
    units: ((tbUnits ?? []) as { id: string; textbook_id: string; unit_no: number; title: string }[])
      .filter((u) => u.textbook_id === b.id)
      .map((u) => ({
        id: u.id,
        no: u.unit_no,
        title: u.title,
        chapterIds: ((maps ?? []) as { textbook_unit_id: string; unit_id: string; position: number }[])
          .filter((m) => m.textbook_unit_id === u.id)
          .sort((a, c) => a.position - c.position)
          .map((m) => m.unit_id),
      })),
  }));

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-700">
          <BookOpen className="h-3.5 w-3.5" />
          Admin · LEXiOX-Gram
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-gray-900">교재 목차 · 챕터 매핑</h1>
        <p className="text-xs text-gray-500">
          학생이 쓰는 교재의 목차를 등록하고, 각 단원에 대응하는 Universal 챕터를 연결합니다. 학생 스케줄에서 교재와 현재 단원을 지정하면 그 순서대로 배정됩니다.{' '}
          <Link href="/admin/content/grammar-2026/plans" className="underline">
            ← 문법 스케줄
          </Link>
        </p>
      </header>

      {missingTable && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          DB 마이그레이션이 필요합니다. Supabase SQL Editor에서 <code>20261111000001_grammar_textbooks.sql</code> 을 실행한 뒤 새로고침하세요.
        </div>
      )}

      {!missingTable && <TextbookEditor books={data} chapters={chapterList} />}
    </main>
  );
}
