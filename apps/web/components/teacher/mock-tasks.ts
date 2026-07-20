// apps/web/components/teacher/mock-tasks.ts

export type TaskStatus = "pending" | "done" | "overdue";

export type TaskCategory = "상담" | "채점" | "과제" | "관리" | "기타";

export type Task = {
  id: string;
  label: string;
  status: TaskStatus;
  category: TaskCategory;
  studentName?: string;
  dueDisplay: string;
};

// 👉 여기 mockTasks는 "원본" 그대로 사용
export const mockTasks: Task[] = [
  {
    id: "t1",
    label: "○○중 2학년 학부모 상담 (김민수)",
    status: "pending",
    category: "상담",
    studentName: "김민수",
    dueDisplay: "오늘 14:00",
  },
  {
    id: "t2",
    label: "Reading 2026 테스트 리뷰 – Set 3 결과 확인",
    status: "pending",
    category: "채점",
    dueDisplay: "오늘",
  },
  {
    id: "t3",
    label: "리스닝 과제 채점 – 3명",
    status: "overdue",
    category: "채점",
    dueDisplay: "어제",
  },
  {
    id: "t4",
    label: "스피킹 과제 피드백 (이서연)",
    status: "done",
    category: "채점",
    studentName: "이서연",
    dueDisplay: "어제 완료",
  },
  {
    id: "t5",
    label: "중3 문법 약점(관계사/분사) 보완 수업 구상",
    status: "pending",
    category: "관리",
    dueDisplay: "이번 주",
  },
  {
    id: "t6",
    label: "12월 상담 스케줄 정리",
    status: "pending",
    category: "관리",
    dueDisplay: "이번 주",
  },
];
