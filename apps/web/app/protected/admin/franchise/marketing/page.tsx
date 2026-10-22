import { getServiceSupabase } from "@/lib/supabase/service";
import { monthStart, todayKST } from "@/lib/promo/dates";
import type { LearningMetrics } from "@/lib/promo/types";
import { HqNav } from "./_nav";
import { OpenAsBranch } from "./OpenAsBranch";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  name: string;
  members: number;
  posted: number;
  scheduled: number;
  pending: number;
  failed: number;
  leads: number;
  enrolled: number;
  students: number | null;
  vocabAcc: number | null;
  channels: number;
  autoChannels: number;
};

// 본사: 가맹점별 이번 달 홍보 활동과 성과 비교 (관리자 레이아웃이 권한 확인)
export default async function HqMarketingOverview() {
  const svc = getServiceSupabase();
  const m0 = monthStart(todayKST());
  const [{ data: orgs }, { data: posts }, { data: leads }, { data: snaps }, { data: members }, { data: chans }] = await Promise.all([
    svc.from("organizations").select("id, name").eq("kind", "branch").order("name"),
    svc.from("promo_posts").select("org_id, status").gte("scheduled_on", m0),
    svc.from("promo_leads").select("org_id, stage").gte("inquired_on", m0),
    svc.from("promo_learning_snapshots").select("org_id, metrics").eq("period_month", m0),
    svc.from("memberships").select("org_id").in("role", ["owner", "manager"]),
    svc.from("promo_channels").select("org_id, connection_id, target").eq("active", true),
  ]);

  const rows: Row[] = (orgs ?? []).map((o) => {
    const ps = (posts ?? []).filter((p) => p.org_id === o.id);
    const ls = (leads ?? []).filter((l) => l.org_id === o.id);
    const snap = (snaps ?? []).find((s) => s.org_id === o.id)?.metrics as LearningMetrics | undefined;
    const cs = (chans ?? []).filter((c) => c.org_id === o.id);
    return {
      id: o.id as string,
      name: o.name as string,
      members: (members ?? []).filter((x) => x.org_id === o.id).length,
      posted: ps.filter((p) => p.status === "posted").length,
      scheduled: ps.filter((p) => p.status === "scheduled").length,
      pending: ps.filter((p) => p.status === "pending").length,
      failed: ps.filter((p) => p.status === "failed").length,
      leads: ls.length,
      enrolled: ls.filter((l) => l.stage === "enrolled").length,
      students: snap?.students.active ?? null,
      vocabAcc: snap?.vocab.accuracy ?? null,
      channels: cs.length,
      autoChannels: cs.filter((c) => c.connection_id && c.target).length,
    };
  });

  const total = rows.reduce(
    (a, r) => ({ posted: a.posted + r.posted, leads: a.leads + r.leads, enrolled: a.enrolled + r.enrolled, pending: a.pending + r.pending }),
    { posted: 0, leads: 0, enrolled: 0, pending: 0 }
  );

  return (
    <div className="space-y-6">
      <HqNav active="/admin/franchise/marketing" />

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["가맹점", `${rows.length}곳`],
          ["이번 달 게시", `${total.posted}건`],
          ["이번 달 문의 → 등록", `${total.leads} → ${total.enrolled}`],
          ["전체 컨펌 대기", `${total.pending}건`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{l}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs text-slate-500">
              <th className="px-4 py-2.5 font-semibold">가맹점</th>
              <th className="px-3 py-2.5 text-right font-semibold">채널(자동)</th>
              <th className="px-3 py-2.5 text-right font-semibold">게시</th>
              <th className="px-3 py-2.5 text-right font-semibold">예약</th>
              <th className="px-3 py-2.5 text-right font-semibold">컨펌 대기</th>
              <th className="px-3 py-2.5 text-right font-semibold">실패</th>
              <th className="px-3 py-2.5 text-right font-semibold">문의</th>
              <th className="px-3 py-2.5 text-right font-semibold">등록</th>
              <th className="px-3 py-2.5 text-right font-semibold">재원생</th>
              <th className="px-3 py-2.5 text-right font-semibold">어휘 정답률</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-slate-500">
                  아직 가맹점이 없어요. &lsquo;가맹점·원장 관리&rsquo;에서 첫 가맹점을 만들어주세요.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-4 py-2.5">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-slate-400">{r.members ? `운영자 ${r.members}명` : "운영자 미연결"}</div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.channels} ({r.autoChannels})</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.posted}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.scheduled}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${r.pending ? "font-semibold text-violet-700" : ""}`}>{r.pending}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${r.failed ? "font-semibold text-rose-600" : ""}`}>{r.failed}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.leads}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.enrolled}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.students ?? "-"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{r.vocabAcc == null ? "-" : `${r.vocabAcc}%`}</td>
                <td className="px-3 py-2.5 text-right">
                  <OpenAsBranch orgId={r.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">게시·예약·컨펌 수는 이번 달 게시일 기준, 재원생·정답률은 매일 새벽 집계한 Lexiox 학습 통계예요.</p>
    </div>
  );
}
