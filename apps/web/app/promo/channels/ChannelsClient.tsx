"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CHANNEL_KINDS, CHANNEL_KIND_LIST, WEEKDAYS, type ChannelKind } from "@/lib/promo/constants";
import { addDays, fmtShort } from "@/lib/promo/dates";
import type { Automation, Channel, ChannelTarget } from "@/lib/promo/types";
import { deleteAutomation, deleteChannel, disconnectProvider, saveAutomation, saveChannel, setChannelTarget } from "../actions";
import { AutogenButton } from "../_components/ActionButtons";
import { ConfirmButton, Modal, useToast } from "../_components/client-ui";
import { Dot, PageHead, Panel, Pill, btn, btnPri, btnSm, inputCls, labelCls } from "../_components/ui";

export type ConnView = {
  id: string;
  provider: "meta" | "google";
  account_label: string | null;
  status: string;
  targets: ChannelTarget[];
  notes: string[];
};

const PROVIDERS = [
  { key: "meta" as const, label: "Meta", desc: "인스타그램 · 페이스북 페이지" },
  { key: "google" as const, label: "Google", desc: "유튜브 · 구글 비즈니스 프로필" },
];

export function ChannelsClient({
  channels,
  autos,
  upcomingAuto,
  today,
  connections,
  configured,
  notice,
  noticeIsError,
}: {
  channels: Channel[];
  autos: Automation[];
  upcomingAuto: number;
  today: string;
  connections: ConnView[];
  configured: { meta: boolean; google: boolean };
  notice: string | null;
  noticeIsError: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, startT] = useTransition();
  const [editCh, setEditCh] = useState<Channel | "new" | null>(null);
  const [editAuto, setEditAuto] = useState<Automation | "new" | null>(null);
  const chName = (id: string) => channels.find((c) => c.id === id)?.name ?? "삭제된 채널";

  return (
    <>
      <PageHead
        title="채널·자동화"
        desc="홍보 채널을 등록하고 요일·주제를 정해두면, 매일 새벽 다음 7일 치 콘텐츠를 만들어 캘린더에 넣어둬요. 게시일이 되면 '오늘' 탭에 올라오고, 복사 후 채널을 바로 열 수 있어요."
      />
      {notice && (
        <p className={`rounded-xl p-3 text-sm ${noticeIsError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{notice}</p>
      )}

      <Panel title="자동 업로드 연결">
        <div className="grid gap-3 sm:grid-cols-2">
          {PROVIDERS.map((p) => {
            const c = connections.find((x) => x.provider === p.key);
            return (
              <div key={p.key} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
                <div className="min-w-[160px] flex-1">
                  <div className="font-semibold">{p.label}</div>
                  <div className="text-[13px] text-slate-500">{p.desc}</div>
                  {c && (
                    <div className="mt-1 text-xs text-slate-500">
                      {c.account_label} · 게시 가능 {c.targets.length}곳
                      {c.status !== "active" && <span className="ml-1 font-semibold text-rose-600">· 다시 연결 필요</span>}
                    </div>
                  )}
                  {c?.notes.map((n) => (
                    <div key={n} className="text-xs text-amber-700">{n}</div>
                  ))}
                </div>
                {configured[p.key] ? (
                  <a href={`/api/promo/oauth/${p.key}/start`} className={`${c ? btn : btnPri} ${btnSm}`}>{c ? "다시 연결" : "연결하기"}</a>
                ) : (
                  <span className="text-xs text-slate-400">본사 설정 전</span>
                )}
                {c && (
                  <ConfirmButton
                    className={`${btn} ${btnSm} !text-rose-600`}
                    onConfirm={() =>
                      startT(async () => {
                        const r = await disconnectProvider(p.key);
                        toast.show(r.ok ? "연결을 해제했어요." : r.error ?? "해제하지 못했어요.");
                        router.refresh();
                      })
                    }
                  >
                    연결 해제
                  </ConfirmButton>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">네이버 블로그·플레이스·카카오 채널은 외부 게시 API가 없어 &lsquo;복사하고 열기&rsquo;로 올려요.</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="홍보 채널" right={<button className={`${btn} ${btnSm}`} onClick={() => setEditCh("new")}>+ 채널 추가</button>}>
          {channels.length ? (
            <ul className="divide-y divide-slate-100">
              {channels.map((c) => (
                <li key={c.id} className="flex items-start gap-3 py-2.5">
                  <Dot colorIdx={c.color_idx} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{c.name}</div>
                    <div className="truncate text-[13px] text-slate-500">{CHANNEL_KINDS[c.kind]?.label}{c.handle ? ` · ${c.handle}` : ""}</div>
                    {CHANNEL_KINDS[c.kind]?.provider && (
                      <div className={`text-xs ${c.target ? "text-sky-700" : "text-amber-700"}`}>
                        {c.target ? `자동 업로드 → ${c.target.name}` : "자동 업로드 계정 미선택"}
                      </div>
                    )}
                  </div>
                  {c.active ? <Pill tone="bg-emerald-100 text-emerald-800">사용 중</Pill> : <Pill>꺼짐</Pill>}
                  <button className={`${btn} ${btnSm}`} onClick={() => setEditCh(c)}>수정</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 text-sm text-slate-500">블로그, 인스타그램, 카카오톡 채널 등 운영 중인 채널을 추가해주세요.</p>
          )}
        </Panel>

        <Panel
          title="자동 콘텐츠 일정"
          right={<button className={`${btn} ${btnSm}`} disabled={!channels.length} onClick={() => setEditAuto("new")}>+ 일정 추가</button>}
        >
          {autos.length ? (
            <ul className="divide-y divide-slate-100">
              {autos.map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2.5">
                  <Dot colorIdx={channels.find((c) => c.id === a.channel_id)?.color_idx} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">
                      {chName(a.channel_id)} · 매주 {a.weekdays.map((d) => WEEKDAYS[d]).join("·")} {a.post_time?.slice(0, 5) ?? ""}
                    </div>
                    <div className="truncate text-[13px] text-slate-500">
                      주제 {a.topics.length}개{a.topics.length ? ` · ${a.topics.slice(0, 2).join(", ")}${a.topics.length > 2 ? " 외" : ""}` : ""}
                    </div>
                  </div>
                  {a.active ? <Pill tone="bg-emerald-100 text-emerald-800">켜짐</Pill> : <Pill>꺼짐</Pill>}
                  <button className={`${btn} ${btnSm}`} onClick={() => setEditAuto(a)}>수정</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 text-sm text-slate-500">
              {channels.length ? "채널별로 '매주 화·목 오후 7시, 시험 대비 팁' 같은 일정을 만들어보세요." : "채널을 먼저 추가해주세요."}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <div className="min-w-[200px] flex-1">
              <div className="text-sm font-bold">다음 7일 콘텐츠 만들기</div>
              <div className="text-xs text-slate-600">
                {fmtShort(today)} ~ {fmtShort(addDays(today, 6))} · 이미 만든 날짜는 건너뛰어요 · 현재 자동 생성 {upcomingAuto}건
              </div>
            </div>
            <AutogenButton disabled={!autos.some((a) => a.active)} />
          </div>
        </Panel>
      </div>

      <Panel title="자동화 흐름">
        <p className="max-w-3xl text-sm text-slate-600">
          흐름: 자동 일정(매일 새벽)과 트렌드 플랜(매주 월요일)이 콘텐츠를 만들면 &lsquo;컨펌&rsquo; 탭에 쌓여요. 승인한 글은 Meta·Google에 연결된
          채널이면 예약 시간에 자동으로 올라가고, 네이버 블로그처럼 외부 게시를 막는 채널은 게시일에 &lsquo;오늘&rsquo; 탭에서 복사 → 채널 열기 →
          붙여넣기로 올려요. 학원 정보 탭에서 &lsquo;컨펌 없이 바로 예약&rsquo;을 켜면 승인 단계를 건너뛸 수 있어요.
        </p>
      </Panel>

      {editCh && (
        <ChannelEditor channel={editCh === "new" ? null : editCh} connections={connections} onClose={() => setEditCh(null)} />
      )}
      {toast.node}
      {editAuto && <AutoEditor auto={editAuto === "new" ? null : editAuto} channels={channels} onClose={() => setEditAuto(null)} />}
    </>
  );
}

const TARGET_TYPE: Record<string, ChannelTarget["type"]> = {
  insta: "ig_user",
  facebook: "fb_page",
  youtube: "yt_channel",
  gbp: "gbp_location",
};

function ChannelEditor({ channel, connections, onClose }: { channel: Channel | null; connections: ConnView[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    kind: (channel?.kind ?? "blog") as ChannelKind,
    name: channel?.name ?? "",
    handle: channel?.handle ?? "",
    write_url: channel?.write_url ?? "",
    active: channel?.active ?? true,
    targetId: channel?.target?.id ?? "",
  });
  const provider = CHANNEL_KINDS[f.kind]?.provider;
  const conn = connections.find((c) => c.provider === provider);
  const targets = conn?.targets.filter((t) => t.type === TARGET_TYPE[f.kind]) ?? [];
  return (
    <Modal title={channel ? "채널 수정" : "채널 추가"} onClose={onClose}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className={labelCls}>
          종류
          <select id="c_kind" className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as ChannelKind })}>
            {CHANNEL_KIND_LIST.map((k) => (<option key={k} value={k}>{CHANNEL_KINDS[k].label}</option>))}
          </select>
        </label>
        <label className={labelCls}>표시 이름<input id="c_name" className={inputCls} placeholder="예) 학원 블로그" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className={labelCls}>계정·아이디<input id="c_handle" className={inputCls} placeholder="예) @lexiox_bundang" value={f.handle} onChange={(e) => setF({ ...f, handle: e.target.value })} /></label>
        <label className={labelCls}>글쓰기 주소 (선택)<input id="c_url" className={inputCls} placeholder="https://" value={f.write_url} onChange={(e) => setF({ ...f, write_url: e.target.value })} /></label>
      </div>
      {provider && (
        <label className={labelCls}>
          자동 업로드 계정
          {conn ? (
            <select id="c_target" className={inputCls} value={f.targetId} onChange={(e) => setF({ ...f, targetId: e.target.value })}>
              <option value="">자동 업로드 안 함 (복사해서 올리기)</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-normal text-slate-500">위 &lsquo;자동 업로드 연결&rsquo;에서 {provider === "meta" ? "Meta" : "Google"} 계정을 먼저 연결해주세요.</span>
          )}
          {conn && !targets.length && <span className="text-xs font-normal text-amber-700">연결된 계정에 이 종류의 페이지·채널이 없어요.</span>}
        </label>
      )}
      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
        <input id="c_active" type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> 사용 중
      </label>
      <p className="text-xs text-slate-500">글쓰기 주소를 넣으면 게시할 때 &lsquo;복사하고 열기&rsquo; 버튼이 생겨요. 예) 네이버 블로그 글쓰기 페이지</p>
      <div className="flex items-center justify-between">
        {channel ? (
          <ConfirmButton
            className={`${btn} ${btnSm} !text-rose-600`}
            onConfirm={() =>
              start(async () => {
                const r = await deleteChannel(channel.id);
                if (!r.ok) return toast.show(r.error ?? "저장하지 못했어요.");
                router.refresh();
                onClose();
              })
            }
          />
        ) : (
          <span />
        )}
        <button
          className={btnPri}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const { targetId, ...rest } = f;
              const r = await saveChannel({ id: channel?.id ?? null, ...rest, name: f.name || CHANNEL_KINDS[f.kind].label });
              if (!r.ok) return toast.show(r.error ?? "저장하지 못했어요.");
              if (provider && r.id && (targetId || channel?.target)) {
                const t = await setChannelTarget(r.id, targetId || null);
                if (!t.ok) return toast.show(t.error ?? "자동 업로드 계정을 저장하지 못했어요.");
              }
              router.refresh();
              onClose();
            })
          }
        >
          저장
        </button>
      </div>
      {toast.node}
    </Modal>
  );
}

function AutoEditor({ auto, channels, onClose }: { auto: Automation | null; channels: Channel[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    channel_id: auto?.channel_id ?? channels[0]?.id ?? "",
    weekdays: auto?.weekdays ?? [2, 4],
    post_time: auto?.post_time?.slice(0, 5) ?? "19:00",
    topics: (auto?.topics ?? []).join("\n"),
    active: auto?.active ?? true,
  });
  const toggle = (d: number) => setF({ ...f, weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d] });
  return (
    <Modal title={auto ? "자동 일정 수정" : "자동 일정 추가"} onClose={onClose}>
      <label className={labelCls}>
        채널
        <select id="a_channel" className={inputCls} value={f.channel_id} onChange={(e) => setF({ ...f, channel_id: e.target.value })}>
          {channels.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
      </label>
      <div className={labelCls}>
        게시 요일
        <div className="flex flex-wrap gap-1">
          {WEEKDAYS.map((w, i) => (
            <button
              key={w}
              type="button"
              aria-pressed={f.weekdays.includes(i)}
              onClick={() => toggle(i)}
              className={`h-9 w-9 rounded-lg border text-sm font-semibold ${f.weekdays.includes(i) ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      <label className={labelCls}>게시 시간<input id="a_time" type="time" className={inputCls} value={f.post_time} onChange={(e) => setF({ ...f, post_time: e.target.value })} /></label>
      <label className={labelCls}>
        주제 후보 (한 줄에 하나)
        <textarea
          id="a_topics"
          className={`${inputCls} min-h-[140px]`}
          placeholder={"기말고사 대비 영어 학습 팁\n이번 주 수업 현장\n이번 달 어휘 학습 성과\n겨울방학 특강 안내\n학부모 Q&A"}
          value={f.topics}
          onChange={(e) => setF({ ...f, topics: e.target.value })}
        />
      </label>
      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
        <input id="a_active" type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> 켜기
      </label>
      <div className="flex items-center justify-between">
        {auto ? (
          <ConfirmButton
            className={`${btn} ${btnSm} !text-rose-600`}
            onConfirm={() =>
              start(async () => {
                const r = await deleteAutomation(auto.id);
                if (!r.ok) return toast.show(r.error ?? "저장하지 못했어요.");
                router.refresh();
                onClose();
              })
            }
          />
        ) : (
          <span />
        )}
        <button
          className={btnPri}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveAutomation({
                id: auto?.id ?? null,
                channel_id: f.channel_id,
                weekdays: f.weekdays,
                post_time: f.post_time,
                topics: f.topics.split("\n").map((t) => t.trim()).filter(Boolean),
                active: f.active,
              });
              if (!r.ok) return toast.show(r.error ?? "저장하지 못했어요.");
              router.refresh();
              onClose();
            })
          }
        >
          저장
        </button>
      </div>
      {toast.node}
    </Modal>
  );
}
