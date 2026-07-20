import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { updateUnitAction } from '../../../actions';
import type { MiddleNaesinUnit } from '@/models/middle-naesin';

export const dynamic = 'force-dynamic';

export default async function EditUnitPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.from('middle_naesin_units').select('*').eq('id', unitId).single();
  if (error || !data) return <div className="p-8 text-red-600">단원을 찾을 수 없습니다.</div>;
  const u = data as MiddleNaesinUnit;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">중학내신 / 단원 수정</div>
          <h1 className="text-xl font-semibold text-neutral-900">단원 정보 수정</h1>
        </div>
        <Link href={`/admin/middle-naesin/units/${unitId}`} className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
          돌아가기
        </Link>
      </header>

      <form action={updateUnitAction} className="space-y-5">
        <input type="hidden" name="id" value={unitId} />

        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">출판사 / 저자 *</label>
              <input
                name="publisher"
                required
                defaultValue={u.publisher}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">학교명 (선택)</label>
              <input
                name="school_name"
                defaultValue={u.school_name ?? ''}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">학년 *</label>
              <select
                name="grade"
                required
                defaultValue={u.grade}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              >
                <option value="M1">중1</option>
                <option value="M2">중2</option>
                <option value="M3">중3</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">학기 *</label>
              <select
                name="semester"
                required
                defaultValue={String(u.semester)}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              >
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">단원 번호</label>
              <input
                name="lesson_number"
                type="number"
                min="1"
                defaultValue={u.lesson_number ?? ''}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">단원 제목</label>
            <input
              name="lesson_title"
              defaultValue={u.lesson_title ?? ''}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link href={`/admin/middle-naesin/units/${unitId}`} className="rounded-xl border px-5 py-2.5 text-sm hover:bg-neutral-50">
            취소
          </Link>
          <button type="submit" className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800">
            저장
          </button>
        </div>
      </form>
    </main>
  );
}
