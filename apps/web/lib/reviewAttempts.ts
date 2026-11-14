// lib/reviewAttempts.ts
// Drill / 단어시험 시도 기록. 리뷰 데이터(JSON) 안에 attempts 로 이어 붙여 저장한다. 서버/클라이언트 공용(의존성 없음).

export interface AttemptTagStat {
  tag: string;
  ok: number;
  n: number;
}

export interface DrillAttempt {
  id: string;
  kind: "drill" | "vocab";
  /** ISO 시각 */
  at: string;
  correct: number;
  total: number;
  /** 문법/문형 태그별 맞힌 수 (Drill) */
  byTag: AttemptTagStat[];
  /** 틀린 단어·표현 (단어시험) */
  missed?: string[];
}

export const MAX_ATTEMPTS = 30;

/** 클라이언트가 보낸 항목별 결과 → 시도 기록. 값은 길이·개수를 제한해서 믿고 쓰지 않는다. */
export function buildDrillAttempt(results: { tag?: unknown; ok?: unknown }[]): DrillAttempt | null {
  const list = (Array.isArray(results) ? results : []).slice(0, 60);
  if (list.length === 0) return null;
  const map = new Map<string, AttemptTagStat>();
  let correct = 0;
  for (const r of list) {
    const tag = String(r?.tag ?? "").trim().slice(0, 40) || "기타";
    const ok = r?.ok === true;
    const t = map.get(tag) ?? { tag, ok: 0, n: 0 };
    t.n += 1;
    if (ok) {
      t.ok += 1;
      correct += 1;
    }
    map.set(tag, t);
  }
  return {
    id: `a${Date.now().toString(36)}`,
    kind: "drill",
    at: new Date().toISOString(),
    correct,
    total: list.length,
    byTag: [...map.values()],
  };
}

export function buildVocabAttempt(total: unknown, correct: unknown, missed: unknown): DrillAttempt | null {
  const t = Math.max(0, Math.min(60, Number(total) || 0));
  if (t === 0) return null;
  const c = Math.max(0, Math.min(t, Number(correct) || 0));
  return {
    id: `a${Date.now().toString(36)}`,
    kind: "vocab",
    at: new Date().toISOString(),
    correct: c,
    total: t,
    byTag: [],
    missed: (Array.isArray(missed) ? missed : []).slice(0, 30).map((m) => String(m ?? "").slice(0, 60)).filter(Boolean),
  };
}

/** 목록용 한 줄 요약: "Drill 7/10 · 단어 9/12" (가장 최근 기록 기준) */
export function summarizeAttempts(attempts: DrillAttempt[] | null | undefined): string {
  const list = Array.isArray(attempts) ? attempts : [];
  const lastOf = (k: DrillAttempt["kind"]) => [...list].reverse().find((a) => a.kind === k);
  const d = lastOf("drill");
  const v = lastOf("vocab");
  const parts: string[] = [];
  if (d) parts.push(`Drill ${d.correct}/${d.total}`);
  if (v) parts.push(`단어 ${v.correct}/${v.total}`);
  return parts.join(" · ");
}
