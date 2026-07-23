// TOEFL Writing 2026 Rubric & Scoring

export interface TaskScore {
  taskId: string;
  taskKind: string;
  title: string;
  maxScore: number;
  score?: number;
  feedback?: string;
  criteria?: CriteriaScore[];
}

export interface CriteriaScore {
  name: string;
  maxScore: number;
  score?: number;
  comment?: string;
}

export interface WritingOverallScore {
  totalScore: number;
  maxScore: number;
  task1Score?: number;
  task2Score?: number;
  task3Score?: number;
  levelDescriptor?: string;
}

// ────────────────────────────────────────────────────────────────
// Task 1: Build a Sentence (10문항 × 1점 = 10점)
// ────────────────────────────────────────────────────────────────

export const TASK1_RUBRIC = {
  taskKind: "micro_writing",
  title: "Build a Sentence",
  maxScore: 10,
  description: "10개 문항, 각 1점 (정답/오답)",
  criteria: [
    { name: "정확성 (Accuracy)", maxScore: 10, description: "정답 개수" },
  ],
};

// ────────────────────────────────────────────────────────────────
// Task 2: Email Writing (30점)
// ────────────────────────────────────────────────────────────────

export const TASK2_RUBRIC = {
  taskKind: "email",
  title: "Email Writing",
  maxScore: 30,
  description: "100-120 단어, 형식 및 내용 평가",
  criteria: [
    {
      name: "글자 수 (Word Count)",
      maxScore: 5,
      description: "100-120 단어 범위",
      scoringGuide: {
        5: "100-120 단어",
        3: "80-99 또는 121-150 단어",
        1: "79 이하 또는 151 이상",
      },
    },
    {
      name: "형식 & 구조 (Format & Structure)",
      maxScore: 10,
      description: "이메일 형식, 인사말, 본문, 마무리",
      scoringGuide: {
        10: "완벽한 이메일 형식 (인사말, 본문, 마무리)",
        7: "대부분 올바른 형식",
        4: "기본 형식은 있으나 부족함",
        1: "형식이 부적절함",
      },
    },
    {
      name: "내용 & 일관성 (Content & Coherence)",
      maxScore: 10,
      description: "상황에 맞는 내용, 논리적 전개",
      scoringGuide: {
        10: "상황을 완벽히 반영, 명확하고 일관된 내용",
        7: "대부분 상황에 맞고 일관됨",
        4: "기본 내용은 있으나 일관성 부족",
        1: "부적절하거나 일관성 없음",
      },
    },
    {
      name: "문법 & 표현 (Grammar & Expression)",
      maxScore: 5,
      description: "문법 정확성, 자연스러운 표현",
      scoringGuide: {
        5: "문법 오류 없음, 자연스러운 표현",
        3: "경미한 오류 2-3개, 대체로 자연스러움",
        1: "다수의 오류, 부자연스러운 표현",
      },
    },
  ],
};

// ────────────────────────────────────────────────────────────────
// Task 3: Academic Discussion (30점)
// ────────────────────────────────────────────────────────────────

export const TASK3_RUBRIC = {
  taskKind: "academic_discussion",
  title: "Academic Discussion",
  maxScore: 30,
  description: "120+ 단어, 학술적 관점 평가",
  criteria: [
    {
      name: "글자 수 (Word Count)",
      maxScore: 5,
      description: "120+ 단어",
      scoringGuide: {
        5: "120+ 단어",
        3: "100-119 단어",
        1: "99 이하",
      },
    },
    {
      name: "논점 명확성 (Thesis Clarity)",
      maxScore: 10,
      description: "주장의 명확성, 입장 표현",
      scoringGuide: {
        10: "주장이 명확하고 강함",
        7: "주장이 대체로 명확함",
        4: "주장이 불명확하거나 약함",
        1: "주장이 없거나 부적절함",
      },
    },
    {
      name: "근거 & 발전 (Evidence & Development)",
      maxScore: 10,
      description: "구체적 근거, 논리적 발전",
      scoringGuide: {
        10: "강력한 근거 2개 이상, 잘 발전됨",
        7: "근거 있음, 어느 정도 발전됨",
        4: "근거 부족하거나 발전 미흡",
        1: "근거 없음",
      },
    },
    {
      name: "문법 & 표현 (Grammar & Expression)",
      maxScore: 5,
      description: "학술적 표현, 정확한 문법",
      scoringGuide: {
        5: "오류 없음, 학술적 표현 적절",
        3: "경미한 오류 2-3개",
        1: "다수의 오류",
      },
    },
  ],
};

// ────────────────────────────────────────────────────────────────
// 총점 계산
// ────────────────────────────────────────────────────────────────

export function calculateTotalScore(
  task1Score: number, // 0-10
  task2Score: number, // 0-30
  task3Score: number  // 0-30
): WritingOverallScore {
  const totalScore = task1Score + task2Score + task3Score;
  const maxScore = 70;

  let levelDescriptor = "";
  if (totalScore >= 65) {
    levelDescriptor = "Excellent (A)";
  } else if (totalScore >= 55) {
    levelDescriptor = "Very Good (B)";
  } else if (totalScore >= 45) {
    levelDescriptor = "Good (C)";
  } else if (totalScore >= 35) {
    levelDescriptor = "Fair (D)";
  } else {
    levelDescriptor = "Needs Improvement (F)";
  }

  return {
    totalScore,
    maxScore,
    task1Score,
    task2Score,
    task3Score,
    levelDescriptor,
  };
}
