// apps/web/app/(protected)/admin/content/updated-listening/new-mst/page.tsx
import Link from "next/link";
import { Headphones } from "lucide-react";
import ListeningMstWizard from "./_client/ListeningMstWizard";

export default function ListeningMstNewPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <Link
            href="/admin/content/updated-listening"
            className="rounded-full border px-2 py-1 hover:border-violet-400 hover:text-violet-700"
          >
            목록으로
          </Link>
          <span>·</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 font-medium text-violet-700">
            <Headphones className="h-3.5 w-3.5" />
            Admin · Listening 2026 · MST 적응형 생성
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">Listening 2026 – 적응형(MST) 시험 생성</h1>
        <p className="mt-1 text-xs text-gray-600">
          Module1(Stage1) → Module2 Hard → Module2 Easy 순서로 3단계에 걸쳐 생성합니다.
        </p>
      </header>

      <ListeningMstWizard />
    </main>
  );
}
