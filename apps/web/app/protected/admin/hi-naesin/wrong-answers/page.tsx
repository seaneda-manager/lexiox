import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import WrongAnswerCard, { type WrongAnswerRow } from "@/components/admin/hi-naesin/WrongAnswerCard";

export const dynamic = "force-dynamic";

const REVALIDATE_PATH = "/admin/hi-naesin/wrong-answers";

export default async function HiNaesinWrongAnswersPage() {
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

  const wrongAnswers: WrongAnswerRow[] = rows.flatMap((r) => {
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
      studentName: session?.student_id ? studentNameById.get(session.student_id) : undefined,
    }];
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="space-y-2">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">🔴 Hi-내신 오답 검토</h1>
        <p className="text-sm text-gray-600">
          확인하지 않은 오답 {wrongAnswers.length}건. 확인하면 목록에서 사라집니다.
        </p>
      </div>

      {wrongAnswers.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-gray-50 p-12 text-center">
          <p className="text-gray-500">확인 대기 중인 오답이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {wrongAnswers.map((row) => (
            <WrongAnswerCard key={row.id} row={row} revalidateTargetPath={REVALIDATE_PATH} />
          ))}
        </div>
      )}
    </main>
  );
}
