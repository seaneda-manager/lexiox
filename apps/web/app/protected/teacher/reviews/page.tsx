// /teacher/reviews — 리뷰 관리 (선생님·관리자)
// 학생이 낸 Writing/Speaking 결과에 대해: 초안 만들기 → 미리보기·수정 → 학생에게 공개.
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import ReviewManager, { type ManagedRow, type ReviewState } from "./_client/ReviewManager";

export const dynamic = "force-dynamic";

type SP = Promise<{ kind?: string; status?: string; short?: string }>;

const fmtKst = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });

function stateOf(status: string | null, version: string | null): ReviewState {
  if (!version) return "none";
  return status === "draft" ? "draft" : "published";
}

export default async function ReviewsAdminPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const kind: "writing" | "speaking" = sp.kind === "speaking" ? "speaking" : "writing";
  const statusFilter = ["none", "draft", "published"].includes(sp.status ?? "") ? (sp.status as ReviewState) : "all";
  const includeShort = sp.short === "1";

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return <main className="mx-auto max-w-4xl px-6 py-10 text-sm text-slate-600">로그인이 필요합니다.</main>;

  let rawRows: any[] = [];
  let loadError: string | null = null;

  if (kind === "writing") {
    const { data, error } = await supabase
      .from("writing_2026_sessions")
      .select("id,user_id,test_id,created_at,review_status:ai_review->>status,review_ver:ai_review->>version")
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) loadError = error.message;
    rawRows = data ?? [];
  } else {
    const { data, error } = await supabase
      .from("speaking_results_2026")
      .select("id,user_id,test_id,task_id,prompt,script,approx_words,created_at,review_status:meta->review_bundle->>status,review_ver:meta->review_bundle->>version")
      .order("created_at", { ascending: false })
      .limit(150);
    if (error) loadError = error.message;
    rawRows = data ?? [];
  }

  // 학생 이름 / 시험 이름
  const userIds = [...new Set(rawRows.map((r) => r.user_id).filter(Boolean))] as string[];
  const testIds = [...new Set(rawRows.map((r) => r.test_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (userIds.length) {
    const { data: ps } = await supabase.from("profiles").select("id, full_name, name, email").in("id", userIds);
    for (const p of ps ?? []) names.set((p as any).id, (p as any).full_name || (p as any).name || (p as any).email || "");
  }
  const labels = new Map<string, string>();
  if (testIds.length) {
    const { data: ts } = await supabase.from(kind === "writing" ? "writing_tests" : "speaking_tests").select("id,label").in("id", testIds);
    for (const t of ts ?? []) labels.set((t as any).id, (t as any).label ?? (t as any).id);
  }

  const wordsOf = (r: any) => (typeof r.approx_words === "number" && r.approx_words > 0 ? r.approx_words : String(r.script ?? "").trim().split(/\s+/).filter(Boolean).length);

  let rows: ManagedRow[] = rawRows.map((r) => ({
    id: r.id as string,
    student: names.get(r.user_id) || `…${String(r.user_id ?? "").slice(-6)}`,
    test: labels.get(r.test_id) || r.test_id || "-",
    detail:
      kind === "speaking"
        ? `${String(r.task_id ?? "")} · ${wordsOf(r)}단어 · ${String(r.prompt ?? "").replace(/\s+/g, " ").slice(0, 50)}`
        : "",
    at: fmtKst(r.created_at),
    state: stateOf(r.review_status, r.review_ver),
    canGenerate: kind === "writing" ? true : wordsOf(r) > 0,
    short: kind === "speaking" ? wordsOf(r) < 40 : false,
  }));

  const hiddenShort = kind === "speaking" && !includeShort ? rows.filter((r) => r.short).length : 0;
  if (kind === "speaking" && !includeShort) rows = rows.filter((r) => !r.short);
  const counts = { none: 0, draft: 0, published: 0 };
  rows.forEach((r) => counts[r.state]++);
  if (statusFilter !== "all") rows = rows.filter((r) => r.state === statusFilter);

  const q = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ kind, ...(statusFilter !== "all" ? { status: statusFilter } : {}), ...(includeShort ? { short: "1" } : {}) });
    for (const [k, v] of Object.entries(over)) (v === undefined ? p.delete(k) : p.set(k, v));
    return `/teacher/reviews?${p.toString()}`;
  };
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">리뷰 관리</h1>
        <p className="text-xs text-slate-500">
          학생 결과의 상세 리뷰와 Drill을 만들고 확인한 뒤 공개합니다. 공개 전에는 학생에게 점수와 “공개 예정일(제출 후 2일)”만 보입니다.
          한 번 만든 초안은 다시 만들지 않고, 수정만 할 수 있어요.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={q({ kind: "writing", status: undefined })} className={chip(kind === "writing")}>Writing</Link>
        <Link href={q({ kind: "speaking", status: undefined })} className={chip(kind === "speaking")}>Speaking</Link>
        <span className="mx-2 h-4 w-px bg-slate-300" />
        <Link href={q({ status: undefined })} className={chip(statusFilter === "all")}>전체 {counts.none + counts.draft + counts.published}</Link>
        <Link href={q({ status: "none" })} className={chip(statusFilter === "none")}>미생성 {counts.none}</Link>
        <Link href={q({ status: "draft" })} className={chip(statusFilter === "draft")}>초안 {counts.draft}</Link>
        <Link href={q({ status: "published" })} className={chip(statusFilter === "published")}>공개 {counts.published}</Link>
        {kind === "speaking" && (
          <Link href={q({ short: includeShort ? undefined : "1" })} className="ml-auto text-xs text-slate-500 underline">
            {includeShort ? "짧은 답변 숨기기" : `짧은 답변(40단어 미만) ${hiddenShort > 0 ? hiddenShort + "건 " : ""}포함해서 보기`}
          </Link>
        )}
      </div>

      {loadError ? (
        <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">목록을 불러오지 못했습니다: {loadError}</p>
      ) : (
        <ReviewManager kind={kind} rows={rows} />
      )}
    </main>
  );
}
