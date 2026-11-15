"use client";

import { useEffect, useRef } from "react";
import type { ArcheryQuestion } from "./ArcheryPhaser";

/**
 * 단어 오목 (사람 vs AI, 11x11) — 정식 오목 + 철자 획득 점수제
 *  - 차례는 번갈아, 돌은 항상 놓인다. 매 수마다 문제가 뜨지 않는다.
 *  - 공격을 만들면 자기 목표 단어의 철자를 1글자 얻는다(4지선다로 다음 글자 고르기):
 *      열린 3목 / 한쪽이 막힌 4목 / 열린 4목  (같은 줄·같은 종류는 한 번만)
 *  - 철자 1개 +100점, 단어 완성 +300점(다음 단어로).
 *  - 5목을 먼저 만들면 즉시 승리. 각자 20수까지 5목이 없으면 점수가 높은 쪽이 승리.
 */
export type OmokLevel = "easy" | "normal" | "hard";

type Props = {
  questions: ArcheryQuestion[]; // answer가 영어 단어인 문제(영영/한영)
  level?: OmokLevel;
  maxMoves?: number; // 각자 둘 수 있는 돌 수
  onFinish?: (r: { result: "win" | "lose" | "draw"; you: number; ai: number; words: number }) => void;
};

const W = 540;
const H = 900;
const N = 11;
const GAP = 44;
const GX = 50;
const GY = 270;
const QTIME = 10;
const LETTER_PTS = 100;
const WORD_BONUS = 300;
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const AI_ACC: Record<OmokLevel, number> = { easy: 0.5, normal: 0.72, hard: 0.9 };
const LEVEL_LABEL: Record<OmokLevel, string> = { easy: "쉬움", normal: "보통", hard: "어려움" };
const KIND_LABEL = { three: "열린 3목", closed4: "막힌 4목", open4: "열린 4목" } as const;

type Kind = keyof typeof KIND_LABEL;
type Who = 1 | 2; // 1=사람, 2=AI
type Word = { answer: string; prompt: string; got: number };

export default function OmokGame({ questions, level = "normal", maxMoves = 20, onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;

      const px = (i: number) => GX + i * GAP;
      const py = (j: number) => GY + j * GAP;
      const DIRS: [number, number][] = [[1, 0], [0, 1], [1, 1], [1, -1]];
      const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N;

      class OmokScene extends Phaser.Scene {
        state: "start" | "player" | "busy" | "ask" | "ai" | "done" = "start";
        board: number[][] = [];
        stones = new Map<string, Phaser.GameObjects.Image>();
        moves = { 1: 0, 2: 0 } as Record<Who, number>;
        points = { 1: 0, 2: 0 } as Record<Who, number>;
        wordsDone = { 1: 0, 2: 0 } as Record<Who, number>;
        words = {} as Record<Who, Word>;
        used = new Set<string>();
        seen = new Set<string>();
        pool: ArcheryQuestion[] = [];
        modal: Phaser.GameObjects.Container | null = null;
        timerBar: Phaser.GameObjects.Rectangle | null = null;
        timeLeft = 0;
        letterBtns: { r: Phaser.GameObjects.Rectangle; letter: string }[] = [];
        askDone: ((ok: boolean) => void) | null = null;
        askCorrect = "";
        hover!: Phaser.GameObjects.Arc;
        last!: Phaser.GameObjects.Rectangle;
        overlay: Phaser.GameObjects.Container | null = null;
        ui!: {
          youPts: Phaser.GameObjects.Text; youWord: Phaser.GameObjects.Text; youClue: Phaser.GameObjects.Text; youLeft: Phaser.GameObjects.Text;
          aiPts: Phaser.GameObjects.Text; aiWord: Phaser.GameObjects.Text; aiClue: Phaser.GameObjects.Text; aiLeft: Phaser.GameObjects.Text;
          turn: Phaser.GameObjects.Text; tip: Phaser.GameObjects.Text; lvl: Phaser.GameObjects.Text;
        };
        cards: Phaser.GameObjects.Rectangle[] = [];

        constructor() {
          super("omok");
        }

        create() {
          this.state = "start";
          this.board = Array.from({ length: N }, () => Array(N).fill(0));
          this.stones = new Map();
          this.moves = { 1: 0, 2: 0 };
          this.points = { 1: 0, 2: 0 };
          this.wordsDone = { 1: 0, 2: 0 };
          this.used = new Set();
          this.seen = new Set();
          this.letterBtns = [];
          this.modal = null;
          // 영어 단어(3~10글자 알파벳)만 철자 목표로 쓴다
          const ok = questions.filter((q) => /^[A-Za-z]{3,10}$/.test(q.answer));
          this.pool = Phaser.Utils.Array.Shuffle(ok.length >= 2 ? ok : [...questions]);
          this.words[1] = this.pickWord();
          this.words[2] = this.pickWord();

          this.makeTextures();
          this.add.rectangle(0, 0, W, H, 0x0f172a).setOrigin(0).setDepth(0);
          const bg = this.add.graphics().setDepth(0);
          bg.fillStyle(0x1e293b, 1).fillRoundedRect(8, 8, W - 16, H - 16, 28);
          this.add.image(W / 2, GY + (GAP * (N - 1)) / 2, "omok-board").setDepth(1);
          this.hover = this.add.circle(0, 0, 17, 0xffd166, 0.35).setStrokeStyle(2, 0xffd166, 0.9).setDepth(3).setVisible(false);
          this.last = this.add.rectangle(0, 0, 10, 10, 0xef4444).setDepth(5).setVisible(false).setRotation(Math.PI / 4);
          this.buildHud();

          this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onDown(p));
          this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.onMove(p));
          const kb = this.input.keyboard!;
          ["ONE", "TWO", "THREE", "FOUR"].forEach((k, i) => kb.on(`keydown-${k}`, () => this.pickLetter(i)));
          kb.on("keydown-ENTER", () => this.onAnyStart());
          kb.on("keydown-SPACE", () => this.onAnyStart());
          this.showStart();
        }

        makeTextures() {
          const fresh = (key: string, w: number, h: number) => {
            if (this.textures.exists(key)) this.textures.remove(key);
            return this.textures.createCanvas(key, w, h)!;
          };
          const stone = (key: string, c0: string, c1: string, c2: string) => {
            const t = fresh(key, 44, 44);
            const ctx = t.getContext();
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.beginPath(); ctx.ellipse(24, 26, 17, 15, 0, 0, Math.PI * 2); ctx.fill();
            const g = ctx.createRadialGradient(16, 14, 2, 22, 22, 19);
            g.addColorStop(0, c0); g.addColorStop(0.6, c1); g.addColorStop(1, c2);
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(22, 22, 18, 0, Math.PI * 2); ctx.fill();
            t.refresh();
          };
          stone("stone-b", "#6b7280", "#111827", "#000000");
          stone("stone-w", "#ffffff", "#e5e7eb", "#9ca3af");

          const size = GAP * (N - 1) + 70;
          const b = fresh("omok-board", size, size);
          const c = b.getContext();
          const wood = c.createLinearGradient(0, 0, size, size);
          wood.addColorStop(0, "#e6b86a");
          wood.addColorStop(0.5, "#d9a24e");
          wood.addColorStop(1, "#c98f3c");
          c.fillStyle = wood;
          c.beginPath(); c.roundRect?.(0, 0, size, size, 18); c.fill();
          for (let i = 0; i < 70; i++) {
            c.strokeStyle = `rgba(120,70,20,${0.05 + Math.random() * 0.08})`;
            c.lineWidth = 1 + Math.random() * 1.5;
            const y = Math.random() * size;
            c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(size * 0.3, y + 8, size * 0.7, y - 8, size, y + 3); c.stroke();
          }
          c.strokeStyle = "#5b3a14"; c.lineWidth = 4;
          c.beginPath(); c.roundRect?.(2, 2, size - 4, size - 4, 18); c.stroke();
          const o = 35;
          c.strokeStyle = "#3a2410"; c.lineWidth = 1.6;
          for (let k = 0; k < N; k++) {
            c.beginPath(); c.moveTo(o, o + k * GAP); c.lineTo(o + GAP * (N - 1), o + k * GAP); c.stroke();
            c.beginPath(); c.moveTo(o + k * GAP, o); c.lineTo(o + k * GAP, o + GAP * (N - 1)); c.stroke();
          }
          c.fillStyle = "#3a2410";
          [[2, 2], [2, 8], [8, 2], [8, 8], [5, 5]].forEach(([a, d]) => {
            c.beginPath(); c.arc(o + a * GAP, o + d * GAP, 4.5, 0, Math.PI * 2); c.fill();
          });
          b.refresh();

          const g = this.make.graphics({ x: 0, y: 0 }, false);
          g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
          g.generateTexture("spark", 16, 16);
          g.destroy();
        }

        // ---------- 단어 ----------
        pickWord(): Word {
          let q = this.pool.find((p) => !this.used.has(p.answer));
          if (!q) {
            this.used.clear();
            q = this.pool[0];
          }
          this.used.add(q.answer);
          return { answer: q.answer.toLowerCase(), prompt: q.prompt, got: 0 };
        }

        pattern(w: Word): string {
          return w.answer
            .split("")
            .map((c, i) => (i < w.got ? c.toUpperCase() : "_"))
            .join(" ");
        }

        // ---------- HUD ----------
        buildHud() {
          const card = (x: number, color: number) => {
            const r = this.add.rectangle(x, 16, 250, 156, 0x0b1230, 0.9).setOrigin(0, 0).setStrokeStyle(2, color, 0.9).setDepth(9);
            this.cards.push(r);
          };
          this.cards = [];
          card(16, 0xffd166);
          card(274, 0x93c5fd);
          const t = (x: number, y: number, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(x, y, "", { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", ...extra }).setDepth(10);
          this.ui = {
            lvl: t(W / 2, 192, 12, "#94a3b8").setOrigin(0.5),
            youPts: t(28, 24, 19, "#ffd166"),
            youWord: t(141, 78, 26, "#ffffff", { stroke: "#0b1230", strokeThickness: 4 }).setOrigin(0.5),
            youClue: t(28, 104, 13, "#cbd5e1", { fontStyle: "normal", wordWrap: { width: 226 } }),
            youLeft: t(28, 150, 12, "#94a3b8"),
            aiPts: t(286, 24, 19, "#93c5fd"),
            aiWord: t(399, 78, 26, "#ffffff", { stroke: "#0b1230", strokeThickness: 4 }).setOrigin(0.5),
            aiClue: t(286, 104, 13, "#cbd5e1", { fontStyle: "normal", wordWrap: { width: 226 } }),
            aiLeft: t(286, 150, 12, "#94a3b8"),
            turn: t(W / 2, 214, 22, "#ffd166", { stroke: "#0b1230", strokeThickness: 4 }).setOrigin(0.5),
            tip: t(W / 2, 790, 14, "#cbd5e1", { align: "center", wordWrap: { width: 480 }, fontStyle: "normal", lineSpacing: 4 }).setOrigin(0.5, 0),
          };
          this.setHud(false);
        }

        setHud(v: boolean) {
          this.cards.forEach((c) => c.setVisible(v));
          Object.values(this.ui).forEach((o) => o.setVisible(v));
        }

        fit(t: Phaser.GameObjects.Text, max: number) {
          t.setScale(1);
          if (t.width > max) t.setScale(max / t.width);
        }

        refreshHud() {
          const u = this.ui;
          u.lvl.setText(`WORD OMOK · AI ${LEVEL_LABEL[level]}`);
          u.youPts.setText(`● YOU  ${this.points[1]}점`);
          u.aiPts.setText(`○ AI  ${this.points[2]}점`);
          u.youWord.setText(this.pattern(this.words[1]));
          u.aiWord.setText(this.pattern(this.words[2]));
          this.fit(u.youWord, 226);
          this.fit(u.aiWord, 226);
          u.youClue.setText(this.words[1].prompt);
          u.aiClue.setText(this.words[2].prompt);
          u.youLeft.setText(`남은 수 ${maxMoves - this.moves[1]} · 완성 ${this.wordsDone[1]}단어`);
          u.aiLeft.setText(`남은 수 ${maxMoves - this.moves[2]} · 완성 ${this.wordsDone[2]}단어`);
          u.turn.setText(this.state === "ai" ? "AI 차례..." : this.state === "ask" ? "다음 철자를 고르세요!" : this.state === "busy" ? "" : this.state === "player" ? "내 차례" : "");
          u.tip.setText(`열린 3목 · 막힌 4목 · 열린 4목을 만들면 철자 1개 (+100) · 단어 완성 +300\n5목을 만들면 즉시 승리! ${maxMoves}수까지 5목이 없으면 점수가 높은 쪽 승리`);
        }

        // ---------- 시작/입력 ----------
        showStart() {
          this.state = "start";
          this.setHud(false);
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.72);
          const title = this.add.text(W / 2, 200, "WORD OMOK", { fontFamily: FONT, fontSize: "60px", color: "#ffd166", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5);
          const sub = this.add
            .text(
              W / 2,
              410,
              `단어 오목 · AI ${LEVEL_LABEL[level]}\n\n정식 오목처럼 차례대로 돌을 놓아요\n열린 3목, 막힌 4목, 열린 4목을 만들면\n내 목표 단어의 철자를 1글자 얻어요\n(다음 글자를 4지선다로 맞히기)\n\n철자 +100 · 단어 완성 +300\n5목을 먼저 만들면 즉시 승리!\n각자 ${maxMoves}수까지 5목이 없으면\n점수가 높은 쪽이 승리`,
              { fontFamily: FONT, fontSize: "19px", color: "#fff", align: "center", lineSpacing: 8 },
            )
            .setOrigin(0.5);
          const go = this.add.text(W / 2, 640, "▶  TAP TO START", { fontFamily: FONT, fontSize: "28px", color: "#0b1230", backgroundColor: "#ffd166", padding: { x: 24, y: 12 }, fontStyle: "bold" }).setOrigin(0.5);
          this.tweens.add({ targets: go, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
          this.overlay = this.add.container(0, 0, [dim, title, sub, go]).setDepth(100);
        }

        onAnyStart() {
          if (this.state === "start") {
            this.overlay?.destroy();
            this.overlay = null;
            this.setHud(true);
            this.state = "player";
            this.refreshHud();
          } else if (this.state === "done") {
            this.scene.restart();
          }
        }

        cellAt(p: Phaser.Input.Pointer): { x: number; y: number } | null {
          const x = Math.round((p.x - GX) / GAP);
          const y = Math.round((p.y - GY) / GAP);
          if (!inb(x, y)) return null;
          if (Math.hypot(p.x - px(x), p.y - py(y)) > GAP * 0.55) return null;
          return { x, y };
        }

        onMove(p: Phaser.Input.Pointer) {
          if (this.state !== "player") return this.hover.setVisible(false);
          const c = this.cellAt(p);
          if (c && this.board[c.y][c.x] === 0) this.hover.setPosition(px(c.x), py(c.y)).setVisible(true);
          else this.hover.setVisible(false);
        }

        onDown(p: Phaser.Input.Pointer) {
          if (this.state === "start" || this.state === "done") return this.onAnyStart();
          if (this.state !== "player") return;
          const c = this.cellAt(p);
          if (!c || this.board[c.y][c.x] !== 0) return;
          this.hover.setVisible(false);
          this.state = "busy";
          this.refreshHud();
          this.turnMove(c.x, c.y, 1);
        }

        // ---------- 한 수 진행 ----------
        place(x: number, y: number, who: Who) {
          this.board[y][x] = who;
          this.moves[who]++;
          const img = this.add.image(px(x), py(y), who === 1 ? "stone-b" : "stone-w").setDepth(4).setScale(0.3);
          this.stones.set(`${x},${y}`, img);
          this.tweens.add({ targets: img, scale: 1, duration: 260, ease: "Back.out" });
          this.last.setPosition(px(x), py(y)).setVisible(true).setFillStyle(who === 1 ? 0xfacc15 : 0xef4444);
          this.burst(px(x), py(y), who === 1 ? [0xffd166, 0xffffff] : [0x93c5fd, 0xffffff], 10);
        }

        /** 돌을 놓고 → 5목이면 종료, 아니면 공격(철자) 이벤트를 차례로 처리한 뒤 done */
        turnMove(x: number, y: number, who: Who) {
          this.place(x, y, who);
          const res = this.analyze(x, y, who);
          this.refreshHud();
          if (res.five) {
            // 5목 = 즉시 승리 (점수와 상관없음)
            this.floatText(px(x), py(y) - 36, "5목! 승리", "#ffd166", 32);
            this.finish(res.five, who);
            return;
          }
          this.runEvents(who, res.events, x, y, () => {
            if (this.moves[1] >= maxMoves && this.moves[2] >= maxMoves) return this.finish(null);
            if (who === 1) this.aiTurn();
            else {
              this.state = "player";
              this.refreshHud();
            }
          });
        }

        /** 이 돌이 만든 줄을 분석: 5목 또는 새 공격 이벤트(열린 3 / 막힌 4 / 열린 4) */
        analyze(x: number, y: number, who: Who): { five: { x: number; y: number }[] | null; events: { kind: Kind; key: string }[] } {
          const events: { kind: Kind; key: string }[] = [];
          let five: { x: number; y: number }[] | null = null;
          DIRS.forEach(([dx, dy], di) => {
            let a = 0;
            while (inb(x - dx * (a + 1), y - dy * (a + 1)) && this.board[y - dy * (a + 1)][x - dx * (a + 1)] === who) a++;
            let f = 0;
            while (inb(x + dx * (f + 1), y + dy * (f + 1)) && this.board[y + dy * (f + 1)][x + dx * (f + 1)] === who) f++;
            const len = a + f + 1;
            const sx = x - dx * a;
            const sy = y - dy * a;
            const ex = x + dx * f;
            const ey = y + dy * f;
            const empty = (cx: number, cy: number) => inb(cx, cy) && this.board[cy][cx] === 0;
            const o1 = empty(sx - dx, sy - dy);
            const o2 = empty(ex + dx, ey + dy);
            if (len >= 5) {
              if (!five) {
                five = [];
                for (let k = 0; k < len; k++) five.push({ x: sx + dx * k, y: sy + dy * k });
              }
              return;
            }
            let kind: Kind | null = null;
            if (len === 4) kind = o1 && o2 ? "open4" : o1 || o2 ? "closed4" : null;
            else if (len === 3 && o1 && o2 && (empty(sx - 2 * dx, sy - 2 * dy) || empty(ex + 2 * dx, ey + 2 * dy))) kind = "three";
            if (!kind) return;
            const key = `${who}|${di}|${sx},${sy}|${kind}`;
            if (this.seen.has(key)) return;
            this.seen.add(key);
            events.push({ kind, key });
          });
          return { five, events };
        }

        runEvents(who: Who, events: { kind: Kind; key: string }[], x: number, y: number, done: () => void) {
          const next = () => {
            const ev = events.shift();
            if (!ev) return done();
            this.floatText(px(x), py(y) - 36, `${KIND_LABEL[ev.kind]}!`, who === 1 ? "#ffd166" : "#bfdbfe", 24);
            this.cameras.main.flash(120, 255, 244, 170);
            this.time.delayedCall(650, () => this.grantLetter(who, next));
          };
          next();
        }

        grantLetter(who: Who, next: () => void) {
          const w = this.words[who];
          const after = (ok: boolean) => {
            if (ok) {
              w.got++;
              this.points[who] += LETTER_PTS;
              this.floatText(W / 2, 330, `+${LETTER_PTS}`, who === 1 ? "#ffd166" : "#bfdbfe", 34);
              this.refreshHud();
              if (w.got >= w.answer.length) {
                this.points[who] += WORD_BONUS;
                this.wordsDone[who]++;
                this.floatText(W / 2, 290, `WORD COMPLETE! ${w.answer.toUpperCase()} +${WORD_BONUS}`, "#4ade80", 28);
                this.cameras.main.flash(180, 180, 255, 190);
                this.refreshHud();
                this.time.delayedCall(1300, () => {
                  this.words[who] = this.pickWord();
                  this.refreshHud();
                  next();
                });
                return;
              }
            } else {
              this.floatText(W / 2, 330, who === 1 ? "WRONG" : "AI MISSED", "#ff6b6b", 28);
            }
            this.time.delayedCall(450, next);
          };
          if (who === 1) {
            this.askLetter(w, after);
          } else {
            this.time.delayedCall(700, () => after(Math.random() < AI_ACC[level]));
          }
        }

        // ---------- 철자 문제(4지선다) ----------
        askLetter(w: Word, done: (ok: boolean) => void) {
          this.state = "ask";
          this.refreshHud();
          this.askDone = done;
          this.askCorrect = w.answer[w.got];
          this.timeLeft = QTIME;
          const letters = new Set<string>([this.askCorrect]);
          const abc = "abcdefghijklmnopqrstuvwxyz".split("");
          while (letters.size < 4) letters.add(abc[Math.floor(Math.random() * abc.length)]);
          const choices = Phaser.Utils.Array.Shuffle([...letters]);

          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x020617, 0.62).setInteractive();
          const panel = this.add.rectangle(W / 2, 470, 480, 400, 0x0b1230, 0.97).setStrokeStyle(2, 0xffd166, 0.9);
          const title = this.add.text(W / 2, 300, "다음 철자는?", { fontFamily: FONT, fontSize: "14px", color: "#ffd166", fontStyle: "bold" }).setOrigin(0.5);
          const clue = this.add.text(W / 2, 360, w.prompt, { fontFamily: FONT, fontSize: "20px", color: "#ffffff", align: "center", wordWrap: { width: 430 }, lineSpacing: 6 }).setOrigin(0.5);
          const pat = this.add.text(W / 2, 430, this.pattern(w).replace("_", "?"), { fontFamily: FONT, fontSize: "34px", color: "#fde68a", fontStyle: "bold" }).setOrigin(0.5);
          if (pat.width > 430) pat.setScale(430 / pat.width);
          const barBg = this.add.rectangle(W / 2, 480, 420, 8, 0x334155);
          this.timerBar = this.add.rectangle(W / 2 - 210, 480, 420, 8, 0x4ade80).setOrigin(0, 0.5);
          const items: Phaser.GameObjects.GameObject[] = [dim, panel, title, clue, pat, barBg, this.timerBar];

          this.letterBtns = [];
          choices.forEach((letter, i) => {
            const x = 110 + i * 107;
            const r = this.add.rectangle(x, 560, 92, 92, 0x1e293b).setStrokeStyle(2, 0x475569).setInteractive({ useHandCursor: true });
            const t = this.add.text(x, 552, letter.toUpperCase(), { fontFamily: FONT, fontSize: "44px", color: "#f8fafc", fontStyle: "bold" }).setOrigin(0.5);
            const n = this.add.text(x, 592, String(i + 1), { fontFamily: FONT, fontSize: "13px", color: "#94a3b8" }).setOrigin(0.5);
            r.on("pointerover", () => this.state === "ask" && r.setFillStyle(0x334155));
            r.on("pointerout", () => this.state === "ask" && r.setFillStyle(0x1e293b));
            r.on("pointerdown", () => this.pickLetter(i));
            this.letterBtns.push({ r, letter });
            items.push(r, t, n);
          });
          this.modal = this.add.container(0, 0, items).setDepth(80);
        }

        pickLetter(i: number) {
          if (this.state !== "ask" || !this.askDone) return;
          const btn = this.letterBtns[i];
          if (!btn) return;
          this.state = "busy";
          const ok = btn.letter === this.askCorrect;
          btn.r.setFillStyle(ok ? 0x15803d : 0xb91c1c);
          if (!ok) this.letterBtns.find((b) => b.letter === this.askCorrect)?.r.setFillStyle(0x15803d);
          const cb = this.askDone;
          this.askDone = null;
          this.time.delayedCall(ok ? 450 : 1000, () => {
            this.modal?.destroy();
            this.modal = null;
            this.timerBar = null;
            this.letterBtns = [];
            this.refreshHud();
            cb(ok);
          });
        }

        // ---------- AI ----------
        pat(count: number, open: number): number {
          if (count >= 5) return 100000;
          if (count === 4) return open === 2 ? 10000 : open === 1 ? 1200 : 0;
          if (count === 3) return open === 2 ? 1500 : open === 1 ? 120 : 0;
          if (count === 2) return open === 2 ? 130 : open === 1 ? 12 : 0;
          return open === 2 ? 10 : open === 1 ? 2 : 0;
        }

        cellScore(x: number, y: number, who: number): number {
          let total = 0;
          for (const [dx, dy] of DIRS) {
            let count = 1;
            let open = 0;
            for (const s of [1, -1]) {
              let k = 1;
              while (true) {
                const nx = x + dx * s * k;
                const ny = y + dy * s * k;
                if (!inb(nx, ny)) break;
                if (this.board[ny][nx] === who) {
                  count++;
                  k++;
                } else {
                  if (this.board[ny][nx] === 0) open++;
                  break;
                }
              }
            }
            total += this.pat(count, open);
          }
          return total;
        }

        chooseMove(): { x: number; y: number } {
          const cands: { x: number; y: number; s: number }[] = [];
          const mid = (N - 1) / 2;
          for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
              if (this.board[y][x] !== 0) continue;
              const s = this.cellScore(x, y, 2) + this.cellScore(x, y, 1) * 1.08 - (Math.abs(x - mid) + Math.abs(y - mid)) * 0.4 + Math.random() * 0.5;
              cands.push({ x, y, s });
            }
          }
          cands.sort((a, b) => b.s - a.s);
          const pool = level === "easy" ? 6 : level === "normal" ? 2 : 1;
          return cands[Math.floor(Math.random() * Math.min(pool, cands.length))];
        }

        aiTurn() {
          if (this.moves[2] >= maxMoves) {
            // AI는 수를 다 썼다 → 사람 차례(또는 종료)
            if (this.moves[1] >= maxMoves) return this.finish(null);
            this.state = "player";
            this.refreshHud();
            return;
          }
          this.state = "ai";
          this.refreshHud();
          this.time.delayedCall(800, () => {
            if (this.state !== "ai") return;
            const m = this.chooseMove();
            this.turnMove(m.x, m.y, 2);
          });
        }

        // ---------- 끝 ----------
        finish(five: { x: number; y: number }[] | null, fiveBy: Who | null = null) {
          this.state = "done";
          this.hover.setVisible(false);
          this.refreshHud();
          this.ui.turn.setText("게임 종료");
          if (five) {
            const g = this.add.graphics().setDepth(6);
            g.lineStyle(7, 0xfacc15, 0.9).lineBetween(px(five[0].x), py(five[0].y), px(five[five.length - 1].x), py(five[five.length - 1].y));
            five.forEach((c) => this.ring(px(c.x), py(c.y), 0xfacc15));
          }
          const a = this.points[1];
          const b = this.points[2];
          // 5목이 나왔으면 그 사람이 승리, 아니면 점수로 판정
          const result: "win" | "lose" | "draw" = fiveBy ? (fiveBy === 1 ? "win" : "lose") : a > b ? "win" : a < b ? "lose" : "draw";
          if (result === "win") this.cameras.main.flash(250, 255, 244, 170);
          finishRef.current?.({ result, you: a, ai: b, words: this.wordsDone[1] });
          this.time.delayedCall(1400, () => {
            if (this.state !== "done") return;
            const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.66);
            const T = (y: number, s: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
              this.add.text(W / 2, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6, align: "center", ...extra }).setOrigin(0.5);
            this.overlay = this.add.container(0, 0, [
              dim,
              T(250, result === "win" ? "YOU WIN!" : result === "lose" ? "AI WINS" : "DRAW", 60, result === "win" ? "#ffd166" : result === "lose" ? "#fca5a5" : "#e2e8f0"),
              T(340, `${a}  :  ${b}`, 54, "#ffffff"),
              T(396, "내 점수  :  AI 점수", 16, "#94a3b8", { strokeThickness: 0 }),
              T(450, `완성한 단어 ${this.wordsDone[1]}개 · AI ${this.wordsDone[2]}개${five ? ` · ${fiveBy === 1 ? "내가" : "AI가"} 5목 완성` : " · 점수 승부"}`, 18, "#cbd5e1", { strokeThickness: 0 }),
              T(560, "↻  TAP TO RETRY", 24, "#0b1230", { backgroundColor: "#ffd166", padding: { x: 20, y: 10 }, strokeThickness: 0 }),
            ]).setDepth(100);
          });
        }

        // ---------- 업데이트 / 이펙트 ----------
        update(_t: number, delta: number) {
          if (this.state === "ask" && this.timerBar) {
            this.timeLeft -= delta / 1000;
            const r = Math.max(0, this.timeLeft / QTIME);
            this.timerBar.width = 420 * r;
            this.timerBar.setFillStyle(r > 0.3 ? 0x4ade80 : 0xef4444);
            if (this.timeLeft <= 0) {
              // 시간 초과 = 오답
              const wrong = this.letterBtns.findIndex((b) => b.letter !== this.askCorrect);
              this.pickLetter(Math.max(0, wrong));
            }
          }
        }

        burst(x: number, y: number, tints: number[], qty: number) {
          const em = this.add.particles(x, y, "spark", {
            speed: { min: 60, max: 220 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 300, max: 600 },
            scale: { start: 0.5, end: 0 },
            tint: tints,
            blendMode: "ADD",
            emitting: false,
          });
          em.setDepth(50);
          em.explode(qty);
          this.time.delayedCall(800, () => em.destroy());
        }

        ring(x: number, y: number, color: number) {
          const r = this.add.circle(x, y, 18, color, 0).setStrokeStyle(4, color, 1).setDepth(7);
          this.tweens.add({ targets: r, scale: 2.2, alpha: 0, duration: 700, repeat: 1, onComplete: () => r.destroy() });
        }

        floatText(x: number, y: number, text: string, color: string, size: number) {
          const t = this.add
            .text(Phaser.Math.Clamp(x, 120, W - 120), y, text, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 5 })
            .setOrigin(0.5)
            .setDepth(60)
            .setScale(0.5);
          this.tweens.add({ targets: t, scale: 1, duration: 160, ease: "Back.out" });
          this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1000, delay: 350, onComplete: () => t.destroy() });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: W,
        height: H,
        backgroundColor: "#0f172a",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: OmokScene,
        input: { touch: { capture: true } },
      });
      if (process.env.NODE_ENV !== "production") (window as unknown as { __archeryGame?: Phaser.Game }).__archeryGame = game;
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
      game = null;
    };
    // questions/level은 마운트 시 1회만 사용(바꾸려면 key로 재마운트)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="w-full mx-auto rounded-2xl overflow-hidden shadow-2xl touch-none select-none" style={{ maxWidth: 480, aspectRatio: `${W} / ${H}` }} />;
}
