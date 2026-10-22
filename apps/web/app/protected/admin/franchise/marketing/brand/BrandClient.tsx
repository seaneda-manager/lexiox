"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BrandGuide } from "@/lib/promo/types";
import { saveBrandGuide } from "../actions";

const input = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none";
const label = "grid gap-1 text-xs font-semibold text-slate-500";

export function BrandClient({ guide }: { guide: BrandGuide | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [f, setF] = useState({
    brand_name: guide?.brand_name ?? "LEXiOX",
    tone: guide?.tone ?? "",
    must_include: (guide?.must_include ?? []).join("\n"),
    must_avoid: (guide?.must_avoid ?? []).join("\n"),
    default_hashtags: (guide?.default_hashtags ?? []).join(" "),
    footer: guide?.footer ?? "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-600">
        모든 가맹점의 AI 홍보 문구에 이 가이드가 들어가요. 금지 표현은 생성 단계에서 막고, 필수 문구는 가능한 곳에 넣어요.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>브랜드명 표기<input id="g_brand" className={input} value={f.brand_name} onChange={set("brand_name")} /></label>
        <label className={label}>기본 해시태그 (띄어쓰기로 구분)<input id="g_tags" className={input} placeholder="#렉시옥스 #LEXiOX" value={f.default_hashtags} onChange={set("default_hashtags")} /></label>
      </div>
      <label className={label}>
        브랜드 말투
        <input id="g_tone" className={input} placeholder="예) 차분하고 전문적인 존댓말, 과장 없이 근거 중심" value={f.tone} onChange={set("tone")} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          가능하면 포함할 문구 (한 줄에 하나)
          <textarea id="g_inc" className={`${input} min-h-[120px]`} placeholder={"매일 10분 AI 어휘 트레이닝\n학부모 월간 학습 리포트"} value={f.must_include} onChange={set("must_include")} />
        </label>
        <label className={label}>
          절대 쓰지 말 표현 (한 줄에 하나)
          <textarea id="g_avoid" className={`${input} min-h-[120px]`} placeholder={"성적 보장\n1등 학원\n최저가"} value={f.must_avoid} onChange={set("must_avoid")} />
        </label>
      </div>
      <label className={label}>
        글 마지막에 붙일 문구 (선택)
        <input id="g_footer" className={input} placeholder="예) LEXiOX는 전국 가맹 캠퍼스에서 같은 커리큘럼으로 운영됩니다." value={f.footer} onChange={set("footer")} />
      </label>
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveBrandGuide(f);
              setMsg(r.ok ? "브랜드 가이드를 저장했어요. 다음 생성부터 모든 가맹점에 반영돼요." : r.error ?? "저장하지 못했어요.");
              if (r.ok) router.refresh();
            })
          }
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        {msg && <span className="text-sm text-slate-600">{msg}</span>}
      </div>
    </section>
  );
}
