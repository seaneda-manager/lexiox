"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { WordWithMeaning, VocabTrack, VocabSet } from "../actions";
import { fetchVocabSetsByTrack, fetchWordsForVocabSet, updateWord } from "../actions";

type ValidationIssue = {
  id: string;
  word: string;
  meaning: string;
  issues: string[];
  severity: "error" | "warning";
};

type FilterType = "all" | "errors" | "warnings";

type EditingWordId = string | null;

type Props = {
  initialTracks: VocabTrack[];
};

type EditingWord = {
  id: string;
  text: string;
  meanings_ko: string;
};

// 모지파케(깨진 한글) 감지 함수
function hasMojibake(text: string): boolean {
  const brokenRegex = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![uD800-\uDBFF])[\uDC00-\uDFFF]/g;
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

export default function ValidateAllClient({ initialTracks = [] }: Props) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [sets, setSets] = useState<VocabSet[]>([]);
  const [words, setWords] = useState<WordWithMeaning[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingWord, setEditingWord] = useState<EditingWord | null>(null);

  // Track 선택 시 Sets 로드
  const handleTrackChange = async (trackId: string) => {
    setSelectedTrackId(trackId);
    setSelectedSetId("");
    setWords([]);
    setSets([]);
    setLoading(true);

    if (!trackId) {
      setLoading(false);
      return;
    }

    const result = await fetchVocabSetsByTrack(trackId);
    if (result.ok) {
      setSets(result.sets);
    }
    setLoading(false);
  };

  // Set 선택 시 Words 로드
  const handleSetChange = async (setId: string) => {
    setSelectedSetId(setId);
    setWords([]);
    setError(null);
    setLoading(true);

    if (!setId) {
      setLoading(false);
      return;
    }

    const result = await fetchWordsForVocabSet(setId);
    if (result.ok) {
      setWords(result.words);
      setError(null);
    } else {
      setError(`단어 로드 실패: ${result.error}`);
    }
    setLoading(false);
  };

  // 단어 저장
  const handleSaveWord = async () => {
    if (!editingWord) return;

    setLoading(true);
    const result = await updateWord(editingWord.id, editingWord.text, editingWord.meanings_ko);

    if (result.ok) {
      // Update words list
      setWords(
        words.map((w) =>
          w.id === editingWord.id
            ? { ...w, text: editingWord.text, meanings_ko: editingWord.meanings_ko }
            : w,
        ),
      );
      setEditingId(null);
      setEditingWord(null);
    } else {
      setError(`저장 실패: ${result.error}`);
    }
    setLoading(false);
  };

  // 로컬 검증 수행
  const validationResults = useMemo(() => {
    const issues = words
      .map((word) => validateWord(word))
      .filter((issue) => issue !== null) as ValidationIssue[];

    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");

    return {
      total: words.length,
      valid: words.length - issues.length,
      issues,
      errors,
      warnings,
    };
  }, [words]);

  // 모든 단어를 문제 여부와 함께 정렬
  const allWordsWithStatus = useMemo(() => {
    const issueMap = new Map(
      validationResults.issues.map((issue) => [issue.id, issue])
    );

    return words
      .map((word) => ({
        word,
        issue: issueMap.get(word.id) || null,
      }))
      .sort((a, b) => {
        // 1. 에러 우선
        if (a.issue?.severity === "error" && b.issue?.severity !== "error")
          return -1;
        if (a.issue?.severity !== "error" && b.issue?.severity === "error")
          return 1;

        // 2. 경고 우선
        if (a.issue?.severity === "warning" && b.issue?.severity !== "warning")
          return -1;
        if (a.issue?.severity !== "warning" && b.issue?.severity === "warning")
          return 1;

        // 3. 알파벳 정렬
        return a.word.text.localeCompare(b.word.text);
      });
  }, [words, validationResults.issues]);

  // 필터링된 단어
  const filteredWords = useMemo(() => {
    return allWordsWithStatus.filter((item) => {
      const matchesFilter =
        filterType === "all" ||
        (filterType === "errors" && item.issue?.severity === "error") ||
        (filterType === "warnings" && item.issue?.severity === "warning");

      const matchesSearch =
        searchTerm === "" ||
        item.word.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.word.meanings_ko?.toString().toLowerCase().includes(searchTerm.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [allWordsWithStatus, filterType, searchTerm]);

  const selectedTrack = initialTracks.find((t) => t.id === selectedTrackId);
  const selectedSet = sets.find((s) => s.id === selectedSetId);

  return (
    <div className="mx-auto w-full max-w-6xl p-6 space-y-4">
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-xl font-extrabold text-slate-900">단어 검증 (코스별 단원별)</div>
        <div className="mt-1 text-sm text-slate-600">
          코스를 선택한 후 단원(Day)을 선택하여 단어를 검증합니다
        </div>

        {/* Dropdowns */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Track Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-600">📚 코스 선택</label>
            <select
              value={selectedTrackId}
              onChange={(e) => handleTrackChange(e.target.value)}
              className="mt-1 w-full rounded-lg border px-4 py-2 text-sm"
            >
              <option value="">-- 코스 선택 --</option>
              {initialTracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title}
                </option>
              ))}
            </select>
          </div>

          {/* Set Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-600">📖 단원(Day) 선택</label>
            <select
              value={selectedSetId}
              onChange={(e) => handleSetChange(e.target.value)}
              disabled={!selectedTrackId || loading || sets.length === 0}
              className="mt-1 w-full rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
            >
              <option value="">-- 단원 선택 --</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  Day {String(set.order_index).padStart(2, "0")}: {set.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary */}
        {selectedSet && (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-700 md:grid-cols-4">
              <div>
                선택됨: <strong>{selectedSet.title}</strong>
              </div>
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
            </div>
            {validationResults.total === 0 && !loading && (
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
                ⚠️ 이 날에 배정된 단어가 없습니다. vocab_set_items 테이블을 확인하세요.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-5">
          <div className="font-semibold text-red-900">
            ❌ 오류: {error}
          </div>
        </div>
      )}

      {/* Results - Show ALL words with status */}
      {selectedSet ? (
        words.length === 0 && !error ? (
          <div className="rounded-2xl border bg-slate-50 p-5 text-center text-slate-600">
            <div className="font-semibold">단어를 로드할 수 없습니다.</div>
            <div className="text-sm mt-2">vocab_set_items 테이블에 데이터가 없을 수 있습니다.</div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-white p-5">
            <div className="font-semibold text-slate-900">
              📋 전체 단어 ({words.length}개)
              {validationResults.issues.length > 0 && (
                <span className="text-rose-700 ml-2">• 문제: {validationResults.issues.length}개</span>
              )}
            </div>

            {/* Filter buttons */}
            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterType("all")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  filterType === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                전체 ({words.length})
              </button>
              {validationResults.errors.length > 0 && (
                <button
                  onClick={() => setFilterType("errors")}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    filterType === "errors"
                      ? "bg-rose-200 text-rose-900"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ❌ 에러 ({validationResults.errors.length})
                </button>
              )}
              {validationResults.warnings.length > 0 && (
                <button
                  onClick={() => setFilterType("warnings")}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                    filterType === "warnings"
                      ? "bg-amber-200 text-amber-900"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ⚠️ 경고 ({validationResults.warnings.length})
                </button>
              )}
              <button
                onClick={() => {
                  setFilterType("all");
                  setSearchTerm("");
                }}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                🔄 초기화
              </button>
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

            {/* Word List - Show ALL words */}
            {allWordsWithStatus.length > 0 && (
              <div className="mt-4 space-y-2 max-h-[600px] overflow-auto">
                {allWordsWithStatus
                  .filter((item) => {
                    const matchesFilter =
                      filterType === "all" ||
                      (filterType === "errors" && item.issue?.severity === "error") ||
                      (filterType === "warnings" && item.issue?.severity === "warning");

                    const matchesSearch =
                      searchTerm === "" ||
                      item.word.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.word.meanings_ko?.toString().toLowerCase().includes(searchTerm.toLowerCase());

                    return matchesFilter && matchesSearch;
                  })
                  .map((item) => (
                    <div
                      key={item.word.id}
                      className={`flex items-start gap-3 rounded-lg p-4 border transition-colors ${
                        item.issue?.severity === "error"
                          ? "bg-rose-50 border-rose-200 text-rose-900"
                          : item.issue?.severity === "warning"
                            ? "bg-amber-50 border-amber-200 text-amber-900"
                            : "bg-emerald-50 border-emerald-200 text-emerald-900"
                      }`}
                    >
                      <div className="flex-shrink-0 w-6 text-center font-bold pt-0.5 text-lg">
                        {item.issue?.severity === "error"
                          ? "❌"
                          : item.issue?.severity === "warning"
                            ? "⚠️"
                            : "✅"}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingId === item.word.id && editingWord ? (
                          <div className="space-y-2">
                            <div>
                              <label className="text-xs font-semibold text-slate-600">단어</label>
                              <input
                                type="text"
                                value={editingWord.text}
                                onChange={(e) =>
                                  setEditingWord({ ...editingWord, text: e.target.value })
                                }
                                className="mt-1 w-full rounded px-2 py-1 text-sm border border-slate-300 focus:border-blue-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-600">뜻</label>
                              <input
                                type="text"
                                value={editingWord.meanings_ko}
                                onChange={(e) =>
                                  setEditingWord({ ...editingWord, meanings_ko: e.target.value })
                                }
                                className="mt-1 w-full rounded px-2 py-1 text-sm border border-slate-300 focus:border-blue-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-bold text-base">{item.word.text}</div>
                            <div className="text-sm mt-1 font-medium">
                              {item.word.meanings_ko?.toString() || "(뜻 없음)"}
                            </div>
                            {item.issue && (
                              <div className="text-xs mt-2 opacity-80 space-y-0.5">
                                {item.issue.issues.map((err, i) => (
                                  <div key={i}>• {err}</div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {editingId === item.word.id ? (
                        <div className="flex-shrink-0 flex gap-2">
                          <button
                            onClick={handleSaveWord}
                            disabled={loading}
                            className="px-2 py-1 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {loading ? "저장중..." : "✓ 저장"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingWord(null);
                            }}
                            disabled={loading}
                            className="px-2 py-1 rounded text-xs font-semibold bg-slate-300 text-slate-700 hover:bg-slate-400 disabled:opacity-50"
                          >
                            ✕ 취소
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(item.word.id);
                            setEditingWord({
                              id: item.word.id,
                              text: item.word.text,
                              meanings_ko: item.word.meanings_ko?.toString() || "",
                            });
                          }}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 transition-colors"
                        >
                          ✎ 수정
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="rounded-2xl border bg-slate-50 p-5 text-center text-slate-600">
          코스와 단원을 선택하면 단어들이 나타납니다
        </div>
      )}
    </div>
  );
}
