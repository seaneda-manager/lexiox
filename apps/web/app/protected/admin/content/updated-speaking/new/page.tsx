import Link from "next/link";
import SpeakingTestGeneratorClient from "./_client/SpeakingTestGeneratorClient";

export const dynamic = "force-dynamic";

export default function SpeakingNewPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <Link href="/admin/content/updated-speaking" className="rounded-full border px-2 py-1 hover:border-orange-400 hover:text-orange-700">
            Updated Speaking 목록
          </Link>
          <span>·</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-700">
            🎤 새 시험 만들기
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Updated Speaking – AI 생성</h1>
        <p className="text-xs text-gray-500">
          토픽을 입력하면 Claude가 Repeat · Independent · Integrated 태스크를 자동 생성합니다.
          검토 후 수정하고 Lock하면 학생에게 노출됩니다.
        </p>
      </header>

      <SpeakingTestGeneratorClient />
    </main>
  );
}
