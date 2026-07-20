/**
 * Audio Analysis for Speaking AI Scoring
 *
 * Analyzes speech for:
 * - WPM (Words Per Minute): Target 130~150
 * - Speaking Rate: Duration, pauses, run length
 * - Pause Detection: 3s+ = catastrophic
 * - Run Length: 4~7 words ideal
 */

export interface SpeechMetrics {
  totalDuration: number; // ms
  speakingDuration: number; // ms (actual speech)
  pauseDuration: number; // ms (silence)
  pauseCount: number;
  longPauses: { start: number; duration: number }[]; // pauses >= 3s
  estimatedWPM: number; // Words Per Minute (130-150 target)
  runLengths: number[]; // word counts between pauses
  averageRunLength: number;
  fillerCount: number; // "uh", "um", "ah"
  immediateInitiation: boolean; // started speaking within 3s
  initiationDelay: number; // ms before first speech
}

export interface AudioBuffer {
  channelData: Float32Array;
  sampleRate: number;
}

/**
 * Analyze audio buffer for speech metrics
 *
 * @param audioContext - Web Audio API context
 * @param audioBuffer - Audio buffer from recording
 * @returns Speech metrics for scoring
 */
export async function analyzeSpeech(
  audioContext: AudioContext,
  audioBuffer: AudioBuffer
): Promise<SpeechMetrics> {
  const { channelData, sampleRate } = audioBuffer;

  // Detect speech activity using amplitude threshold
  const AMPLITUDE_THRESHOLD = 0.02; // Adjust based on microphone
  const PAUSE_THRESHOLD_MS = 500; // 500ms = pause
  const LONG_PAUSE_THRESHOLD_MS = 3000; // 3s = catastrophic

  const samplesPerSecond = sampleRate;
  const speechSegments: { start: number; end: number }[] = [];
  let inSpeech = false;
  let segmentStart = 0;

  // Detect speech segments
  for (let i = 0; i < channelData.length; i++) {
    const isSpeaking = Math.abs(channelData[i]) > AMPLITUDE_THRESHOLD;

    if (isSpeaking && !inSpeech) {
      segmentStart = i;
      inSpeech = true;
    } else if (!isSpeaking && inSpeech) {
      speechSegments.push({
        start: segmentStart,
        end: i,
      });
      inSpeech = false;
    }
  }

  // Handle case where audio ends while speaking
  if (inSpeech) {
    speechSegments.push({
      start: segmentStart,
      end: channelData.length,
    });
  }

  // Calculate metrics
  const totalDuration = (channelData.length / samplesPerSecond) * 1000; // ms

  let speakingDuration = 0;
  const longPauses: { start: number; duration: number }[] = [];

  for (let i = 0; i < speechSegments.length; i++) {
    const segment = speechSegments[i];
    const segmentDuration = ((segment.end - segment.start) / samplesPerSecond) * 1000;
    speakingDuration += segmentDuration;

    // Detect long pauses between segments
    if (i < speechSegments.length - 1) {
      const nextSegment = speechSegments[i + 1];
      const pauseDuration = ((nextSegment.start - segment.end) / samplesPerSecond) * 1000;

      if (pauseDuration >= LONG_PAUSE_THRESHOLD_MS) {
        longPauses.push({
          start: (segment.end / samplesPerSecond) * 1000,
          duration: pauseDuration,
        });
      }
    }
  }

  const pauseDuration = totalDuration - speakingDuration;

  // Estimate WPM (assuming ~5 characters per word + spaces)
  // Rough estimate: actual speech analysis would need word recognition
  // For now: typical speaking is 4.7 characters per word
  const estimatedCharacters = speakingDuration / 100; // ~10 chars per 100ms of speech
  const estimatedWords = estimatedCharacters / 4.7;
  const estimatedWPM = (estimatedWords / speakingDuration) * 60000;

  // Estimate run lengths (speech segments)
  // In real implementation, would need word-level analysis
  const runLengths = speechSegments.map((seg) => {
    const duration = ((seg.end - seg.start) / samplesPerSecond) * 1000;
    // Rough estimate: 5 words per second
    return Math.round((duration / 1000) * 5);
  });

  const averageRunLength = runLengths.length > 0
    ? runLengths.reduce((a, b) => a + b, 0) / runLengths.length
    : 0;

  // Immediate initiation: did they start within 3s?
  const initiationDelay = speechSegments.length > 0
    ? (speechSegments[0].start / samplesPerSecond) * 1000
    : totalDuration;

  const immediateInitiation = initiationDelay <= 3000;

  return {
    totalDuration,
    speakingDuration,
    pauseDuration,
    pauseCount: speechSegments.length - 1,
    longPauses,
    estimatedWPM: Math.round(estimatedWPM),
    runLengths,
    averageRunLength: Math.round(averageRunLength * 10) / 10,
    fillerCount: 0, // TODO: Implement filler detection
    immediateInitiation,
    initiationDelay,
  };
}

/**
 * Score speech metrics against AI rubric
 */
export function scoreMetrics(metrics: SpeechMetrics): {
  fluencyScore: number; // 0-5
  deliveryScore: number; // 0-5
  details: Record<string, any>;
} {
  let fluencyScore = 5;
  let deliveryScore = 5;
  const details: Record<string, any> = {};

  // WPM scoring (130-150 optimal)
  const { estimatedWPM } = metrics;
  if (estimatedWPM < 100) {
    fluencyScore -= 2;
    details.wpmIssue = "Too slow (below 100 WPM)";
  } else if (estimatedWPM < 130) {
    fluencyScore -= 1;
    details.wpmNote = "Slightly below target (130-150)";
  } else if (estimatedWPM > 160) {
    fluencyScore -= 1;
    details.wpmNote = "Too fast (above 160 WPM)";
  }

  // Pause scoring (3s+ = catastrophic)
  if (metrics.longPauses.length > 0) {
    const maxPauseDuration = Math.max(...metrics.longPauses.map((p) => p.duration));
    if (maxPauseDuration >= 3000) {
      fluencyScore -= 2;
      details.pauseIssue = `Long pause detected: ${(maxPauseDuration / 1000).toFixed(1)}s`;
    } else if (maxPauseDuration >= 2000) {
      fluencyScore -= 1;
      details.pauseWarning = `Moderate pause detected: ${(maxPauseDuration / 1000).toFixed(1)}s`;
    }
  }

  // Run length scoring (4-7 words ideal)
  const avgRunLength = metrics.averageRunLength;
  if (avgRunLength < 4) {
    deliveryScore -= 1;
    details.runLengthIssue = "Run length too short (< 4 words)";
  } else if (avgRunLength > 7 && avgRunLength < 10) {
    deliveryScore += 0; // OK
  } else if (avgRunLength >= 10) {
    details.runLengthNote = "Excellent continuity";
  }

  // Immediate initiation (Task 2 critical)
  if (!metrics.immediateInitiation) {
    fluencyScore -= 1;
    details.initiationIssue = `Delayed start: ${(metrics.initiationDelay / 1000).toFixed(1)}s`;
  }

  // Bound scores
  fluencyScore = Math.max(0, Math.min(5, fluencyScore));
  deliveryScore = Math.max(0, Math.min(5, deliveryScore));

  return {
    fluencyScore,
    deliveryScore,
    details,
  };
}

/**
 * Extract audio samples from recorded audio data
 */
export async function extractAudioBuffer(
  audioContext: AudioContext,
  arrayBuffer: ArrayBuffer
): Promise<AudioBuffer> {
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0); // mono

  return {
    channelData: new Float32Array(channelData),
    sampleRate: audioBuffer.sampleRate,
  };
}
