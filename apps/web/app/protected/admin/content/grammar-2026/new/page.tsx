import Link from "next/link";
import NewUnitClient from "./_client/NewUnitClient";

export default function NewGrammarUnitPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <Link
          href="/admin/content/grammar-2026"
          className="text-[11px] text-gray-400 hover:text-gray-600"
        >
          ← 유닛 목록
        </Link>
        <h1 className="mt-2 text-xl font-bold text-gray-900">새 유닛 만들기</h1>
      </div>
      <NewUnitClient />
    </main>
  );
}
