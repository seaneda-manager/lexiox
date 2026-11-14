"use client";
// 선생님/관리자가 학생 리뷰 화면을 열었을 때 맨 위에 보이는 도구 모음: 상태 · 공개/공개 취소 · 수정 · 초안 삭제.
import { useState } from "react";
import Link from "next/link";

type Kind = "writing" | "speaking";
type Task = "email" | "discussion";

export interface EditableTexts {
  overview: string;
  improvedText: string;
  faceliftText: string;
}

async function call(action: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/staff/reviews/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) throw new Error(json.error || "처리하지 못했습니다");
  return json;
}

export default function StaffReviewBar({
  kind,
  id,
  status,
  task,
  texts,
  onChanged,
}: {
  kind: Kind;
  id: string;
  status: "draft" | "published";
  /** Writing 에서 지금 보고 있는 과제 (수정 대상) */
  task?: Task;
  texts: EditableTexts | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableTexts | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "처리하지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  const published = status === "published";

  return (
    <section className={`space-y-3 rounded-xl border px-4 py-3 ${published ? "border-emerald-200 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${published ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
          {published ? "공개됨" : "초안 · 학생에게 안 보임"}
        </span>
        <span className="text-xs text-slate-600">
          {published ? "학생이 이 리뷰를 보고 있어요." : "확인하고 수정한 뒤 ‘공개’를 누르면 학생에게 열려요."}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/teacher/reviews" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            목록
          </Link>
          <button
            disabled={busy || !texts}
            onClick={() => {
              setDraft(texts);
              setEditing((v) => !v);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            {editing ? "수정 닫기" : "수정"}
          </button>
          {!published && (
            <button
              disabled={busy}
              onClick={() => {
                if (window.confirm("초안을 삭제하면 처음부터 다시 만들어야 하고 AI 비용이 다시 듭니다. 삭제할까요?")) run(() => call("delete", { kind, id }));
              }}
              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
            >
              초안 삭제
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => run(() => call("publish", { kind, id, publish: !published }))}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40 ${published ? "bg-slate-700 hover:bg-slate-800" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {published ? "공개 취소" : "학생에게 공개"}
          </button>
        </div>
      </div>

      {editing && draft && (
        <div className="space-y-3 rounded-lg bg-white p-3">
          <Field label="총평" value={draft.overview} onChange={(v) => setDraft({ ...draft, overview: v })} rows={3} />
          <Field label="모범답안 ① 내 답안 다듬기" value={draft.improvedText} onChange={(v) => setDraft({ ...draft, improvedText: v })} rows={6} />
          <Field label="모범답안 ② 구조부터 새로" value={draft.faceliftText} onChange={(v) => setDraft({ ...draft, faceliftText: v })} rows={6} />
          <div className="flex items-center gap-2">
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await call("edit", { kind, id, task, overview: draft.overview, improvedText: draft.improvedText, faceliftText: draft.faceliftText });
                  setEditing(false);
                })
              }
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              저장
            </button>
            <span className="text-[11px] text-slate-500">수정한 내용은 바로 반영돼요. (AI를 다시 호출하지 않아요)</span>
          </div>
        </div>
      )}

      {err && <p className="text-xs text-rose-600">{err}</p>}
    </section>
  );
}

function Field({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-bold text-slate-600">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-slate-300 p-2 text-xs leading-relaxed focus:border-slate-500 focus:outline-none"
      />
    </label>
  );
}
