"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import GeminiPromptGenerator from "./GeminiPromptGenerator";

type Test = { id: string; label: string };
type Explanation = {
  id: string;
  question_id: string;
  test_id: string;
  question_interpretation: string | null;
  evidence_interpretation: string | null;
  correct_choice_explanation: string | null;
  incorrect_choices: any;
  vocabulary_notes: any;
  created_at: string;
  updated_at: string;
};

export default function ExplanationGeneratorClient({ tests }: { tests: Test[] }) {
  const searchParams = useSearchParams();
  const queryTestId = searchParams.get("testId");
  const [selectedTestId, setSelectedTestId] = useState(queryTestId || tests[0]?.id || "");
  const [generating, setGenerating] = useState(false);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Explanation> | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExplanation, setNewExplanation] = useState<Partial<Explanation>>({
    question_id: "",
    question_interpretation: "",
    evidence_interpretation: "",
    correct_choice_explanation: "",
    incorrect_choices: [],
    vocabulary_notes: {},
  });
  const [showGeminiPrompt, setShowGeminiPrompt] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  // 설명 로드
  const loadExplanations = async (testId: string) => {
    if (!testId) return;
    const res = await fetch(
      `/api/admin/reading/explanations?testId=${testId}`
    );
    const data = await res.json();
    if (data.ok) {
      setExplanations(data.explanations || []);
    }
  };

  useEffect(() => {
    if (selectedTestId) {
      loadExplanations(selectedTestId);
    }
  }, [selectedTestId]);

  // 설명 생성
  const handleGenerate = async () => {
    if (!selectedTestId) {
      alert("테스트를 선택하세요");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/admin/reading/generate-explanations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId: selectedTestId }),
      });

      const data = await res.json();
      if (!data.ok) {
        alert(`생성 실패: ${data.error}`);
        return;
      }

      alert(`✅ ${data.generated}개 설명 생성 완료!`);
      await loadExplanations(selectedTestId);
    } catch (e) {
      console.error("Generate error:", e);
      alert("생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  // 수정 시작
  const startEditing = (exp: Explanation) => {
    setEditingId(exp.id);
    setEditData({ ...exp });
  };

  // 수정 저장
  const saveEdit = async () => {
    if (!editData || !editingId) return;

    try {
      const res = await fetch(`/api/admin/reading/explanation/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      const data = await res.json();
      if (!data.ok) {
        alert(`저장 실패: ${data.error}`);
        return;
      }

      alert("✅ 저장되었습니다");
      setEditingId(null);
      setEditData(null);
      await loadExplanations(selectedTestId);
    } catch (e) {
      console.error("Save error:", e);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  // 새 설명 추가
  const addNewExplanation = async () => {
    if (!newExplanation.question_id) {
      alert("question_id를 입력하세요");
      return;
    }

    try {
      const res = await fetch("/api/admin/reading/explanation/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newExplanation,
          test_id: selectedTestId,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        alert(`추가 실패: ${data.error}`);
        return;
      }

      alert("✅ 설명이 추가되었습니다");
      setShowAddForm(false);
      setNewExplanation({
        question_id: "",
        question_interpretation: "",
        evidence_interpretation: "",
        correct_choice_explanation: "",
        incorrect_choices: [],
        vocabulary_notes: {},
      });
      await loadExplanations(selectedTestId);
    } catch (e) {
      console.error("Add error:", e);
      alert("추가 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. 테스트 선택 & 생성 */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              테스트 선택
            </label>
            <select
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">-- 테스트 선택 --</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={!selectedTestId || generating}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {generating ? "생성 중..." : "✨ AI로 설명 생성"}
            </button>
          </div>
        </div>
      </div>

      {/* 1.5. Gemini 프롬프트 생성 */}
      {selectedTestId && (
        <GeminiPromptGenerator testId={selectedTestId} />
      )}

      {/* 2. JSON 업로드 */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          📤 JSON 파일 업로드 (Bulk)
        </h2>
        <p className="text-xs text-gray-600 mb-4">
          JSON 배열 형식으로 여러 설명을 한 번에 업로드하세요.
        </p>

        <div className="space-y-3">
          <textarea
            placeholder={`[
  {
    "question_id": "q1",
    "test_id": "reading-2026-sample-1",
    "question_interpretation": "이 문제는...",
    "evidence_interpretation": "지문에서...",
    "correct_choice_explanation": "정답이 맞는 이유는...",
    "vocabulary_notes": {"단어": "정의"}
  },
  ...
]`}
            className="w-full rounded-md border px-3 py-2 text-sm font-mono h-40"
            id="json-input"
          />

          <button
            onClick={async () => {
              const jsonText = (
                document.getElementById("json-input") as HTMLTextAreaElement
              )?.value;
              if (!jsonText.trim()) {
                alert("JSON을 입력하세요");
                return;
              }

              try {
                const data = JSON.parse(jsonText);
                const res = await fetch(
                  "/api/admin/reading/explanations/bulk-upload",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  }
                );

                const result = await res.json();
                if (!result.ok) {
                  alert(`업로드 실패: ${result.error}`);
                  return;
                }

                alert(`✅ ${result.count}개 설명 업로드 완료!`);
                (document.getElementById("json-input") as HTMLTextAreaElement).value = "";
                await loadExplanations(selectedTestId);
              } catch (e: any) {
                alert(
                  `오류: ${e.message || "JSON 형식이 잘못되었습니다"}`
                );
              }
            }}
            className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
          >
            📤 업로드
          </button>
        </div>
      </div>

      {/* 3. 새 설명 추가 */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">➕ 설명 직접 추가</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {showAddForm ? "닫기" : "추가 폼 열기"}
          </button>
        </div>

        {showAddForm && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Question ID
              </label>
              <input
                value={newExplanation.question_id || ""}
                onChange={(e) =>
                  setNewExplanation({
                    ...newExplanation,
                    question_id: e.target.value,
                  })
                }
                placeholder="q1_item1"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <textarea
              value={newExplanation.question_interpretation || ""}
              onChange={(e) =>
                setNewExplanation({
                  ...newExplanation,
                  question_interpretation: e.target.value,
                })
              }
              placeholder="문제 해석"
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={2}
            />

            <textarea
              value={newExplanation.evidence_interpretation || ""}
              onChange={(e) =>
                setNewExplanation({
                  ...newExplanation,
                  evidence_interpretation: e.target.value,
                })
              }
              placeholder="근거 해석"
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={2}
            />

            <textarea
              value={newExplanation.correct_choice_explanation || ""}
              onChange={(e) =>
                setNewExplanation({
                  ...newExplanation,
                  correct_choice_explanation: e.target.value,
                })
              }
              placeholder="정답 설명"
              className="w-full rounded-md border px-3 py-2 text-sm"
              rows={2}
            />

            <textarea
              value={JSON.stringify(
                newExplanation.vocabulary_notes || {},
                null,
                2
              )}
              onChange={(e) => {
                try {
                  setNewExplanation({
                    ...newExplanation,
                    vocabulary_notes: JSON.parse(e.target.value),
                  });
                } catch {}
              }}
              placeholder='{"단어": "정의"}'
              className="w-full rounded-md border px-3 py-2 text-sm font-mono"
              rows={3}
            />

            <div className="flex gap-2">
              <button
                onClick={addNewExplanation}
                className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                ➕ 추가
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 rounded-md border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. 설명 목록 */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">
          생성된 설명 ({explanations.length}개)
        </h2>

        {explanations.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-600">
              테스트를 선택하고 "AI로 설명 생성" 버튼을 클릭하세요.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {explanations.map((exp) =>
              editingId === exp.id ? (
                // 편집 모드
                <div
                  key={exp.id}
                  className="rounded-lg border-2 border-blue-400 bg-blue-50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      Q: {exp.question_id}
                    </span>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ✕ 취소
                    </button>
                  </div>

                  <textarea
                    value={editData?.question_interpretation || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData!,
                        question_interpretation: e.target.value,
                      })
                    }
                    placeholder="문제 해석"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    rows={2}
                  />

                  <textarea
                    value={editData?.evidence_interpretation || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData!,
                        evidence_interpretation: e.target.value,
                      })
                    }
                    placeholder="근거 해석"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    rows={2}
                  />

                  <textarea
                    value={editData?.correct_choice_explanation || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData!,
                        correct_choice_explanation: e.target.value,
                      })
                    }
                    placeholder="정답 설명"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    rows={2}
                  />

                  <textarea
                    value={JSON.stringify(editData?.vocabulary_notes || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        setEditData({
                          ...editData!,
                          vocabulary_notes: JSON.parse(e.target.value),
                        });
                      } catch {}
                    }}
                    placeholder='{"단어": "정의"}'
                    className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                    rows={3}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      💾 저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 rounded-md border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                // 읽기 모드
                <div
                  key={exp.id}
                  className="rounded-lg border bg-white p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Q: {exp.question_id}
                    </span>
                    <button
                      onClick={() => startEditing(exp)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      ✏️ 수정
                    </button>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      <span className="font-semibold">문제:</span>{" "}
                      {exp.question_interpretation || "-"}
                    </p>
                    <p>
                      <span className="font-semibold">근거:</span>{" "}
                      {exp.evidence_interpretation || "-"}
                    </p>
                    <p>
                      <span className="font-semibold">정답:</span>{" "}
                      {exp.correct_choice_explanation || "-"}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
