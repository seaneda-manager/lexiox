// 주 단위 범위 계산 (월~일). 서버/클라이언트 공용.
import { toIsoDate } from "./types";

export function getWeekRange(weeksAgo: number) {
  const now = new Date();
  const day = now.getDay(); // 0=일
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1) - weeksAgo * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: toIsoDate(monday),
    to: toIsoDate(sunday),
    label: `${monday.getMonth() + 1}/${monday.getDate()} ~ ${sunday.getMonth() + 1}/${sunday.getDate()}`,
  };
}

export const WEEK_LINKS = [0, 1, 2, 3, 4];
export const weekLabel = (w: number) => (w === 0 ? "이번 주" : w === 1 ? "저번 주" : `${w}주 전`);

export function parseWeek(v: string | undefined) {
  return Math.max(0, Math.min(4, parseInt(v ?? "0", 10) || 0));
}
