"use client";

import { useEffect, useState } from "react";

type Question = {
  id: string;
  stem: string;
  choices: Array<{ id: string; text: string; isCorrect?: boolean }>;
  passage?: string;
  contextType?: string;
};

export default function GeminiPromptGenerator({ testId }: { testId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const res = await fetch(
          `/api/admin/reading/test/${testId}/questions`
        );
        const data = await res.json();
        if (data.ok) {
          setQuestions(data.questions || []);
          if (data.questions.length > 0) {
            setSelectedQuestion(data.questions[0]);
          }
        }
      } catch (e) {
        console.error("Load questions error:", e);
      } finally {
        setLoading(false);
      }
    };

    if (testId) {
      loadQuestions();
    }
  }, [testId]);

  useEffect(() => {
    if (selectedQuestion) {
      const correctChoice = selectedQuestion.choices.find(
        (c) => c.isCorrect
      );
      const promptText = `당신은 TOEFL Reading 문제의 해설을 작성하는 전문가입니다.

다음 문제를 분석하고, 아래 JSON 형식으로 한국어 해설을 작성해주세요:

【 문제 】
${selectedQuestion.stem}

【 선택지 】
${selectedQuestion.choices
  .map((c, i) => `${String.fromCharCode(65 + i)}. ${c.text}`)
  .join("\n")}

【 정답 】
${correctChoice?.text || "Unknown"}

${selectedQuestion.passage ? `【 지문 】\n${selectedQuestion.passage}` : ""}

【 요청 형식 】
다음 JSON 형식으로만 응답하세요:
{
  "question_id": "${selectedQuestion.id}",
  "test_id": "${testId}",
  "question_interpretation": "이 문제가 무엇을 묻는가?",
  "evidence_interpretation": "지문에서 정답과 관련된 부분이 무엇을 의미하는가?",
  "correct_choice_explanation": "정답이 맞는 이유",
  "incorrect_choices": [
    {
      "choiceId": "B",
      "interpretation": "선택지 B는 '~'를 의미함",
      "whyWrong": "지문에서 반박됨"
    }
  ],
  "vocabulary_notes": {
    "ubiquitous": "모든 곳에 있는, 만연한",
    "pragmatic": "실용적인"
  }
}`;

      setPrompt(promptText);
    }
  }, [selectedQuestion, testId]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">문제를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-gray-900">
        📋 Gemini 프롬프트 생성
      </h2>

      {questions.length === 0 ? (
        <p className="text-sm text-gray-600">문제가 없습니다.</p>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              문제 선택
            </label>
            <select
              value={selectedQuestion?.id || ""}
              onChange={(e) => {
                const q = questions.find((q) => q.id === e.target.value);
                if (q) setSelectedQuestion(q);
              }}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.id}: {q.stem.substring(0, 40)}...
                </option>
              ))}
            </select>
          </div>

          {selectedQuestion && (
            <div className="rounded-md border bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                📌 선택된 문제:
              </p>
              <p className="text-xs text-gray-600 mb-2">{selectedQuestion.stem}</p>
              <p className="text-xs text-gray-500">
                선택지: {selectedQuestion.choices.length}개
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Gemini용 프롬프트
              </label>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(prompt);
                  alert("✅ 프롬프트가 복사되었습니다!");
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                📋 복사
              </button>
            </div>
            <textarea
              value={prompt}
              readOnly
              className="w-full rounded-md border px-3 py-2 text-xs font-mono bg-gray-50 h-64"
            />
          </div>

          <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
            <p className="font-semibold mb-1">💡 사용 방법:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>위 "📋 복사" 버튼을 클릭</li>
              <li>Gemini Chat에 프롬프트를 붙여넣기</li>
              <li>Gemini의 응답(JSON)을 복사</li>
              <li>어드민 페이지의 "➕ 설명 직접 추가" 또는 "📤 JSON 업로드"에 붙여넣기</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
