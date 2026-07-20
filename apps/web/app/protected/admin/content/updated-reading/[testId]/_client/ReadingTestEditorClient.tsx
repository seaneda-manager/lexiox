"use client";

import { useState } from "react";
import type { RReadingTest2026 } from "@/models/reading";

type Props = {
  initialId: string;
  initialLabel: string;
  initialPayload: RReadingTest2026;
};

export default function ReadingTestEditorClient({
  initialId,
  initialLabel,
  initialPayload,
}: Props) {
  const [label, setLabel] = useState(initialLabel);
  const [payload, setPayload] = useState<RReadingTest2026>(initialPayload);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setStatus(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/updated-reading/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initialId, label, payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus(data.error ?? "Save failed");
      } else {
        setStatus("Saved");
      }
    } catch (e: any) {
      setStatus(e?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  // 아주 러프한 폼: meta.label + 첫 모듈/아이템/질문 일부만 노출
  const firstModule = payload.modules?.[0];
  const firstItem: any = firstModule?.items?.[0];

  function updatePassageHtml(html: string) {
    setPayload((prev) => {
      const next = structuredClone(prev) as RReadingTest2026;
      if (next.modules[0]?.items[0]?.taskKind === "academic_passage") {
        (next.modules[0].items[0] as any).passageHtml = html;
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium">Test ID</label>
        <input
          value={initialId}
          disabled
          className="w-full rounded-md border px-2 py-1 text-sm bg-gray-50 font-mono"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">Label</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-md border px-2 py-1 text-sm"
        />
      </div>

      {firstItem && (
        <div className="space-y-2 border rounded-md p-3">
          <h2 className="text-sm font-semibold">
            Module 1 – Item 1 (passage preview)
          </h2>
          <textarea
            value={firstItem.passageHtml ?? ""}
            onChange={(e) => updatePassageHtml(e.target.value)}
            className="w-full h-60 rounded-md border px-2 py-1 text-xs font-mono"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-md border bg-black px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>

      {status && (
        <p className="text-sm text-gray-700">
          {status}
        </p>
      )}

      <details className="rounded-md border px-3 py-2 text-xs">
        <summary className="cursor-pointer font-semibold">
          Raw JSON (debug)
        </summary>
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </details>
    </div>
  );
}
