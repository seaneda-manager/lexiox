import type { ReactNode } from "react";
import Link from "next/link";
import { SEASONS, stageLabel, stageTone } from "@/lib/promo/constants";
import { loadOrgBundle } from "@/lib/promo/data";
import { addDays, fmtShort, monthOf, monthStart, todayKST } from "@/lib/promo/dates";
import { loadAutomations, loadBase, loadLeads, loadPosts } from "./_data";
import { AutogenButton, CampaignCard } from "./_components/ActionButtons";
import { LearningCard } from "./_components/LearningCard";
import { PostList } from "./_components/PostEditor";
import { Kpis, Panel, Pill, btn, btnSm } from "./_components/ui";

export default async function PromoToday() {
  const { ctx, channels } = await loadBase();
  const db = ctx.supabase;
  const today = todayKST();
  const [posts, leads, autos, bundle, pendingRes, failedRes] = await Promise.all([
    loadPosts(ctx.org.id, db, addDays(today, -14), addDays(today, 7)),
    loadLeads(ctx.org.id, db),
    loadAutomations(ctx.org.id, db),
    loadOrgBundle(db, ctx.org),
    db.from("promo_posts").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id).eq("status", "pending"),
    db.from("promo_posts").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id).eq("status", "failed"),
  ]);
  const pendingCount = pendingRes.count ?? 0;
  const failedCount = failedRes.count ?? 0;

  const m0 = monthStart(today);
  const monthLeads = leads.filter((l) => l.inquired_on >= m0);
  const enrolled = monthLeads.filter((l) => l.stage === "enrolled").length;
  const due = posts.filter((p) => p.status === "scheduled" && p.scheduled_on <= today);
  const week = posts.filter((p) => p.status === "scheduled" && p.scheduled_on > today);
  const follow = leads
    .filter((l) => l.stage === "inquiry" || l.stage === "booked")
    .sort((a, b) => (a.next_contact_on ?? a.inquired_on).localeCompare(b.next_contact_on ?? b.inquired_on))
    .slice(0, 6);
  const activeAutos = autos.filter((a) => a.active);
  const autoNext = posts.filter((p) => p.source === "auto" && p.scheduled_on >= today).length;
  const month = monthOf(today);

  return (
    <>
      {!bundle.profile ? (
        <Banner title="학원 정보를 먼저 입력해주세요." desc="모든 홍보 문구가 이 정보를 바탕으로 만들어져요.">
          <Link href="/promo/settings" className={btn}>학원 정보 입력</Link>
        </Banner>
      ) : !channels.length ? (
        <Banner title="운영 중인 홍보 채널을 등록해주세요." desc="블로그, 인스타그램, 카카오톡 채널 등을 등록하면 채널별로 일정이 관리돼요.">
          <Link href="/promo/channels" className={btn}>채널 등록</Link>
        </Banner>
      ) : activeAutos.length > 0 && autoNext === 0 ? (
        <Banner title="다음 7일 자동 콘텐츠가 아직 없어요." desc={`켜져 있는 자동 일정 ${activeAutos.length}개에 맞춰 한 번에 만들어요. 매일 새벽에도 자동으로 채워져요.`}>
          <AutogenButton />
        </Banner>
      ) : null}

      {(pendingCount > 0 || failedCount > 0) && (
        <Banner
          title={[pendingCount ? `컨펌 대기 ${pendingCount}건` : "", failedCount ? `업로드 실패 ${failedCount}건` : ""].filter(Boolean).join(" · ")}
          desc="승인한 글만 예약 시간에 올라가요. 실패한 글은 내용을 확인하고 다시 올려주세요."
        >
          <Link href="/promo/review" className={btn}>컨펌하러 가기</Link>
        </Banner>
      )}

      <Kpis
        items={[
          { label: "이번 달 문의", value: monthLeads.length, unit: "건" },
          { label: "이번 달 등록", value: enrolled, unit: "명" },
          { label: "등록 전환율", value: monthLeads.length ? Math.round((enrolled / monthLeads.length) * 100) : 0, unit: "%" },
          { label: "7일 내 게시 예정", value: due.length + week.length, unit: "건" },
        ]}
      />

      <div className="rounded-xl bg-emerald-950 px-4 py-3 text-sm text-emerald-50">
        <b className="text-amber-300">{month}월 시즌</b> · {SEASONS[month]}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="오늘 올릴 콘텐츠" right={<Pill tone={due.length ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>{due.length}건</Pill>}>
          <PostList posts={due} channels={channels} empty="오늘 올릴 게시물이 없어요." />
          {week.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 text-sm font-bold text-slate-700">이번 주 예정</h3>
              <PostList posts={week.slice(0, 6)} channels={channels} />
            </>
          )}
        </Panel>

        <Panel title="연락할 상담" right={<Link href="/promo/leads?new=1" className={`${btn} ${btnSm}`}>+ 문의 등록</Link>}>
          {follow.length ? (
            <ul className="divide-y divide-slate-100">
              {follow.map((l) => (
                <li key={l.id}>
                  <Link href={`/promo/leads?lead=${l.id}`} className="flex items-start gap-3 py-2.5 hover:bg-slate-50">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {l.student_name} <span className="text-[13px] font-normal text-slate-500">{l.grade}</span>
                      </span>
                      <span className="block text-[13px] text-slate-500">
                        {l.next_contact_on ? `다음 연락 ${fmtShort(l.next_contact_on)}` : `문의 ${fmtShort(l.inquired_on)}`}
                        {l.parent_phone ? ` · ${l.parent_phone}` : ""}
                      </span>
                    </span>
                    <Pill tone={stageTone(l.stage)}>{stageLabel(l.stage)}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 text-sm text-slate-500">대기 중인 상담이 없어요.</p>
          )}
        </Panel>
      </div>

      {bundle.campaigns.length > 0 && (
        <Panel title="본사 진행 캠페인">
          <ul className="divide-y divide-slate-100">
            {bundle.campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} channels={channels} />
            ))}
          </ul>
        </Panel>
      )}

      <LearningCard snapshot={bundle.snapshot} prev={bundle.prevSnapshot} />
    </>
  );
}

function Banner({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4">
      <div className="min-w-[200px] flex-1">
        <div className="font-bold text-slate-900">{title}</div>
        <div className="text-[13px] text-slate-600">{desc}</div>
      </div>
      {children}
    </div>
  );
}
