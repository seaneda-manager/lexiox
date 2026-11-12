// 테스트 계정은 학생 화면에서 모든 레벨의 레슨을 초안까지 미리 볼 수 있다(확정 전 점검용).
// 일반 학생에게는 영향이 없다 — 학생은 여전히 확정(final)된 레슨만 본다.
const PREVIEW_EMAILS = new Set(["kimseung74@lexiox.com"]);

export function canPreviewDrafts(email: string | null | undefined): boolean {
  return !!email && PREVIEW_EMAILS.has(email.trim().toLowerCase());
}
