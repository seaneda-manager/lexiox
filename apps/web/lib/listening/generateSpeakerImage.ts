import { getServiceSupabase } from "@/lib/supabase/service";

export type SpeakerTaskKind = "choose_response" | "conversation" | "announcement" | "academic_talk";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

// 트랙마다 다른 사람이 나오도록 매번 랜덤하게 조합한다 (실제 ETS 화면처럼 다양한 화자).
const GENDERS = ["woman", "man"];
const HAIR = ["short brown hair", "long blonde hair", "black hair", "curly hair", "gray hair"];
const OUTFITS = ["navy blazer", "light blue button-up shirt", "burgundy sweater", "olive green polo shirt", "gray cardigan"];
const AGES = ["young adult", "middle-aged", "in their 30s"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function singlePersonPrompt(): string {
  return `Professional studio headshot photo of a ${pick(AGES)} ${pick(GENDERS)} wearing a ${pick(OUTFITS)}, ` +
    `${pick(HAIR)}, upper body, standing, arms relaxed, plain light gray background, ` +
    `neutral friendly expression, soft studio lighting, high quality photography, no text`;
}

function conversationPrompt(): string {
  const personA = `${pick(AGES)} ${pick(GENDERS)} wearing a ${pick(OUTFITS)}`;
  const personB = `${pick(AGES)} ${pick(GENDERS)} wearing a ${pick(OUTFITS)}`;
  return `Professional studio photo of two people facing each other mid-conversation, ` +
    `one is a ${personA}, the other is a ${personB}, both standing, plain light gray background, ` +
    `natural conversational gestures, soft studio lighting, high quality photography, no text`;
}

function buildPrompt(taskKind: SpeakerTaskKind): string {
  return taskKind === "conversation" ? conversationPrompt() : singlePersonPrompt();
}

/**
 * Listening 트랙용 화자 이미지를 생성해 Storage에 올리고 public URL을 반환한다.
 * HF 키가 없거나 API 호출이 실패하면 ''을 반환한다 — 러너 쪽 SpeakerVisual이
 * 빈 문자열을 실루엣 placeholder로 처리하므로, 실패가 시험 생성 자체를 막지 않는다.
 */
export async function generateSpeakerImage(taskKind: SpeakerTaskKind): Promise<string> {
  if (!HF_API_KEY) {
    console.warn("[generateSpeakerImage] HUGGINGFACE_API_KEY not configured — skipping image generation");
    return "";
  }

  try {
    const prompt = buildPrompt(taskKind);

    const res = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[generateSpeakerImage] HuggingFace API error:", res.status, text);
      return "";
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // speaking-assets 버킷을 재사용한다 (listening-assets 전용 버킷을 새로 만들 필요 없이
    // 폴더 프리픽스만 분리 — app/api/admin/updated-speaking/upload/route.ts와 동일한 방식).
    const path = `listening-assets/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const supabase = getServiceSupabase();
    const { error } = await supabase.storage
      .from("speaking-assets")
      .upload(path, buffer, { contentType: "image/png", upsert: false });

    if (error) {
      console.error("[generateSpeakerImage] Storage upload error:", error);
      return "";
    }

    const { data: { publicUrl } } = supabase.storage.from("speaking-assets").getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    console.error("[generateSpeakerImage] Unexpected error:", err);
    return "";
  }
}
