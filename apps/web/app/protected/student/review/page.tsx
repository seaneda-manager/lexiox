import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  BookOpen, Mic, Headphones, PenLine,
  ArrowRight, AlertCircle, History,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentReviewPage() {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <h1 className="text-xl font-bold tracking-tight">Review</h1>
        <p className="text-sm text-gray-600">이 페이지를 보려면 로그인이 필요합니다.</p>
      </main>
    );
  }

  // Reading 결과
  const { data: readingRaw } = await supabase
    .from("reading_results_2026")
    .select("id,test_id,total_questions,finished_at")
    .eq("user_id", user.id)
    .order("finished_at", { ascending: false })
    .limit(30);

  const readingTestIds = [...new Set((readingRaw ?? []).map((r) => r.test_id).filter(Boolean))] as string[];
  let readingLabelMap: Record<string, string> = {};
  if (readingTestIds.length > 0) {
    const { data: tests } = await supabase
      .from("reading_tests_2026")
      .select("id,label")
      .in("id", readingTestIds);
    readingLabelMap = (tests ?? []).reduce<Record<string, string>>((acc, t) => {
      if (t?.id) acc[t.id] = t.label ?? t.id;
      return acc;
    }, {});
  }

  // Writing 결과
  const { data: writingRaw } = await supabase
    .from("writing_2026_sessions")
    .select("id,test_id,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const writingTestIds = [...new Set((writingRaw ?? []).map((r) => r.test_id).filter(Boolean))] as string[];
  let writingLabelMap: Record<string, string> = {};
  if (writingTestIds.length > 0) {
    const { data: tests } = await supabase
      .from("writing_tests")
      .select("id,label")
      .in("id", writingTestIds);
    writingLabelMap = (tests ?? []).reduce<Record<string, string>>((acc, t) => {
      if (t?.id) acc[t.id] = t.label ?? t.id;
      return acc;
    }, {});
  }

  const writingRows = (writingRaw ?? []).map((r) => ({
    id: r.id,
    label: (r.test_id && writingLabelMap[r.test_id]) || r.test_id || "Unknown",
    createdAt: r.created_at,
  }));

  // Speaking 결과
  const { data: speakingRaw } = await supabase
    .from("speaking_results_2026")
    .select("id,test_id,task_id,prompt,content_score,fluency_score,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const speakingTestIds = [...new Set((speakingRaw ?? []).map((r) => r.test_id).filter(Boolean))] as string[];
  let speakingLabelMap: Record<string, string> = {};
  if (speakingTestIds.length > 0) {
    const { data: tests } = await supabase
      .from("speaking_tests")
      .select("id,label")
      .in("id", speakingTestIds);
    speakingLabelMap = (tests ?? []).reduce<Record<string, string>>((acc, t) => {
      if (t?.id) acc[t.id] = t.label ?? t.id;
      return acc;
    }, {});
  }

  const readingRows = (readingRaw ?? []).map((r) => ({
    id: r.id,
    label: (r.test_id && readingLabelMap[r.test_id]) || r.test_id || "Unknown",
    finishedAt: r.finished_at,
    totalQuestions: r.total_questions ?? 0,
  }));

  const speakingRows = (speakingRaw ?? []).map((r) => ({
    id: r.id,
    label: (r.test_id && speakingLabelMap[r.test_id]) || r.test_id || "Unknown",
    prompt: r.prompt ?? null,
    contentScore: r.content_score ?? null,
    fluencyScore: r.fluency_score ?? null,
    createdAt: r.created_at,
  }));

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
          <History className="h-3.5 w-3.5" />
          Updated TOEFL · Review
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">테스트 리뷰</h1>
        <p className="text-xs text-gray-500">내가 풀었던 테스트를 문항별로 다시 확인합니다.</p>
      </header>

      {/* Reading */}
      <SkillSection
        icon={<BookOpen className="h-4 w-4 text-blue-500" />}
        title="Reading"
        color="blue"
        empty={readingRows.length === 0}
        emptyHref="/updated-reading/study"
        emptyLabel="Reading 연습 시작하기"
      >
        {readingRows.map((r) => (
          <ResultRow
            key={r.id}
            label={r.label}
            meta={`${r.totalQuestions}문항 · ${r.finishedAt ? new Date(r.finishedAt).toLocaleString("ko-KR") : "-"}`}
            href={`/student/review/reading/${r.id}`}
            color="blue"
          />
        ))}
      </SkillSection>

      {/* Speaking */}
      <SkillSection
        icon={<Mic className="h-4 w-4 text-orange-500" />}
        title="Speaking"
        color="orange"
        empty={speakingRows.length === 0}
        emptyHref="/speaking-2026/study"
        emptyLabel="Speaking 연습 시작하기"
      >
        {speakingRows.map((r) => (
          <ResultRow
            key={r.id}
            label={r.label}
            meta={`${r.createdAt ? new Date(r.createdAt).toLocaleString("ko-KR") : "-"}${r.contentScore != null ? ` · 내용 ${r.contentScore}점` : ""}`}
            href={`/student/review/speaking/${r.id}`}
            color="orange"
          />
        ))}
      </SkillSection>

      {/* Listening - 결과 테이블 준비 중 */}
      <SkillSection
        icon={<Headphones className="h-4 w-4 text-violet-500" />}
        title="Listening"
        color="indigo"
        empty
        emptyHref="/updated-listening"
        emptyLabel="Listening 연습 시작하기"
        soon
      >
        {[]}
      </SkillSection>

      {/* Writing */}
      <SkillSection
        icon={<PenLine className="h-4 w-4 text-teal-500" />}
        title="Writing"
        color="teal"
        empty={writingRows.length === 0}
        emptyHref="/updated-writing/test"
        emptyLabel="Writing 연습 시작하기"
      >
        {writingRows.map((r) => (
          <ResultRow
            key={r.id}
            label={r.label}
            meta={r.createdAt ? new Date(r.createdAt).toLocaleString("ko-KR") : "-"}
            href={`/student/review/writing/${r.id}`}
            color="teal"
          />
        ))}
      </SkillSection>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────

const colorMap = {
  blue:   { header: "text-blue-700",   border: "border-blue-100",   bg: "bg-blue-50"   },
  orange: { header: "text-orange-700", border: "border-orange-100", bg: "bg-orange-50" },
  violet: { header: "text-violet-700", border: "border-violet-100", bg: "bg-violet-50" },
  teal:   { header: "text-teal-700",   border: "border-teal-100",   bg: "bg-teal-50"   },
} as const;

type Color = keyof typeof colorMap;

function SkillSection({
  icon, title, color, empty, emptyHref, emptyLabel, soon, children,
}: {
  icon: React.ReactNode;
  title: string;
  color: Color;
  empty: boolean;
  emptyHref: string;
  emptyLabel: string;
  soon?: boolean;
  children: React.ReactNode;
}) {
  const c = colorMap[color];
  return (
    <section className="space-y-2">
      <div className={`flex items-center gap-2 text-sm font-semibold ${c.header}`}>
        {icon}
        {title}
        {soon && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-400">결과 저장 준비 중</span>
        )}
      </div>

      {empty ? (
        <div className={`rounded-xl border border-dashed ${c.border} ${c.bg} p-4 text-xs text-gray-500`}>
          {soon ? (
            <p>Listening/Writing 결과 테이블이 준비되면 여기에 표시됩니다.</p>
          ) : (
            <p>
              아직 기록이 없습니다.{" "}
              <Link href={emptyHref} className="font-semibold text-emerald-700 underline">
                {emptyLabel} →
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className={`overflow-hidden rounded-xl border ${c.border} bg-white shadow-sm`}>
          {children}
        </div>
      )}
    </section>
  );
}

function ResultRow({ label, meta, href, color }: { label: string; meta: string; href: string; color: Color }) {
  const c = colorMap[color];
  return (
    <article className={`flex items-center justify-between gap-3 px-4 py-3 text-xs hover:${c.bg} border-b last:border-0`}>
      <div className="space-y-0.5">
        <div className={`font-semibold ${c.header}`}>{label}</div>
        <div className="text-[11px] text-gray-500">{meta}</div>
      </div>
      <Link
        href={href}
        className={`inline-flex items-center gap-1 rounded-lg border ${c.border} bg-white px-2.5 py-1.5 text-[11px] font-medium ${c.header} hover:${c.bg} shrink-0`}
      >
        리뷰 <ArrowRight className="h-3 w-3" />
      </Link>
    </article>
  );
}
