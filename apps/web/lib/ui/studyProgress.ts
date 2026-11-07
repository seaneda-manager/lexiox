/**
 * Study 모드 진행 저장 (섹션 공통).
 * 현재는 브라우저 localStorage. 서버 저장(docs/sql-drafts/study_progress.draft.sql)이 적용되면
 * 이 파일의 세 함수 뒤에 동기화를 붙이면 호출부는 바뀌지 않는다.
 * Reading은 자체 구현(MockTestPlayer)이라 이 헬퍼를 쓰지 않는다.
 */
export type StudySection = "reading" | "listening" | "speaking" | "writing";

const key = (section: StudySection, id: string) => `study_progress__${section}__${id}`;

export function loadStudy<T>(section: StudySection, id: string): { data: T; savedAt: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(section, id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: number; savedAt: string; data: T };
    return parsed?.v === 1 ? { data: parsed.data, savedAt: parsed.savedAt } : null;
  } catch {
    return null;
  }
}

export function saveStudy<T>(section: StudySection, id: string, data: T) {
  try {
    window.localStorage.setItem(key(section, id), JSON.stringify({ v: 1, savedAt: new Date().toISOString(), data }));
  } catch {
    /* 저장 공간 부족 등 — 메모리 상태가 기준이므로 무시 */
  }
}

export function clearStudy(section: StudySection, id: string) {
  try {
    window.localStorage.removeItem(key(section, id));
  } catch {
    /* noop */
  }
}
