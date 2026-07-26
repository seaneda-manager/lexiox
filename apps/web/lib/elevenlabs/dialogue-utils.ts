// Dialogue TTS: 화자별 다중 음성 생성 유틸

export interface DialogueSegment {
  speaker: string;
  text: string;
  order: number;
}

export interface SpeakerVoiceMap {
  [speakerName: string]: string;
}

// 줄 맨 앞의 화자 레이블로 인정할 패턴: "Speaker A", "Student", "Professor", "Resident Advisor" 등
// 대문자로 시작하는 1~3 단어, 특수문자/문장부호 없음 (실제 문장이 콜론을 포함해 오탐되는 것 방지)
const SPEAKER_LABEL_RE = /^[A-Z][a-zA-Z]*(?:\s[A-Z][a-zA-Z]*){0,2}$/;

// Dialogue transcript 파싱 (화자별 세그멘테이션)
// 형식: "Speaker A: ..." 뿐 아니라 "Student: ...", "Professor: ..." 등 실제 역할명 라벨도 인식
// (AI가 프롬프트의 "Speaker A/B" 지시를 따르지 않고 역할명을 쓰는 경우가 흔함)
export function parseDialogueTranscript(transcript: string): DialogueSegment[] {
  const segments: DialogueSegment[] = [];

  // 줄 단위 파싱이 가장 안정적
  const lines = transcript.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const speakerPart = line.substring(0, colonIdx).trim();
    const textPart = line.substring(colonIdx + 1).trim();

    if (!SPEAKER_LABEL_RE.test(speakerPart)) continue;

    // 따옴표 제거
    let text = textPart;
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1);
    }

    if (text.length === 0) continue;

    segments.push({
      speaker: speakerPart,
      text,
      order: segments.length,
    });
  }

  return segments;
}

// 화자별로 고정된 음성 ID 할당
// 같은 dialogue 내에서 화자는 항상 같은 음성으로 읽음
export function assignVoicesToSpeakers(
  segments: DialogueSegment[],
  voicePool: string[]
): SpeakerVoiceMap {
  const uniqueSpeakers = [...new Set(segments.map((s) => s.speaker))];
  const voiceMap: SpeakerVoiceMap = {};

  uniqueSpeakers.forEach((speaker, idx) => {
    voiceMap[speaker] = voicePool[idx % voicePool.length];
  });

  return voiceMap;
}

// Dialogue인지 판단 (여러 화자 존재 여부)
export function isDialogue(transcript: string): boolean {
  const segments = parseDialogueTranscript(transcript);
  const uniqueSpeakers = new Set(segments.map((s) => s.speaker));
  return uniqueSpeakers.size > 1;
}
