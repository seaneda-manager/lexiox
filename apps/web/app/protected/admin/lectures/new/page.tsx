import { createLectureAction } from "../actions";

export default function NewLecturePage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-6 py-8">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-neutral-400">Admin / Lectures / New</div>
        <h1 className="text-2xl font-semibold tracking-tight">새 강의 추가</h1>
      </div>

      <form action={createLectureAction} className="space-y-4 rounded-2xl border bg-white p-6">
        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-600">제목 *</label>
          <input
            name="title"
            required
            placeholder="강의 제목"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-600">YouTube URL *</label>
          <input
            name="youtube_url"
            required
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <p className="text-[11px] text-neutral-400">비공개(Unlisted) 영상 URL을 붙여넣으세요.</p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-neutral-600">설명</label>
          <textarea
            name="description"
            rows={3}
            placeholder="강의 내용 요약..."
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">영상 길이 (초)</label>
            <input
              name="duration_seconds"
              type="number"
              placeholder="예: 600"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">태그 (쉼표 구분)</label>
            <input
              name="tags"
              placeholder="문법, 리딩, 고1"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          강의 추가
        </button>
      </form>
    </main>
  );
}
