// 음성 품질 분석 시스템

export interface AudioQuality {
  volumeLevel: "too_quiet" | "good" | "too_loud";
  noiseLevel: "clean" | "some_noise" | "very_noisy";
  clarity: "clear" | "muffled" | "very_unclear";
  duration: number; // 초
  confidence: number; // 0-100
  isAcceptable: boolean;
  suggestions: string[];
}

/**
 * 음성 파일 품질 분석
 */
export async function analyzeAudioQuality(audioBlob: Blob): Promise<AudioQuality> {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 음성 샘플 분석
    const samples = audioBuffer.getChannelData(0);

    return {
      ...analyzeAmplitude(samples),
      ...analyzeNoise(samples),
      duration: audioBuffer.duration,
      confidence: calculateConfidence(samples),
      isAcceptable: checkIfAcceptable(samples),
      suggestions: generateSuggestions(samples),
    };
  } catch (error) {
    console.error("Failed to analyze audio quality:", error);
    return {
      volumeLevel: "good",
      noiseLevel: "clean",
      clarity: "clear",
      duration: 0,
      confidence: 0,
      isAcceptable: false,
      suggestions: ["마이크를 다시 확인해주세요"],
    };
  }
}

/**
 * 진폭(음량) 분석
 */
function analyzeAmplitude(samples: Float32Array): { volumeLevel: "too_quiet" | "good" | "too_loud"; clarity: "clear" | "muffled" | "very_unclear" } {
  let sum = 0;
  let peakAmplitude = 0;

  for (let i = 0; i < samples.length; i++) {
    const val = Math.abs(samples[i]);
    sum += val;
    if (val > peakAmplitude) {
      peakAmplitude = val;
    }
  }

  const rms = Math.sqrt(sum / samples.length); // Root Mean Square
  const decibels = 20 * Math.log10(Math.max(rms, 0.001));

  let volumeLevel: "too_quiet" | "good" | "too_loud";
  let clarity: "clear" | "muffled" | "very_unclear";

  if (decibels < -30) {
    volumeLevel = "too_quiet";
    clarity = "very_unclear";
  } else if (decibels < -20) {
    volumeLevel = "too_quiet";
    clarity = "muffled";
  } else if (decibels > -5) {
    volumeLevel = "too_loud";
    clarity = "very_unclear";
  } else {
    volumeLevel = "good";
    clarity = "clear";
  }

  return { volumeLevel, clarity };
}

/**
 * 노이즈 레벨 분석
 */
function analyzeNoise(samples: Float32Array): { noiseLevel: "clean" | "some_noise" | "very_noisy" } {
  // 배경 노이즈 추정 (처음 0.5초)
  const silentPortion = Math.floor(samples.length * 0.1); // 처음 10%
  let noiseSum = 0;

  for (let i = 0; i < silentPortion; i++) {
    noiseSum += Math.abs(samples[i]);
  }

  const noiseFloor = noiseSum / silentPortion;
  const noiseThresholdClean = 0.01;
  const noiseThresholdSome = 0.05;

  let noiseLevel: "clean" | "some_noise" | "very_noisy";

  if (noiseFloor < noiseThresholdClean) {
    noiseLevel = "clean";
  } else if (noiseFloor < noiseThresholdSome) {
    noiseLevel = "some_noise";
  } else {
    noiseLevel = "very_noisy";
  }

  return { noiseLevel };
}

/**
 * 신뢰도 계산
 */
function calculateConfidence(samples: Float32Array): number {
  // RMS와 Peak 비율로 신뢰도 계산
  let sum = 0;
  let peakAmplitude = 0;

  for (let i = 0; i < samples.length; i++) {
    const val = Math.abs(samples[i]);
    sum += val;
    if (val > peakAmplitude) {
      peakAmplitude = val;
    }
  }

  const rms = Math.sqrt(sum / samples.length);
  const ratio = rms > 0 ? Math.min((peakAmplitude / rms) * 10, 100) : 0;

  return Math.round(Math.max(20, Math.min(100, ratio)));
}

/**
 * 음성 품질 수용 여부 판단
 */
function checkIfAcceptable(samples: Float32Array): boolean {
  const { volumeLevel, clarity } = analyzeAmplitude(samples);
  const { noiseLevel } = analyzeNoise(samples);

  // 모두 최악이 아니면 수용 가능
  const isGoodVolume = volumeLevel !== "too_quiet";
  const isGoodClarity = clarity !== "very_unclear";
  const isGoodNoise = noiseLevel !== "very_noisy";

  return isGoodVolume && isGoodClarity && isGoodNoise;
}

/**
 * 개선 제안 생성
 */
function generateSuggestions(samples: Float32Array): string[] {
  const suggestions: string[] = [];
  const { volumeLevel, clarity } = analyzeAmplitude(samples);
  const { noiseLevel } = analyzeNoise(samples);

  if (volumeLevel === "too_quiet") {
    suggestions.push("❌ 음량이 작습니다. 마이크에 더 가깝게 말씀해주세요");
  }

  if (volumeLevel === "too_loud") {
    suggestions.push("❌ 음량이 너무 큽니다. 조금 더 편안한 목소리로 말씀해주세요");
  }

  if (clarity === "muffled") {
    suggestions.push("❌ 발음이 명확하지 않습니다. 더 또박또박 말씀해주세요");
  }

  if (clarity === "very_unclear") {
    suggestions.push("❌ 음성이 매우 불명확합니다. 마이크를 확인하고 다시 시도해주세요");
  }

  if (noiseLevel === "some_noise") {
    suggestions.push("⚠️ 배경 소음이 있습니다. 조용한 환경에서 다시 시도해주세요");
  }

  if (noiseLevel === "very_noisy") {
    suggestions.push("❌ 배경 소음이 너무 큽니다. 더 조용한 환경을 찾아주세요");
  }

  if (suggestions.length === 0) {
    suggestions.push("✅ 좋은 품질입니다!");
  }

  return suggestions;
}

/**
 * 음성 품질 점수 계산 (0-100)
 */
export function getAudioQualityScore(quality: AudioQuality): number {
  let score = 100;

  // 음량 감점
  if (quality.volumeLevel === "too_quiet") score -= 40;
  if (quality.volumeLevel === "too_loud") score -= 20;

  // 명확도 감점
  if (quality.clarity === "muffled") score -= 20;
  if (quality.clarity === "very_unclear") score -= 50;

  // 노이즈 감점
  if (quality.noiseLevel === "some_noise") score -= 15;
  if (quality.noiseLevel === "very_noisy") score -= 30;

  // 지속 시간 확인
  if (quality.duration < 0.5) score -= 10;
  if (quality.duration > 5) score -= 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * 재시도 필요 여부 판단
 */
export function shouldRetry(quality: AudioQuality): boolean {
  if (!quality.isAcceptable) return true;
  if (quality.volumeLevel === "too_quiet") return true;
  if (quality.clarity === "very_unclear") return true;
  if (quality.noiseLevel === "very_noisy") return true;

  return false;
}
