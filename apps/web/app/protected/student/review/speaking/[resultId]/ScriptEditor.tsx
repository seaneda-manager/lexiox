"use client";

import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";

export default function ScriptEditor({
  resultId,
  initialScript,
  approxWords,
  approxSentences,
  onScriptChanged,
  reRecordSlot,
}: {
  resultId: string;
  initialScript: string | null;
  approxWords?: number | null;
  approxSentences?: number | null;
  onScriptChanged?: () => void;
  reRecordSlot?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialScript ?? "");
  const [script, setScript] = useState(initialScript ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(draft.length, draft.length);
    }
  }, [editing]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/speaking/update-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId, script: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      setScript(draft);
      setEditing(false);
      onScriptChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(script);
    setEditing(false);
    setError(null);
  }

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-600">내 답변</div>
        <div className="flex items-center gap-2">
          {!editing && (
            <div className="flex gap-3 text-[11px] text-gray-400">
              {approxWords != null && <span>{approxWords} words</span>}
              {approxSentences != null && <span>{approxSentences} sentences</span>}
            </div>
          )}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:border-orange-300 hover:text-orange-700"
            >
              <Pencil className="h-3 w-3" />
              수정
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={cancel}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                취소
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                저장
              </button>
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          className="w-full resize-y rounded-lg border border-orange-200 bg-orange-50/30 p-3 text-sm leading-relaxed text-gray-800 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200"
        />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
          {script || <span className="text-gray-400">스크립트 없음</span>}
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {!editing && reRecordSlot}
    </section>
  );
}
