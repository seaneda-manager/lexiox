"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GRADES, LEAD_SOURCE_EXTRAS, LEAD_STAGES, stageLabel, stageTone, type LeadStage } from "@/lib/promo/constants";
import { fmtShort, todayKST } from "@/lib/promo/dates";
import type { Channel, Lead } from "@/lib/promo/types";
import { deleteLead, saveLead } from "../actions";
import { ConfirmButton, Modal, copyText, useToast } from "../_components/client-ui";
import { PageHead, Pill, btn, btnPri, btnSm, inputCls, labelCls } from "../_components/ui";

export function LeadsClient({
  leads,
  channels,
  openId,
  openNew,
}: {
  leads: Lead[];
  channels: Channel[];
  openId: string | null;
  openNew: boolean;
}) {
  const [filter, setFilter] = useState<LeadStage | "all">("all");
  const [editing, setEditing] = useState<Lead | "new" | null>(
    openNew ? "new" : openId ? leads.find((l) => l.id === openId) ?? null : null
  );
  const srcName = (l: Lead) => channels.find((c) => c.id === l.source_channel_id)?.name ?? l.source_label ?? "경로 미입력";

  const card = (l: Lead) => (
    <button key={l.id} onClick={() => setEditing(l)} className="grid w-full gap-0.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-left hover:border-emerald-600">
      <span className="font-semibold">
        {l.student_name} <span className="text-xs font-normal text-slate-500">{l.grade}</span>
      </span>
      <span className="truncate text-xs text-slate-500">{[l.parent_name, srcName(l)].filter(Boolean).join(" · ")}</span>
      <span className="text-xs text-slate-500">{l.next_contact_on ? `다음 연락 ${fmtShort(l.next_contact_on)}` : `문의 ${fmtShort(l.inquired_on)}`}</span>
    </button>
  );

  const shown = filter === "all" ? leads : leads.filter((l) => l.stage === filter);

  return (
    <>
      <PageHead
        title="상담·문의 관리"
        desc="문의부터 등록까지 단계별로 관리해요. 유입 경로를 남기면 성과 탭에서 어떤 채널이 효과적인지 보여드려요."
        right={<button className={btnPri} onClick={() => setEditing("new")}>+ 문의 등록</button>}
      />
      <div className="flex flex-wrap gap-1.5">
        {[{ key: "all" as const, label: "전체" }, ...LEAD_STAGES].map((s) => {
          const n = s.key === "all" ? leads.length : leads.filter((l) => l.stage === s.key).length;
          return (
            <button key={s.key} onClick={() => setFilter(s.key)} className={`${btn} ${btnSm} ${filter === s.key ? "!border-emerald-800 !bg-emerald-800 !text-white" : ""}`}>
              {s.label} {n}
            </button>
          );
        })}
      </div>

      {!leads.length ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          아직 등록된 문의가 없어요. 전화·방문·온라인 문의가 들어오면 &lsquo;+ 문의 등록&rsquo;으로 남겨주세요.
        </p>
      ) : filter === "all" ? (
        <div className="grid grid-cols-[repeat(5,minmax(190px,1fr))] gap-2.5 overflow-x-auto pb-1">
          {LEAD_STAGES.map((s) => {
            const ls = leads.filter((l) => l.stage === s.key);
            return (
              <div key={s.key} className="grid min-w-0 content-start gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="flex items-center justify-between text-[13px] font-bold">
                  {s.label}
                  <Pill tone={s.tone}>{ls.length}</Pill>
                </div>
                {ls.length ? ls.map(card) : <span className="text-xs text-slate-400">없음</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
          {shown.length ? (
            shown.map((l) => (
              <li key={l.id}>
                <button onClick={() => setEditing(l)} className="flex w-full items-start gap-3 py-2.5 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{l.student_name} <span className="text-[13px] font-normal text-slate-500">{l.grade}</span></span>
                    <span className="block text-[13px] text-slate-500">{[l.parent_name, l.parent_phone, srcName(l)].filter(Boolean).join(" · ")}</span>
                    {l.memo && <span className="block break-words text-[13px] text-slate-500">{l.memo}</span>}
                  </span>
                  <Pill tone={stageTone(l.stage)}>{stageLabel(l.stage)}</Pill>
                </button>
              </li>
            ))
          ) : (
            <li className="py-3 text-sm text-slate-500">이 단계에 해당하는 문의가 없어요.</li>
          )}
        </ul>
      )}

      {editing && <LeadEditor lead={editing === "new" ? null : editing} channels={channels} onClose={() => setEditing(null)} />}
    </>
  );
}

function LeadEditor({ lead, channels, onClose }: { lead: Lead | null; channels: Channel[]; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const initSource = lead?.source_channel_id ? `ch:${lead.source_channel_id}` : lead?.source_label ? `lb:${lead.source_label}` : "";
  const [f, setF] = useState({
    student_name: lead?.student_name ?? "",
    grade: lead?.grade ?? "",
    school: lead?.school ?? "",
    parent_name: lead?.parent_name ?? "",
    parent_phone: lead?.parent_phone ?? "",
    source: initSource,
    stage: (lead?.stage ?? "inquiry") as LeadStage,
    inquired_on: lead?.inquired_on ?? todayKST(),
    next_contact_on: lead?.next_contact_on ?? "",
    memo: lead?.memo ?? "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const save = () =>
    start(async () => {
      const [t, v] = [f.source.slice(0, 3), f.source.slice(3)];
      const r = await saveLead({
        id: lead?.id ?? null,
        student_name: f.student_name,
        grade: f.grade,
        school: f.school,
        parent_name: f.parent_name,
        parent_phone: f.parent_phone,
        source_channel_id: t === "ch:" ? v : null,
        source_label: t === "lb:" ? v : null,
        stage: f.stage,
        inquired_on: f.inquired_on,
        next_contact_on: f.next_contact_on,
        memo: f.memo,
      });
      if (!r.ok) return toast.show(r.error ?? "저장하지 못했어요.");
      router.refresh();
      onClose();
    });

  return (
    <Modal title={lead ? "상담 기록" : "새 문의"} onClose={onClose}>
      <div className="grid gap-2.5 sm:grid-cols-3">
        <label className={labelCls}>학생 이름<input id="l_student" className={inputCls} value={f.student_name} onChange={set("student_name")} /></label>
        <label className={labelCls}>
          학년
          <select id="l_grade" className={inputCls} value={f.grade} onChange={set("grade")}>
            <option value="">선택</option>
            {GRADES.map((g) => (<option key={g}>{g}</option>))}
          </select>
        </label>
        <label className={labelCls}>학교<input id="l_school" className={inputCls} value={f.school} onChange={set("school")} /></label>
        <label className={labelCls}>학부모<input id="l_parent" className={inputCls} placeholder="예) 어머님" value={f.parent_name} onChange={set("parent_name")} /></label>
        <label className={labelCls}>연락처<input id="l_phone" inputMode="tel" className={inputCls} value={f.parent_phone} onChange={set("parent_phone")} /></label>
        <label className={labelCls}>
          유입 경로
          <select id="l_source" className={inputCls} value={f.source} onChange={set("source")}>
            <option value="">선택</option>
            {channels.map((c) => (<option key={c.id} value={`ch:${c.id}`}>{c.name}</option>))}
            {LEAD_SOURCE_EXTRAS.map((s) => (<option key={s} value={`lb:${s}`}>{s}</option>))}
          </select>
        </label>
        <label className={labelCls}>
          단계
          <select id="l_stage" className={inputCls} value={f.stage} onChange={set("stage")}>
            {LEAD_STAGES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
          </select>
        </label>
        <label className={labelCls}>문의일<input id="l_date" type="date" className={inputCls} value={f.inquired_on} onChange={set("inquired_on")} /></label>
        <label className={labelCls}>다음 연락일<input id="l_next" type="date" className={inputCls} value={f.next_contact_on} onChange={set("next_contact_on")} /></label>
      </div>
      <label className={labelCls}>
        상담 메모
        <textarea id="l_memo" className={`${inputCls} min-h-[90px]`} placeholder="예) 중간고사 68점, 독해 약함. 주 3회 희망" value={f.memo} onChange={set("memo")} />
      </label>
      {lead?.parent_phone && (
        <div className="flex items-center gap-2">
          <span className="select-all font-mono text-sm">{lead.parent_phone}</span>
          <button className={`${btn} ${btnSm}`} onClick={async () => toast.show((await copyText(lead.parent_phone!)) ? "번호를 복사했어요." : "길게 눌러 복사해주세요.")}>번호 복사</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        {lead ? (
          <ConfirmButton
            className={`${btn} ${btnSm} !text-rose-600`}
            onConfirm={() =>
              start(async () => {
                const r = await deleteLead(lead.id);
                if (!r.ok) return toast.show(r.error ?? "저장하지 못했어요.");
                router.refresh();
                onClose();
              })
            }
          />
        ) : (
          <span />
        )}
        <button className={btnPri} disabled={pending} onClick={save}>{pending ? "저장 중…" : "저장"}</button>
      </div>
      {toast.node}
    </Modal>
  );
}
