// apps/web/app/(protected)/toefl-2026/test/demo-tests.ts

import type { RReadingTest2026 } from "@/models/reading";
import { demoAdaptiveReadingTest } from "@/app/protected/reading/adaptive/demo-data";
import { demoWritingTest2026 } from "@/app/protected/writing-2026/study";

// ✅ 이미 있는 리딩 2026 데모 재사용
export const demoReadingTest2026: RReadingTest2026 = demoAdaptiveReadingTest;

// ✅ 리스닝/스피킹은 아직 러너/모델 확정 전이니 느슨하게 시작
export const demoListeningTest2026 = {
  meta: {
    id: "updated-listening-demo-1",
    label: "Listening 2026 Demo",
  },
  sections: [],
};

export const demoSpeakingTest2026 = {
  meta: {
    id: "speaking-2026-demo-1",
    label: "Speaking 2026 Demo",
  },
  tasks: [],
};

// ✅ study에서 쓰던 데모 그대로 재사용
export { demoWritingTest2026 };
