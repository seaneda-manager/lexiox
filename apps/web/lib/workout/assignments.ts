import type { GameStyle } from "./gameCatalog";

/** 선생님이 학생에게 내준 게임 */
export type MyAssignment = {
  id: string;
  style: GameStyle;
  setId: string | null;
  setLabel: string | null;
  mode: string;
  level: string;
  targetPlays: number;
  dueDate: string | null;
  note: string;
  plays: number;
  bestScore: number;
  done: boolean;
};

export async function loadMyAssignments(): Promise<MyAssignment[]> {
  try {
    const r = await fetch("/api/workout/assignments", { cache: "no-store" });
    if (!r.ok) return [];
    const j = (await r.json()) as { assignments?: MyAssignment[] };
    return j.assignments ?? [];
  } catch {
    return [];
  }
}

/** 게임 한 판의 결과를 서버에 남긴다(실패해도 게임은 그대로). 직원 계정은 서버가 무시한다. */
export function reportAttempt(p: {
  style: GameStyle;
  setId?: string | null;
  assignmentId?: string | null;
  mode?: string;
  level?: string;
  result: Record<string, unknown>;
}): void {
  const r = p.result;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  // 게임마다 결과 모양이 달라서 공통 점수/정답/문항으로 맞춘다
  const correct = num(r.correct) || num(r.words);
  const total = num(r.total) || num(r.asked);
  const score = r.score !== undefined ? num(r.score) : r.you !== undefined ? num(r.you) : correct * 100;
  try {
    void fetch("/api/workout/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style: p.style, setId: p.setId || null, assignmentId: p.assignmentId || null, mode: p.mode, level: p.level, correct, total, score, detail: r }),
    });
  } catch {
    /* 기록 실패는 무시 */
  }
}
