// apps/web/app/(protected)/admin/vocab/progress/page.tsx
import ProgressClient from "./_client/ProgressClient";
import { listVocabTracksForProgressAction } from "./actions";

export default async function AdminVocabProgressPage() {
  const res = await listVocabTracksForProgressAction();
  const tracks = res.ok ? res.tracks : [];

  return (
    <div className="mx-auto w-full max-w-6xl p-6 space-y-4">
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-xl font-extrabold">Vocab Progress · 진행 현황</div>
        <div className="mt-1 text-sm text-slate-600">
          트랙별 학생 진도 — 완료 Day 수, 진도율, 마지막 학습일
        </div>
        {"error" in res && (
          <div className="mt-3 text-sm text-rose-700">트랙 로드 실패: {res.error}</div>
        )}
      </div>
      <ProgressClient tracks={tracks} />
    </div>
  );
}
