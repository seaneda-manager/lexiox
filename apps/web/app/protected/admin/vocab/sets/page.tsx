// apps/web/app/(protected)/admin/vocab/sets/page.tsx
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import SetsTableClient from "./_client/SetsTableClient";

export const dynamic = "force-dynamic";

export default async function AdminVocabSetsPage() {
  const supabase = await getServerSupabase();

  const [setsRes, studentsRes] = await Promise.all([
    supabase
      .from("vocab_sets_with_counts")
      .select("id, title, description, grade_band, level, source_label, word_count, item_count, created_at, track_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("academy_students")
      .select("id, auth_user_id, login_id, full_name, grade, school")
      .order("full_name", { ascending: true }),
  ]);

  const rows = setsRes.data ?? [];
  const students = studentsRes.data ?? [];
  const setsError = setsRes.error;
  const studentsError = studentsRes.error;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-400">어드민 / LEXiOX-어휘</div>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">단어 책 목록</h1>
          <p className="mt-1 text-sm text-neutral-500">등록된 vocab set(단어 책) 목록입니다</p>
        </div>
        <Link
          href="/admin/vocab/import"
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          + CSV 업로드
        </Link>
      </header>

      {(setsError || studentsError) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          조회 실패: {setsError?.message || studentsError?.message}
        </div>
      )}

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">전체 세트</div>
          <div className="mt-2 text-3xl font-bold text-violet-700">{rows.length}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">전체 단어 수</div>
          <div className="mt-2 text-3xl font-bold text-neutral-900">
            {rows.reduce((sum, r) => sum + (r.word_count ?? 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">평균 단어 수</div>
          <div className="mt-2 text-3xl font-bold text-neutral-900">
            {rows.length > 0
              ? Math.round(rows.reduce((sum, r) => sum + (r.word_count ?? 0), 0) / rows.length).toLocaleString()
              : 0}
          </div>
        </div>
      </div>

      {/* 테이블 (클라이언트 컴포넌트로 이동) */}
      <SetsTableClient rows={rows} students={students} />

      <div className="flex gap-3 text-sm">
        <Link href="/admin/vocab/import" className="text-violet-600 hover:underline">→ CSV 업로드</Link>
        <Link href="/admin/vocab/Tracks" className="text-violet-600 hover:underline">→ 트랙 배포</Link>
        <Link href="/admin/vocab/words" className="text-violet-600 hover:underline">→ 단어 목록</Link>
      </div>
    </main>
  );
}
