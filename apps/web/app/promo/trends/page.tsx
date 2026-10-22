import Link from "next/link";
import { CHANNEL_KINDS, type ChannelKind } from "@/lib/promo/constants";
import { fmtShort } from "@/lib/promo/dates";
import type { TrendReport } from "@/lib/promo/types";
import { requirePromoOrg } from "@/lib/promo/context";
import { PageHead, Panel, btn, btnSm } from "../_components/ui";
import { TrendRunButton } from "./TrendRunButton";

export default async function TrendsPage() {
  const ctx = await requirePromoOrg();
  const { data } = await ctx.supabase
    .from("promo_trend_reports")
    .select("*")
    .eq("org_id", ctx.org.id)
    .order("created_at", { ascending: false })
    .limit(6);
  const reports = (data ?? []) as TrendReport[];
  const r = reports[0];
  const groups = r?.trend_data?.groups ?? [];
  const max = Math.max(1, ...groups.flatMap((g) => g.series));

  return (
    <>
      <PageHead
        title="트렌드 분석"
        desc="매주 월요일 새벽, 네이버 검색 추이와 시즌, Lexiox 학습 데이터를 보고 2주 콘텐츠 플랜을 짜서 컨펌 대기로 넣어둬요."
        right={<TrendRunButton />}
      />
      {!r ? (
        <Panel>
          <p className="text-sm text-slate-500">
            아직 분석 리포트가 없어요. &lsquo;지금 분석&rsquo;을 누르거나 월요일까지 기다려주세요. 학원 정보 탭에서 관심 검색어를 추가하면 함께 봐요.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title={`${fmtShort(r.period_start)} 분석`} right={<span className="text-xs text-slate-400">게시물 초안 {r.posts_created}건</span>}>
            {r.summary && <p className="max-w-3xl text-[15px] leading-relaxed text-slate-800">{r.summary}</p>}
            {r.insights.length > 0 && (
              <ul className="mt-3 grid gap-1.5 text-sm text-slate-700">
                {r.insights.map((x, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-emerald-700" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="네이버 검색 추이 (최근 12주, 상대 지수)">
              {groups.length ? (
                <div className="grid gap-3">
                  {groups.map((g) => (
                    <div key={g.name} className="grid grid-cols-[110px_1fr_56px] items-end gap-2">
                      <span className="truncate text-[13px] text-slate-700" title={g.name}>{g.name}</span>
                      <span className="flex h-8 items-end gap-[2px]" aria-label={`${g.name} 추이`}>
                        {g.series.map((v, i) => (
                          <span
                            key={i}
                            className={`flex-1 rounded-sm ${i >= g.series.length - 4 ? "bg-emerald-700" : "bg-slate-300"}`}
                            style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
                          />
                        ))}
                      </span>
                      <span className={`text-right font-mono text-[13px] tabular-nums ${g.change == null ? "text-slate-400" : g.change >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        {g.change == null ? "-" : `${g.change >= 0 ? "+" : ""}${g.change}%`}
                      </span>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">진한 막대가 최근 4주. 오른쪽 숫자는 그 전 4주 대비 변화예요. 실제 검색 횟수가 아닌 상대 지수예요.</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">검색 추이를 가져오지 못했어요{r.trend_data?.error ? ` (${r.trend_data.error})` : ""}. 시즌과 학습 데이터만으로 플랜을 짰어요.</p>
              )}
            </Panel>

            <Panel title="2주 콘텐츠 플랜" right={<Link href="/promo/review" className={`${btn} ${btnSm}`}>컨펌하러 가기</Link>}>
              {r.plan.length ? (
                <ul className="divide-y divide-slate-100 text-sm">
                  {r.plan.map((p, i) => (
                    <li key={i} className="py-2">
                      <div className="font-semibold">{p.topic}</div>
                      <div className="text-[13px] text-slate-500">
                        {fmtShort(p.date)} · {CHANNEL_KINDS[p.kind as ChannelKind]?.label ?? p.kind}
                        {p.angle ? ` · ${p.angle}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">플랜 항목이 없어요.</p>
              )}
            </Panel>
          </div>

          {reports.length > 1 && (
            <Panel title="지난 리포트">
              <ul className="divide-y divide-slate-100 text-sm">
                {reports.slice(1).map((x) => (
                  <li key={x.id} className="py-2">
                    <span className="font-mono text-[13px] text-slate-500">{x.period_start}</span> · {x.summary?.slice(0, 90) ?? ""}
                    {(x.summary?.length ?? 0) > 90 ? "…" : ""}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
