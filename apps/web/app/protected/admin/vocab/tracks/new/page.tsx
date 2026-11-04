import Link from "next/link";
import TrackBuilderClient from "./_client/TrackBuilderClient";

export const dynamic = "force-dynamic";

export default function AdminVocabTrackNewPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-8">
      <header>
        <div className="text-xs uppercase tracking-widest text-neutral-400">어드민 / LEXiOX-어휘</div>
        <h1 className="text-2xl font-extrabold text-neutral-900">Track 만들기 · Day 편성</h1>
        <p className="mt-1 text-sm text-neutral-600">
          세트를 골라 Day 1, 2, 3… 순서로 묶습니다. 저장하면 Day 수가 자동으로 정해집니다.
        </p>
      </header>
      <TrackBuilderClient />
      <div className="flex gap-3 text-sm">
        <Link href="/admin/vocab/sets" className="text-violet-600 hover:underline">→ 세트 목록</Link>
        <Link href="/admin/vocab/tracks" className="text-violet-600 hover:underline">→ 트랙 배포</Link>
      </div>
    </main>
  );
}
