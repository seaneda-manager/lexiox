import Link from 'next/link';
import { createUnitAction } from '../../actions';

export default function NewUnitPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">중학내신 / 단원 추가</div>
          <h1 className="text-xl font-semibold text-neutral-900">새 단원 등록</h1>
        </div>
        <Link href="/admin/middle-naesin/units" className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">
          목록으로
        </Link>
      </header>

      <form action={createUnitAction} className="space-y-5">
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">출판사 / 저자 *</label>
              <input
                name="publisher"
                required
                placeholder="예: 천재(이재영), YBM(박준언)"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">학교명 (선택)</label>
              <input
                name="school_name"
                placeholder="예: 서울중학교"
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
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              >
                <option value="">선택</option>
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
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              >
                <option value="">선택</option>
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
                placeholder="예: 3"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">단원 제목</label>
            <input
              name="lesson_title"
              placeholder='예: "Be Yourself"'
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link href="/admin/middle-naesin/units" className="rounded-xl border px-5 py-2.5 text-sm hover:bg-neutral-50">
            취소
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            저장 후 콘텐츠 편집
          </button>
        </div>
      </form>
    </main>
  );
}
