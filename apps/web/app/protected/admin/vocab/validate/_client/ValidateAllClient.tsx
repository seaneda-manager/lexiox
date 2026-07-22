"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { WordWithMeaning } from "../actions";

type ValidationIssue = {
  id: string;
  word: string;
  meaning: string;
  issues: string[];
  severity: "error" | "warning";
};

type FilterType = "all" | "errors" | "warnings";

type Props = {
  initialWords: WordWithMeaning[];
};

// 모지파케(깨진 한글) 감지 함수
function hasMojibake(text: string): boolean {
  // 유효하지 않은 한글 범위를 감지
  const koreanRegex = /[가-힣]/g; // 완성된 한글
  const brokenRegex = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![uD800-\uDBFF])[\uDC00-\uDFFF]/g; // 깨진 유니코드

  return brokenRegex.test(text);
}

// 단어 검증 로직
function validateWord(word: WordWithMeaning): ValidationIssue | null {
  const issues: string[] = [];
  let severity: "error" | "warning" = "warning";

  // 뜻 정규화
  let meaning = "";
  if (typeof word.meanings_ko === "string") {
    meaning = word.meanings_ko;
  } else if (Array.isArray(word.meanings_ko)) {
    meaning = word.meanings_ko.join(", ");
  } else if (word.meanings_ko) {
    meaning = String(word.meanings_ko);
  }

  meaning = meaning.trim();

  // 1. 뜻이 없음
  if (!meaning) {
    issues.push("뜻이 없습니다");
    severity = "error";
  }

  // 2. 모지파케 감지
  if (hasMojibake(meaning)) {
    issues.push("깨진 한글(모지파케) 감지");
    severity = "error";
  }

  // 3. 뜻이 너무 짧음 (1-2글자)
  if (meaning.length < 2) {
    issues.push("뜻이 너무 짧습니다 (최소 2글자)");
    severity = "error";
  }

  // 4. 형식 문제: 끝에 comma
  if (meaning.endsWith(",")) {
    issues.push("끝에 쉼표가 있습니다");
    severity = "error";
  }

  // 5. 형식 문제: 앞에 comma
  if (meaning.startsWith(",")) {
    issues.push("앞에 쉼표가 있습니다");
    severity = "error";
  }

  // 6. 이중 comma
  if (meaning.includes(",,")) {
    issues.push("연속된 쉼표가 있습니다");
    severity = "error";
  }

  // 이슈가 없으면 null 반환
  return issues.length === 0 ? null : {
    id: word.id,
    word: word.text,
    meaning,
    issues,
    severity,
  };
}

export default function ValidateAllClient({ initialWords = [] }: Props) {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // 로컬 검증 수행
  const validationResults = useMemo(() => {
    const issues = initialWords
      .map((word) => validateWord(word))
      .filter((issue) => issue !== null) as ValidationIssue[];

    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");

    return {
      total: initialWords.length,
      valid: initialWords.length - issues.length,
      issues,
      errors,
      warnings,
    };
  }, [initialWords]);

  // 필터링된 이슈
  const filteredIssues = useMemo(() => {
    return validationResults.issues.filter((issue) => {
      const matchesFilter =
        filterType === "all" ||
        (filterType === "errors" && issue.severity === "error") ||
        (filterType === "warnings" && issue.severity === "warning");

      const matchesSearch =
        searchTerm === "" ||
        issue.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.meaning.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [validationResults.issues, filterType, searchTerm]);

  return (
    <div className="mx-auto w-full max-w-6xl p-6 space-y-4">
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-xl font-extrabold text-slate-900">단어 전체 검증</div>
        <div className="mt-1 text-sm text-slate-600">
          DB의 모든 단어를 로컬 검증 (모지파케, 형식 오류 등)
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-700 md:grid-cols-4">
          <div>
            총 단어: <strong>{validationResults.total}</strong>
          </div>
          <div>
            정상: <strong className="text-emerald-700">{validationResults.valid}</strong>
          </div>
          {validationResults.errors.length > 0 && (
            <div className="text-rose-700">
              에러: <strong>{validationResults.errors.length}</strong>
            </div>
          )}
          {validationResults.warnings.length > 0 && (
            <div className="text-amber-700">
              경고: <strong>{validationResults.warnings.length}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {validationResults.issues.length > 0 ? (
        <div className="rounded-2xl border bg-amber-50 p-5">
          <div className="font-semibold text-amber-900">
            ⚠️ {validationResults.issues.length}개 문제 발견
          </div>

          {/* Filter buttons */}
          <div className="mt-4 flex gap-2">
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
                  ? `모두 (${validationResults.issues.length})`
                  : filter === "errors"
                    ? `에러만 (${validationResults.errors.length})`
                    : `경고만 (${validationResults.warnings.length})`}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mt-3">
            <input
              type="text"
              placeholder="단어 또는 뜻으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border px-4 py-2 text-sm"
            />
          </div>

          {/* Issues List */}
          {filteredIssues.length > 0 && (
            <div className="mt-4 space-y-2 max-h-[600px] overflow-auto">
              {filteredIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/admin/vocab/words/${issue.id}/edit`}
                  className={`block rounded-lg p-3 transition-colors ${
                    issue.severity === "error"
                      ? "bg-rose-100 text-rose-900 hover:bg-rose-200"
                      : "bg-amber-100 text-amber-900 hover:bg-amber-200"
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
                </Link>
              ))}
            </div>
          )}

          {filteredIssues.length === 0 && validationResults.issues.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-white text-center text-sm text-slate-700">
              검색 또는 필터 결과가 없습니다
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border bg-emerald-50 p-5">
          <div className="font-semibold text-emerald-900">
            ✅ 모든 단어가 정상입니다!
          </div>
        </div>
      )}
    </div>
  );
}
