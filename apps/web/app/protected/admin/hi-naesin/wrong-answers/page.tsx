import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import WrongAnswerCard, { type WrongAnswerRow } from "@/components/admin/hi-naesin/WrongAnswerCard";

export const dynamic = "force-dynamic";

const REVALIDATE_PATH = "/admin/hi-naesin/wrong-answers";

const DRILL_TYPE_LABEL: Record<string, string> = {
  vocab: "어휘",
  identify_categorize: "구문 식별",
  translation: "번역",
  translation_arrange: "번역 순서 배열",
  fill_blank: "빈칸 채우기",
  writing: "작문",
  writing_arrange: "작문 순서 배열",
  grammar_choice: "문법 선택",
};

// created_at(timestamptz)의 로컬 날짜(YYYY-MM-DD)만 뽑는다. Intl 안 쓰고 직접 포맷 —
// toLocaleDateString은 서버(Node ICU)/브라우저 로케일 데이터가 달라 하이드레이션 에러를 낼 수 있다.
function dateKeyOf(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateHeader(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
}

type SP = Promise<{ date?: string; student?: string }>;

export default async function HiNaesinWrongAnswersPage({ searchParams }: { searchParams: SP }) {
  const { date: selectedDate, student: selectedStudent } = await searchParams;

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = getServiceSupabase();

  // 아직 선생님이 "확인함"을 누르지 않은 Hi-내신 오답만 최신순으로 모은다.
  const { data: wrongAnswerRows } = await service
    .from("hi_naesin_drill_responses")
    .select("id, drill_id, session_id, response_text, response_choice, score_pct, feedback_text, created_at")
    .eq("is_correct", false)
    .is("reviewed_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = wrongAnswerRows ?? [];
  const sessionIds = [...new Set(rows.map((r) => r.session_id).filter(Boolean))];
  const drillIds = [...new Set(rows.map((r) => r.drill_id).filter(Boolean))];

  const { data: sessions } =
    sessionIds.length > 0
      ? await service.from("hi_naesin_sessions").select("id, student_id, passage_id").in("id", sessionIds)
      : { data: [] as { id: string; student_id: string; passage_id: string | null }[] };
  const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]));

  const studentIds = [...new Set((sessions ?? []).map((s) => s.student_id).filter(Boolean))];
  const passageIds = [...new Set((sessions ?? []).map((s) => s.passage_id).filter(Boolean))];

  const { data: profiles } =
    studentIds.length > 0
      ? await service.from("profiles").select("id, full_name, name, email").in("id", studentIds)
      : { data: [] as { id: string; full_name: string | null; name: string | null; email: string | null }[] };
  const studentNameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name || p.name || p.email || "이름 미설정"])
  );

  const { data: passages } =
    passageIds.length > 0
      ? await service.from("hi_naesin_passages").select("id, title").in("id", passageIds)
      : { data: [] as { id: string; title: string | null }[] };
  const passageTitleById = new Map((passages ?? []).map((p) => [p.id, p.title]));

  const { data: drills } =
    drillIds.length > 0
      ? await service.from("hi_naesin_drills").select("id, drill_type, payload").in("id", drillIds)
      : { data: [] as { id: string; drill_type: string; payload: Record<string, unknown> }[] };
  const drillById = new Map((drills ?? []).map((d) => [d.id, d]));

  const wrongAnswers: (WrongAnswerRow & { dateKey: string })[] = rows.flatMap((r) => {
    const drill = drillById.get(r.drill_id);
    const session = sessionById.get(r.session_id);
    if (!drill) return [];
    return [{
      id: r.id,
      response_text: r.response_text,
      response_choice: r.response_choice,
      score_pct: r.score_pct,
      feedback_text: r.feedback_text,
      created_at: r.created_at,
      drillType: drill.drill_type,
      payload: drill.payload,
      passageTitle: (session?.passage_id && passageTitleById.get(session.passage_id)) || null,
      studentId: session?.student_id ?? undefined,
      studentName: session?.student_id ? studentNameById.get(session.student_id) : undefined,
      dateKey: dateKeyOf(r.created_at),
    }];
  });

  // ── 상세 뷰: 특정 날짜 + 학생의 오답을 task(문항 유형)별로 ──
  if (selectedDate && selectedStudent) {
    const items = wrongAnswers.filter((r) => r.dateKey === selectedDate && (r.studentId ?? "unknown") === selectedStudent);
    const studentName = items[0]?.studentName ?? studentNameById.get(selectedStudent) ?? "학생 미확인";

    const byTask = new Map<string, WrongAnswerRow[]>();
    for (const item of items) {
      const list = byTask.get(item.drillType) ?? [];
      list.push(item);
      byTask.set(item.drillType, list);
    }

    return (
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div className="space-y-2">
          <Link
            href="/admin/hi-naesin/wrong-answers"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            목록으로
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{studentName} · {formatDateHeader(selectedDate)}</h1>
          <p className="text-sm text-gray-600">오답 {items.length}건, task별로 정리했습니다.</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-gray-50 p-12 text-center">
            <p className="text-gray-500">확인 대기 중인 오답이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {[...byTask.entries()].map(([drillType, taskItems]) => (
              <section key={drillType} className="space-y-2">
                <h2 className="text-sm font-bold text-gray-900">
                  {DRILL_TYPE_LABEL[drillType] ?? drillType}
                  <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                    {taskItems.length}건
                  </span>
                </h2>
                <div className="space-y-2">
                  {taskItems.map((row) => (
                    <WrongAnswerCard key={row.id} row={row} revalidateTargetPath={REVALIDATE_PATH} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ── 목록 뷰: 날짜별로 묶고, 그 안에 학생 카드 (클릭하면 위 상세 뷰로) ──
  const byDate = new Map<string, Map<string, { name: string; count: number }>>();
  for (const row of wrongAnswers) {
    const studentKey = row.studentId ?? "unknown";
    const studentGroup = byDate.get(row.dateKey) ?? new Map<string, { name: string; count: number }>();
    const existing = studentGroup.get(studentKey) ?? { name: row.studentName ?? "학생 미확인", count: 0 };
    existing.count += 1;
    studentGroup.set(studentKey, existing);
    byDate.set(row.dateKey, studentGroup);
  }
  const dateGroups = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="space-y-2">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">🔴 Hi-내신 오답 검토</h1>
        <p className="text-sm text-gray-600">
          확인하지 않은 오답 {wrongAnswers.length}건. 학생 카드를 누르면 그 날짜의 오답을 task별로 볼 수 있습니다.
        </p>
      </div>

      {dateGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-gray-50 p-12 text-center">
          <p className="text-gray-500">확인 대기 중인 오답이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateGroups.map(([dateKey, studentGroup]) => (
            <section key={dateKey} className="space-y-2">
              <h2 className="text-sm font-bold text-gray-900">{formatDateHeader(dateKey)}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[...studentGroup.entries()].map(([studentKey, info]) => (
                  <Link
                    key={studentKey}
                    href={`/admin/hi-naesin/wrong-answers?date=${dateKey}&student=${studentKey}`}
                    className="flex items-center justify-between rounded-lg border border-rose-100 bg-white px-3 py-2.5 shadow-sm hover:border-rose-300"
                  >
                    <span className="truncate text-sm font-medium text-gray-900">{info.name}</span>
                    <span className="flex-shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                      {info.count}건
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
