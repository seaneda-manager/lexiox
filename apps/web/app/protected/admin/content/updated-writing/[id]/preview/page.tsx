// Admin이 배정 전에 Writing 시험의 실제 구성(task 종류·문항·프롬프트)을 확인하는 페이지.
// 학생 러너는 없는 taskKind를 조용히 건너뛰므로, 여기서 빠진 task를 경고로 보여준다.
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import type { WWritingTest2026 } from "@/models/writing";

export const dynamic = "force-dynamic";

const EXPECTED_KINDS = [
  { kind: "build_a_sentence", label: "Build a Sentence" },
  { kind: "email", label: "Email Writing" },
  { kind: "academic_discussion", label: "Academic Discussion" },
] as const;

export default async function WritingTestPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const { data: testRow, error } = await supabase
    .from("writing_tests")
    .select("id, label, payload, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          조회 오류: {error.message}
        </p>
      </main>
    );
  }
  if (!testRow) return notFound();

  const payload = (testRow.payload ?? {}) as Partial<WWritingTest2026>;
  const items = (payload.items ?? []) as any[];
  const presentKinds = new Set(items.map((i) => i?.taskKind));
  const missing = EXPECTED_KINDS.filter((e) => !presentKinds.has(e.kind));

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Admin / Writing / 미리보기
        </p>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{testRow.label}</h1>
        <p className="font-mono text-xs text-slate-400">{testRow.id}</p>
      </header>

      {/* 누락 task 경고 */}
      {missing.length > 0 ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3">
          <p className="text-sm font-bold text-rose-700">
            ⚠️ 누락된 Task: {missing.map((m) => m.label).join(", ")}
          </p>
          <p className="mt-1 text-xs text-rose-600">
            학생 러너는 없는 task를 건너뛰므로, 이 시험을 배정하면 학생에게 해당 화면이 나오지 않습니다.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          ✅ 3개 Task 모두 포함 (Build a Sentence / Email / Academic Discussion)
        </div>
      )}

      {items.length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          payload에 items가 없습니다. 시험 데이터가 비어 있습니다.
        </p>
      )}

      {/* Task별 상세 */}
      {items.map((item, idx) => {
        const kind = item?.taskKind ?? "(unknown)";
        return (
          <section key={item?.id ?? idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
                Task {idx + 1}
              </span>
              <span className="text-sm font-bold text-slate-900">{kind}</span>
              {item?.id && <span className="font-mono text-[11px] text-slate-400">{item.id}</span>}
            </div>

            {kind === "build_a_sentence" && (
              <div className="space-y-2 text-xs text-slate-700">
                <p className="font-semibold">문항 수: {item.questions?.length ?? 0}</p>
                {(item.questions ?? []).slice(0, 3).map((q: any, i: number) => (
                  <p key={q.id ?? i} className="text-slate-500">
                    {i + 1}. {q.contextLeadIn} ___ {q.contextLeadOut}
                  </p>
                ))}
                {(item.questions?.length ?? 0) > 3 && (
                  <p className="text-slate-400">… 외 {(item.questions?.length ?? 0) - 3}문항</p>
                )}
              </div>
            )}

            {kind === "email" && (
              <div className="space-y-2 text-xs text-slate-700">
                <p><span className="font-semibold">To:</span> {item.recipient ?? "-"} {item.recipientEmail ? `<${item.recipientEmail}>` : ""}</p>
                <p><span className="font-semibold">Subject:</span> {item.subjectLine ?? "-"}</p>
                <p><span className="font-semibold">상황:</span> {item.situation ?? "-"}</p>
                {(item.hints ?? []).length > 0 && (
                  <ul className="list-disc pl-5 text-slate-600">
                    {item.hints.map((h: string, i: number) => <li key={i}>{h}</li>)}
                  </ul>
                )}
                <p className="text-slate-500">
                  권장 분량: {item.wordLimit?.min ?? "?"}–{item.wordLimit?.max ?? "?"} words
                </p>
              </div>
            )}

            {kind === "academic_discussion" && (
              <div className="space-y-2 text-xs text-slate-700">
                <p><span className="font-semibold">교수:</span> {item.professorName ?? "-"}</p>
                <p className="text-slate-600">{item.professorPrompt ?? "-"}</p>
                {(item.studentPosts ?? []).map((p: any) => (
                  <div key={p.id} className="rounded-lg bg-slate-50 p-2">
                    <p className="font-semibold text-slate-800">{p.author}</p>
                    <p className="text-slate-600">{String(p.content ?? "").slice(0, 150)}…</p>
                  </div>
                ))}
              </div>
            )}

            {!["build_a_sentence", "email", "academic_discussion"].includes(kind) && (
              <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
                {JSON.stringify(item, null, 2).slice(0, 800)}
              </pre>
            )}
          </section>
        );
      })}

      <div className="flex gap-2">
        <Link
          href="/admin/content/updated-writing"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← 목록으로
        </Link>
      </div>
    </main>
  );
}
