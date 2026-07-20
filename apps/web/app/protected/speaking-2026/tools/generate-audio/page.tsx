"use client";

import { useState } from "react";
import { useGenerateSpeech } from "@/lib/elevenlabs/use-generate-speech";

export default function GenerateAudioPage() {
  const [text, setText] = useState("");
  const [results, setResults] = useState<Array<{ text: string; url: string; fileName: string }>>([]);
  const { generateAudio, loading, error } = useGenerateSpeech();

  const handleGenerate = async () => {
    if (!text.trim()) return;
    const result = await generateAudio(text);
    if (result) {
      setResults((prev) => [{ text, ...result }, ...prev]);
      setText("");
    }
  };

  const handleGenerateSentences = async () => {
    const sentences = [
      "The student center closes earlier on Fridays.",
      "Many international students attend orientation in the first week.",
      "Please remember to submit your assignment before midnight.",
      "The library will be under renovation during the summer term.",
      "Group projects help students develop communication skills.",
      "Some classes are offered both online and in person.",
      "You can book an appointment with your advisor using the portal.",
    ];

    for (const sentence of sentences) {
      const result = await generateAudio(sentence);
      if (result) {
        setResults((prev) => [{ text: sentence, ...result }, ...prev]);
      }
      // 레이트 제한 방지
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  };

  const handleGenerateTask1Audio = async () => {
    const task1Sentences = [
      "The student center closes earlier on Fridays.",
      "Many international students attend orientation in the first week.",
      "Please remember to submit your assignment before midnight.",
      "The library will be under renovation during the summer term.",
      "Group projects help students develop communication skills.",
      "Some classes are offered both online and in person.",
      "You can book an appointment with your advisor using the portal.",
    ];

    for (let i = 0; i < task1Sentences.length; i++) {
      const sentence = task1Sentences[i];
      const result = await generateAudio(sentence);
      if (result) {
        setResults((prev) => [{ text: `[Task 1 - Sentence ${i + 1}] ${sentence}`, ...result }, ...prev]);
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
        🎵 TTS 음성 생성 도구
      </h1>

      {/* 입력 영역 */}
      <div style={{ marginBottom: 30, padding: 20, backgroundColor: "#f5f5f5", borderRadius: 8 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="생성할 텍스트 입력 (500자 이내)"
          style={{
            width: "100%",
            height: 100,
            padding: 12,
            fontSize: 14,
            fontFamily: "monospace",
            borderRadius: 4,
            border: "1px solid #ddd",
            marginBottom: 12,
          }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleGenerate}
            disabled={loading || !text.trim()}
            style={{
              padding: "10px 20px",
              backgroundColor: loading ? "#ccc" : "#0073E6",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "생성 중..." : "생성"}
          </button>
          <button
            onClick={handleGenerateSentences}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: loading ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "생성 중..." : "Demo 문장 일괄 생성"}
          </button>
          <button
            onClick={handleGenerateTask1Audio}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: loading ? "#ccc" : "#ff6b6b",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {loading ? "생성 중..." : "🎤 Task 1 음성 생성 (7개)"}
          </button>
        </div>
        {error && <p style={{ color: "red", marginTop: 10 }}>❌ {error}</p>}
      </div>

      {/* 결과 */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          생성 결과 ({results.length})
        </h2>
        {results.length === 0 ? (
          <p style={{ color: "#999" }}>생성된 음성이 없습니다.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {results.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: 16,
                  backgroundColor: "#f9f9f9",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                }}
              >
                <p style={{ margin: "0 0 10px 0", fontSize: 14, fontWeight: 600 }}>
                  {idx + 1}. {item.text}
                </p>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <audio
                    controls
                    src={item.url}
                    style={{ height: 30, flex: 1 }}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(item.url)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#666",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    📋 Copy URL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 코드 예제 */}
      <div
        style={{
          marginTop: 40,
          padding: 20,
          backgroundColor: "#f0f0f0",
          borderRadius: 8,
          fontFamily: "monospace",
          fontSize: 12,
          whiteSpace: "pre-wrap",
          overflowX: "auto",
        }}
      >
        {`// 생성된 URL을 page.tsx에 복붙해서 사용:

const demoItems: ListenRepeatItem[] = [
  {
    id: "s1",
    sentence: "The student center closes earlier on Fridays.",
    audioUrl: "${results[0]?.url || 'https://...'}",
  },
  // ...
];`}
      </div>
    </div>
  );
}
