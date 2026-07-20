import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import ReadingTestGeneratorClient from "./_client/ReadingTestGeneratorClient";

export const dynamic = "force-dynamic";

export default function Reading2026NewTestPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <Link href="/admin/content/updated-reading" className="rounded-full border px-2 py-1 hover:border-emerald-400 hover:text-emerald-700">
            Reading 2026 목록
          </Link>
          <span>·</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
            <BookOpenCheck className="h-3.5 w-3.5" />
            새 시험 만들기
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Reading 2026 – AI 생성</h1>
        <p className="text-xs text-gray-500">
          토픽을 입력하면 Claude가 Stage 1/2 지문과 문제를 자동 생성합니다.
          검토 후 수정하고 Lock하면 학생에게 노출됩니다.
        </p>
      </header>

      <ReadingTestGeneratorClient />
    </main>
  );
}
