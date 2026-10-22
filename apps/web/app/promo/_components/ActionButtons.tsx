"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Campaign, Channel } from "@/lib/promo/types";
import { CHANNEL_KINDS, type ChannelKind } from "@/lib/promo/constants";
import { fmtShort, todayKST } from "@/lib/promo/dates";
import { Modal, useToast } from "./client-ui";
import { btn, btnChalk, btnPri, btnSm, inputCls, labelCls } from "./ui";

/** 다음 7일 자동 콘텐츠 생성 버튼 */
export function AutogenButton({ disabled, label = "지금 생성" }: { disabled?: boolean; label?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className={btnChalk}
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          toast.show("콘텐츠를 만들고 있어요. 1~2분 걸려요.");
          try {
            const res = await fetch("/api/promo/autogen", { method: "POST" });
            const j = await res.json();
            toast.show(j.ok ? j.message : j.error);
            if (j.ok) router.refresh();
          } catch {
            toast.show("연결이 끊겼어요. 다시 시도해주세요.");
          }
          setBusy(false);
        }}
      >
        {busy ? "만드는 중…" : label}
      </button>
      {toast.node}
    </>
  );
}

/** 본사 캠페인 → 내 학원용 게시물 만들기 */
export function CampaignCard({ campaign, channels }: { campaign: Campaign; channels: Channel[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const fits = channels.filter((c) => c.active && (!campaign.channel_kinds.length || campaign.channel_kinds.includes(c.kind)));
  const [channelId, setChannelId] = useState(fits[0]?.id ?? channels[0]?.id ?? "");
  const start = campaign.starts_on && campaign.starts_on > todayKST() ? campaign.starts_on : todayKST();
  const [date, setDate] = useState(start);
  const [busy, setBusy] = useState(false);

  return (
    <li className="flex flex-wrap items-start gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-900">{campaign.title}</div>
        <div className="text-[13px] text-slate-500">
          {campaign.starts_on ? fmtShort(campaign.starts_on) : ""}
          {campaign.ends_on ? ` ~ ${fmtShort(campaign.ends_on)}` : ""}
          {campaign.summary ? ` · ${campaign.summary}` : ""}
        </div>
        {campaign.channel_kinds.length > 0 && (
          <div className="mt-0.5 text-xs text-slate-400">
            추천 채널: {campaign.channel_kinds.map((k) => CHANNEL_KINDS[k as ChannelKind]?.label ?? k).join(", ")}
          </div>
        )}
      </div>
      <button className={`${btn} ${btnSm}`} disabled={!channels.length} onClick={() => setOpen(true)}>
        내 학원용으로 만들기
      </button>
      {open && (
        <Modal title={campaign.title} onClose={() => setOpen(false)}>
          <p className="text-sm text-slate-600">본사 캠페인 문구를 우리 학원 정보와 학습 데이터에 맞춰 고쳐 쓰고 캘린더에 넣어요.</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className={labelCls}>
              채널
              <select id="ca_channel" className={inputCls} value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              게시 날짜
              <input id="ca_date" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              className={btnPri}
              disabled={busy || !channelId}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await fetch("/api/promo/campaign-adapt", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ campaignId: campaign.id, channelId, date }),
                  });
                  const j = await res.json();
                  if (!j.ok) toast.show(j.error);
                  else {
                    toast.show("캘린더에 넣었어요.");
                    setOpen(false);
                    router.refresh();
                  }
                } catch {
                  toast.show("연결이 끊겼어요. 다시 시도해주세요.");
                }
                setBusy(false);
              }}
            >
              {busy ? "작성 중… (30초 정도)" : "만들어서 캘린더에 넣기"}
            </button>
          </div>
        </Modal>
      )}
      {toast.node}
    </li>
  );
}
