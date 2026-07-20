// apps/web/app/(protected)/admin/content/[id]/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { BookOpenCheck, FileQuestion } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminContentDetailBridgePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // v1: 이번 스프린트는 Reading 우선.
  // generic content detail로 들어오면, 실제 편집기는 기존 Reading 2026 editor로 넘긴다.
  const { data: reading2026, error: reading2026Error } = await supabase
    .from("reading_tests_2026")
    .select("id,label,exam_era,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (reading2026) {
    redirect(`/admin/content/updated-reading/${reading2026.id}`);
  }

  console.error("AdminContentDetailBridgePage: unsupported content id", {
    id,
    reading2026Error,
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
          <Link
            href="/admin/content"
            className="rounded-full border px-2 py-1 text-[11px] hover:border-emerald-400 hover:text-emerald-700"
          >
            목록으로
          </Link>

          <span>·</span>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
            <BookOpenCheck className="h-3.5 w-3.5" />
            Admin · Content · Detail Bridge
          </span>
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-tight">콘텐츠 상세 브리지</h1>
          <p className="mt-1 text-sm text-neutral-600">
            현재 이 ID는 공통 Content Hub에서는 찾았지만, 연결된 섹션별 에디터가 아직 매핑되지 않았습니다.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-neutral-100 p-2 text-neutral-700">
            <FileQuestion className="h-5 w-5" />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-400">
                Content ID
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">{id}</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              이번 스프린트에서는 <strong>Reading 우선</strong>으로 진행합니다.  
              그래서 generic 상세 페이지는 섹션별 에디터로 넘기는 브리지 역할만 담당합니다.
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/content"
                className="rounded-lg border px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                콘텐츠 목록으로
              </Link>

              <Link
                href="/admin/content/new"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                새 콘텐츠 만들기
              </Link>

              <Link
                href="/admin/content/updated-reading"
                className="rounded-lg border px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Reading 2026 목록
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">현재 v1 정책</h2>
        <ul className="mt-3 space-y-2 text-sm text-neutral-700">
          <li>• 공통 Content Hub는 진입 허브 역할</li>
          <li>• 실제 편집은 섹션별 editor route를 우선 사용</li>
          <li>• Reading은 기존 <code className="rounded bg-neutral-100 px-1 py-0.5">/admin/content/updated-reading/[id]</code> 재사용</li>
          <li>• Listening / Speaking / Writing / Grammar / Vocab은 이후 단계에서 연결</li>
        </ul>
      </section>
    </main>
  );
}
