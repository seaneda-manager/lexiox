import "server-only";
import { splitAuto, splitByTags, stripTags, type LangPart } from "@/lib/elevenlabs/mixedText";

// 한국어 설명 속 영어 단어·예문을 영어로 읽히기 위한 구간별 음성 합성.
//  - 한국어 구간은 koVoiceId(선생님 클론), 영어 구간은 enVoiceId(없으면 koVoiceId)로 따로 만든다.
//  - 앞뒤 구간 텍스트(previous_text / next_text)를 함께 보내 억양이 끊기지 않게 한다.
//  - 구간 결과(mp3)는 하나로 이어 붙여 돌려준다 → 기존 플레이어/저장 구조 그대로.

export type SplitMode = "whole" | "auto" | "tags";

export type SynthOptions = {
  koVoiceId: string;
  enVoiceId?: string;
  modelId: string;
  mode: SplitMode;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speed?: number;
  useContext?: boolean; // previous_text / next_text 전달
};

export type SynthResult = { audio: Buffer; parts: LangPart[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 모드에 맞게 대본을 구간으로 나눈다. whole 이면 구간 하나(언어 자동). */
export function planParts(text: string, mode: SplitMode): LangPart[] {
  if (mode === "tags") return splitByTags(text);
  if (mode === "auto") return splitAuto(text);
  const plain = stripTags(text).replace(/\s+/g, " ").trim();
  return plain ? [{ lang: "auto", text: plain }] : [];
}

async function synthPart(text: string, voiceId: string, o: SynthOptions, prev?: string, next?: string, lang?: "en" | "ko"): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");

  const voice_settings: Record<string, number> = {
    stability: o.stability ?? 0.5,
    similarity_boost: o.similarityBoost ?? 0.75,
  };
  if (typeof o.style === "number") voice_settings.style = o.style;
  if (typeof o.speed === "number") voice_settings.speed = o.speed;

  const body: Record<string, unknown> = { text, model_id: o.modelId, voice_settings };
  if (o.useContext !== false) {
    if (prev) body.previous_text = prev;
    if (next) body.next_text = next;
  }

  // 언어를 명시하면 "he", "that" 같은 짧은 단어도 한국어식으로 읽히지 않는다.
  // (language_code 를 지원하지 않는 모델이면 400 이 오므로 그 경우 빼고 다시 시도)
  let withLang = !!lang;
  if (withLang) body.language_code = lang;

  // 요청 한도(429)일 때는 잠깐 쉬고 다시 시도한다
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify(body),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 400 && withLang) {
      const msg = await res.text();
      if (/language/i.test(msg)) {
        withLang = false;
        delete body.language_code;
        attempt--;
        continue;
      }
      throw new Error(`ElevenLabs 400: ${msg.slice(0, 400)}`);
    }
    if (res.status === 429 && attempt < 2) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  throw new Error("ElevenLabs 요청 실패");
}

export async function synthesizeNarration(text: string, o: SynthOptions): Promise<SynthResult> {
  const parts = planParts(text, o.mode);
  if (parts.length === 0) throw new Error("읽을 텍스트가 없습니다.");

  const buffers: Buffer[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const voice = p.lang === "en" && o.enVoiceId ? o.enVoiceId : o.koVoiceId;
    // 영어 구간에는 한국어 앞뒤 문맥을 보내지 않는다(발음이 한국어 쪽으로 끌려감)
    const sameLang = (x: LangPart) => x.lang === p.lang;
    const prev = p.lang === "en" ? "" : parts.slice(Math.max(0, i - 2), i).filter(sameLang).map((x) => x.text).join(" ").slice(-200);
    const next = p.lang === "en" ? "" : parts.slice(i + 1, i + 3).filter(sameLang).map((x) => x.text).join(" ").slice(0, 200);
    const lang = p.lang === "en" ? "en" : p.lang === "ko" ? "ko" : undefined;
    buffers.push(await synthPart(p.text, voice, o, prev || undefined, next || undefined, lang));
  }
  return { audio: Buffer.concat(buffers), parts };
}
