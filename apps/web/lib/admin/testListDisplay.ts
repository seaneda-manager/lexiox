/**
 * 시험 목록(배정 화면 등)에서 이름 없는 시험도 구분되도록 보여주는 표시 헬퍼.
 * 서버 컴포넌트에서만 쓰므로 순수 함수로 둔다.
 */

/** ISO 시각을 한국 시간 "25. 11. 13. 19:07" 형태로. */
export function formatCreated(iso: string | null | undefined): string {
  if (!iso) return "생성일 미상";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "생성일 미상";
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 생성 시 기록된 usedTopics에서 학술/첫 주제를 짧게 뽑는다. 없으면 빈 문자열.
 * (Reading/Listening/Writing은 payload.meta.usedTopics, Speaking은 payload.usedTopics 최상위)
 */
export function topicHint(usedTopics: unknown): string {
  if (!usedTopics || typeof usedTopics !== "object") return "";
  const pick = (v: unknown): string => (Array.isArray(v) ? String(v.find((x) => typeof x === "string" && x) ?? "") : typeof v === "string" ? v : "");
  const u = usedTopics as Record<string, unknown>;
  const t = pick(u.academic) || pick(u.lecture) || pick(Object.values(u)[0]);
  return t.length > 40 ? t.slice(0, 39) + "…" : t;
}

/** 라벨이 비었으면 대체 문구. */
export function labelOrPlaceholder(label: string | null | undefined): { text: string; empty: boolean } {
  const t = label?.trim();
  return t ? { text: t, empty: false } : { text: "(이름 없음)", empty: true };
}
