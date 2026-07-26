// apps/web/models/speaking-2026.ts
// Speaking 2026 SSOT

export type SpeakingTaskType2026 = "listen_repeat" | "interview";

// ── 이미지 하이라이트 영역 (이미지 크기 대비 % 단위) ────────────────
export type ImageRegion = {
  x: number;  // left %
  y: number;  // top %
  w: number;  // width %
  h: number;  // height %
};

// ── Task 1: 듣고 따라말하기 ────────────────────────────────────────
export type ListenRepeatSentence = {
  id: string;
  text: string;
  audioUrl?: string;
  speakingSeconds: number;
  region?: ImageRegion;  // site map 위 해당 영역
  locationLabel?: string; // 그 영역의 간판/표지판 문구 (예: "Textbook Section")
};

export interface SpeakingTaskListenRepeat2026 {
  id: string;
  type: "listen_repeat";
  situation: string;
  situationDescription?: string;
  imageUrl?: string;       // site map 이미지 URL (3D 플로어플랜)
  sentences: ListenRepeatSentence[];
}

// ── Task 2: 인터뷰 ────────────────────────────────────────────────
export type InterviewQuestion = {
  id: string;
  text: string;
  audioUrl?: string;
  topic?: string;
  speakingSeconds: number;
};

export interface SpeakingTaskInterview2026 {
  id: string;
  type: "interview";
  interviewerGifUrl?: string;    // 인터뷰어 애니메이션 GIF URL (스프라이트시트 기반, 선택)
  interviewerImageUrl?: string;  // 인터뷰어 정지 사진 URL (AI 자동생성)
  interviewerGender?: "male" | "female";
  questions: InterviewQuestion[];
}

export type SpeakingTask2026 =
  | SpeakingTaskListenRepeat2026
  | SpeakingTaskInterview2026;

export interface SpeakingTest2026 {
  id: string;
  label: string;
  tasks: SpeakingTask2026[];
}
