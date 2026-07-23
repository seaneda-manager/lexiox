// Dialogue TTS: 화자별 다중 음성 생성 유틸

export interface DialogueSegment {
  speaker: string;
  text: string;
  order: number;
}

export interface SpeakerVoiceMap {
  [speakerName: string]: string;
}

// Dialogue transcript 파싱 (화자별 세그멘테이션)
// 형식: Speaker A: "..." 또는 Speaker A: ... (따옴표 없음)
export function parseDialogueTranscript(transcript: string): DialogueSegment[] {
  const segments: DialogueSegment[] = [];

  // 줄 단위 파싱이 가장 안정적
  const lines = transcript.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const speakerPart = line.substring(0, colonIdx).trim();
    const textPart = line.substring(colonIdx + 1).trim();

    // "Speaker A" 형식 확인
    if (!speakerPart.startsWith('Speaker ')) continue;

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
