"use client";

import React, { useState } from "react";
import type { WordWithMeaning } from "../actions";

type ValidationIssue = {
  index: number;
  word: string;
  meaning: string;
  issues: string[];
  severity: "error" | "warning";
};

type ValidationState = {
  total: number;
  valid: number;
  hasErrors: boolean;
  hasWarnings: boolean;
  issues: ValidationIssue[];
};

type FilterType = "all" | "errors" | "warnings";

type Props = {
  initialWords: WordWithMeaning[];
};

export default function ValidateAllClient({ initialWords = [] }: Props) {
  const [validating, setValidating] = useState(false);
  const [validationState, setValidationState] = useState<ValidationState | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");

  async function handleValidateAll() {
    console.log("[ValidateAll] Starting validation...");
    console.log("[ValidateAll] initialWords count:", initialWords.length);

    setValidationState(null);
    setValidating(true);
    try {
      // Filter out words without meanings
      const wordsToValidate = initialWords
        .filter((w) => {
          if (!w.meanings_ko) return false;
          // Handle string, array, or other types
          const meaning = typeof w.meanings_ko === 'string'
            ? w.meanings_ko
            : Array.isArray(w.meanings_ko)
              ? w.meanings_ko.join(', ')
              : String(w.meanings_ko);
          return meaning.trim().length > 0;
        })
        .map((w) => {
          const meaning = typeof w.meanings_ko === 'string'
            ? w.meanings_ko
            : Array.isArray(w.meanings_ko)
              ? w.meanings_ko.join(', ')
              : String(w.meanings_ko);
          return {
            word: w.text,
            meaning: meaning.trim(),
          };
        });

      console.log("[ValidateAll] wordsToValidate count:", wordsToValidate.length);

      if (wordsToValidate.length === 0) {
        console.log("[ValidateAll] No words to validate!");
        setValidationState({
          total: 0,
          valid: 0,
          hasErrors: false,
          hasWarnings: false,
          issues: [],
        });
        return;
      }

      // Validate in batches (100 at a time)
      const batchSize = 100;
      const allIssues: ValidationIssue[] = [];

      for (let i = 0; i < wordsToValidate.length; i += batchSize) {
        const batch = wordsToValidate.slice(i, i + batchSize);
        const response = await fetch("/api/vocab/validate-meanings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words: batch }),
        });

        const data = await response.json();
        if (data.ok && data.issues) {
          // Add batch offset to index
          const batchIssues = data.issues.map((issue: ValidationIssue) => ({
            ...issue,
            index: issue.index + i,
          }));
          allIssues.push(...batchIssues);
        }
      }

      const hasErrors = allIssues.some((i) => i.severity === "error");
      const hasWarnings = allIssues.some((i) => i.severity === "warning");
      const validCount = wordsToValidate.length - allIssues.length;

      setValidationState({
        total: wordsToValidate.length,
        valid: validCount,
        hasErrors,
        hasWarnings,
        issues: allIssues,
      });
    } finally {
      setValidating(false);
    }
  }

  // Filter issues based on filterType and searchTerm
  const filteredIssues = validationState?.issues.filter((issue) => {
    const matchesFilter =
      filterType === "all" ||
      (filterType === "errors" && issue.severity === "error") ||
      (filterType === "warnings" && issue.severity === "warning");

    const matchesSearch =
      searchTerm === "" ||
      issue.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.meaning.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  }) ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl p-6 space-y-4">
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-xl font-extrabold text-slate-900">단어 전체 검증</div>
        <div className="mt-1 text-sm text-slate-600">
          DB에 저장된 모든 단어의 뜻을 AI가 검증합니다
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleValidateAll}
            disabled={validating || initialWords.length === 0}
            className="rounded-xl bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {validating ? "검증 중..." : "🔍 전체 검증 시작"}
          </button>
          {initialWords.length > 0 && (
            <span className="text-sm text-slate-600">
              총 {initialWords.length}개 단어
            </span>
          )}
        </div>
      </div>

      {/* Validation Results */}
      {validationState ? (
        <div
          className={`rounded-2xl border p-5 ${
            validationState.issues.length === 0 ? "bg-emerald-50" : "bg-amber-50"
          }`}
        >
          <div
            className={`font-semibold ${
              validationState.issues.length === 0 ? "text-emerald-900" : "text-amber-900"
            }`}
          >
            {validationState.issues.length === 0
              ? "✅ 모든 단어의 뜻이 온전합니다"
              : `⚠️ ${validationState.issues.filter((i) => i.severity === "error").length}개 에러, ${validationState.issues.filter((i) => i.severity === "warning").length}개 경고`}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-700 md:grid-cols-4">
            <div>
              검증됨: <strong>{validationState.total}</strong>
            </div>
            <div>
              정상: <strong>{validationState.valid}</strong>
            </div>
            {validationState.hasErrors && (
              <div className="text-rose-700">
                에러: <strong>{validationState.issues.filter((i) => i.severity === "error").length}</strong>
              </div>
            )}
            {validationState.hasWarnings && (
              <div className="text-amber-700">
                경고: <strong>{validationState.issues.filter((i) => i.severity === "warning").length}</strong>
              </div>
            )}
          </div>

          {/* Filter and Search */}
          {validationState.issues.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                {(["all", "errors", "warnings"] as FilterType[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterType(filter)}
                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                      filterType === filter
                        ? filter === "errors"
                          ? "bg-rose-200 text-rose-900"
                          : filter === "warnings"
                            ? "bg-amber-200 text-amber-900"
                            : "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {filter === "all"
                      ? `모두 (${validationState.issues.length})`
                      : filter === "errors"
                        ? `에러만 (${validationState.issues.filter((i) => i.severity === "error").length})`
                        : `경고만 (${validationState.issues.filter((i) => i.severity === "warning").length})`}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="단어 또는 뜻으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border px-4 py-2 text-sm"
              />
            </div>
          )}

          {/* Issues List */}
          {filteredIssues.length > 0 && (
            <div className="mt-4 space-y-2 max-h-96 overflow-auto">
              {filteredIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-3 ${
                    issue.severity === "error"
                      ? "bg-rose-100 text-rose-900"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  <div className="font-semibold">
                    {issue.severity === "error" ? "❌" : "⚠️"} {issue.word}
                  </div>
                  <div className="text-sm mt-1 opacity-90">"{issue.meaning}"</div>
                  <div className="text-xs mt-2">
                    {issue.issues.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredIssues.length === 0 && validationState.issues.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-white text-center text-sm text-slate-700">
              검색 또는 필터 결과가 없습니다
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
