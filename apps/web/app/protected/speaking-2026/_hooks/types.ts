/**
 * Speaking 2026 세션 타입 정의
 * - Task 1: Listen & Repeat (7개)
 * - Task 2: Interview (4개)
 */

export type SpeakingSectionState =
  | 'AUDIO_CHECK'
  | 'DIRECTIONS'
  | 'T1_CONTEXT_LOAD'
  | 'T1_STREAMING_PROMPT'
  | 'T1_RECORDING_ACTIVE'
  | 'T2_INTERVIEW_INTRO'
  | 'T2_STREAMING_QUESTION'
  | 'T2_RECORDING_RESPONSE'
  | 'SECTION_COMPLETE';

export interface AudioCheckData {
  micLevel: number; // 0-100
  isReady: boolean;
  threshold: number; // -20dB
}

export interface Task1Item {
  id: string;
  taskNumber: 1;
  itemNumber: number; // 1-7
  contextId: string;
  sentenceAudioUrl: string;
  recordingDurationSeconds: number; // 8-12초
  correctTranscript?: string;
}

export interface Task2Item {
  id: string;
  taskNumber: 2;
  itemNumber: number; // 1-4 (문항 8-11)
  questionAudioUrl: string;
  recordingDurationSeconds: number; // 45초
  correctTranscript?: string;
}

export type SpeakingItem = Task1Item | Task2Item;

export interface SpeakingSession {
  sessionId: string;
  startTime: Date;
  currentState: SpeakingSectionState;
  currentItemIndex: number;
  recordings: Map<string, Blob>; // itemId -> audio blob
  transcripts: Map<string, string>; // itemId -> STT result
  scores: Map<string, number>; // itemId -> score
}

export interface RecordingBlob {
  itemId: string;
  blob: Blob;
  timestamp: Date;
  duration: number;
}

export interface ReviewData {
  itemId: string;
  userTranscript: string;
  correctTranscript: string;
  audioUrl: string;
  waveformData: Float32Array;
  errorMap: ErrorHighlight[];
  score: number;
}

export interface ErrorHighlight {
  wordIndex: number;
  startTime: number;
  endTime: number;
  errorType: 'pronunciation' | 'fluency' | 'silence';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DrillConfig {
  taskType: 1 | 2; // Task 1 또는 2만
  itemNumbers?: number[]; // 특정 아이템만 (옵션)
  repeatCount: number; // 반복 횟수
  filterByError?: boolean; // 오답만
}
