"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TONES } from "@/lib/promo/constants";
import type { OrgProfile } from "@/lib/promo/types";
import { saveProfile } from "../actions";
import { useToast } from "../_components/client-ui";
import { Panel, btnPri, inputCls, labelCls } from "../_components/ui";

const FIELDS: { k: keyof Omit<OrgProfile, "org_id" | "tone" | "trend_keywords" | "auto_approve">; label: string; ph: string; long?: boolean }[] = [
  { k: "display_name", label: "학원명 (홍보 표기)", ph: "예) LEXiOX 분당정자캠퍼스" },
  { k: "region", label: "지역·인근 학교", ph: "예) 분당 정자동 · 정자중, 늘푸른고 인근" },
  { k: "grades", label: "대상 학년", ph: "예) 초3~고2" },
  { k: "subjects", label: "과목", ph: "예) 영어 (내신·어휘·리딩)" },
  { k: "phone", label: "상담 연락처", ph: "예) 031-000-0000" },
  { k: "strengths", label: "강점", ph: "예) 정원 8명 소수정예, 매일 Lexiox 어휘 드릴, 월 1회 학부모 리포트", long: true },
  { k: "classes", label: "반 구성·수업 방식", ph: "예) 중등 내신반 주 3회 2시간 / 고등 독해반 주 2회 / 시험 4주 전 주말 특강", long: true },
  { k: "avoid", label: "쓰지 않을 표현", ph: "예) 가격 할인 언급, 타 학원 이름" },
];

export function SettingsClient({ profile, orgName }: { profile: OrgProfile | null; orgName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [f, setF] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = { tone: profile?.tone ?? TONES[0] };
    FIELDS.forEach(({ k }) => (o[k] = (profile?.[k] as string | null) ?? (k === "display_name" ? orgName : "")));
    return o;
  });
  const [keywords, setKeywords] = useState((profile?.trend_keywords ?? []).join(", "));
  const [autoApprove, setAutoApprove] = useState(profile?.auto_approve ?? false);

  return (
    <Panel>
      <div className="grid gap-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.filter((x) => !x.long).map(({ k, label, ph }) => (
            <label key={k} className={labelCls}>
              {label}
              <input id={`s_${k}`} className={inputCls} placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </label>
          ))}
          <label className={labelCls}>
            기본 말투
            <select id="s_tone" className={inputCls} value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })}>
              {TONES.map((t) => (<option key={t}>{t}</option>))}
            </select>
          </label>
        </div>
        {FIELDS.filter((x) => x.long).map(({ k, label, ph }) => (
          <label key={k} className={labelCls}>
            {label}
            <textarea id={`s_${k}`} className={`${inputCls} min-h-[90px]`} placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </label>
        ))}
        <label className={labelCls}>
          트렌드 분석에 추가로 볼 검색어 (쉼표로 구분, 최대 5개)
          <input
            id="s_keywords"
            className={inputCls}
            placeholder="예) 정자동 영어학원, 중2 영어 내신, 초등 영어 독해"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </label>
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          <input id="s_auto" type="checkbox" className="mt-1" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
          <span>
            <b>컨펌 없이 바로 예약</b>
            <span className="block text-[13px] text-slate-500">
              자동 일정·트렌드 플랜으로 만든 글을 승인 단계 없이 예약해요. 연결된 채널에는 예약 시간에 바로 올라가니 처음에는 꺼두는 걸 권해요.
            </span>
          </span>
        </label>
        <div>
          <button
            className={btnPri}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await saveProfile({
                  ...f,
                  trend_keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 5),
                  auto_approve: autoApprove,
                });
                toast.show(r.ok ? "학원 정보를 저장했어요." : r.error ?? "저장하지 못했어요.");
                if (r.ok) router.refresh();
              })
            }
          >
            {pending ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
      {toast.node}
    </Panel>
  );
}
