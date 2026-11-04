import { describe, expect, it } from "vitest";
import {
  addDays,
  applyReviewResults,
  countDueReviewByTrack,
  getDueReviewItems,
  kstToday,
  registerReviewItemsForDay,
} from "./reviewItems";

/**
 * 아주 작은 in-memory supabase 흉내 — reviewItems.ts 가 쓰는 체인(select/eq/in/lte/order/upsert/update)만 지원.
 */
function makeFake(tables: Record<string, any[]>) {
  const db: Record<string, any[]> = JSON.parse(JSON.stringify(tables));
  const client = {
    from(name: string) {
      db[name] ??= [];
      let rows = db[name];
      let op: "select" | "update" = "select";
      let patch: any = null;
      const filters: Array<(r: any) => boolean> = [];
      let orderCol: string | null = null;
      let orderDesc = false;

      const run = () => {
        let out = rows.filter((r) => filters.every((f) => f(r)));
        if (orderCol) {
          out = [...out].sort((a, b) =>
            a[orderCol!] < b[orderCol!] ? (orderDesc ? 1 : -1) : a[orderCol!] > b[orderCol!] ? (orderDesc ? -1 : 1) : 0,
          );
        }
        return out;
      };

      const q: any = {
        select: () => q,
        eq: (c: string, v: any) => (filters.push((r) => r[c] === v), q),
        in: (c: string, vs: any[]) => (filters.push((r) => vs.includes(r[c])), q),
        lte: (c: string, v: any) => (filters.push((r) => r[c] <= v), q),
        order: (c: string, o?: { ascending?: boolean }) => ((orderCol = c), (orderDesc = o?.ascending === false), q),
        update: (p: any) => ((op = "update"), (patch = p), q),
        upsert: async (newRows: any[], opts: { onConflict: string }) => {
          const keys = opts.onConflict.split(",");
          for (const nr of newRows) {
            const i = rows.findIndex((r) => keys.every((k) => r[k] === nr[k]));
            if (i >= 0) rows[i] = { ...rows[i], ...nr };
            else rows.push({ id: `id${rows.length + 1}`, ...nr });
          }
          return { error: null };
        },
        then: (resolve: any) => {
          if (op === "update") {
            for (const r of run()) Object.assign(r, patch);
            return resolve({ data: null, error: null });
          }
          return resolve({ data: run(), error: null });
        },
      };
      return q;
    },
  };
  return { client, db };
}

describe("복습 날짜 계산", () => {
  it("KST 기준 날짜로 바뀐다 (UTC 15시 = KST 다음날 0시)", () => {
    expect(kstToday(new Date("2026-11-04T14:59:00Z"))).toBe("2026-11-04");
    expect(kstToday(new Date("2026-11-04T15:00:00Z"))).toBe("2026-11-05");
  });
  it("addDays", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  });
});

describe("registerReviewItemsForDay", () => {
  const base = {
    vocab_set_items: [
      { set_id: "S1", word_id: "w1" },
      { set_id: "S1", word_id: "w2" },
      { set_id: "S1", word_id: "w3" },
    ],
  };

  it("know 모름 + speed 오답을 합쳐 등록하고, 각 단계는 가장 최근 시도만 쓴다", async () => {
    const { client, db } = makeFake({
      ...base,
      vocab_learning_attempts: [
        { student_id: "st", set_id: "S1", stage: "know", wrong_word_ids: ["w1", "w9"], attempted_at: "2026-11-04T01:00:00Z" },
        // 같은 단계의 더 오래된 시도는 무시돼야 한다 (w3)
        { student_id: "st", set_id: "S1", stage: "know", wrong_word_ids: ["w3"], attempted_at: "2026-11-03T01:00:00Z" },
        { student_id: "st", set_id: "S1", stage: "speed", wrong_word_ids: ["w2"], attempted_at: "2026-11-04T02:00:00Z" },
        // 스펠링 단계는 정책에 없다
        { student_id: "st", set_id: "S1", stage: "spelling", wrong_word_ids: ["w3"], attempted_at: "2026-11-04T01:30:00Z" },
      ],
      vocab_review_items: [],
    });
    const r = await registerReviewItemsForDay(client, { studentId: "st", trackId: "T1", setId: "S1" });
    expect(r.ok).toBe(true);
    // w9 는 이 Day 의 단어가 아니므로 제외
    expect(db.vocab_review_items.map((x) => x.word_id).sort()).toEqual(["w1", "w2"]);
    expect(db.vocab_review_items.every((x) => x.stage === 1 && x.status === "open")).toBe(true);
    expect(db.vocab_review_items[0].due_on).toBe(addDays(kstToday(), 1));
  });

  it("다시 약점이 되면 1회차부터 다시 시작한다", async () => {
    const { client, db } = makeFake({
      ...base,
      vocab_learning_attempts: [
        { student_id: "st", set_id: "S1", stage: "know", wrong_word_ids: ["w1"], attempted_at: "2026-11-04T01:00:00Z" },
      ],
      vocab_review_items: [
        { id: "x", student_id: "st", word_id: "w1", stage: 3, status: "graduated", r1_ok: false, r2_ok: false },
      ],
    });
    await registerReviewItemsForDay(client, { studentId: "st", trackId: "T1", setId: "S1" });
    const w1 = db.vocab_review_items.find((x) => x.word_id === "w1");
    expect(w1.stage).toBe(1);
    expect(w1.status).toBe("open");
    expect(w1.r1_ok).toBeNull();
  });

  it("약점 단어가 없으면 아무것도 등록하지 않는다", async () => {
    const { client, db } = makeFake({
      ...base,
      vocab_learning_attempts: [
        { student_id: "st", set_id: "S1", stage: "know", wrong_word_ids: [], attempted_at: "2026-11-04T01:00:00Z" },
      ],
      vocab_review_items: [],
    });
    const r = await registerReviewItemsForDay(client, { studentId: "st", trackId: "T1", setId: "S1" });
    expect(r).toMatchObject({ ok: true, registered: 0 });
    expect(db.vocab_review_items).toHaveLength(0);
  });
});

describe("복습 회차 규칙 (applyReviewResults)", () => {
  const item = (over: any = {}) => ({
    id: "i1",
    student_id: "st",
    word_id: "w1",
    track_id: "T1",
    stage: 1,
    status: "open",
    r1_ok: null,
    r2_ok: null,
    due_on: "2026-11-05",
    ...over,
  });

  it("1회차 → 결과와 상관없이 2회차(다음 날)로", async () => {
    for (const correct of [true, false]) {
      const { client, db } = makeFake({ vocab_review_items: [item()] });
      await applyReviewResults(client, { studentId: "st", results: [{ wordId: "w1", correct }], today: "2026-11-05" });
      const it = db.vocab_review_items[0];
      expect(it.stage).toBe(2);
      expect(it.r1_ok).toBe(correct);
      expect(it.due_on).toBe("2026-11-06");
      expect(it.status).toBe("open");
    }
  });

  it("2회차까지 다 맞히면 졸업 (3회차 없음)", async () => {
    const { client, db } = makeFake({ vocab_review_items: [item({ stage: 2, r1_ok: true })] });
    const r = await applyReviewResults(client, { studentId: "st", results: [{ wordId: "w1", correct: true }], today: "2026-11-06" });
    expect(db.vocab_review_items[0].status).toBe("graduated");
    expect(r.graduated).toBe(1);
  });

  it("1회차에서 틀렸으면 2회차를 맞혀도 3회차가 필요하다", async () => {
    const { client, db } = makeFake({ vocab_review_items: [item({ stage: 2, r1_ok: false })] });
    await applyReviewResults(client, { studentId: "st", results: [{ wordId: "w1", correct: true }], today: "2026-11-06" });
    const it = db.vocab_review_items[0];
    expect(it.status).toBe("open");
    expect(it.stage).toBe(3);
    expect(it.due_on).toBe("2026-11-07");
  });

  it("2회차에서 틀리면 3회차", async () => {
    const { client, db } = makeFake({ vocab_review_items: [item({ stage: 2, r1_ok: true })] });
    await applyReviewResults(client, { studentId: "st", results: [{ wordId: "w1", correct: false }], today: "2026-11-06" });
    expect(db.vocab_review_items[0].stage).toBe(3);
  });

  it("3회차: 맞히면 졸업, 틀리면 lapsed(복습 종료·총 시험에서 다룸)", async () => {
    const a = makeFake({ vocab_review_items: [item({ stage: 3 })] });
    await applyReviewResults(a.client, { studentId: "st", results: [{ wordId: "w1", correct: true }] });
    expect(a.db.vocab_review_items[0].status).toBe("graduated");

    const b = makeFake({ vocab_review_items: [item({ stage: 3 })] });
    await applyReviewResults(b.client, { studentId: "st", results: [{ wordId: "w1", correct: false }] });
    expect(b.db.vocab_review_items[0].status).toBe("lapsed");
  });

  it("시험에 나오지 않은 항목은 건드리지 않는다", async () => {
    const { client, db } = makeFake({
      vocab_review_items: [item(), item({ id: "i2", word_id: "w2" })],
    });
    await applyReviewResults(client, { studentId: "st", results: [{ wordId: "w1", correct: true }], today: "2026-11-05" });
    expect(db.vocab_review_items.find((x) => x.word_id === "w2").stage).toBe(1);
  });
});

describe("오늘 복습할 단어 조회", () => {
  it("기한이 지난 것도 포함하고(하루 빼먹어도 남음), 졸업/종료 항목은 제외, 교재별로 센다", async () => {
    const { client } = makeFake({
      vocab_review_items: [
        { id: "1", student_id: "st", word_id: "a", track_id: "T1", stage: 1, status: "open", due_on: "2026-11-01", set_id: "S" },
        { id: "2", student_id: "st", word_id: "b", track_id: "T1", stage: 2, status: "open", due_on: "2026-11-05", set_id: "S" },
        { id: "3", student_id: "st", word_id: "c", track_id: "T2", stage: 1, status: "open", due_on: "2026-11-05", set_id: "S" },
        { id: "4", student_id: "st", word_id: "d", track_id: "T1", stage: 1, status: "open", due_on: "2026-11-09", set_id: "S" }, // 아직 아님
        { id: "5", student_id: "st", word_id: "e", track_id: "T1", stage: 3, status: "graduated", due_on: "2026-11-01", set_id: "S" },
        { id: "6", student_id: "other", word_id: "f", track_id: "T1", stage: 1, status: "open", due_on: "2026-11-01", set_id: "S" },
      ],
    });
    const t1 = await getDueReviewItems(client, { studentId: "st", trackId: "T1", today: "2026-11-05" });
    expect(t1.map((x) => x.wordId).sort()).toEqual(["a", "b"]);
    const counts = await countDueReviewByTrack(client, { studentId: "st", today: "2026-11-05" });
    expect(counts).toEqual({ T1: 2, T2: 1 });
  });

  it("테이블 오류가 나도 예외 없이 빈 값", async () => {
    const broken: any = {
      from: () => {
        throw new Error("relation does not exist");
      },
    };
    expect(await getDueReviewItems(broken, { studentId: "st" })).toEqual([]);
    expect(await countDueReviewByTrack(broken, { studentId: "st" })).toEqual({});
  });
});
