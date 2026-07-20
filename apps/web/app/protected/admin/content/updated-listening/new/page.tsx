import Link from "next/link";
import ListeningTestGeneratorClient from "./_client/ListeningTestGeneratorClient";

export const dynamic = "force-dynamic";

export default function Listening2026NewPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <Link href="/admin/content/updated-listening" className="rounded-full border px-2 py-1 hover:border-violet-400 hover:text-violet-700">
            Listening 2026 목록
          </Link>
          <span>·</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-medium text-violet-700">
            🎧 새 시험 만들기
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Listening 2026 – AI 생성</h1>
        <p className="text-xs text-gray-500">
          토픽을 입력하면 Claude가 Stage 1/2 대화·강의 스크립트와 문제를 자동 생성합니다.
          검토 후 수정하고 Lock하면 학생에게 노출됩니다.
        </p>
      </header>

      <ListeningTestGeneratorClient />
    </main>
  );
}
