"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArcheryQuestion } from "@/components/workout/ArcheryPhaser";
import { CLOZE_SENTENCES, type ClozeItem } from "@/lib/workout/clozeSentences";

/**
 * WORD TETRIS (1층)
 *  - 일반 테트리스. 줄을 지울 때마다 단어 카드가 한 장씩 모인다.
 *  - 스테이지(N줄)를 채우면 모인 카드로 단어 퀴즈 → 별 1~3개(보너스 점수). 틀린 단어는 다음 스테이지 카드에 다시 나온다.
 *  - 꼭대기에 닿으면 목숨 -1, 위쪽 절반이 비워지고 이어서 한다. 목숨 0이면 끝.
 *  퀴즈는 게임 흐름을 멈춘 뒤에만 나오므로 블록과 단어를 동시에 하지 않아도 된다(시뮬레이션으로 난이도 확인).
 */
export type TetrisLevel = "easy" | "normal" | "hard";

type Props = {
  questions: ArcheryQuestion[];
  level?: TetrisLevel;
  stages?: number;
  /** 2층 기능 켜고 끄기(기본 둘 다 켬). special: 슬로우 블록·pause권, cloze: 빈칸 문장 이벤트 */
  features?: { special?: boolean; cloze?: boolean };
  onFinish?: (r: { score: number; correct: number; total: number; stages: number; stars: number }) => void;
};

const W = 10;
const H = 20;
const CELL = 30;
// 난이도: 목숨, 스테이지 줄 수, 낙하 간격(ms)
const LEVEL_CFG: Record<TetrisLevel, { lives: number; lines: number; drop: number }> = {
  easy: { lives: 5, lines: 6, drop: 1100 },
  normal: { lives: 3, lines: 8, drop: 800 },
  hard: { lives: 2, lines: 10, drop: 600 },
};
const COLORS = ["", "#22d3ee", "#facc15", "#a78bfa", "#4ade80", "#f87171", "#60a5fa", "#fb923c", "#fbbf24", "#38bdf8"];
const ANSWER = 8; // 정답 블록 칸
const SLOW = 9; // 슬로우 블록 칸
const EVENT_PIECES = 8; // 문장 이벤트가 열려 있는 조각 수
const EVENT_GAP = 6; // 이벤트 사이 최소 조각 수
const SLOW_MS = 8000;
const PAUSE_MS = 10000;
const SHAPES: Record<string, { c: number; cells: [number, number][] }> = {
  I: { c: 1, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { c: 2, cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  T: { c: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { c: 4, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { c: 5, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { c: 6, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { c: 7, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};
const NAMES = Object.keys(SHAPES);

type Piece = { name: string; cells: [number, number][]; x: number; y: number; kind?: "answer" | "decoy"; word?: string; slow?: boolean };
type Ev = { item: ClozeItem; left: number; spawned: number };
type Phase = "start" | "play" | "quiz" | "stageEnd" | "over" | "clear";
type Card = { q: ArcheryQuestion; missed: boolean };

function rotate(cells: [number, number][], name: string): [number, number][] {
  if (name === "O") return cells;
  // 4x4(I) / 3x3 상자 안에서 시계 방향 회전
  const n = name === "I" ? 4 : 3;
  return cells.map(([x, y]) => [n - 1 - y, x] as [number, number]);
}
function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function TetrisGame({ questions, level = "normal", stages = 3, features, onFinish }: Props) {
  const useSpecial = features?.special !== false;
  const useCloze = features?.cloze !== false;
  const cfg = LEVEL_CFG[level];
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);

  // 게임 상태(빠르게 변하는 값은 ref, 화면에 보이는 값만 state)
  const g = useRef({
    grid: Array.from({ length: H }, () => Array(W).fill(0)) as number[][],
    piece: null as Piece | null,
    bag: [] as string[],
    next: "T",
    acc: 0,
    soft: false,
    phase: "start" as Phase,
    pool: [] as ArcheryQuestion[], // 아직 안 나온 문제
    redo: [] as ArcheryQuestion[], // 틀려서 다시 나올 문제
    cards: [] as Card[],
    stageLines: 0,
    ev: null as Ev | null,
    sinceEvent: 99,
    sinceSlow: 0,
    slowMs: 0,
    pauseMs: 0,
    midDone: false,
    clozeSeen: [] as number[],
  });

  const [phase, setPhase] = useState<Phase>("start");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(cfg.lives);
  const [stage, setStage] = useState(0);
  const [stageLines, setStageLines] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [lastCard, setLastCard] = useState<string>("");
  const [stars, setStars] = useState(0);
  const totals = useRef({ score: 0, correct: 0, total: 0, stars: 0 });
  const stageRef = useRef(0);
  const livesRef = useRef(cfg.lives);

  // 퀴즈 상태
  const [quiz, setQuiz] = useState<{ items: { q: ArcheryQuestion; choices: string[] }[]; i: number; right: number; picked: string | null } | null>(null);
  const [stageStars, setStageStars] = useState(0);
  const [evView, setEvView] = useState<{ text: string; pos: string } | null>(null);
  const [tickets, setTickets] = useState(0);
  const ticketsRef = useRef(0);
  const [msg, setMsg] = useState("");
  const [fx, setFx] = useState({ slow: false, pause: false });
  const msgTimer = useRef<number | undefined>(undefined);
  const flash = (t: string) => {
    setMsg(t);
    window.clearTimeout(msgTimer.current);
    msgTimer.current = window.setTimeout(() => setMsg(""), 3200);
  };

  const setPh = useCallback((p: Phase) => {
    g.current.phase = p;
    setPhase(p);
  }, []);

  function startEvent(reason: string) {
    const s = g.current;
    if (!useCloze || s.ev || s.sinceEvent < EVENT_GAP) return;
    let idx = Math.floor(Math.random() * CLOZE_SENTENCES.length);
    for (let t = 0; t < 8 && s.clozeSeen.includes(idx); t++) idx = Math.floor(Math.random() * CLOZE_SENTENCES.length);
    s.clozeSeen.push(idx);
    if (s.clozeSeen.length > 20) s.clozeSeen.shift();
    const item = CLOZE_SENTENCES[idx];
    s.ev = { item, left: EVENT_PIECES, spawned: 0 };
    setEvView({ text: item.s, pos: item.pos });
    flash(reason);
  }
  function endEvent(success: boolean) {
    const s = g.current;
    if (!s.ev) return;
    s.ev = null;
    s.sinceEvent = 0;
    setEvView(null);
    for (const row of s.grid) for (let x = 0; x < W; x++) if (row[x] === ANSWER) row[x] = 3;
    if (!success) flash("문장 이벤트가 끝났어요 (벌칙 없음)");
  }
  function reward() {
    totals.current.score += 300 * (stageRef.current + 1);
    setScore(totals.current.score);
    if (livesRef.current < cfg.lives + 1) {
      livesRef.current += 1;
      setLives(livesRef.current);
      flash("정답 블록 성공! 목숨 +1");
    } else {
      ticketsRef.current += 1;
      setTickets(ticketsRef.current);
      flash("정답 블록 성공! pause권 +1");
    }
  }
  const triggerPause = useCallback(() => {
    const s = g.current;
    if (s.phase !== "play") return;
    if (s.pauseMs > 0) {
      s.pauseMs = 0;
      setFx((f) => ({ ...f, pause: false }));
      return;
    }
    if (ticketsRef.current <= 0) return;
    ticketsRef.current -= 1;
    setTickets(ticketsRef.current);
    s.pauseMs = PAUSE_MS;
    setFx((f) => ({ ...f, pause: true }));
    startEvent("생각할 시간! 문장이 떴어요");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextName = () => {
    const s = g.current;
    if (s.bag.length === 0) s.bag = shuffle(NAMES);
    return s.bag.pop()!;
  };
  const spawn = useCallback(() => {
    const s = g.current;
    const name = s.next;
    s.next = nextName();
    const def = SHAPES[name];
    const p: Piece = { name, cells: def.cells.map(([x, y]) => [x, y] as [number, number]), x: 3, y: name === "I" ? -1 : 0 };
    s.sinceEvent++;
    s.sinceSlow++;
    if (s.ev) {
      // 문장 이벤트: 오답 조각 - 정답 조각 - 오답 조각 순으로 라벨이 붙는다. 정해진 조각 수가 지나면 이벤트는 끝난다.
      if (s.ev.left <= 0) endEvent(false);
      else {
        const k = s.ev.spawned++;
        s.ev.left--;
        const wrongs = s.ev.item.wrong;
        if (k === 1) {
          p.kind = "answer";
          p.word = s.ev.item.a;
        } else if (k === 0 || k === 2) {
          p.kind = "decoy";
          p.word = wrongs[k === 0 ? 0 : 1] ?? wrongs[0];
        }
      }
    } else if (useSpecial && s.sinceSlow >= 12 && Math.random() < 0.5) {
      p.slow = true; // 이 조각의 한 칸이 슬로우 블록(그 줄을 지우면 낙하가 느려지고 문장이 뜬다)
      s.sinceSlow = 0;
    }
    s.piece = p;
    return fits(s.grid, p, 0, 0);
  }, []);

  function fits(grid: number[][], p: Piece, dx: number, dy: number, cells = p.cells) {
    return cells.every(([cx, cy]) => {
      const x = p.x + cx + dx;
      const y = p.y + cy + dy;
      return x >= 0 && x < W && y < H && (y < 0 || !grid[y][x]);
    });
  }

  const drawCards = (n: number): ArcheryQuestion[] => {
    const s = g.current;
    const out: ArcheryQuestion[] = [];
    for (let i = 0; i < n; i++) {
      let q = s.redo.shift();
      if (!q) {
        if (s.pool.length === 0) s.pool = shuffle(questions);
        q = s.pool.pop();
      }
      if (q) out.push(q);
    }
    return out;
  };

  const startStage = useCallback(
    (resetGrid: boolean) => {
      const s = g.current;
      if (resetGrid) s.grid = Array.from({ length: H }, () => Array(W).fill(0));
      s.cards = [];
      s.stageLines = 0;
      s.midDone = false;
      s.acc = 0;
      setStageLines(0);
      setCardCount(0);
      setLastCard("");
      if (!s.next) s.next = nextName();
      spawn();
      setPh("play");
    },
    [setPh, spawn],
  );

  const startGame = useCallback(() => {
    const s = g.current;
    s.pool = shuffle(questions);
    s.redo = [];
    s.bag = [];
    s.next = nextName();
    totals.current = { score: 0, correct: 0, total: 0, stars: 0 };
    s.ev = null;
    s.sinceEvent = 99;
    s.sinceSlow = 0;
    s.slowMs = 0;
    s.pauseMs = 0;
    ticketsRef.current = 0;
    setTickets(0);
    setEvView(null);
    setFx({ slow: false, pause: false });
    setScore(0);
    setLives(cfg.lives);
    stageRef.current = 0;
    livesRef.current = cfg.lives;
    setStage(0);
    startStage(true);
  }, [cfg.lives, questions, startStage]);

  const finish = useCallback(
    (cleared: boolean) => {
      const t = totals.current;
      setPh(cleared ? "clear" : "over");
      finishRef.current?.({ score: t.score, correct: t.correct, total: t.total, stages: cleared ? stages : stageRef.current, stars: t.stars });
    },
    [setPh, stages],
  );

  // ---- 조작 ----
  const move = useCallback((dx: number) => {
    const s = g.current;
    const p = s.piece;
    if (s.phase !== "play" || !p) return;
    if (fits(s.grid, p, dx, 0)) p.x += dx;
  }, []);
  const rotatePiece = useCallback(() => {
    const s = g.current;
    const p = s.piece;
    if (s.phase !== "play" || !p) return;
    const rc = rotate(p.cells, p.name);
    for (const k of [0, -1, 1, -2, 2]) {
      if (fits(s.grid, p, k, 0, rc)) {
        p.cells = rc;
        p.x += k;
        return;
      }
    }
  }, []);

  const lockPiece = useCallback(() => {
    const s = g.current;
    const p = s.piece;
    if (!p) return;
    let topOut = false;
    for (const [cx, cy] of p.cells) {
      const x = p.x + cx;
      const y = p.y + cy;
      if (y < 0) topOut = true;
      else s.grid[y][x] = p.kind === "answer" ? ANSWER : p.slow && cx === p.cells[0][0] && cy === p.cells[0][1] ? SLOW : SHAPES[p.name].c;
    }
    // 줄 지우기
    const fullRows = s.grid.filter((r) => r.every(Boolean));
    const full = fullRows.length;
    const hitAnswer = fullRows.some((r) => r.includes(ANSWER));
    const hitSlow = fullRows.some((r) => r.includes(SLOW));
    if (full > 0) {
      s.grid = s.grid.filter((r) => !r.every(Boolean));
      while (s.grid.length < H) s.grid.unshift(Array(W).fill(0));
      const gain = ([0, 100, 300, 500, 800][full] ?? 800) * (stageRef.current + 1);
      totals.current.score += gain;
      setScore(totals.current.score);
      // 줄마다 단어 카드 한 장
      const cs = drawCards(full);
      for (const q of cs) s.cards.push({ q, missed: false });
      s.stageLines += full;
      setStageLines(s.stageLines);
      setCardCount(s.cards.length);
      if (cs.length) setLastCard(`${cs[cs.length - 1].answer}`);
      // 문장 이벤트 보상 / 특수 블록 / 올 클리어 / 스테이지 중간
      if (hitAnswer && s.ev) {
        endEvent(true);
        reward();
      }
      if (hitSlow && useSpecial) {
        s.slowMs = SLOW_MS;
        setFx((f) => ({ ...f, slow: true }));
        startEvent("슬로우 블록! 낙하가 느려지고 문장이 떴어요");
      }
      if (s.grid.every((r) => r.every((v) => !v))) {
        totals.current.score += 500 * (stageRef.current + 1);
        setScore(totals.current.score);
        startEvent("올 클리어! 보너스 문장이 떴어요");
      }
      if (!s.midDone && s.stageLines >= Math.ceil(cfg.lines / 2)) {
        s.midDone = true;
        startEvent("절반 달성! 문장이 떴어요");
      }
      if (s.stageLines >= cfg.lines) {
        s.piece = null;
        beginQuiz();
        return;
      }
    }
    if (topOut) {
      loseLife();
      return;
    }
    if (!spawn()) loseLife();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.lines, spawn]);

  function loseLife() {
    const s = g.current;
    const left = livesRef.current - 1;
    livesRef.current = left;
    setLives(left);
    if (left <= 0) {
      s.piece = null;
      finish(false);
      return;
    }
    for (let y = 0; y < H / 2; y++) s.grid[y] = Array(W).fill(0); // 위쪽 절반을 비우고 이어서
    spawn();
  }

  const hardDrop = useCallback(() => {
    const s = g.current;
    const p = s.piece;
    if (s.phase !== "play" || !p) return;
    let n = 0;
    while (fits(s.grid, p, 0, 1)) {
      p.y++;
      n++;
    }
    totals.current.score += n * 2;
    setScore(totals.current.score);
    lockPiece();
  }, [lockPiece]);

  // ---- 퀴즈 ----
  function beginQuiz() {
    const s = g.current;
    if (s.ev) endEvent(true);
    s.slowMs = 0;
    s.pauseMs = 0;
    setFx({ slow: false, pause: false });
    const picks = s.cards.slice(0, 6); // 한 스테이지 퀴즈는 최대 6문제
    if (picks.length === 0) {
      endStage(0);
      return;
    }
    const items = picks.map((c) => ({ q: c.q, choices: shuffle(c.q.choices.length ? c.q.choices : [c.q.answer]) }));
    setQuiz({ items, i: 0, right: 0, picked: null });
    setPh("quiz");
  }
  function answer(choice: string) {
    if (!quiz || quiz.picked) return;
    const qz = quiz;
    const cur = qz.items[qz.i];
    const ok = choice === cur.q.answer;
    totals.current.total += 1;
    if (ok) totals.current.correct += 1;
    else g.current.redo.push(cur.q); // 틀린 단어는 다음 스테이지에 다시
    const right = qz.right + (ok ? 1 : 0);
    setQuiz({ ...qz, picked: choice, right });
    window.setTimeout(() => {
      if (qz.i + 1 >= qz.items.length) {
        setQuiz(null);
        const ratio = right / qz.items.length;
        endStage(ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1);
      } else {
        setQuiz({ ...qz, i: qz.i + 1, picked: null, right });
      }
    }, ok ? 700 : 1300);
  }
  function endStage(st: number) {
    totals.current.score += st * 200;
    totals.current.stars += st;
    setScore(totals.current.score);
    setStageStars(st);
    setStars(totals.current.stars);
    if (stageRef.current + 1 >= stages) finish(true);
    else {
      stageRef.current += 1;
      setStage(stageRef.current);
      setPh("stageEnd");
    }
  }

  // ---- 루프 + 입력 ----
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      const s = g.current;
      if (s.phase === "play" && s.piece) {
        const slowMul = s.slowMs > 0 ? 2.2 : 1;
        if (s.slowMs > 0) {
          s.slowMs -= dt;
          if (s.slowMs <= 0) setFx((f) => ({ ...f, slow: false }));
        }
        const interval = Math.max(120, (cfg.drop * Math.pow(0.9, stageRef.current) * slowMul) / (s.soft ? 12 : 1));
        if (s.pauseMs > 0) {
          s.pauseMs -= dt;
          if (s.pauseMs <= 0) setFx((f) => ({ ...f, pause: false }));
        } else s.acc += dt;
        while (s.acc >= interval) {
          s.acc -= interval;
          const p = s.piece;
          if (!p) break;
          if (fits(s.grid, p, 0, 1)) p.y++;
          else {
            lockPiece();
            break;
          }
        }
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const kd = (e: KeyboardEvent) => {
      const s = g.current;
      if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "].includes(e.key)) e.preventDefault();
      if (s.phase === "start" || s.phase === "over" || s.phase === "clear") {
        if (e.key === "Enter" || e.key === " ") startGame();
        return;
      }
      if (s.phase === "stageEnd") {
        if (e.key === "Enter" || e.key === " ") startStage(false);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "a") move(-1);
      else if (e.key === "ArrowRight" || e.key === "d") move(1);
      else if (e.key === "ArrowUp" || e.key === "w" || e.key === "x") rotatePiece();
      else if (e.key === "ArrowDown" || e.key === "s") s.soft = true;
      else if (e.key === " ") hardDrop();
      else if (e.key === "p" || e.key === "P") triggerPause();
    };
    const ku = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "s") g.current.soft = false;
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.drop, lockPiece, hardDrop, move, rotatePiece, triggerPause, startGame, startStage]);

  function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size = CELL, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
    ctx.globalAlpha = 1;
  }
  function draw() {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const s = g.current;
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, W * CELL, H * CELL);
    ctx.strokeStyle = "rgba(148,163,184,0.08)";
    for (let x = 1; x < W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H * CELL);
      ctx.stroke();
    }
    for (let y = 1; y < H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W * CELL, y * CELL);
      ctx.stroke();
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (s.grid[y][x]) drawCell(ctx, x, y, COLORS[s.grid[y][x]]);
    const p = s.piece;
    if (p && s.phase === "play") {
      let gy = 0;
      while (fits(s.grid, p, 0, gy + 1)) gy++;
      for (const [cx, cy] of p.cells) if (p.y + cy + gy >= 0) drawCell(ctx, p.x + cx, p.y + cy + gy, COLORS[SHAPES[p.name].c], CELL, 0.22);
      for (const [cx, cy] of p.cells) {
        if (p.y + cy < 0) continue;
        const isSlow = p.slow && cx === p.cells[0][0] && cy === p.cells[0][1];
        drawCell(ctx, p.x + cx, p.y + cy, p.kind === "answer" ? COLORS[ANSWER] : isSlow ? COLORS[SLOW] : COLORS[SHAPES[p.name].c]);
      }
      if (p.word) {
        const minX = Math.min(...p.cells.map((c) => c[0])) + p.x;
        const minY = Math.min(...p.cells.map((c) => c[1])) + p.y;
        ctx.font = "bold 14px system-ui, sans-serif";
        const w = ctx.measureText(p.word).width + 14;
        const bx = Math.min(W * CELL - w - 2, Math.max(2, minX * CELL));
        const by = Math.max(2, minY * CELL - 24);
        ctx.fillStyle = p.kind === "answer" ? "#fbbf24" : "#475569";
        ctx.fillRect(bx, by, w, 20);
        ctx.fillStyle = p.kind === "answer" ? "#0f172a" : "#e2e8f0";
        ctx.fillText(p.word, bx + 7, by + 15);
      }
    }
    const nv = nextRef.current;
    if (nv) {
      const c2 = nv.getContext("2d")!;
      c2.fillStyle = "#0b1220";
      c2.fillRect(0, 0, nv.width, nv.height);
      const def = SHAPES[s.next];
      if (def) for (const [cx, cy] of def.cells) drawCell(c2, cx + 0.2, cy + 0.4, COLORS[def.c], 22);
    }
  }

  const btn = "rounded-xl bg-slate-700 active:bg-slate-500 text-white font-bold text-xl select-none touch-none";
  const hold = (fn: () => void) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      fn();
    },
  });
  const cur = quiz ? quiz.items[quiz.i] : null;

  return (
    <div className="w-full mx-auto select-none touch-none" style={{ maxWidth: 480 }}>
      {(evView || msg) && (
        <div className={`mb-2 rounded-xl px-3 py-2 text-white ${evView ? "bg-indigo-900" : "bg-slate-800"}`}>
          {evView && (
            <>
              <p className="text-[11px] text-amber-300 font-bold">문장 이벤트 · {evView.pos} · 금색 블록을 넣고 줄을 지우세요</p>
              <p className="mt-0.5 text-base font-bold leading-snug">{evView.text}</p>
            </>
          )}
          {msg && <p className="text-xs text-emerald-300 mt-0.5">{msg}</p>}
        </div>
      )}
      <div className="relative flex items-start gap-3 rounded-2xl bg-slate-900 p-3 shadow-2xl">
        <div className="flex-1 min-w-0 flex justify-center">
         <div className="relative" style={{ width: "min(100%, calc(min(72dvh, 600px) / 2))", aspectRatio: `${W} / ${H}` }}>
          <canvas ref={canvasRef} width={W * CELL} height={H * CELL} className="w-full h-full rounded-lg border border-slate-700" />

          {phase === "start" && (
            <Overlay>
              <p className="text-xl font-extrabold">WORD TETRIS</p>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                줄을 지우면 단어 카드가 모여요.
                <br />
                {cfg.lines}줄을 채우면 단어 퀴즈! 별을 모으세요.
                <br />
                ← → 이동 · ↑ 회전 · ↓ 빠르게 · Space 떨구기
              </p>
              <button className="mt-4 rounded-full bg-amber-400 px-6 py-2 font-bold text-slate-900" onClick={startGame}>
                시작
              </button>
            </Overlay>
          )}
          {phase === "stageEnd" && (
            <Overlay>
              <p className="text-lg font-extrabold">스테이지 {stage} 클리어!</p>
              <p className="text-2xl mt-1">{"★".repeat(stageStars)}{"☆".repeat(3 - stageStars)}</p>
              <p className="text-xs text-slate-300 mt-1">틀린 단어는 다음 스테이지에 다시 나와요</p>
              <button className="mt-4 rounded-full bg-amber-400 px-6 py-2 font-bold text-slate-900" onClick={() => startStage(false)}>
                다음 스테이지
              </button>
            </Overlay>
          )}
          {(phase === "over" || phase === "clear") && (
            <Overlay>
              <p className="text-xl font-extrabold">{phase === "clear" ? "전체 클리어!" : "게임 오버"}</p>
              <p className="text-sm mt-2">점수 {score.toLocaleString()} · 별 {stars}개</p>
              <p className="text-xs text-slate-300 mt-1">
                단어 퀴즈 {totals.current.correct}/{totals.current.total}
              </p>
              <button className="mt-4 rounded-full bg-amber-400 px-6 py-2 font-bold text-slate-900" onClick={startGame}>
                다시 하기
              </button>
            </Overlay>
          )}
         </div>
        </div>

        <div className="w-24 shrink-0 text-white text-sm space-y-3">
          <div>
            <p className="text-[11px] text-slate-400">점수</p>
            <p className="font-extrabold tabular-nums">{score.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">스테이지</p>
            <p className="font-bold">
              {Math.min(stage + 1, stages)} / {stages}
            </p>
            <div className="mt-1 h-2 rounded bg-slate-700 overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (stageLines / cfg.lines) * 100)}%` }} />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stageLines}/{cfg.lines}줄
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">목숨</p>
            <p className="text-rose-400">{"♥".repeat(Math.max(0, lives))}</p>
            <p className="text-[11px] text-sky-300 mt-0.5">
              {fx.slow ? "❄ 슬로우 중" : ""}
              {fx.pause ? " ⏸ 멈춤" : ""}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">다음</p>
            <canvas ref={nextRef} width={96} height={64} className="rounded bg-slate-950" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">단어 카드 {cardCount}장</p>
            <p className="text-xs text-amber-300 break-words min-h-[1.2em]">{lastCard}</p>
          </div>
        </div>
          {phase === "quiz" && cur && quiz && (
            <div className="absolute inset-0 z-10 rounded-2xl bg-slate-950/95 p-4 flex flex-col text-white">
              <p className="text-xs text-amber-300 font-bold">단어 퀴즈 {quiz.i + 1} / {quiz.items.length}</p>
              <p className="mt-2 text-base font-bold leading-snug whitespace-pre-line">{cur.q.prompt}</p>
              <div className="mt-3 grid gap-2">
                {cur.choices.map((c) => {
                  const isAns = c === cur.q.answer;
                  const picked = quiz.picked === c;
                  const cls = quiz.picked ? (isAns ? "bg-emerald-500 text-white" : picked ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-400") : "bg-slate-700 hover:bg-slate-600";
                  return (
                    <button key={c} disabled={!!quiz.picked} onClick={() => answer(c)} className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ${cls}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
      </div>

      <div className="mt-3 grid grid-cols-6 gap-2 px-1">
        <button className={`${btn} h-14`} {...hold(() => move(-1))}>
          ◀
        </button>
        <button className={`${btn} h-14`} {...hold(() => move(1))}>
          ▶
        </button>
        <button className={`${btn} h-14`} {...hold(rotatePiece)}>
          ⟳
        </button>
        <button
          className={`${btn} h-14`}
          onPointerDown={(e) => {
            e.preventDefault();
            g.current.soft = true;
          }}
          onPointerUp={() => (g.current.soft = false)}
          onPointerLeave={() => (g.current.soft = false)}
        >
          ▼
        </button>
        <button className={`${btn} h-14 !text-sm ${tickets > 0 || fx.pause ? "bg-sky-600" : "bg-slate-800 text-slate-500"}`} {...hold(triggerPause)}>
          ⏸{tickets}
        </button>
        <button className={`${btn} h-14 bg-amber-500 text-slate-900 !text-sm`} {...hold(hardDrop)}>
          DROP
        </button>
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 rounded-lg bg-slate-950/85 flex flex-col items-center justify-center text-center text-white p-4">{children}</div>;
}
