// apps/web/app/(protected)/admin/vocab/import/_client/WisewordCsvImporter.tsx
"use client";

import React, { useRef, useState } from "react";
import {
  importWisewordWordsAndCreateSetFromJsonText,
  importWisewordWordsFromJsonText,
  importWisewordWordsFromCsvText,
  importWisewordWordsAndCreateSetFromCsvText,
  type ImportWisewordCsvActionResult,
} from "../wiseword-actions";
import type { TrackLite } from "../../Tracks/actions";

type Mode = "CSV" | "JSON";

type Props = {
  initialSlug?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialTracks?: TrackLite[];
};

function clean(s: any) {
  return String(s ?? "").trim();
}

export default function WisewordCsvImporter({
  initialSlug = "",
  initialTitle = "",
  initialDescription = "",
  initialTracks = [],
}: Props) {
  const [mode, setMode] = useState<Mode>("CSV");
  const [slug, setSlug] = useState(initialSlug);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [trackId, setTrackId] = useState<string>(initialTracks?.[0]?.id ?? "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"WORDS" | "SET" | "VALIDATE" | null>(null);
  const [result, setResult] = useState<ImportWisewordCsvActionResult | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function canImportWords() {
    const t = clean(text);
    if (mode === "JSON") return t.startsWith("[") || t.startsWith("{");
    return t.length > 0;
  }

  function canImportSet() {
    return canImportWords() && !!clean(slug);
  }

  // Parse CSV to extract words
  function parseCsv(csvText: string): Array<{ word: string; meaning: string }> {
    const lines = csvText.trim().split("\n");
    if (lines.length === 0) return [];

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const textIdx = header.indexOf("text");
    const meaningIdx = header.indexOf("meanings_ko");

    if (textIdx === -1 || meaningIdx === -1) return [];

    const result: Array<{ word: string; meaning: string }> = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts[textIdx] && parts[meaningIdx]) {
        result.push({
          word: parts[textIdx],
          meaning: parts[meaningIdx],
        });
      }
    }
    return result;
  }

  // Validate meanings
  async function doValidate() {
    setValidationResult(null);
    setBusy("VALIDATE");
    try {
      const words = mode === "CSV" ? parseCsv(text) : [];

      if (words.length === 0) {
        setValidationResult({
          ok: false,
          error: "No valid words found to validate",
        });
        return;
      }

      const response = await fetch("/api/vocab/validate-meanings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });

      const data = await response.json();
      setValidationResult(data);
    } finally {
      setBusy(null);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content ?? "");
      if (file.name.endsWith(".csv")) setMode("CSV");
      else if (file.name.endsWith(".json")) setMode("JSON");
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  async function doImportWordsOnly() {
    setResult(null);
    setBusy("WORDS");
    try {
      const r =
        mode === "CSV"
          ? await importWisewordWordsFromCsvText({ csvText: text })
          : await importWisewordWordsFromJsonText({ jsonText: text });
      setResult(r);
    } finally {
      setBusy(null);
    }
  }

  async function doImportAndCreateSet() {
    setResult(null);
    setBusy("SET");
    try {
      const common = {
        slug: clean(slug),
        title: clean(title) || null,
        description: clean(description) || null,
        track_id: trackId || null,
      };
      const r =
        mode === "CSV"
          ? await importWisewordWordsAndCreateSetFromCsvText({ ...common, csvText: text })
          : await importWisewordWordsAndCreateSetFromJsonText({ ...common, jsonText: text });
      setResult(r);
    } finally {
      setBusy(null);
    }
  }

  const csvExample = `text,lemma,pos,meanings_ko,meanings_en_simple,examples_easy
retire,retire,verb,은퇴하다,to stop working permanently,He will retire next year.
acquire,acquire,verb,획득하다,to get or obtain something,She acquired new skills.`;

  const jsonExample = `[
  {
    "text": "retire",
    "lemma": "retire",
    "pos": "verb",
    "meanings_ko": ["은퇴하다"],
    "meanings_en_simple": ["to stop working permanently"],
    "examples_easy": "He will retire next year."
  }
]`;

  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-4">
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-xl font-extrabold text-slate-900">Wiseword Import</div>
        <div className="mt-1 text-sm text-slate-600">단어 DB 직접 적재 · CSV 또는 JSON</div>

        {/* Mode toggle */}
        <div className="mt-4 inline-flex rounded-xl border overflow-hidden">
          {(["CSV", "JSON"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setText(""); setResult(null); }}
              className={[
                "px-5 py-2 text-sm font-extrabold",
                mode === m ? "bg-slate-900 text-white" : "bg-white text-slate-700",
              ].join(" ")}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Set info */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="text-xs font-semibold text-slate-600">slug (세트 생성 시 필수)</div>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. neungyul-day01"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600">title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 능률 Day 01"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600">description</div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="optional"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600">track</div>
            <select
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            >
              <option value="">-- 선택 안 함 --</option>
              {initialTracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title || track.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* File upload */}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            파일 업로드 (.csv / .json)
          </button>
          {text && (
            <span className="text-xs text-emerald-700 font-semibold">
              {text.split("\n").length}행 로드됨
            </span>
          )}
          <input ref={fileInputRef} type="file" accept=".csv,.json,.txt" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Text area */}
        <div className="mt-3">
          <div className="text-xs font-semibold text-slate-600">
            {mode === "CSV" ? "CSV 텍스트 (헤더 행 포함)" : "JSON 텍스트 ([{...}] 형태)"}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={mode === "CSV" ? csvExample : jsonExample}
            className="mt-1 h-56 w-full rounded-xl border p-3 font-mono text-[12px]"
          />
          {mode === "CSV" && (
            <div className="mt-1 text-xs text-slate-500">
              지원 컬럼: text, lemma, pos, meanings_ko, meanings_en_simple, examples_easy, synonyms_en_simple, notes
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          {mode === "CSV" && (
            <button
              onClick={doValidate}
              disabled={!canImportWords() || busy !== null}
              className="rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              {busy === "VALIDATE" ? "검증 중..." : "🔍 뜻 검증"}
            </button>
          )}
          <button
            onClick={doImportWordsOnly}
            disabled={!canImportWords() || busy !== null}
            className="rounded-xl border bg-white py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-50"
          >
            {busy === "WORDS" ? "Importing..." : "단어만 Import"}
          </button>
          <button
            onClick={doImportAndCreateSet}
            disabled={!canImportSet() || busy !== null}
            className="rounded-xl bg-black py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "SET" ? "Importing..." : "Import + 세트 생성/교체"}
          </button>
        </div>
      </div>

      {/* Validation Result */}
      {validationResult ? (
        <div className={`rounded-2xl border p-5 ${validationResult.ok && validationResult.issues.length === 0 ? "bg-emerald-50" : validationResult.ok ? "bg-amber-50" : "bg-rose-50"}`}>
          <div className={`font-semibold ${validationResult.ok && validationResult.issues.length === 0 ? "text-emerald-900" : validationResult.ok ? "text-amber-900" : "text-rose-900"}`}>
            {validationResult.ok
              ? validationResult.issues.length === 0
                ? "✅ 모든 뜻이 온전합니다"
                : `⚠️ ${validationResult.issues.filter((i: any) => i.severity === "error").length}개 에러, ${validationResult.issues.filter((i: any) => i.severity === "warning").length}개 경고`
              : "❌ 검증 실패"}
          </div>
          {validationResult.ok && validationResult.summary && (
            <div className="mt-2 text-sm text-slate-700">
              총 {validationResult.summary.total}개 중 {validationResult.summary.valid}개 정상 ·
              {validationResult.summary.hasErrors && " ❌ 에러 있음 ·"}
              {validationResult.summary.hasWarnings && " ⚠️ 경고 있음"}
            </div>
          )}
          {validationResult.issues && validationResult.issues.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900">
                상세 내용 ({validationResult.issues.length})
              </summary>
              <div className="mt-2 space-y-2 max-h-64 overflow-auto">
                {validationResult.issues.map((issue: any, idx: number) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-2 text-xs ${
                      issue.severity === "error"
                        ? "bg-rose-100 text-rose-900"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    <div className="font-semibold">
                      {issue.severity === "error" ? "❌" : "⚠️"} {issue.word}
                    </div>
                    <div className="text-slate-700 mt-1">"{issue.meaning}"</div>
                    <div className="mt-1">
                      {issue.issues.map((err: string, i: number) => (
                        <div key={i}>• {err}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
          <button
            onClick={() => setValidationResult(null)}
            className="mt-3 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            닫기
          </button>
        </div>
      ) : null}

      {result ? (
        <div className={`rounded-2xl border p-5 ${result.ok ? "bg-emerald-50" : "bg-rose-50"}`}>
          <div className={`font-semibold ${result.ok ? "text-emerald-900" : "text-rose-900"}`}>
            {result.ok ? "✅ 완료" : "❌ 실패"}
          </div>
          {result.ok ? (
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-800 md:grid-cols-4">
              {"setId" in result && result.setId && (
                <div className="col-span-2">setId: <span className="font-mono text-xs">{result.setId}</span></div>
              )}
              {"insertedWords" in result && <div>신규 단어: <strong>{(result as any).insertedWords}</strong></div>}
              {"existingWords" in result && <div>기존 단어: <strong>{(result as any).existingWords}</strong></div>}
              {"insertedSetItems" in result && <div>세트 항목: <strong>{(result as any).insertedSetItems}</strong></div>}
              {"totalRows" in result && <div>전체 행: <strong>{(result as any).totalRows}</strong></div>}
              {"skippedRows" in result && (result as any).skippedRows > 0 && (
                <div className="text-amber-800">스킵: <strong>{(result as any).skippedRows}</strong></div>
              )}
            </div>
          ) : (
            <div className="mt-2 text-sm text-rose-800 font-mono">{(result as any).error}</div>
          )}

          {"errors" in result && Array.isArray((result as any).errors) && (result as any).errors.length ? (
            <details className="mt-3">
              <summary className="text-xs font-semibold text-slate-700 cursor-pointer">
                errors ({(result as any).errors.length})
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded-xl border bg-white p-2 text-[11px] text-slate-700">
                {(result as any).errors.join("\n")}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
