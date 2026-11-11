// 수행 결과 분석 (순수 함수 — 서버/클라이언트 어디서나 사용)
import type { AttemptRecord, SectionData, Severity, SessionRecord } from "./types";

/* ─────────── 오답 심각도 판정 ───────────
 * 규칙을 바꾸려면 이 한 곳만 고치면 된다.
 * - 입력형(빈칸/스펠링): 정답과의 문자열 유사도로 판정
 *     유사도 ≥ 0.70 → 약간 오답 (철자 한두 글자 실수)
 *     유사도 ≥ 0.40 → 부분 오답
 *     그 미만·무응답 → 완전 오답
 * - 객관식: 무응답은 완전 오답. 고른 선택지가 "일부는 맞는 함정"(SCOPE_ERROR, KEYWORD_OVERLAP)
 *   이면 부분 오답, 그 외는 완전 오답. (선택지 함정 메타가 없으면 전부 완전 오답)
 */

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

export function similarity(a: string, b: string): number {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  const max = Math.max(x.length, y.length);
  if (max === 0) return 1;
  return 1 - levenshtein(x, y) / max;
}

export function classifyTyped(userAnswer: string | null, correctAnswer: string | null): Severity {
  if (!userAnswer || !userAnswer.trim() || !correctAnswer) return "complete";
  const s = similarity(userAnswer, correctAnswer);
  if (s >= 0.7) return "slight";
  if (s >= 0.4) return "partial";
  return "complete";
}

const PARTIAL_TRAPS = new Set(["SCOPE_ERROR", "KEYWORD_OVERLAP"]);

export function classifyMcq(userAnswer: string | null, trapType?: string | null): Severity {
  if (!userAnswer) return "complete";
  if (trapType && PARTIAL_TRAPS.has(trapType)) return "partial";
  return "complete";
}

/* ─────────── 집계 ─────────── */

export type Stat = { total: number; correct: number; pct: number | null };

export function stat(attempts: AttemptRecord[]): Stat {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;
  return { total, correct, pct: total ? Math.round((correct / total) * 100) : null };
}

export type SubsectionStat = Stat & {
  subsection: string;
  label: string;
  severity: Record<Severity, number>;
  /** 최근 5문항 정답률 vs 그 이전 — 개선/악화 신호 */
  recentPct: number | null;
  earlierPct: number | null;
};

export function bySubsection(attempts: AttemptRecord[]): SubsectionStat[] {
  const groups = new Map<string, AttemptRecord[]>();
  for (const a of attempts) {
    const arr = groups.get(a.subsection) ?? [];
    arr.push(a);
    groups.set(a.subsection, arr);
  }
  const out: SubsectionStat[] = [];
  for (const [subsection, arr] of groups) {
    const sorted = [...arr].sort((x, y) => x.at.localeCompare(y.at));
    const s = stat(sorted);
    const severity: Record<Severity, number> = { complete: 0, partial: 0, slight: 0 };
    for (const a of sorted) if (!a.correct && a.severity) severity[a.severity]++;
    const recent = sorted.slice(-5);
    const earlier = sorted.slice(0, -5);
    out.push({
      ...s,
      subsection,
      label: sorted[0].subsectionLabel,
      severity,
      recentPct: recent.length >= 3 ? stat(recent).pct : null,
      earlierPct: earlier.length >= 3 ? stat(earlier).pct : null,
    });
  }
  // 약점(정답률 낮은 순), 동률이면 오답 많은 순
  return out.sort(
    (a, b) => (a.pct ?? 101) - (b.pct ?? 101) || b.total - a.total,
  );
}

export type Pattern = { text: string; tone: "bad" | "warn" | "good" };

/** 오답 경향 문장 생성 — 표본이 너무 적으면(3문항 미만) 판단하지 않는다 */
export function detectPatterns(attempts: AttemptRecord[]): Pattern[] {
  const patterns: Pattern[] = [];
  const subs = bySubsection(attempts).filter((s) => s.total >= 3);
  if (!attempts.length) return patterns;

  const weakest = subs[0];
  if (weakest && weakest.pct !== null && weakest.pct < 70) {
    patterns.push({
      tone: "bad",
      text: `'${weakest.label}' 유형 정답률이 ${weakest.pct}%로 가장 낮습니다 (${weakest.correct}/${weakest.total}).`,
    });
  }

  const wrong = attempts.filter((a) => !a.correct);
  const unanswered = wrong.filter((a) => !a.userAnswer).length;
  if (wrong.length >= 3 && unanswered / wrong.length >= 0.3) {
    patterns.push({
      tone: "warn",
      text: `오답 중 ${Math.round((unanswered / wrong.length) * 100)}%가 무응답입니다. 시간 배분이나 포기 습관을 점검해 보세요.`,
    });
  }

  // 같은 정답을 반복해서 틀리는 경우 (단어·빈칸에서 특히 의미 있음)
  const repeat = new Map<string, { count: number; stem: string }>();
  for (const a of wrong) {
    if (!a.correctAnswer) continue;
    const k = `${a.subsection}::${a.correctAnswer.toLowerCase()}`;
    const cur = repeat.get(k) ?? { count: 0, stem: a.correctAnswer };
    cur.count++;
    repeat.set(k, cur);
  }
  const repeated = [...repeat.values()].filter((r) => r.count >= 2).sort((a, b) => b.count - a.count);
  if (repeated.length) {
    const top = repeated.slice(0, 3).map((r) => `${r.stem}(${r.count}회)`).join(", ");
    patterns.push({ tone: "bad", text: `반복해서 틀리는 항목: ${top}` });
  }

  const slight = wrong.filter((a) => a.severity === "slight").length;
  if (wrong.length >= 4 && slight / wrong.length >= 0.4) {
    patterns.push({
      tone: "warn",
      text: `오답의 ${Math.round((slight / wrong.length) * 100)}%가 '약간 오답'(철자·사소한 실수)입니다. 개념 이해보다 마무리 점검이 필요합니다.`,
    });
  }

  for (const s of subs) {
    if (s.recentPct !== null && s.earlierPct !== null) {
      if (s.recentPct - s.earlierPct >= 20) {
        patterns.push({ tone: "good", text: `'${s.label}' 최근 정답률이 ${s.earlierPct}% → ${s.recentPct}%로 올랐습니다.` });
      } else if (s.earlierPct - s.recentPct >= 20) {
        patterns.push({ tone: "bad", text: `'${s.label}' 최근 정답률이 ${s.earlierPct}% → ${s.recentPct}%로 떨어졌습니다.` });
      }
    }
  }

  return patterns;
}

/* ─────────── 분야 요약 ─────────── */

export type SectionSummary = {
  section: SectionData["section"];
  done: boolean;
  sessionCount: number;
  lastAt: string | null;
  /** 문항 기반이면 정답률, 점수형이면 점수 평균 (0~100) */
  avgPct: number | null;
  /** 최근 3회 평균 − 그 이전 평균 (표본 부족하면 null) */
  delta: number | null;
  /** 최근 30일 수행 횟수 */
  last30: number;
};

function avg(nums: number[]): number | null {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
}

export function summarizeSection(data: SectionData): SectionSummary {
  const sessions = [...data.sessions].sort((a, b) => a.at.localeCompare(b.at));
  const scored = sessions.filter((s): s is SessionRecord & { pct: number } => s.pct !== null);
  const recent = scored.slice(-3).map((s) => s.pct);
  const earlier = scored.slice(0, -3).map((s) => s.pct);
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  return {
    section: data.section,
    done: sessions.length > 0,
    sessionCount: sessions.length,
    lastAt: sessions.length ? sessions[sessions.length - 1].at : null,
    avgPct: data.attempts.length ? stat(data.attempts).pct : avg(scored.map((s) => s.pct)),
    delta: recent.length >= 2 && earlier.length >= 2 ? (avg(recent) ?? 0) - (avg(earlier) ?? 0) : null,
    last30: sessions.filter((s) => new Date(s.at).getTime() >= cutoff).length,
  };
}
