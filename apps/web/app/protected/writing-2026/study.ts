// apps/web/app/(protected)/writing-2026/study.ts

import type {
  WWritingTest2026,
  WMicroWritingItem,
  WEmailWritingItem,
  WAcademicWritingItem,
} from "@/models/writing";

// Micro Writing (짧은 3문항 세트)
const microItem: WMicroWritingItem = {
  id: "micro-1",
  taskKind: "micro_writing",
  prompts: [
    {
      id: "mw-1",
      prompt:
        "What is one small habit that helps you study better? Explain briefly.",
      minWords: 20,
      maxWords: 40,
    },
    {
      id: "mw-2",
      prompt: "Do you prefer studying alone or with friends? Give a reason.",
      minWords: 20,
      maxWords: 40,
    },
    {
      id: "mw-3",
      prompt: "Describe a place where you like to relax.",
      minWords: 20,
      maxWords: 40,
    },
  ],
};

// Email Writing (지금 타입에는 minWords / maxWords 없음)
const emailItem: WEmailWritingItem = {
  id: "email-1",
  taskKind: "email",
  situation:
    "You are a student at an English language program. Recently, some classes have been moved online, and you are confused about the new schedule.",
  prompt:
    "Write an email to the program coordinator asking for clarification about your new class schedule. Be sure to explain your situation and ask specific questions.",
  hints: [
    "Explain why you are confused about the schedule.",
    "Mention which classes you are taking.",
    "Ask for specific information or confirmation.",
  ],
  // ⚠ 타입 정의에 minWords/maxWords가 아직 없어서 데모에서는 생략
};

// Academic Discussion (여기도 타입에 minWords / maxWords 없음)
const academicItem: WAcademicWritingItem = {
  id: "acad-1",
  taskKind: "academic_discussion",
  context:
    "In an online course discussion board, the class is talking about whether universities should require students to take physical education (PE) classes.",
  professorPrompt:
    "Do you think universities should require students to take at least one physical education course? Write a post expressing your opinion and explaining your reasons.",
  studentPosts: [
    {
      id: "post-1",
      author: "Lily",
      content:
        "I think PE should be optional. Many students already exercise on their own, and some prefer to use their time for academic courses.",
    },
    {
      id: "post-2",
      author: "Carlos",
      content:
        "PE should be required at least once. Many students sit all day, and a required course can help them learn healthy habits.",
    },
  ],
  // 여기에도 minWords / maxWords는 나중에 타입에 공식 추가하기로 하면 그때 반영
};

// 최종 데모 세트
export const demoWritingTest2026: WWritingTest2026 = {
  meta: {
    id: "writing-2026-demo-1",
    label: "TOEFL iBT 2026 Writing – Demo Set",
    examEra: "ibt_2026",
    source: "demo",
  },
  items: [microItem, emailItem, academicItem],
};
