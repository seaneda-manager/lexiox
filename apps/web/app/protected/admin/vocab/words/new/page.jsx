// apps/web/app/(protected)/admin/vocab/words/new/page.tsx
import Link from "next/link";
import WordForm from "@/components/vocab/WordForm";

export const dynamic = "force-dynamic";

export default function AdminVocabWordNewPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">단어 추가 (New Word)</h1>
          <p className="text-sm text-gray-600">새 단어를 입력하고 저장하세요.</p>
        </div>

        <Link
          href="/admin/vocab/words"
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          ← Back
        </Link>
      </header>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        {/* ✅ 함수 prop 전달 없음: RSC 에러 원천봉쇄 */}
        <WordForm submitLabel="단어 저장" />
      </section>
    </main>
  );
}
