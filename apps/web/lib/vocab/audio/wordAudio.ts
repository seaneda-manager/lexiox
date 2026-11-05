/**
 * 단어 발음 오디오 (ElevenLabs로 미리 만들어 Supabase Storage에 저장한 mp3).
 *
 * - 저장 위치: 공개 버킷 `content` 의 `vocab-audio/<slug>.mp3`  (slug = 단어 철자 기반, DB 컬럼 불필요)
 * - 재생: 파일이 있으면 그것을, 없거나 실패하면 브라우저 내장 TTS로 대신한다.
 */

export const WORD_AUDIO_BUCKET = "content";
export const WORD_AUDIO_FOLDER = "vocab-audio";

/** 단어 → 파일 이름 (소문자, 공백→_, 영숫자/_/- 외 제거). 서버·브라우저 공통 */
export function wordAudioSlug(text: string): string {
  return String(text ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "");
}

export function wordAudioPath(text: string): string {
  return `${WORD_AUDIO_FOLDER}/${wordAudioSlug(text)}.mp3`;
}

export function wordAudioUrl(text: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const slug = wordAudioSlug(text);
  if (!base || !slug) return null;
  return `${base}/storage/v1/object/public/${WORD_AUDIO_BUCKET}/${wordAudioPath(text)}`;
}

// ---- 브라우저 전용 ----
const missing = new Set<string>(); // 파일이 없다고 확인된 단어 (다시 요청하지 않음)
let current: HTMLAudioElement | null = null;

function speakFallback(text: string, rate = 0.85) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* 소리 재생 실패는 학습을 막지 않는다 */
  }
}

/** 단어 발음 재생. 저장된 음성이 있으면 그것을, 없으면 브라우저 TTS */
export function playWordAudio(text: string): void {
  if (typeof window === "undefined") return;
  const slug = wordAudioSlug(text);
  const url = wordAudioUrl(text);
  if (!url || missing.has(slug)) return speakFallback(text);

  try {
    current?.pause();
    window.speechSynthesis?.cancel();
    const a = new Audio(url);
    current = a;
    a.onerror = () => {
      missing.add(slug);
      speakFallback(text);
    };
    a.play().catch(() => {
      // 자동재생 차단 등 — 파일 문제가 아닐 수 있으니 missing 표시는 하지 않고 TTS로
      speakFallback(text);
    });
  } catch {
    speakFallback(text);
  }
}
