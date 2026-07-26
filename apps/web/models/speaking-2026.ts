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
  /**
   * 이 시험이 소비한 주제를 태스크별로 기록한다. 주제 추천 API가 저장된 시험 전체에서
   * 이 값을 긁어모아 같은 주제가 다시 나오지 않게 한다.
   * (Reading/Listening은 meta.usedTopics를 쓰지만 Speaking 페이로드엔 meta가 없어 최상위에 둔다.)
   */
  usedTopics?: {
    listen_repeat?: string[];
    interview?: string[];
  };
}
