// File: apps/web/app/(protected)/admin/content/new/[tab]/_client/JsonUploaderClient.tsx
"use client";

import { useState } from "react";

export default function JsonUploaderClient() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onUpload() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const payload = JSON.parse(text); // must be { passage: {...} }
      const res = await fetch("/api/admin/content/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Import failed");
      setMsg("✓ Import OK");
    } catch (e: any) {
      setErr(e?.message || "Invalid JSON");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        className="w-full h-64 border rounded p-2 font-mono text-sm"
        placeholder='{"passage":{...}}'
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-1.5 rounded border"
          onClick={onUpload}
          disabled={busy}
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
        {msg && <span className="text-green-600 text-sm">{msg}</span>}
        {err && <span className="text-red-600 text-sm">{err}</span>}
      </div>
    </div>
  );
}
