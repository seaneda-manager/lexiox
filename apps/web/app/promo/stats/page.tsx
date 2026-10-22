import Link from "next/link";
import { addMonths, monthStart, todayKST } from "@/lib/promo/dates";
import { computeStats, RANGE_LABEL, type StatsRange } from "@/lib/promo/stats";
import type { Post, Snapshot } from "@/lib/promo/types";
import { loadBase, loadLeads } from "../_data";
import { LearningCard } from "../_components/LearningCard";
import { Bars, Kpis, PageHead, Panel, btn, btnSm } from "../_components/ui";
import { InsightClient } from "./InsightClient";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ r?: string }> | { r?: string } }) {
  const sp = await searchParams;
  const range: StatsRange = sp.r === "3m" || sp.r === "all" ? sp.r : "month";
  const { ctx, channels } = await loadBase();
  const db = ctx.supabase;
  const thisMonth = monthStart(todayKST());
  const [leads, { data: posts }, { data: snaps }] = await Promise.all([
    loadLeads(ctx.org.id, db),
    db.from("promo_posts").select("*").eq("org_id", ctx.org.id).eq("status", "posted"),
    db
      .from("promo_learning_snapshots")
      .select("*")
      .eq("org_id", ctx.org.id)
      .gte("period_month", addMonths(thisMonth, -5))
      .order("period_month"),
  ]);
  const s = computeStats(leads, (posts ?? []) as Post[], channels, range);
  const snapshots = (snaps ?? []) as Snapshot[];
  const cur = snapshots.find((x) => x.period_month === thisMonth) ?? null;
  const prev = snapshots.find((x) => x.period_month === addMonths(thisMonth, -1)) ?? null;

  return (
    <>
      <PageHead
        title="성과 대시보드"
        desc="어떤 채널에서 문의가 오고, 얼마나 등록으로 이어지는지 봐요."
        right={
          <div className="flex gap-1.5">
            {(Object.keys(RANGE_LABEL) as StatsRange[]).map((k) => (
              <Link key={k} href={`/promo/stats?r=${k}`} className={`${btn} ${btnSm} ${range === k ? "!border-emerald-800 !bg-emerald-800 !text-white" : ""}`}>
                {RANGE_LABEL[k]}
              </Link>
            ))}
          </div>
        }
      />
      <Kpis
        items={[
          { label: "문의", value: s.leads, unit: "건" },
          { label: "등록", value: s.enrolled, unit: "명" },
          { label: "전환율", value: s.conversion, unit: "%" },
          { label: "게시 완료", value: s.posted, unit: "건" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="상담 단계별 흐름">
          <Bars rows={s.funnel} />
          <p className="mt-2 text-xs text-slate-500">각 단계 이상 진행한 문의 수예요. 보류는 제외했어요.</p>
        </Panel>
        <Panel title="유입 경로별 성과">
          {s.sources.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-slate-500">
                    <th className="py-2 pr-2 font-semibold">경로</th>
                    <th className="py-2 text-right font-semibold">문의</th>
                    <th className="py-2 text-right font-semibold">등록</th>
                    <th className="py-2 text-right font-semibold">전환율</th>
                  </tr>
                </thead>
                <tbody>
                  {s.sources.map((r) => (
                    <tr key={r.name} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-2">{r.name}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{r.leads}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{r.enrolled}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{r.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-3 text-sm text-slate-500">이 기간 문의가 없어요.</p>
          )}
        </Panel>
        <Panel title="채널별 게시 수">
          {s.postsByChannel.length ? <Bars rows={s.postsByChannel} /> : <p className="py-3 text-sm text-slate-500">이 기간 게시 완료로 표시한 게시물이 없어요.</p>}
        </Panel>
        <Panel title="학년별 문의">
          {s.byGrade.length ? <Bars rows={s.byGrade} /> : <p className="py-3 text-sm text-slate-500">이 기간 문의가 없어요.</p>}
        </Panel>
      </div>

      <LearningCard snapshot={cur} prev={prev} />
      {snapshots.length > 1 && (
        <Panel title="월별 학습 추이">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="py-2 pr-3 font-semibold">월</th>
                  <th className="py-2 text-right font-semibold">재원생</th>
                  <th className="py-2 text-right font-semibold">어휘 정답률</th>
                  <th className="py-2 text-right font-semibold">완료 세트</th>
                  <th className="py-2 text-right font-semibold">과제 제출</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((x) => (
                  <tr key={x.period_month} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 font-mono">{x.period_month.slice(0, 7)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{x.metrics.students.active}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{x.metrics.vocab.accuracy ?? "-"}{x.metrics.vocab.accuracy != null ? "%" : ""}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{x.metrics.vocab.setsCompleted}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{x.metrics.homework.submissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <InsightClient range={range} />
    </>
  );
}
