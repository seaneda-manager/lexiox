"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CHANNEL_KINDS, CHANNEL_KIND_LIST, SEASONS } from "@/lib/promo/constants";
import type { Campaign } from "@/lib/promo/types";
import { deleteCampaign, saveCampaign } from "../actions";

const input = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none";
const label = "grid gap-1 text-xs font-semibold text-slate-500";
const STATUS = { draft: ["작성 중", "bg-slate-100 text-slate-600"], published: ["배포 중", "bg-emerald-100 text-emerald-800"], archived: ["종료", "bg-slate-100 text-slate-400"] } as const;

export function CampaignsClient({ campaigns, usage }: { campaigns: Campaign[]; usage: Record<string, { branches: number; posted: number }> }) {
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const month = new Date().getMonth() + 1;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-950 px-4 py-3 text-sm text-emerald-50">
        <span>
          <b className="text-amber-300">다음 시즌 ({(month % 12) + 1}월)</b> · {SEASONS[(month % 12) + 1]}
        </span>
        <button className="rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-amber-950" onClick={() => setEditing("new")}>
          + 캠페인 만들기
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <ul className="divide-y">
          {campaigns.map((c) => (
            <li key={c.id}>
              <button className="flex w-full flex-wrap items-start gap-3 px-5 py-3 text-left hover:bg-slate-50" onClick={() => setEditing(c)}>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{c.title}</span>
                  <span className="block text-xs text-slate-500">
                    {c.starts_on ?? "?"} ~ {c.ends_on ?? "?"}
                    {c.summary ? ` · ${c.summary}` : ""}
                  </span>
                </span>
                <span className="text-xs text-slate-500">
                  사용 가맹점 {usage[c.id]?.branches ?? 0} · 게시 {usage[c.id]?.posted ?? 0}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[c.status][1]}`}>{STATUS[c.status][0]}</span>
              </button>
            </li>
          ))}
          {campaigns.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">아직 캠페인이 없어요. 시즌에 맞춰 첫 캠페인을 만들어 가맹점에 배포해보세요.</li>}
        </ul>
      </div>

      {editing && <CampaignEditor campaign={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function CampaignEditor({ campaign, onClose }: { campaign: Campaign | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [f, setF] = useState({
    title: campaign?.title ?? "",
    summary: campaign?.summary ?? "",
    starts_on: campaign?.starts_on ?? "",
    ends_on: campaign?.ends_on ?? "",
    channel_kinds: campaign?.channel_kinds ?? ["blog", "insta"],
    brief: campaign?.brief ?? "",
    template_title: campaign?.template_title ?? "",
    template_body: campaign?.template_body ?? "",
    status: campaign?.status ?? "draft",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = (status: Campaign["status"]) =>
    start(async () => {
      const r = await saveCampaign({ id: campaign?.id ?? null, ...f, status });
      if (!r.ok) return setErr(r.error ?? "저장하지 못했어요.");
      router.refresh();
      onClose();
    });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-3 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="grid max-h-full w-full max-w-2xl gap-3 overflow-auto rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">{campaign ? "캠페인 수정" : "새 캠페인"}</h3>
          <button className="text-sm text-slate-500" onClick={onClose}>닫기</button>
        </div>
        <label className={label}>캠페인 이름<input id="cp_title" className={input} placeholder="예) 2026 겨울방학 어휘 집중 특강" value={f.title} onChange={set("title")} /></label>
        <label className={label}>한 줄 요약 (가맹점에 보임)<input id="cp_sum" className={input} value={f.summary} onChange={set("summary")} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>시작일<input id="cp_start" type="date" className={input} value={f.starts_on} onChange={set("starts_on")} /></label>
          <label className={label}>종료일<input id="cp_end" type="date" className={input} value={f.ends_on} onChange={set("ends_on")} /></label>
        </div>
        <div className={label}>
          추천 채널
          <div className="flex flex-wrap gap-1.5">
            {CHANNEL_KIND_LIST.map((k) => {
              const on = f.channel_kinds.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setF({ ...f, channel_kinds: on ? f.channel_kinds.filter((x) => x !== k) : [...f.channel_kinds, k] })}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${on ? "border-emerald-900 bg-emerald-900 text-white" : "border-slate-200 text-slate-600"}`}
                >
                  {CHANNEL_KINDS[k].label}
                </button>
              );
            })}
          </div>
        </div>
        <label className={label}>
          AI 지침 (핵심 메시지, 혜택, 꼭 넣을 문구)
          <textarea id="cp_brief" className={`${input} min-h-[100px]`} placeholder="예) 4주 완성, 하루 30분 어휘 트레이닝, 첫 주 무료 진단. '선착순'은 쓰지 말 것." value={f.brief} onChange={set("brief")} />
        </label>
        <label className={label}>템플릿 제목 (선택)<input id="cp_tt" className={input} value={f.template_title} onChange={set("template_title")} /></label>
        <label className={label}>
          템플릿 본문 (선택 · 가맹점별로 학원명·지역·연락처가 채워져요)
          <textarea id="cp_tb" className={`${input} min-h-[140px]`} value={f.template_body} onChange={set("template_body")} />
        </label>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {campaign ? (
            <button
              className="text-sm text-rose-600"
              onClick={() =>
                armed
                  ? start(async () => {
                      await deleteCampaign(campaign.id);
                      router.refresh();
                      onClose();
                    })
                  : setArmed(true)
              }
            >
              {armed ? "한 번 더 누르면 삭제" : "삭제"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {campaign?.status === "published" && (
              <button className="rounded-lg border px-3 py-2 text-sm font-semibold" disabled={pending} onClick={() => submit("archived")}>종료</button>
            )}
            <button className="rounded-lg border px-3 py-2 text-sm font-semibold" disabled={pending || !f.title} onClick={() => submit("draft")}>임시 저장</button>
            <button className="rounded-lg bg-emerald-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={pending || !f.title} onClick={() => submit("published")}>
              {campaign?.status === "published" ? "저장" : "가맹점에 배포"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
