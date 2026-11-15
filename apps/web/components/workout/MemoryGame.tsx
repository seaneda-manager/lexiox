"use client";

import { useEffect, useRef } from "react";
import type { ArcheryMode, ArcheryVocab } from "@/lib/workout/archeryQuestions";

/**
 * 단어 위치 기억
 *  1) 외우기: 카드에 단어가 몇 초 동안 보인다.
 *  2) 떠올리기: 카드가 뒤집히고, 뜻(또는 단어)이 나오면 그 단어가 있던 "위치"의 카드를 누른다.
 *  스테이지가 올라갈수록 카드가 늘고 외우는 시간이 상대적으로 짧아진다. 목숨 3개.
 */
export type MemoryLevel = "easy" | "normal" | "hard";

type Props = {
  vocab: ArcheryVocab[];
  mode?: ArcheryMode; // en-en: 영어 정의 → 단어 위치 / ko-en: 한글 뜻 → 단어 위치 / en-ko: 단어 → 한글 뜻 위치
  level?: MemoryLevel;
  stages?: number; // 한 판에 진행할 라운드(스테이지) 수
  onFinish?: (r: { score: number; stageReached: number; correct: number; asked: number }) => void;
};

const W = 960;
const H = 540;
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// [카드 수, 열, 행, 외우는 시간(초)]
const STAGE_TABLE: [number, number, number, number][] = [
  [4, 2, 2, 5],
  [6, 3, 2, 6],
  [8, 4, 2, 7],
  [10, 5, 2, 8],
  [12, 4, 3, 9],
  [15, 5, 3, 10],
  [20, 5, 4, 12],
];
const LEVEL_START: Record<MemoryLevel, number> = { easy: 0, normal: 1, hard: 2 };
const LEVEL_TIME: Record<MemoryLevel, number> = { easy: 1.3, normal: 1, hard: 0.8 };

export default function MemoryGame({ vocab, mode = "en-en", level = "normal", stages = 6, onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;

      const faceOf = (v: ArcheryVocab) => (mode === "en-ko" ? v.ko : v.word);
      const promptOf = (v: ArcheryVocab) => (mode === "en-ko" ? v.word : mode === "en-en" ? v.def || v.ko : v.ko || v.def);
      const askLabel = mode === "en-ko" ? "이 단어의 뜻이 있던 카드는?" : "이 뜻의 단어가 있던 카드는?";

      type Card = {
        c: Phaser.GameObjects.Container;
        front: Phaser.GameObjects.Rectangle;
        back: Phaser.GameObjects.Rectangle;
        qmark: Phaser.GameObjects.Text;
        label: Phaser.GameObjects.Text;
        v: ArcheryVocab;
        up: boolean;
        done: boolean;
        w: number;
        h: number;
      };

      class MemoryScene extends Phaser.Scene {
        state: "start" | "memorize" | "recall" | "between" | "done" = "start";
        stage = 0; // 진행한 라운드 수(0부터)
        base = LEVEL_START[level];
        score = 0;
        combo = 0;
        lives = 3;
        correct = 0;
        asked = 0;
        peeked = false;
        cards: Card[] = [];
        order: Card[] = [];
        qIdx = 0;
        qStart = 0;
        memLeft = 0;
        memTotal = 1;
        pool: ArcheryVocab[] = [];
        hud!: Record<"score" | "lives" | "stage" | "prompt" | "ask" | "timer" | "combo", Phaser.GameObjects.Text>;
        panel!: Phaser.GameObjects.Rectangle;
        bar!: Phaser.GameObjects.Rectangle;
        barBg!: Phaser.GameObjects.Rectangle;
        readyBtn!: Phaser.GameObjects.Text;
        peekBtn!: Phaser.GameObjects.Text;
        overlay: Phaser.GameObjects.Container | null = null;

        constructor() {
          super("memory");
        }

        create() {
          this.state = "start";
          this.cards = [];
          this.stage = 0;
          this.score = 0;
          this.combo = 0;
          this.lives = 3;
          this.correct = this.asked = 0;
          // 같은 카드 글씨가 겹치지 않는 단어만 쓴다
          const seen = new Set<string>();
          this.pool = Phaser.Utils.Array.Shuffle(vocab.filter((v) => faceOf(v) && promptOf(v) && !seen.has(faceOf(v)) && (seen.add(faceOf(v)), true)));
          this.makeBackground();
          this.buildHud();
          this.input.keyboard!.on("keydown-SPACE", () => this.onAnyStart());
          this.input.keyboard!.on("keydown-ENTER", () => this.onAnyStart());
          this.showStart();
        }

        makeBackground() {
          if (this.textures.exists("mem-bg")) this.textures.remove("mem-bg");
          const t = this.textures.createCanvas("mem-bg", W, H)!;
          const c = t.getContext();
          const g = c.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, "#0f172a");
          g.addColorStop(1, "#1e1b4b");
          c.fillStyle = g;
          c.fillRect(0, 0, W, H);
          for (let i = 0; i < 70; i++) {
            c.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.15})`;
            c.beginPath();
            c.arc(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 0, Math.PI * 2);
            c.fill();
          }
          t.refresh();
          this.add.image(0, 0, "mem-bg").setOrigin(0).setDepth(0);
          const g2 = this.make.graphics({ x: 0, y: 0 }, false);
          g2.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
          g2.generateTexture("spark", 16, 16);
          g2.destroy();
        }

        buildHud() {
          const t = (x: number, y: number, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(x, y, "", { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 4, ...extra }).setDepth(20);
          this.panel = this.add.rectangle(W / 2, 62, 560, 84, 0x0b1230, 0.85).setDepth(19).setStrokeStyle(2, 0xffd166, 0.9);
          this.hud = {
            score: t(18, 12, 30, "#ffffff"),
            combo: t(18, 50, 18, "#ffb703"),
            lives: t(W - 18, 12, 28, "#ff5d6c").setOrigin(1, 0),
            stage: t(W - 18, 48, 16, "#a5b4fc").setOrigin(1, 0),
            ask: t(W / 2, 30, 14, "#ffd166", { strokeThickness: 0 }).setOrigin(0.5),
            prompt: this.add.text(W / 2, 66, "", { fontFamily: FONT, fontSize: "22px", color: "#fff", align: "center", wordWrap: { width: 520 }, fontStyle: "bold" }).setOrigin(0.5).setDepth(21),
            timer: t(W / 2, 104, 13, "#cbd5e1", { strokeThickness: 0 }).setOrigin(0.5, 0),
          };
          this.barBg = this.add.rectangle(W / 2, 122, 560, 8, 0x334155).setDepth(19);
          this.bar = this.add.rectangle(W / 2 - 280, 122, 560, 8, 0x4ade80).setOrigin(0, 0.5).setDepth(20);
          this.readyBtn = this.add
            .text(W / 2, H - 30, "READY  ▶ (지금 바로 시작)", { fontFamily: FONT, fontSize: "18px", color: "#0b1230", backgroundColor: "#fde68a", padding: { x: 16, y: 7 }, fontStyle: "bold" })
            .setOrigin(0.5)
            .setDepth(25)
            .setInteractive({ useHandCursor: true });
          this.readyBtn.on("pointerdown", () => this.state === "memorize" && this.startRecall(true));
          this.peekBtn = this.add
            .text(W - 24, H - 30, "👁 PEEK -50", { fontFamily: FONT, fontSize: "16px", color: "#0b1230", backgroundColor: "#a5b4fc", padding: { x: 12, y: 6 }, fontStyle: "bold" })
            .setOrigin(1, 0.5)
            .setDepth(25)
            .setInteractive({ useHandCursor: true });
          this.peekBtn.on("pointerdown", () => this.peek());
          this.setHud(false);
        }

        setHud(v: boolean) {
          this.panel.setVisible(v);
          this.barBg.setVisible(v);
          this.bar.setVisible(v);
          Object.values(this.hud).forEach((o) => o.setVisible(v));
          this.readyBtn.setVisible(false);
          this.peekBtn.setVisible(false);
        }

        refreshHud() {
          const [n] = STAGE_TABLE[Math.min(this.base + this.stage, STAGE_TABLE.length - 1)];
          this.hud.score.setText(`${this.score}`);
          this.hud.combo.setText(this.combo > 1 ? `COMBO x${this.combo}` : "");
          this.hud.lives.setText("♥".repeat(this.lives));
          this.hud.stage.setText(`STAGE ${this.stage + 1} / ${stages}  ·  ${n}장`);
        }

        // ---------- 흐름 ----------
        showStart() {
          this.state = "start";
          this.setHud(false);
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.7).setDepth(90);
          const title = this.add.text(W / 2, 130, "WORD MEMORY", { fontFamily: FONT, fontSize: "62px", color: "#a5b4fc", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5).setDepth(91);
          const sub = this.add
            .text(
              W / 2,
              290,
              `카드에 적힌 단어의 위치를 외우세요!\n잠시 보여 준 뒤 카드가 뒤집히고,\n${mode === "en-ko" ? "단어" : "뜻"}이 나오면 ${mode === "en-ko" ? "그 뜻이" : "그 단어가"} 있던 카드를 누르세요\n\n스테이지가 올라갈수록 카드가 많아져요 · 목숨 3개`,
              { fontFamily: FONT, fontSize: "22px", color: "#fff", align: "center", lineSpacing: 8 },
            )
            .setOrigin(0.5)
            .setDepth(91);
          const go = this.add.text(W / 2, 430, "▶  TAP TO START", { fontFamily: FONT, fontSize: "28px", color: "#0b1230", backgroundColor: "#a5b4fc", padding: { x: 24, y: 12 }, fontStyle: "bold" }).setOrigin(0.5).setDepth(91);
          this.tweens.add({ targets: go, scale: 1.06, duration: 700, yoyo: true, repeat: -1 });
          this.overlay = this.add.container(0, 0, [dim, title, sub, go]).setDepth(90);
          this.input.once("pointerdown", () => this.onAnyStart());
        }

        onAnyStart() {
          if (this.state === "start") {
            this.overlay?.destroy();
            this.overlay = null;
            this.setHud(true);
            this.startStage();
          } else if (this.state === "done") {
            this.scene.restart();
          }
        }

        startStage() {
          this.cards.forEach((c) => c.c.destroy());
          this.cards = [];
          const idx = Math.min(this.base + this.stage, STAGE_TABLE.length - 1);
          let [n, cols, rows, secs] = STAGE_TABLE[idx];
          // 단어가 모자라면 카드 수를 줄인다
          if (this.pool.length < n) {
            const fit = [...STAGE_TABLE].reverse().find((r) => r[0] <= this.pool.length) ?? STAGE_TABLE[0];
            [n, cols, rows, secs] = fit;
          }
          // 이번 라운드 단어는 풀의 앞에서부터 순환해서 뽑는다
          const start = (this.stage * 5) % Math.max(1, this.pool.length);
          const picked: ArcheryVocab[] = [];
          for (let i = 0; i < n; i++) picked.push(this.pool[(start + i) % this.pool.length]);
          Phaser.Utils.Array.Shuffle(picked);

          const gx = 14;
          const areaX = 50;
          const areaY = 150;
          const areaW = W - 100;
          const areaH = H - 150 - 56;
          const cw = Math.min(170, (areaW - gx * (cols - 1)) / cols);
          const ch = Math.min(110, (areaH - gx * (rows - 1)) / rows);
          const totalW = cols * cw + (cols - 1) * gx;
          const totalH = rows * ch + (rows - 1) * gx;
          const ox = areaX + (areaW - totalW) / 2 + cw / 2;
          const oy = areaY + (areaH - totalH) / 2 + ch / 2;

          picked.forEach((v, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            this.cards.push(this.makeCard(v, ox + col * (cw + gx), oy + row * (ch + gx), cw, ch));
          });

          // 카드가 위에서 쏟아지듯 등장 → 외우기 시작
          this.state = "between";
          this.cards.forEach((c, i) => {
            c.c.setAlpha(0).setScale(0.6);
            this.tweens.add({ targets: c.c, alpha: 1, scale: 1, duration: 260, delay: i * 40, ease: "Back.out" });
          });
          this.refreshHud();
          this.time.delayedCall(260 + n * 40 + 100, () => this.startMemorize(secs * LEVEL_TIME[level]));
        }

        makeCard(v: ArcheryVocab, x: number, y: number, w: number, h: number): Card {
          const back = this.add.rectangle(0, 0, w, h, 0x1e3a8a).setStrokeStyle(3, 0x93c5fd, 0.9);
          const qmark = this.add.text(0, 0, "?", { fontFamily: FONT, fontSize: `${Math.round(h * 0.5)}px`, color: "#93c5fd", fontStyle: "bold" }).setOrigin(0.5);
          const front = this.add.rectangle(0, 0, w, h, 0xfff3c4).setStrokeStyle(3, 0x3a2410, 1);
          const label = this.add
            .text(0, 0, faceOf(v), { fontFamily: FONT, fontSize: "22px", color: "#10172e", fontStyle: "bold", align: "center", wordWrap: { width: w - 14 } })
            .setOrigin(0.5);
          const fit = Math.min(1, (w - 14) / Math.max(1, label.width), (h - 10) / Math.max(1, label.height));
          label.setScale(fit);
          const c = this.add.container(x, y, [back, qmark, front, label]).setDepth(5);
          c.setSize(w, h);
          const card: Card = { c, front, back, qmark, label, v, up: true, done: false, w, h };
          front.setInteractive({ useHandCursor: true });
          back.setInteractive({ useHandCursor: true });
          const tap = () => this.onCard(card);
          front.on("pointerdown", tap);
          back.on("pointerdown", tap);
          this.setFace(card, true);
          return card;
        }

        setFace(c: Card, up: boolean) {
          c.up = up;
          c.front.setVisible(up);
          c.label.setVisible(up);
          c.back.setVisible(!up);
          c.qmark.setVisible(!up);
        }

        flip(c: Card, up: boolean, delay = 0, cb?: () => void) {
          this.tweens.add({
            targets: c.c,
            scaleX: 0,
            duration: 110,
            delay,
            onComplete: () => {
              this.setFace(c, up);
              this.tweens.add({ targets: c.c, scaleX: 1, duration: 110, onComplete: cb });
            },
          });
        }

        // ---------- 외우기 ----------
        startMemorize(secs: number) {
          this.state = "memorize";
          this.memTotal = secs;
          this.memLeft = secs;
          this.peeked = false;
          this.hud.ask.setText("외우세요!");
          this.hud.prompt.setText("카드의 위치를 기억하세요");
          this.readyBtn.setVisible(true);
          this.peekBtn.setVisible(false);
        }

        startRecall(early: boolean) {
          if (this.state !== "memorize") return;
          this.state = "between";
          this.readyBtn.setVisible(false);
          if (early) this.score += Math.round(this.memLeft) * 5; // 일찍 시작하면 보너스
          this.cards.forEach((c, i) => this.flip(c, false, i * 25));
          this.order = Phaser.Utils.Array.Shuffle([...this.cards]);
          this.qIdx = 0;
          this.time.delayedCall(this.cards.length * 25 + 300, () => {
            this.state = "recall";
            this.peekBtn.setVisible(!this.peeked);
            this.askNext();
          });
        }

        askNext() {
          const c = this.order[this.qIdx];
          if (!c) return this.stageClear();
          this.qStart = this.time.now;
          this.hud.ask.setText(`${this.qIdx + 1} / ${this.order.length}  ·  ${askLabel}`);
          this.hud.prompt.setText(promptOf(c.v));
          this.hud.timer.setText("");
        }

        peek() {
          if (this.state !== "recall" || this.peeked) return;
          this.peeked = true;
          this.score = Math.max(0, this.score - 50);
          this.peekBtn.setVisible(false);
          this.state = "between";
          const open = this.cards.filter((c) => !c.done);
          open.forEach((c) => this.flip(c, true));
          this.time.delayedCall(1500, () => {
            open.forEach((c) => this.flip(c, false));
            this.time.delayedCall(280, () => {
              if (this.state === "between") this.state = "recall";
            });
          });
          this.refreshHud();
        }

        // ---------- 답하기 ----------
        onCard(c: Card) {
          if (this.state !== "recall" || c.done) return;
          const target = this.order[this.qIdx];
          if (!target) return;
          this.asked++;
          this.state = "between";
          if (c === target) {
            const secs = (this.time.now - this.qStart) / 1000;
            this.correct++;
            this.combo++;
            const gain = 100 + Math.max(0, Math.round((6 - secs) * 10)) + (this.combo - 1) * 10;
            this.score += gain;
            c.done = true;
            this.flip(c, true, 0, () => {
              c.front.setFillStyle(0xbbf7d0).setStrokeStyle(4, 0x16a34a, 1);
              this.burst(c.c.x, c.c.y, [0x4ade80, 0xffffff, 0xfde68a]);
            });
            this.floatText(c.c.x, c.c.y - c.h / 2 - 10, `+${gain}`, "#4ade80", 26);
            this.qIdx++;
            this.time.delayedCall(520, () => {
              this.state = "recall";
              this.askNext();
            });
          } else {
            this.combo = 0;
            this.lives--;
            this.cameras.main.shake(200, 0.008);
            // 누른 카드는 빨갛게 보여 주고, 정답 카드를 알려 준다
            this.flip(c, true, 0, () => c.front.setFillStyle(0xfecaca).setStrokeStyle(4, 0xdc2626, 1));
            this.flip(target, true, 120, () => target.front.setFillStyle(0xbbf7d0).setStrokeStyle(4, 0x16a34a, 1));
            this.floatText(c.c.x, c.c.y - c.h / 2 - 10, "WRONG", "#ff6b6b", 26);
            this.refreshHud();
            target.done = true;
            this.qIdx++;
            this.time.delayedCall(1300, () => {
              if (!c.done) {
                c.front.setFillStyle(0xfff3c4).setStrokeStyle(3, 0x3a2410, 1);
                this.flip(c, false);
              }
              if (this.lives <= 0) return this.showResult(false);
              this.state = "recall";
              this.askNext();
            });
          }
          this.refreshHud();
        }

        stageClear() {
          this.state = "between";
          const perfect = this.lives === 3 || this.cards.every((c) => c.done);
          void perfect;
          this.score += 200;
          this.hud.ask.setText("STAGE CLEAR!");
          this.hud.prompt.setText("");
          this.floatText(W / 2, H / 2, `STAGE ${this.stage + 1} CLEAR +200`, "#fde68a", 44);
          this.cameras.main.flash(180, 200, 200, 255);
          this.refreshHud();
          this.peekBtn.setVisible(false);
          this.time.delayedCall(1700, () => {
            this.stage++;
            if (this.stage >= stages) this.showResult(true);
            else this.startStage();
          });
        }

        // ---------- 업데이트 / 결과 ----------
        update(_t: number, delta: number) {
          if (this.state === "memorize") {
            this.memLeft -= delta / 1000;
            const r = Math.max(0, this.memLeft / this.memTotal);
            this.bar.width = 560 * r;
            this.bar.setFillStyle(r > 0.35 ? 0x4ade80 : 0xef4444);
            this.hud.timer.setText(`${Math.max(0, this.memLeft).toFixed(1)}초`);
            if (this.memLeft <= 0) this.startRecall(false);
          } else if (this.state === "recall") {
            this.bar.width = 560;
            this.bar.setFillStyle(0x6366f1);
          }
        }

        showResult(win: boolean) {
          this.state = "done";
          this.setHud(false);
          this.cards.forEach((c) => c.c.destroy());
          this.cards = [];
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.72).setDepth(90);
          const T = (y: number, s: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(W / 2, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6, align: "center", ...extra }).setOrigin(0.5).setDepth(91);
          const acc = this.asked ? Math.round((this.correct / this.asked) * 100) : 0;
          this.overlay = this.add.container(0, 0, [
            dim,
            T(110, win ? "ALL CLEAR!" : "GAME OVER", 56, win ? "#a5b4fc" : "#fb7185"),
            T(220, `${this.score}`, 84, "#ffffff"),
            T(300, `도달 스테이지 ${Math.min(this.stage + (win ? 0 : 1), stages)} / ${stages}`, 24, "#e2e8f0", { strokeThickness: 0 }),
            T(340, `정답 ${this.correct} / ${this.asked}  (${acc}%)`, 24, "#fff", { strokeThickness: 0 }),
            T(440, "↻  TAP TO RETRY", 24, "#0b1230", { backgroundColor: "#a5b4fc", padding: { x: 20, y: 10 }, strokeThickness: 0 }),
          ]).setDepth(90);
          this.input.once("pointerdown", () => this.onAnyStart());
          finishRef.current?.({ score: this.score, stageReached: this.stage + 1, correct: this.correct, asked: this.asked });
        }

        burst(x: number, y: number, tints: number[]) {
          const em = this.add.particles(x, y, "spark", {
            speed: { min: 80, max: 260 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 300, max: 600 },
            scale: { start: 0.55, end: 0 },
            tint: tints,
            blendMode: "ADD",
            emitting: false,
          });
          em.setDepth(40);
          em.explode(16);
          this.time.delayedCall(800, () => em.destroy());
        }

        floatText(x: number, y: number, text: string, color: string, size: number) {
          const t = this.add
            .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 5 })
            .setOrigin(0.5)
            .setDepth(60)
            .setScale(0.5);
          this.tweens.add({ targets: t, scale: 1, duration: 150, ease: "Back.out" });
          this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 900, delay: 300, onComplete: () => t.destroy() });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: W,
        height: H,
        backgroundColor: "#0f172a",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: MemoryScene,
        input: { touch: { capture: true } },
      });
      if (process.env.NODE_ENV !== "production") (window as unknown as { __archeryGame?: Phaser.Game }).__archeryGame = game;
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
      game = null;
    };
    // vocab/mode/level은 마운트 시 1회만 사용(바꾸려면 key로 재마운트)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="w-full mx-auto rounded-2xl overflow-hidden shadow-2xl touch-none select-none" style={{ maxWidth: 960, aspectRatio: `${W} / ${H}` }} />;
}
