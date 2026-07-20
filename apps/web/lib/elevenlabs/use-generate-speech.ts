// 클라이언트 훅: TTS API 호출
// 사용: const { generateAudio, loading, error } = useGenerateSpeech();

import { useState } from "react";

type SpeechOptions = {
  voiceId?: string;
  modelId?: "eleven_monolingual_v1" | "eleven_multilingual_v2";
  stability?: number;
  similarityBoost?: number;
};

type SpeechResult = {
  url: string;
  fileName: string;
};

export function useGenerateSpeech() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAudio = async (
    text: string,
    options?: SpeechOptions
  ): Promise<SpeechResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/speaking/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, ...options }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate audio");
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generateAudio, loading, error };
}
