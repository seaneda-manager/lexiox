import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LooseRow = Record<string, unknown>;

type PassageListRow = {
  id: string;
  title: string;
  track: string;
  status: string;
  schoolLevel: string;
  examType: string;
  sentenceCount: number;
  variantCount: number;
  updatedAt: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function formatDateTime(value: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function normalizeRow(row: LooseRow): PassageListRow {
  return {
    id: asString(row.id),
    title: asString(row.title),
    track: asString(row.track),
    status: asString(row.status),
    schoolLevel: asString(row.school_level),
    examType: asString(row.exam_type),
    sentenceCount: asNumber(row.sentence_count),
    variantCount: asNumber(row.variant_count),
    updatedAt: asString(row.updated_at),
  };
}

export default async function AdminNaesinPassagesPage() {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("naesin_passages")
    .select(
      "id, title, track, status, school_level, exam_type, sentence_count, variant_count, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  const rows = ((data ?? []) as LooseRow[]).map(normalizeRow);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Admin / Naesin / Passages
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
            Passage List
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            저장된 passage를 확인하고, 다시 열어 수정하거나 다음 단계로 연결합니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/naesin/passages/new"
            className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700"
          >
            새 Passage 작성
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">트랙</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">학교급</th>
                <th className="px-4 py-3 font-medium">시험유형</th>
                <th className="px-4 py-3 font-medium">문장 수</th>
                <th className="px-4 py-3 font-medium">Variant 수</th>
                <th className="px-4 py-3 font-medium">수정일</th>
                <th className="px-4 py-3 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-neutral-500">
                    저장된 passage가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t align-top">
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {row.title || "(제목 없음)"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{row.track || "-"}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.status || "-"}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.schoolLevel || "-"}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.examType || "-"}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.sentenceCount}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.variantCount}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {formatDateTime(row.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/naesin/passages/${row.id}`}
                          className="rounded-xl border px-3 py-1.5 text-xs font-medium text-neutral-700"
                        >
                          편집
                        </Link>
                        <Link
                          href={`/admin/naesin/passages/${row.id}/preview`}
                          className="rounded-xl border px-3 py-1.5 text-xs font-medium text-neutral-700"
                        >
                          미리보기
                        </Link>
                        <Link
                          href={`/admin/assignments/new?passageId=${row.id}`}
                          className="rounded-xl border px-3 py-1.5 text-xs font-medium text-neutral-700"
                        >
                          과제 만들기
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
