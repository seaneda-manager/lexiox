// apps/web/lib/listening/script-timing.ts
//
// Study 모드에서 오디오 재생 위치에 맞춰 스크립트 문장을 하이라이트하려면
// 문장별 시작/종료 시각이 필요하다. 그런데 지금 생성되는 시험 데이터에는
// 평문 transcript만 있고 타임스탬프가 없다.
//
// 그래서 두 경로를 모두 지원한다:
//   1) scriptSegments(정렬된 실제 타임스탬프)가 있으면 그대로 쓴다.
//   2) 없으면 transcript를 문장으로 쪼개고, 각 문장의 단어 수 비율로
//      오디오 전체 길이를 배분해 추정한다.
//
// 추정치는 화자가 쉬거나 말이 빨라지면 어긋나므로, 나중에 정렬 API를 붙여
// scriptSegments를 채우면 이 파일을 고치지 않아도 정확해진다.
import type { ScriptSegment } from "@/models/listening";

export interface ScriptLine {
  id: string;
  /** "Speaker A", "Professor" 등. 없으면 화자 표기 없는 단일 화자 스크립트. */
  speaker?: string;
  text: string;
  startTime: number;
  endTime: number;
  /** 추정 타이밍이면 true — UI에서 "대략적 위치"임을 알릴 때 쓴다. */
  estimated: boolean;
}

/** "Speaker A: 안녕" 처럼 앞에 붙는 화자 라벨을 분리한다. */
function splitSpeaker(line: string): { speaker?: string; text: string } {
  const m = line.match(/^\s*([A-Za-z][A-Za-z .]{0,24}?)\s*:\s*(.+)$/);
  if (!m) return { text: line.trim() };
  return { speaker: m[1].trim(), text: m[2].trim() };
}

/**
 * 문장 단위로 자른다. 줄바꿈을 먼저 존중하고(대화문은 보통 줄로 화자가 갈린다),
 * 그다음 문장부호로 쪼갠다. 축약형(Mr., U.S.)에서 잘리는 걸 피하려고
 * 마침표 뒤에 공백+대문자가 오는 경우만 경계로 본다.
 */
function splitSentences(transcript: string): { speaker?: string; text: string }[] {
  const out: { speaker?: string; text: string }[] = [];

  for (const rawLine of transcript.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const { speaker, text } = splitSpeaker(line);
    const pieces = text
      .split(/(?<=[.!?])\s+(?=[“"'(\[]?[A-Z0-9])/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const piece of pieces.length ? pieces : [text]) {
      out.push({ speaker, text: piece });
    }
  }

  return out;
}

function countWords(text: string): number {
  const n = text.trim().split(/\s+/).filter(Boolean).length;
  return n > 0 ? n : 1;
}

/**
 * 스크립트 라인 + 타이밍을 만든다.
 *
 * @param transcript 평문 스크립트 (없으면 빈 배열)
 * @param durationSeconds 오디오 실제 길이. 0이거나 모르면 타이밍 없이 텍스트만 반환.
 * @param scriptSegments 정렬된 타임스탬프가 있으면 이쪽이 우선한다.
 */
export function buildScriptLines(
  transcript: string | undefined,
  durationSeconds: number,
  scriptSegments?: ScriptSegment[],
): ScriptLine[] {
  if (scriptSegments?.length) {
    return scriptSegments.map((seg, i) => ({
      id: seg.id || `seg-${i}`,
      speaker: seg.speaker,
      text: seg.text,
      startTime: seg.startTime,
      endTime: seg.endTime,
      estimated: false,
    }));
  }

  const sentences = splitSentences(transcript ?? "");
  if (!sentences.length) return [];

  // 길이를 모르면 하이라이트는 못 하지만 스크립트 자체는 보여준다.
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return sentences.map((s, i) => ({
      id: `est-${i}`,
      speaker: s.speaker,
      text: s.text,
      startTime: 0,
      endTime: 0,
      estimated: true,
    }));
  }

  const weights = sentences.map((s) => countWords(s.text));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let elapsed = 0;
  return sentences.map((s, i) => {
    const start = elapsed;
    elapsed += (weights[i] / totalWeight) * durationSeconds;
    // 마지막 문장은 부동소수 누적 오차로 끝을 못 채우는 걸 막는다.
    const end = i === sentences.length - 1 ? durationSeconds : elapsed;
    return {
      id: `est-${i}`,
      speaker: s.speaker,
      text: s.text,
      startTime: start,
      endTime: end,
      estimated: true,
    };
  });
}

/** 현재 재생 시각에 해당하는 라인 인덱스. 없으면 -1. */
export function activeLineIndex(lines: ScriptLine[], currentTime: number): number {
  if (!lines.length) return -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].endTime <= lines[i].startTime) continue; // 타이밍 없는 라인
    if (currentTime >= lines[i].startTime && currentTime < lines[i].endTime) return i;
  }
  // 마지막 문장 끝을 넘어 재생 중이면 마지막 문장을 유지한다.
  const last = lines[lines.length - 1];
  if (last.endTime > 0 && currentTime >= last.endTime) return lines.length - 1;
  return -1;
}
