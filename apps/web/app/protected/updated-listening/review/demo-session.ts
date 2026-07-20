// Demo: Listening Review Session Data
import type { LListeningTrack2026Extended, QuestionAnalysisMeta, ChoiceTrapMeta } from '@/models/listening';

/**
 * 학생의 답변 기록
 */
export interface StudentResponse {
  questionId: string;
  choiceIndex: number; // 학생이 선택한 선택지 인덱스
  isCorrect: boolean;
  responseTime: number; // 밀리초
}

/**
 * 세션 데이터 (시험 후 리뷰용)
 */
export interface ListeningSession {
  sessionId: string;
  userId: string;
  testId: string;
  track: LListeningTrack2026Extended;
  responses: StudentResponse[];
  startTime: number; // timestamp
  endTime: number;
  scorePercent: number;
}

// Demo Track with scriptSegments & trapMetadata
export const demoTrack: LListeningTrack2026Extended = {
  id: 'track_demo_conv_001',
  taskKind: 'conversation',
  title: 'Student-Advisor Conversation',
  audioUrl: '/audio/dev/conv-1-1.mp3',
  audioSeconds: 52,
  illustrationUrl: 'https://via.placeholder.com/400x300?text=Office',
  transcript:
    'Student: Hi, I need to register for Biology 301. Advisor: Let me check that for you. The course appears to be full. However, there might be a waitlist option.',

  // ── scriptSegments (Wavesurfer 동기화용) ──
  scriptSegments: [
    {
      id: 'SEG_001',
      speaker: 'student',
      text: 'Hi, I need to register for Biology 301.',
      startTime: 0.5,
      endTime: 2.5,
      words: [
        { word: 'Hi', startTime: 0.5, endTime: 0.7 },
        { word: 'I', startTime: 0.8, endTime: 0.9 },
        { word: 'need', startTime: 1.0, endTime: 1.2 },
        { word: 'to', startTime: 1.3, endTime: 1.4 },
        { word: 'register', startTime: 1.5, endTime: 1.9 },
        { word: 'for', startTime: 2.0, endTime: 2.1 },
        { word: 'Biology', startTime: 2.2, endTime: 2.3 },
        { word: '301', startTime: 2.4, endTime: 2.5 },
      ],
    },
    {
      id: 'SEG_002',
      speaker: 'instructor',
      text: 'Let me check that for you. The course appears to be full.',
      startTime: 3.0,
      endTime: 6.5,
      words: [
        { word: 'Let', startTime: 3.0, endTime: 3.2 },
        { word: 'me', startTime: 3.3, endTime: 3.4 },
        { word: 'check', startTime: 3.5, endTime: 3.8 },
        { word: 'that', startTime: 3.9, endTime: 4.1 },
        { word: 'for', startTime: 4.2, endTime: 4.3 },
        { word: 'you', startTime: 4.4, endTime: 4.5 },
        { word: 'The', startTime: 4.6, endTime: 4.8 },
        { word: 'course', startTime: 4.9, endTime: 5.2 },
        { word: 'appears', startTime: 5.3, endTime: 5.4 },
        { word: 'to', startTime: 5.5, endTime: 5.6 },
        { word: 'be', startTime: 5.7, endTime: 5.8 },
        { word: 'full', startTime: 5.9, endTime: 6.5 },
      ],
    },
    {
      id: 'SEG_003',
      speaker: 'instructor',
      text: 'However, there might be a waitlist option.',
      startTime: 7.0,
      endTime: 9.5,
      words: [
        { word: 'However', startTime: 7.0, endTime: 7.4 },
        { word: 'there', startTime: 7.5, endTime: 7.7 },
        { word: 'might', startTime: 7.8, endTime: 8.0 },
        { word: 'be', startTime: 8.1, endTime: 8.3 },
        { word: 'a', startTime: 8.4, endTime: 8.5 },
        { word: 'waitlist', startTime: 8.6, endTime: 9.1 },
        { word: 'option', startTime: 9.2, endTime: 9.5 },
      ],
    },
  ],

  questions: [
    {
      id: 'q_001',
      number: 1,
      type: 'detail',
      stem: 'What does the student want to do?',
      choices: [
        { id: 'a', text: 'Drop Biology 301', isCorrect: false },
        { id: 'b', text: 'Register for Biology 301', isCorrect: true },
        { id: 'c', text: 'Change the course schedule', isCorrect: false },
        { id: 'd', text: 'Get a refund for Biology 301', isCorrect: false },
      ],
      correctIndices: [1],
    },
    {
      id: 'q_002',
      number: 2,
      type: 'detail',
      stem: 'What does the advisor say about Biology 301?',
      choices: [
        { id: 'a', text: 'It is available for immediate enrollment', isCorrect: false },
        { id: 'b', text: 'It has been cancelled', isCorrect: false },
        { id: 'c', text: 'The course appears to be full', isCorrect: true },
        { id: 'd', text: 'It has an open waitlist', isCorrect: false },
      ],
      correctIndices: [2],
    },
  ],

  // ── questionAnalysis (Review 모드용) ──
  questionAnalysis: [
    {
      questionId: 'q_001',
      mainSignalTokens: ['register', 'Biology 301'],
      focusSegmentIds: ['SEG_001'],
      trapChoices: [
        {
          choiceIndex: 0,
          trapType: 'KEYWORD_OVERLAP',
          explanation:
            '"Drop"과 "Register"는 대조적 의미. 학생이 "register"를 들었는데 반대 개념인 "drop"을 선택하는 실수.',
          triggeredSegmentIds: ['SEG_001'],
        },
        {
          choiceIndex: 2,
          trapType: 'SCOPE_ERROR',
          explanation: '스케줄 변경은 언급되지 않음',
        },
      ] as ChoiceTrapMeta[],
    },
    {
      questionId: 'q_002',
      mainSignalTokens: ['appears to be full', 'course'],
      focusSegmentIds: ['SEG_002'],
      trapChoices: [
        {
          choiceIndex: 1,
          trapType: 'INFERENCE_TRAP',
          explanation: '"full"은 취소된 것이 아니라 수강인원이 가득 찼다는 의미',
          triggeredSegmentIds: ['SEG_002'],
        },
        {
          choiceIndex: 3,
          trapType: 'TIMING_CONFUSION',
          explanation:
            '"waitlist option"은 교수의 제안이지 현재 상태가 아님. SEG_003에서 나중에 언급됨.',
          triggeredSegmentIds: ['SEG_003'],
        },
      ] as ChoiceTrapMeta[],
    },
  ] as QuestionAnalysisMeta[],
};

// Demo Session: 학생이 Q1은 맞추고, Q2를 틀린 경우
export const demoSession: ListeningSession = {
  sessionId: 'session_demo_001',
  userId: 'student_001',
  testId: 'test_2026_001',
  track: demoTrack,
  responses: [
    {
      questionId: 'q_001',
      choiceIndex: 1, // 정답 (Correct)
      isCorrect: true,
      responseTime: 8500,
    },
    {
      questionId: 'q_002',
      choiceIndex: 3, // 오답: "waitlist option" 선택 (틀림)
      isCorrect: false,
      responseTime: 12300,
    },
  ],
  startTime: Date.now() - 600000, // 10분 전
  endTime: Date.now() - 300000, // 5분 전
  scorePercent: 50,
};
