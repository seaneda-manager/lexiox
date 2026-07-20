// ElevenLabs TTS API를 사용한 음성 생성
// 텍스트 → 음성 파일 (Supabase Storage에 저장)

import { createClient } from "@supabase/supabase-js";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";

// Voice Pool (환경 변수에서 로드)
let VOICE_POOL: string[] = [
  "GZ4PpFJV8ikEGUtBrjK7", // 0: Laura (US 여)
  "uIZsnBL0YK1S5j69bAih", // 1: Samantha (US 여)
  "ynUcJpglne1SRSNHFg1k", // 2: Bill (US 남)
  "Gubgw9l4dtIoQA9YZHgx", // 3: Brian (US 남)
  "Ix8C14HEHgIQkJswik2o", // 4: Peter (UK 남)
  "6fZce9LFNG3iEITDfqZZ", // 5: Charlotte (UK 여)
  "roYauZ4bOLAKvVZTPLre", // 6: Lena (Canada 여)
  "SHJeg1jtED7EW6Zr6rHc", // 7: Alex (Canada 남)
];

if (process.env.SPEAKING_VOICE_POOL) {
  try {
    VOICE_POOL = JSON.parse(process.env.SPEAKING_VOICE_POOL);
  } catch (error) {
    console.warn("Failed to parse SPEAKING_VOICE_POOL, using defaults:", error);
  }
}

const getVoiceId = (voiceIndex: number = 0): string => {
  return VOICE_POOL[voiceIndex % VOICE_POOL.length];
};

export type SpeechGenerationOptions = {
  voiceId?: string;
  voiceIndex?: number; // 0~7 (8명 중 선택)
  modelId?: "eleven_multilingual_v2" | "eleven_v3" | "eleven_flash_v2_5";
  stability?: number; // 0~1
  similarityBoost?: number; // 0~1
};

// ElevenLabs API에서 음성 blob 생성
async function generateSpeechBlob(
  text: string,
  options: SpeechGenerationOptions = {}
): Promise<Blob> {
  const {
    voiceId,
    voiceIndex = 0,
    modelId = "eleven_multilingual_v2",
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  const finalVoiceId = voiceId || getVoiceId(voiceIndex);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("ElevenLabs error response:", errorBody);
    throw new Error(
      `ElevenLabs API error: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  return response.blob();
}

// Supabase Storage에 음성 파일 저장
async function uploadToSupabase(
  blob: Blob,
  fileName: string
): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const { data, error } = await supabase.storage
    .from("content")
    .upload(fileName, blob, {
      contentType: "audio/mpeg",
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload error: ${error.message}`);
  }

  // 공개 URL 생성
  const { data: publicUrlData } = supabase.storage
    .from("content")
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

// 메인 함수: 텍스트 → 음성 URL
export async function generateSpeech(
  text: string,
  options: SpeechGenerationOptions = {}
): Promise<{ url: string; fileName: string }> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }

  // 파일명 생성 (텍스트 해시 기반)
  const hash = Buffer.from(text).toString("base64").slice(0, 12);
  const fileName = `listen-repeat/${Date.now()}-${hash}.mp3`;

  // 1. ElevenLabs에서 음성 생성
  const blob = await generateSpeechBlob(text, options);

  // 2. Supabase Storage에 업로드
  const url = await uploadToSupabase(blob, fileName);

  return { url, fileName };
}

// 대량 생성용 (배치 처리)
export async function generateSpeechBatch(
  items: Array<{ id: string; text: string }>,
  options: SpeechGenerationOptions = {}
): Promise<Array<{ id: string; url: string; fileName: string }>> {
  const results = [];

  for (const item of items) {
    try {
      const { url, fileName } = await generateSpeech(item.text, options);
      results.push({ id: item.id, url, fileName });
      // API 레이트 제한 방지 (ElevenLabs: 기본 ~20 req/min)
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`Failed to generate speech for ${item.id}:`, error);
      results.push({ id: item.id, url: "", fileName: "" });
    }
  }

  return results;
}
