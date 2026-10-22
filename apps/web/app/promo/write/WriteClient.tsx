"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CHANNEL_KINDS, CHANNEL_KIND_LIST, PURPOSES, TARGET_GRADES, TONES } from "@/lib/promo/constants";
import { todayKST } from "@/lib/promo/dates";
import type { Channel, GeneratedPost } from "@/lib/promo/types";
import { savePost } from "../actions";
import { copyText, useToast } from "../_components/client-ui";
import { Panel, btn, btnPri, inputCls, labelCls } from "../_components/ui";

export function WriteClient({ channels }: { channels: Channel[] }) {
  const router = useRouter();
  const toast = useToast();
  // 채널이 등록돼 있으면 채널, 없으면 채널 종류로 고른다
  const [target, setTarget] = useState(channels[0] ? `ch:${channels[0].id}` : "kind:blog");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [grade, setGrade] = useState("");
  const [tone, setTone] = useState("");
  const [message, setMessage] = useState("");
  const [useLearning, setUseLearning] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GeneratedPost | null>(null);
  const [date, setDate] = useState(todayKST());
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    const [t, v] = target.split(":");
    try {
      const res = await fetch("/api/promo/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(t === "ch" ? { channelId: v } : { kind: v }), purpose, grade, tone, message, useLearning }),
      });
      const j = await res.json();
      if (j.ok) setResult(j.post);
      else setError(j.error);
    } catch {
      setError("연결이 끊겼어요. 다시 시도해주세요.");
    }
    setBusy(false);
  };

  const text = () => (result ? [result.title, result.body, result.hashtags.join(" ")].filter(Boolean).join("\n\n") : "");

  const save = async () => {
    if (!result) return;
    const [t, v] = target.split(":");
    setSaving(true);
    const r = await savePost({
      id: null,
      channel_id: t === "ch" ? v : null,
      title: result.title,
      body: result.body,
      hashtags: result.hashtags,
      scheduled_on: date,
      status: "scheduled",
    });
    setSaving(false);
    if (!r.ok) return toast.show(r.error ?? "저장하지 못했어요.");
    toast.show("캘린더에 저장했어요.");
    router.refresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <div className="grid gap-3">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <label className={labelCls}>
              채널
              <select id="w_target" className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)}>
                {channels.length > 0 && (
                  <optgroup label="우리 학원 채널">
                    {channels.map((c) => (
                      <option key={c.id} value={`ch:${c.id}`}>{c.name}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="채널 종류">
                  {CHANNEL_KIND_LIST.map((k) => (
                    <option key={k} value={`kind:${k}`}>{CHANNEL_KINDS[k].label}</option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className={labelCls}>
              목적
              <select id="w_purpose" className={inputCls} value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                {PURPOSES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              대상 학년
              <select id="w_grade" className={inputCls} value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="">전체</option>
                {TARGET_GRADES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              말투
              <select id="w_tone" className={inputCls} value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="">학원 기본 말투</option>
                {TONES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <label className={labelCls}>
            꼭 넣을 내용
            <textarea
              id="w_msg"
              className={`${inputCls} min-h-[110px]`}
              placeholder="예) 11월 둘째 주 중2 영어 기말 대비반 개강, 정원 8명, 주 3회, 첫 상담 시 어휘 진단 무료"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input id="w_learning" type="checkbox" checked={useLearning} onChange={(e) => setUseLearning(e.target.checked)} />
            이번 달 Lexiox 학습 데이터를 근거로 활용
          </label>
          <div>
            <button className={btnPri} disabled={busy} onClick={generate}>{busy ? "작성 중…" : "문구 만들기"}</button>
          </div>
        </div>
      </Panel>

      <Panel title="결과">
        {busy ? (
          <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">작성 중이에요. 블로그 글은 30초 정도 걸려요.</p>
        ) : result ? (
          <div className="grid gap-2.5">
            <input id="w_title" aria-label="제목" className={inputCls} value={result.title} onChange={(e) => setResult({ ...result, title: e.target.value })} />
            <textarea id="w_body" aria-label="본문" className={`${inputCls} min-h-[300px] leading-relaxed`} value={result.body} onChange={(e) => setResult({ ...result, body: e.target.value })} />
            <input
              id="w_tags"
              aria-label="해시태그"
              className={`${inputCls} text-emerald-800`}
              value={result.hashtags.join(" ")}
              onChange={(e) => setResult({ ...result, hashtags: e.target.value.split(/\s+/).filter(Boolean) })}
            />
            <div className="flex flex-wrap items-end gap-2">
              <button className={btn} onClick={async () => toast.show((await copyText(text())) ? "복사했어요." : "길게 눌러 직접 복사해주세요.")}>전체 복사</button>
              <label className={`${labelCls} min-w-[140px] flex-1`}>
                게시 날짜
                <input id="w_date" type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <button className={btnPri} disabled={saving} onClick={save}>캘린더에 저장</button>
              <button className={btn} disabled={busy} onClick={generate}>다시 쓰기</button>
            </div>
          </div>
        ) : (
          <p className="py-3 text-sm text-slate-500">{error || "왼쪽에서 조건을 고르고 '문구 만들기'를 눌러주세요."}</p>
        )}
      </Panel>
      {toast.node}
    </div>
  );
}
