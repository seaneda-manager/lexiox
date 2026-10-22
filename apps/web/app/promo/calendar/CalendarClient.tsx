"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CHANNEL_COLORS, WEEKDAYS } from "@/lib/promo/constants";
import { addDays, fmtShort } from "@/lib/promo/dates";
import type { Channel, Post } from "@/lib/promo/types";
import { PostEditor, PostList } from "../_components/PostEditor";
import { Panel, btn, btnPri, btnSm } from "../_components/ui";

export function CalendarClient(props: {
  month: string;
  prev: string;
  next: string;
  gridStart: string;
  gridEnd: string;
  today: string;
  season: string;
  posts: Post[];
  channels: Channel[];
}) {
  const { month, today, posts, channels } = props;
  const inMonth = today.slice(0, 7) === month.slice(0, 7);
  const [sel, setSel] = useState(inMonth ? today : month);
  const [creating, setCreating] = useState(false);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = props.gridStart; d <= props.gridEnd; d = addDays(d, 1)) out.push(d);
    return out;
  }, [props.gridStart, props.gridEnd]);
  const byDate = useMemo(() => {
    const m = new Map<string, Post[]>();
    posts.forEach((p) => m.set(p.scheduled_on, [...(m.get(p.scheduled_on) ?? []), p]));
    return m;
  }, [posts]);
  const color = (p: Post) => CHANNEL_COLORS[(channels.find((c) => c.id === p.channel_id)?.color_idx ?? 5) % CHANNEL_COLORS.length];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link href={`/promo/calendar?m=${props.prev}`} className={`${btn} ${btnSm}`} aria-label="이전 달">‹</Link>
          <b className="font-mono text-base">{month.slice(0, 7).replace("-", ".")}</b>
          <Link href={`/promo/calendar?m=${props.next}`} className={`${btn} ${btnSm}`} aria-label="다음 달">›</Link>
          {!inMonth && <Link href="/promo/calendar" className={`${btn} ${btnSm}`}>오늘</Link>}
        </div>
        <div className="flex flex-wrap gap-3 text-[13px] text-slate-600">
          {channels.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${CHANNEL_COLORS[c.color_idx % CHANNEL_COLORS.length]}`} />
              {c.name}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-emerald-950 px-4 py-3 text-sm text-emerald-50">
        <b className="text-amber-300">{Number(month.slice(5, 7))}월 시즌</b> · {props.season}
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`border-b border-slate-200 bg-slate-50 py-1.5 text-center text-xs ${i === 0 ? "text-rose-600" : "text-slate-500"}`}>{w}</div>
        ))}
        {days.map((d, i) => {
          const ps = byDate.get(d) ?? [];
          const out = d.slice(0, 7) !== month.slice(0, 7);
          return (
            <button
              key={d}
              onClick={() => setSel(d)}
              aria-label={`${d} 게시물 ${ps.length}건`}
              className={`flex min-h-[56px] min-w-0 flex-col gap-0.5 border-b border-slate-200 p-1 text-left sm:min-h-[96px] ${i % 7 !== 6 ? "border-r" : ""} ${out ? "opacity-40" : ""} ${d === sel ? "ring-2 ring-inset ring-emerald-600" : ""}`}
            >
              <span className={`self-start font-mono text-xs ${d === today ? "rounded-full bg-amber-400 px-1.5 text-amber-950" : ""}`}>{Number(d.slice(8))}</span>
              {ps.slice(0, 3).map((p) => (
                <span key={p.id} className={`hidden truncate rounded px-1 py-0.5 text-[11px] leading-tight text-white sm:block ${color(p)} ${p.status === "posted" ? "line-through opacity-60" : ""}`}>
                  {p.title || "(제목 없음)"}
                </span>
              ))}
              {ps.length > 3 && <span className="hidden text-[11px] text-slate-500 sm:block">+{ps.length - 3}</span>}
              <span className="flex flex-wrap gap-0.5 sm:hidden">
                {ps.map((p) => (
                  <i key={p.id} className={`h-1.5 w-1.5 rounded-full ${color(p)}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <Panel title={`${fmtShort(sel)} 게시물`} right={<button className={`${btnPri} ${btnSm}`} disabled={!channels.length} onClick={() => setCreating(true)}>+ 게시물 추가</button>}>
        <PostList posts={byDate.get(sel) ?? []} channels={channels} empty={channels.length ? "이 날짜에는 게시물이 없어요." : "채널·자동화 탭에서 채널을 먼저 등록해주세요."} />
      </Panel>

      {creating && <PostEditor post={null} channels={channels} defaultDate={sel} onClose={() => setCreating(false)} />}
    </>
  );
}
