"use client";

import { useEffect, useRef } from "react";
import type { ArcheryQuestion } from "./ArcheryPhaser";

/**
 * 100m 달리기: 문제를 맞힐 때마다 속도가 붙는다(빨리 맞힐수록 더). 오답은 비틀거려 속도가 줄고 잠깐 입력이 막힌다.
 * 상대 선수 3명과 경쟁. 1~4 키 또는 터치로 정답 선택.
 */
export type SprintLevel = "easy" | "normal" | "hard";

type Props = {
  questions: ArcheryQuestion[];
  level?: SprintLevel;
  onFinish?: (r: { time: number; rank: number; correct: number; asked: number }) => void;
};

const W = 960;
const H = 540;
const LANE_Y = [186, 244, 302, 360];
const PLAYER_LANE = 3;
const PX_PER_M = 26;
const PLAYER_X = 280;
const DIST = 100;
const MAX_V = 11.5;
const FLOOR = 4.2; // 정답을 못 맞혀도 이 속도(m/s)로는 달린다
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const AI_SPEED: Record<SprintLevel, number> = { easy: 5.9, normal: 7.0, hard: 8.2 };
const COLORS = [0xe63946, 0x3b82f6, 0x22c55e, 0xfacc15];
const NAMES = ["YOU", "A", "B", "C"];

export default function SprintGame({ questions, level = "normal", onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;

      type Runner = {
        g: Phaser.GameObjects.Graphics;
        tag: Phaser.GameObjects.Text;
        lane: number;
        color: number;
        dist: number;
        v: number;
        base: number;
        phase: number;
        finT: number | null;
        stumble: number;
      };

      class SprintScene extends Phaser.Scene {
        state: "start" | "marks" | "run" | "done" = "start";
        runners: Runner[] = [];
        t = 0;
        order: ArcheryQuestion[] = [];
        qi = 0;
        correct = 0;
        asked = 0;
        lock = 0;
        qStart = 0; // 문제가 뜬 시점(레이스 시간 기준)
        qWindow = 3.5; // 이 시간 안에 맞히면 빠른 정답 보너스(문제가 길수록 길어진다)
        graceUntil = 0; // 이 시간까지는 읽는 시간으로 보고 속도가 천천히 줄어든다(레이스 시간 기준)
        cur: ArcheryQuestion | null = null;
        btns: { r: Phaser.GameObjects.Rectangle; t: Phaser.GameObjects.Text; word: string }[] = [];
        track!: Phaser.GameObjects.TileSprite;
        marks: { line: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
        finishLine!: Phaser.GameObjects.Container;
        hud!: Record<"time" | "dist" | "rank" | "speed" | "prompt" | "center", Phaser.GameObjects.Text>;
        speedBar!: Phaser.GameObjects.Rectangle;
        overlay: Phaser.GameObjects.Container | null = null;

        constructor() {
          super("sprint");
        }

        create() {
          this.state = "start";
          this.runners = [];
          this.btns = [];
          this.marks = [];
          this.t = 0;
          this.correct = this.asked = 0;
          this.lock = 0;
          this.makeTextures();
          this.buildStadium();
          this.buildRunners();
          this.buildHud();
          const kb = this.input.keyboard!;
          ["ONE", "TWO", "THREE", "FOUR"].forEach((k, i) => kb.on(`keydown-${k}`, () => this.answer(i)));
          kb.on("keydown-SPACE", () => this.onAnyStart());
          kb.on("keydown-ENTER", () => this.onAnyStart());
          this.input.on("pointerdown", () => {
            if (this.state === "start" || this.state === "done") this.onAnyStart();
          });
          this.showStart();
        }

        makeTextures() {
          const fresh = (key: string, w: number, h: number) => {
            if (this.textures.exists(key)) this.textures.remove(key);
            return this.textures.createCanvas(key, w, h)!;
          };
          // 트랙 점무늬 (256x256, 가로 반복)
          const tr = fresh("sprint-track", 256, 256);
          const c = tr.getContext();
          c.fillStyle = "#c2410c";
          c.fillRect(0, 0, 256, 256);
          for (let i = 0; i < 260; i++) {
            c.fillStyle = i % 2 ? "rgba(120,30,0,0.35)" : "rgba(255,170,110,0.3)";
            c.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2);
          }
          tr.refresh();
          // 관중석 띠 (512x128)
          const cr = fresh("sprint-crowd", 512, 128);
          const d = cr.getContext();
          d.fillStyle = "#334155";
          d.fillRect(0, 0, 512, 128);
          const cols = ["#f87171", "#fbbf24", "#60a5fa", "#e2e8f0", "#4ade80", "#c084fc"];
          for (let r = 0; r < 5; r++) {
            for (let k = 0; k < 40; k++) {
              d.fillStyle = cols[(r * 7 + k * 3) % cols.length];
              d.beginPath();
              d.arc(6 + k * 13 + (r % 2) * 6, 18 + r * 22, 5.2, 0, Math.PI * 2);
              d.fill();
            }
          }
          cr.refresh();
          const g = this.make.graphics({ x: 0, y: 0 }, false);
          g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
          g.generateTexture("spark", 16, 16);
          g.destroy();
        }

        buildStadium() {
          // 하늘 + 경기장 벽
          const bg = this.add.graphics().setDepth(0);
          bg.fillGradientStyle(0x1e3a8a, 0x1e3a8a, 0x93c5fd, 0x93c5fd, 1).fillRect(0, 0, W, 90);
          this.add.tileSprite(0, 80, W, 128, "sprint-crowd").setOrigin(0, 0).setDepth(1).setAlpha(0.95);
          bg.fillStyle(0x0f172a, 0.7).fillRect(0, 150, W, 4);
          this.track = this.add.tileSprite(0, 154, W, 240, "sprint-track").setOrigin(0, 0).setDepth(2);
          // 레인 선
          const ln = this.add.graphics().setDepth(3);
          for (let k = 0; k <= 4; k++) ln.fillStyle(0xffffff, 0.85).fillRect(0, 154 + k * 60 - 1.5, W, 3);
          // 거리 표시 (10m 간격 12개 풀)
          for (let i = 0; i < 12; i++) {
            const line = this.add.rectangle(0, 274, 4, 240, 0xffffff, 0.55).setDepth(3);
            const label = this.add.text(0, 160, "", { fontFamily: FONT, fontSize: "15px", color: "#fff", fontStyle: "bold", stroke: "#7c2d12", strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(3);
            this.marks.push({ line, label });
          }
          // 결승선
          const fl = this.add.container(0, 274).setDepth(4);
          for (let r = 0; r < 24; r++) {
            fl.add(this.add.rectangle(0, -120 + r * 10 + 5, 10, 10, r % 2 ? 0xffffff : 0x111111));
            fl.add(this.add.rectangle(10, -120 + r * 10 + 5, 10, 10, r % 2 ? 0x111111 : 0xffffff));
          }
          fl.add(this.add.text(0, -150, "FINISH", { fontFamily: FONT, fontSize: "20px", color: "#fff", fontStyle: "bold", stroke: "#0f172a", strokeThickness: 5 }).setOrigin(0.5));
          this.finishLine = fl;
        }

        buildRunners() {
          const lanes = [PLAYER_LANE, 0, 1, 2];
          lanes.forEach((lane, i) => {
            const g = this.add.graphics().setDepth(6 + lane);
            const tag = this.add.text(0, 0, NAMES[i], { fontFamily: FONT, fontSize: "13px", color: "#fff", fontStyle: "bold", stroke: "#0f172a", strokeThickness: 4 }).setOrigin(0.5).setDepth(20);
            const base = i === 0 ? 0 : AI_SPEED[level] * Phaser.Math.FloatBetween(0.93, 1.06);
            this.runners.push({ g, tag, lane, color: COLORS[i], dist: 0, v: 0, base, phase: Math.random() * 6, finT: null, stumble: 0 });
          });
        }

        buildHud() {
          const t = (x: number, y: number, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(x, y, "", { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 4, ...extra }).setDepth(40);
          this.hud = {
            time: t(16, 10, 30, "#fff"),
            dist: t(16, 48, 18, "#fde68a"),
            rank: t(W - 16, 10, 28, "#ffd166").setOrigin(1, 0),
            speed: t(W - 16, 48, 16, "#93c5fd").setOrigin(1, 0),
            prompt: this.add.text(W / 2, 424, "", { fontFamily: FONT, fontSize: "21px", color: "#fff", align: "center", wordWrap: { width: 900 }, fontStyle: "bold" }).setOrigin(0.5).setDepth(40),
            center: t(W / 2, 250, 84, "#fff").setOrigin(0.5).setDepth(70),
          };
          this.speedBar = this.add.rectangle(16, 78, 0, 8, 0x4ade80).setOrigin(0, 0.5).setDepth(40);
          const panel = this.add.rectangle(W / 2, 470, W - 20, 150, 0x0b1230, 0.9).setDepth(30).setStrokeStyle(2, 0xffd166, 0.7);
          void panel;
          for (let i = 0; i < 4; i++) {
            const x = 10 + 110 + i * 235;
            const r = this.add.rectangle(x + 4, 494, 220, 58, 0x1e293b).setStrokeStyle(2, 0x475569).setDepth(31).setInteractive({ useHandCursor: true });
            const tx = this.add.text(x + 4, 494, "", { fontFamily: FONT, fontSize: "22px", color: "#f8fafc", fontStyle: "bold" }).setOrigin(0.5).setDepth(32);
            r.on("pointerdown", () => this.answer(i));
            r.on("pointerover", () => this.state === "run" && r.setFillStyle(0x334155));
            r.on("pointerout", () => r.setFillStyle(0x1e293b));
            this.btns.push({ r, t: tx, word: "" });
          }
          this.setHud(false);
        }

        setHud(v: boolean) {
          Object.values(this.hud).forEach((o) => o.setVisible(v));
          this.speedBar.setVisible(v);
        }

        // ---------- 흐름 ----------
        showStart() {
          this.state = "start";
          this.setHud(false);
          this.btns.forEach((b) => {
            b.t.setText("");
          });
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.6).setDepth(90);
          const title = this.add.text(W / 2, 150, "100m SPRINT", { fontFamily: FONT, fontSize: "62px", color: "#fdba74", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5).setDepth(91);
          const sub = this.add
            .text(W / 2, 280, "문제를 맞힐수록 빨라져요 (빨리 맞히면 더 빨라요)\n틀리면 비틀거리고 잠깐 멈춰요\n\n1~4 키 또는 터치로 정답 선택 · 상대 선수 3명", { fontFamily: FONT, fontSize: "21px", color: "#fff", align: "center", lineSpacing: 8 })
            .setOrigin(0.5)
            .setDepth(91);
          const go = this.add.text(W / 2, 410, "▶  TAP TO START", { fontFamily: FONT, fontSize: "28px", color: "#0b1230", backgroundColor: "#fdba74", padding: { x: 24, y: 12 }, fontStyle: "bold" }).setOrigin(0.5).setDepth(91);
          this.tweens.add({ targets: go, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
          this.overlay = this.add.container(0, 0, [dim, title, sub, go]).setDepth(90);
        }

        onAnyStart() {
          if (this.state === "start") this.startRace();
          else if (this.state === "done") this.scene.restart();
        }

        startRace() {
          this.overlay?.destroy();
          this.overlay = null;
          this.setHud(true);
          this.order = Phaser.Utils.Array.Shuffle([...questions]);
          this.qi = 0;
          this.state = "marks";
          const say = (s: string, delay: number, size = 64) => this.time.delayedCall(delay, () => this.hud.center.setText(s).setFontSize(size).setScale(1.3).setAlpha(1));
          say("ON YOUR MARKS", 0, 56);
          say("SET", 1300, 70);
          this.time.delayedCall(2400, () => {
            this.hud.center.setText("GO!").setFontSize(90).setScale(1.4).setAlpha(1);
            this.tweens.add({ targets: this.hud.center, scale: 1, alpha: 0, duration: 800 });
            this.state = "run";
            this.runners[0].v = FLOOR;
            this.nextQuestion();
          });
        }

        nextQuestion() {
          if (this.qi >= this.order.length) this.qi = 0;
          const q = this.order[this.qi++];
          this.cur = q;
          // 읽는 시간: 문제 길이(영영 정의처럼 긴 문장일수록 더 길게)에 비례. 이 동안은 속도가 덜 떨어진다.
          const words = q.prompt.trim().split(/\s+/).length;
          const read = Phaser.Math.Clamp(1.2 + 0.3 * words, 1.2, 4.2);
          this.qStart = this.t;
          this.qWindow = read + 1.8;
          this.graceUntil = this.t + read;
          this.hud.prompt.setText(q.prompt);
          Phaser.Utils.Array.Shuffle([...q.choices]).slice(0, 4).forEach((w, i) => {
            const b = this.btns[i];
            b.word = w;
            b.t.setText(`${i + 1}  ${w}`);
            b.t.setScale(1);
            if (b.t.width > 200) b.t.setScale(200 / b.t.width);
            b.r.setFillStyle(0x1e293b);
          });
        }

        answer(i: number) {
          if (this.state !== "run" || !this.cur) return;
          if (this.time.now < this.lock) return;
          const b = this.btns[i];
          if (!b || !b.word) return;
          const me = this.runners[0];
          if (me.finT !== null) return;
          this.asked++;
          const ok = b.word === this.cur.answer;
          if (ok) {
            this.correct++;
            const secs = this.t - this.qStart;
            const bonus = Math.max(0, (this.qWindow - secs) / this.qWindow) * 1.3;
            me.v = Math.min(MAX_V, me.v + 2.2 + bonus);
            b.r.setFillStyle(0x15803d);
            this.floatText(PLAYER_X + 40, LANE_Y[PLAYER_LANE] - 50, secs < this.qWindow * 0.4 ? "FAST!" : "+SPEED", "#4ade80", 22);
            this.time.delayedCall(120, () => this.nextQuestion());
          } else {
            me.v = Math.max(2.4, me.v * 0.62);
            me.stumble = 0.55;
            this.lock = this.time.now + 500;
            b.r.setFillStyle(0xb91c1c);
            this.btns.find((x) => x.word === this.cur!.answer)?.r.setFillStyle(0x15803d);
            this.floatText(PLAYER_X + 40, LANE_Y[PLAYER_LANE] - 50, "STUMBLE!", "#ff6b6b", 24);
            this.cameras.main.shake(180, 0.006);
            this.time.delayedCall(700, () => this.nextQuestion());
          }
        }

        // ---------- 업데이트 ----------
        update(_t: number, delta: number) {
          const dt = Math.min(delta, 33) / 1000;
          if (this.state === "run" || this.state === "done") {
            if (this.state === "run") this.t += dt;
            this.runners.forEach((r, i) => this.stepRunner(r, i, dt));
            if (this.state === "run" && this.runners[0].finT !== null) this.finishRace();
          }
          this.draw();
        }

        stepRunner(r: Runner, i: number, dt: number) {
          if (r.finT !== null) {
            r.v = Math.max(0, r.v - 3 * dt); // 결승 뒤 감속
          } else if (i === 0) {
            // 아무것도 안 해도 조깅 속도(FLOOR)는 유지된다. 비틀거리는 동안만 그 아래로 내려간다.
            const reading = this.t < this.graceUntil ? 0.3 : 1; // 문제를 읽는 동안은 감속이 약하다
            r.v = Math.max(r.stumble > 0 ? 2.0 : FLOOR, r.v - 1.0 * reading * dt);
          } else {
            const et = this.t;
            const target = r.base * (1 - Math.exp(-et / 0.9)) * (1 + 0.05 * Math.sin(et * 1.7 + r.phase));
            r.v += (target - r.v) * Math.min(1, 4 * dt);
          }
          if (r.stumble > 0) r.stumble -= dt;
          r.dist += r.v * dt;
          r.phase += r.v * dt * 2.1;
          if (r.finT === null && r.dist >= DIST) r.finT = this.t;
        }

        draw() {
          const me = this.runners[0];
          const camX = me.dist;
          this.track.tilePositionX = camX * PX_PER_M;
          const sx = (d: number) => PLAYER_X + (d - camX) * PX_PER_M;

          // 거리 표시
          const first = Math.floor((camX - PLAYER_X / PX_PER_M) / 10) * 10;
          this.marks.forEach((m, k) => {
            const d = first + k * 10;
            const x = sx(d);
            const show = d >= 0 && d <= DIST && x > -20 && x < W + 20;
            m.line.setVisible(show).setX(x);
            m.label.setVisible(show).setX(x).setText(d === 0 ? "START" : `${d}m`);
          });
          this.finishLine.setX(sx(DIST));

          // 선수
          this.runners.forEach((r, i) => {
            const x = sx(r.dist);
            const y = LANE_Y[r.lane];
            const g = r.g;
            g.clear();
            g.setPosition(x, y);
            r.tag.setPosition(x, y - 58);
            const crouch = this.state === "marks" || this.state === "start";
            const run = Math.sin(r.phase);
            const run2 = Math.sin(r.phase + Math.PI);
            const lean = crouch ? 0.9 : Phaser.Math.Clamp(0.15 + r.v * 0.035, 0.15, 0.5);
            const wob = r.stumble > 0 ? Math.sin(r.stumble * 40) * 0.25 : 0;
            const hip = { x: 0, y: -10 };
            const sh = { x: Math.sin(lean + wob) * 22, y: -10 - Math.cos(lean + wob) * 22 };
            const head = { x: sh.x + Math.sin(lean) * 7, y: sh.y - 9 };
            g.fillStyle(0x000000, 0.22).fillEllipse(0, 4, 38, 8);
            const limb = (ax: number, ay: number, ang: number, len: number, w: number, col: number) => {
              g.lineStyle(w, col, 1).lineBetween(ax, ay, ax + Math.sin(ang) * len, ay + Math.cos(ang) * len);
            };
            const stride = crouch ? 0.1 : 0.9 + r.v * 0.03;
            // 뒤쪽 팔·다리
            limb(sh.x, sh.y + 2, run2 * stride + 0.3, 13, 4, 0xe0b48a);
            limb(sh.x + 0, sh.y + 2, run2 * stride - 0.5, 10, 4, 0xe0b48a);
            limb(hip.x, hip.y, run2 * stride, 16, 5, 0x1f2937);
            limb(hip.x + Math.sin(run2 * stride) * 16, hip.y + Math.cos(run2 * stride) * 16, run2 * stride - 0.9, 14, 4.5, 0x1f2937);
            // 몸통(유니폼)
            g.lineStyle(10, r.color, 1).lineBetween(hip.x, hip.y, sh.x, sh.y);
            // 앞쪽 다리·팔
            limb(hip.x, hip.y, run * stride, 16, 5, 0x374151);
            limb(hip.x + Math.sin(run * stride) * 16, hip.y + Math.cos(run * stride) * 16, run * stride - 0.9, 14, 4.5, 0x374151);
            limb(sh.x, sh.y + 2, run * stride + 0.3, 13, 4, 0xf1c9a0);
            limb(sh.x, sh.y + 2, run * stride - 0.5, 10, 4, 0xf1c9a0);
            g.fillStyle(0xf1c9a0, 1).fillCircle(head.x, head.y, 7);
            g.fillStyle(0x1f2937, 1).fillRect(head.x - 7, head.y - 8, 14, 5);
            void i;
          });

          // HUD
          this.hud.time.setText(`${this.t.toFixed(2)}s`);
          const left = Math.max(0, DIST - me.dist);
          this.hud.dist.setText(`${Math.min(DIST, me.dist).toFixed(0)}m / ${DIST}m  (남은 ${left.toFixed(0)}m)`);
          const ahead = this.runners.filter((r) => r !== me && r.dist > me.dist).length;
          this.hud.rank.setText(`${ahead + 1} / 4`);
          this.hud.speed.setText(`${(me.v * 3.6).toFixed(0)} km/h`);
          this.speedBar.width = (me.v / MAX_V) * 220;
          this.speedBar.setFillStyle(me.v < 5 ? 0x4ade80 : me.v < 8 ? 0xfacc15 : 0xef4444);
        }

        finishRace() {
          if (this.state !== "run") return;
          this.state = "done";
          const me = this.runners[0];
          const rank = 1 + this.runners.filter((r) => r !== me && r.finT !== null && (r.finT as number) < (me.finT as number)).length;
          const time = me.finT as number;
          this.cameras.main.flash(200, 255, 244, 170);
          this.hud.center.setText(rank === 1 ? "WINNER!" : "FINISH!").setFontSize(70).setScale(1.3).setAlpha(1);
          finishRef.current?.({ time, rank, correct: this.correct, asked: this.asked });
          this.time.delayedCall(1500, () => {
            if (this.state !== "done") return;
            this.hud.center.setAlpha(0);
            const medal = ["GOLD", "SILVER", "BRONZE", "4th"][rank - 1];
            const mc = ["#ffd166", "#cbd5e1", "#d6935a", "#94a3b8"][rank - 1];
            const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.72).setDepth(90);
            const T = (y: number, s: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
              this.add.text(W / 2, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6, align: "center", ...extra }).setOrigin(0.5).setDepth(91);
            const acc = this.asked ? Math.round((this.correct / this.asked) * 100) : 0;
            this.overlay = this.add.container(0, 0, [
              dim,
              T(110, medal, 64, mc),
              T(200, `${time.toFixed(2)}s`, 72, "#fff"),
              T(270, `${rank}위 / 4명`, 24, "#e2e8f0", { strokeThickness: 0 }),
              T(320, `정답 ${this.correct} / ${this.asked}  (${acc}%)`, 24, "#fff", { strokeThickness: 0 }),
              T(420, "↻  TAP TO RETRY", 24, "#0b1230", { backgroundColor: "#fdba74", padding: { x: 20, y: 10 }, strokeThickness: 0 }),
            ]).setDepth(90);
          });
        }

        floatText(x: number, y: number, text: string, color: string, size: number) {
          const t = this.add
            .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 5 })
            .setOrigin(0.5)
            .setDepth(60)
            .setScale(0.5);
          this.tweens.add({ targets: t, scale: 1, duration: 150, ease: "Back.out" });
          this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 800, delay: 250, onComplete: () => t.destroy() });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: W,
        height: H,
        backgroundColor: "#1e3a8a",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: SprintScene,
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

  return <div ref={hostRef} className="w-full mx-auto rounded-2xl overflow-hidden shadow-2xl touch-none select-none" style={{ maxWidth: 960, aspectRatio: `${W} / ${H}` }} />;
}
