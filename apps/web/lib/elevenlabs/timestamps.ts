import "server-only";

// 한글 발음으로 바꾼 음성용 문장(speech)을 한 번에 합성하면서 글자별 시간을 함께 받는다.
// 문장 단위 시간(start/end 초)을 자막 원문(narration)의 문장에 그대로 붙여, 영어가 들어간 자막·칠판을 음성과 맞춘다.

export type SentenceTiming = { text: string; start: number; end: number };

/** 문장 끝(. ? !)에서 나눈다. 앞뒤 공백을 뺀 조각과 원문에서의 위치를 돌려준다. */
export function splitSentences(text: string): { text: string; from: number; to: number }[] {
  const out: { text: string; from: number; to: number }[] = [];
  const re = /[^.?!]*[.?!]+|[^.?!]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const body = raw.trim();
    if (!body) continue;
    out.push({ text: body, from: m.index + lead, to: m.index + lead + body.length });
  }
  return out;
}

export async function synthesizeWithTimestamps(
  text: string,
  voiceId: string,
  modelId: string,
): Promise<{ audio: Buffer; alignment: { characters: string[]; start: number[]; end: number[] } }> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: modelId, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
    if (res.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = (await res.json()) as { audio_base64: string; alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] } };
    return {
      audio: Buffer.from(j.audio_base64, "base64"),
      alignment: {
        characters: j.alignment?.characters ?? [],
        start: j.alignment?.character_start_times_seconds ?? [],
        end: j.alignment?.character_end_times_seconds ?? [],
      },
    };
  }
  throw new Error("ElevenLabs 요청 실패");
}

/**
 * speech(음성용)와 narration(자막용, [en] 표시 제거본)의 문장 수가 같으면,
 * speech 문장별 시작/끝 시간을 narration 문장에 붙여 돌려준다. 문장 수가 다르면 null(맞출 수 없음).
 */
export function buildTimings(
  speech: string,
  narrationPlain: string,
  alignment: { characters: string[]; start: number[]; end: number[] },
): SentenceTiming[] | null {
  const a = splitSentences(speech);
  const b = splitSentences(narrationPlain);
  if (a.length === 0 || a.length !== b.length) return null;
  if (alignment.characters.join("") !== speech || alignment.start.length !== speech.length) return null;
  return a.map((s, i) => ({
    text: b[i].text,
    start: Math.round(alignment.start[s.from] * 100) / 100,
    end: Math.round(alignment.end[s.to - 1] * 100) / 100,
  }));
}
