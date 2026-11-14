// lib/reviewRelease.ts
// 학생에게 상세 리뷰가 열리는 "공개 예정일" = 제출일 + 2일. 선생님이 그 전에 공개하면 바로 열린다.
// 서버/클라이언트 공용(의존성 없음).

export const REVIEW_RELEASE_DAYS = 2;

export function releaseAtOf(submittedAt: string | null | undefined): string {
  const base = submittedAt ? new Date(submittedAt).getTime() : Date.now();
  return new Date(base + REVIEW_RELEASE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** 학생 화면 문구: 예정일 전이면 "◯월 ◯일에 공개돼요", 지났으면 "곧 공개돼요". */
export function releaseMessage(releaseAt: string | null | undefined): string {
  if (!releaseAt) return "자세한 리뷰는 곧 공개돼요.";
  const t = new Date(releaseAt).getTime();
  if (!Number.isFinite(t) || t <= Date.now()) return "자세한 리뷰는 곧 공개돼요.";
  const d = new Date(releaseAt).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  return `자세한 리뷰는 ${d}에 공개돼요.`;
}
