"use client";

import { useMemo, useState } from "react";
import { highlightHtml } from "@/lib/reading/evidence";

type Ev = { quote: string; status: "draft" | "approved" | "rejected"; source?: string };
export type EvidenceQuestion = {
  id: string;
  number: number;
  type: string;
  stem: string;
  passageHtml: string;
  passagePlain: string;
  passageLabel: string;
  choices: { text: string; isCorrect: boolean }[];
  evidence: Ev[];
  /** 생성 시 AI 블라인드 풀이 결과(정답 키와 비교) */
  qa?: { keyVerified: boolean; solverChoice: number } | null;
};

const STATUS_LABEL: Record<Ev["status"], string> = { draft: "AI 초안", approved: "승인됨", rejected: "반려" };
const STATUS_CLASS: Record<Ev["status"], string> = {
  draft: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-gray-200 text-gray-600",
};

export default function EvidenceReviewClient({ testId, questions }: { testId: string; questions: EvidenceQuestion[] }) {
  const [items, setItems] = useState(questions);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "draft" | "none" | "suspect">("all");
  const [openId, setOpenId] = useState<string | null>(questions[0]?.id ?? null);

  const counts = useMemo(() => {
    const c = { approved: 0, draft: 0, none: 0, suspect: 0 };
    for (const q of items) {
      if (q.evidence.some((e) => e.status === "approved")) c.approved++;
      else if (q.evidence.some((e) => e.status === "draft")) c.draft++;
      else c.none++;
      if (q.qa && !q.qa.keyVerified) c.suspect++;
    }
    return c;
  }, [items]);

  async function generate(onlyMissing: boolean) {
    setBusy("generate");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/updated-reading/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", testId, onlyMissing }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "생성 실패");
      setMsg(`AI 초안 ${j.generated}개 생성, ${j.failed}개 실패(지문에서 인용을 못 찾음). 곧 새로고침합니다.`);
      if (j.generated > 0) setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      setMsg(`오류: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function save(q: EvidenceQuestion, evidence: Ev[]) {
    setBusy(q.id);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/updated-reading/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", testId, questionId: q.id, evidence }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "저장 실패");
      setItems((prev) => prev.map((x) => (x.id === q.id ? { ...x, evidence } : x)));
      setMsg(`Q${q.number} 저장됨`);
    } catch (e: any) {
      setMsg(`오류: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  const visible = items.filter((q) => {
    if (filter === "draft") return q.evidence.some((e) => e.status === "draft") && !q.evidence.some((e) => e.status === "approved");
    if (filter === "none") return q.evidence.length === 0;
    if (filter === "suspect") return !!q.qa && !q.qa.keyVerified;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3 text-xs">
        <span className="font-semibold">승인 {counts.approved}</span>
        <span className="text-amber-700">검수 대기 {counts.draft}</span>
        <span className="text-gray-500">근거 없음 {counts.none}</span>
        <span className={counts.suspect > 0 ? "font-semibold text-red-600" : "text-gray-400"}>정답 의심 {counts.suspect}</span>
        <span className="mx-2 h-4 w-px bg-gray-200" />
        <button onClick={() => generate(true)} disabled={busy !== null} className="rounded bg-sky-600 px-3 py-1.5 font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
          {busy === "generate" ? "AI 생성 중…" : "근거 없는 문항 AI 생성"}
        </button>
        <button onClick={() => generate(false)} disabled={busy !== null} className="rounded border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">
          미승인 문항 다시 생성
        </button>
        <div className="ml-auto flex gap-1">
          {(["all", "suspect", "draft", "none"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded px-2 py-1 ${filter === f ? "bg-gray-900 text-white" : "border hover:bg-gray-50"}`}>
              {f === "all" ? "전체" : f === "suspect" ? "정답 의심" : f === "draft" ? "검수 대기" : "근거 없음"}
            </button>
          ))}
        </div>
      </div>
      {msg && <div className="rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">{msg}</div>}

      <div className="space-y-2">
        {visible.map((q) => (
          <QuestionRow key={q.id} q={q} open={openId === q.id} onToggle={() => setOpenId(openId === q.id ? null : q.id)} busy={busy === q.id} onSave={(ev) => save(q, ev)} />
        ))}
        {visible.length === 0 && <p className="py-8 text-center text-sm text-gray-500">표시할 문항이 없습니다.</p>}
      </div>
    </div>
  );
}

function QuestionRow({ q, open, onToggle, busy, onSave }: { q: EvidenceQuestion; open: boolean; onToggle: () => void; busy: boolean; onSave: (ev: Ev[]) => void }) {
  const [draft, setDraft] = useState<Ev[]>(q.evidence);
  const status = q.evidence.some((e) => e.status === "approved") ? "approved" : q.evidence.some((e) => e.status === "draft") ? "draft" : null;
  const marked = useMemo(
    () => highlightHtml(q.passageHtml, draft.filter((e) => e.status !== "rejected").map((e) => e.quote)),
    [q.passageHtml, draft]
  );

  return (
    <article className="rounded-lg border bg-white">
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <span className="text-xs font-bold text-gray-700">Q{q.number}</span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{q.type}</span>
        <span className="line-clamp-1 flex-1 text-sm text-gray-800">{q.stem}</span>
        {q.qa && !q.qa.keyVerified && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">정답 의심</span>}
        {q.qa?.keyVerified && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-700">AI 검증 통과</span>}
        {status ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
        ) : (
          <span className="text-[10px] text-gray-400">근거 없음</span>
        )}
      </button>
      {open && (
        <div className="grid gap-4 border-t px-4 py-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-semibold text-gray-500">{q.passageLabel}</p>
            <style>{".evidence-mark{background:#FEF08A;padding:0 1px;border-radius:2px}"}</style>
            <div className="max-h-72 overflow-auto rounded border bg-gray-50 p-3 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: marked }} />
          </div>
          <div className="space-y-3">
            {q.qa && !q.qa.keyVerified && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                AI가 정답을 가리고 풀었더니 <strong>{String.fromCharCode(65 + q.qa.solverChoice)}</strong>를 골랐습니다(현재 정답 키와 다름). 지문과 정답을 직접 확인하세요. 이 문항에는 근거 초안이 붙지 않습니다.
              </div>
            )}
            <ul className="space-y-1 text-xs">
              {q.choices.map((c, i) => (
                <li key={i} className={c.isCorrect ? "font-semibold text-emerald-700" : "text-gray-600"}>
                  {String.fromCharCode(65 + i)}. {c.text} {c.isCorrect && "✓"}
                </li>
              ))}
            </ul>
            {draft.map((e, i) => (
              <div key={i} className="space-y-1 rounded border p-2">
                <textarea
                  value={e.quote}
                  onChange={(ev) => setDraft(draft.map((d, j) => (j === i ? { ...d, quote: ev.target.value, status: "draft" } : d)))}
                  rows={3}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
                <div className="flex items-center gap-1 text-xs">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                  <button onClick={() => setDraft(draft.map((d, j) => (j === i ? { ...d, status: "approved" } : d)))} className="rounded border border-emerald-300 px-2 py-0.5 text-emerald-700 hover:bg-emerald-50">승인</button>
                  <button onClick={() => setDraft(draft.map((d, j) => (j === i ? { ...d, status: "rejected" } : d)))} className="rounded border px-2 py-0.5 hover:bg-gray-50">반려</button>
                  <button onClick={() => setDraft(draft.filter((_, j) => j !== i))} className="ml-auto text-gray-400 hover:text-red-600">삭제</button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setDraft([...draft, { quote: "", status: "draft" }])} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">+ 근거 문장 추가</button>
              <button onClick={() => onSave(draft)} disabled={busy} className="rounded bg-gray-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
                {busy ? "저장 중…" : "저장"}
              </button>
            </div>
            <p className="text-[11px] text-gray-500">근거는 지문에서 그대로 복사한 문장이어야 승인됩니다. 승인된 근거만 학생에게 보입니다.</p>
          </div>
        </div>
      )}
    </article>
  );
}
