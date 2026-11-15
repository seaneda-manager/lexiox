"use client";

import { useEffect, useRef } from "react";
import type { ArcheryQuestion } from "./ArcheryPhaser";
import { createJoystick, type Joystick } from "@/lib/workout/virtualJoystick";

/**
 * 콕핏 (위에서 내려다보는 종스크롤 슈팅, 조종석 계기판 UI)
 *  - 위쪽 문제(뜻)에 맞는 단어가 적힌 "타깃 함선"을 격추한다. 오답 함선을 격추하면 감점.
 *  - 적 드론이 내려와 탄을 쏜다 → 피하거나 격추. 맞으면 실드 -1.
 *  - 정답 타깃이 계기판 선(바닥)까지 내려오면 실드 -1 (놓침).
 *  - 아래 계기판: 실드, 점수, 레이더, 충격파(SHOCK) 버튼.
 */
type Props = {
  questions: ArcheryQuestion[];
  onFinish?: (r: { score: number; correct: number; total: number }) => void;
};

const W = 540;
const H = 900;
const DASH_Y = 790; // 계기판 윗선
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const MAX_SHIELD = 5;

export default function CockpitGame({ questions, onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;

      type WShip = {
        c: Phaser.GameObjects.Container;
        saucer: Phaser.GameObjects.Image;
        bar: Phaser.GameObjects.Rectangle;
        word: string;
        correct: boolean;
        hp: number;
        vy: number;
        x0: number;
        phase: number;
        dead: boolean;
      };
      type Drone = { img: Phaser.GameObjects.Image; vy: number; x0: number; phase: number; nextShot: number };
      type Bullet = { img: Phaser.GameObjects.Image; vx: number; vy: number };

      class CockpitScene extends Phaser.Scene {
        state: "start" | "play" | "between" | "done" = "start";
        order: ArcheryQuestion[] = [];
        qIndex = 0;
        score = 0;
        combo = 0;
        correctCount = 0;
        shield = 3;
        shocks = 2;
        invulUntil = 0;
        lastShot = 0;
        side = 1;
        qStart = 0;
        qDone = false;
        droneAcc = 0;
        ship!: Phaser.GameObjects.Image;
        wships: WShip[] = [];
        drones: Drone[] = [];
        shots: Bullet[] = [];
        eshots: Bullet[] = [];
        far!: Phaser.GameObjects.TileSprite;
        near!: Phaser.GameObjects.TileSprite;
        radar!: Phaser.GameObjects.Graphics;
        hud!: Record<"prompt" | "gate" | "score" | "shield" | "combo" | "shock" | "center", Phaser.GameObjects.Text>;
        panel!: Phaser.GameObjects.Rectangle;
        shockBtn!: Phaser.GameObjects.Rectangle;
        fireBtn!: Phaser.GameObjects.Rectangle;
        joy!: Joystick;
        overlay: Phaser.GameObjects.Container | null = null;
        target = { x: W / 2, y: 660 };
        keys!: Record<string, Phaser.Input.Keyboard.Key>;

        constructor() {
          super("cockpit");
        }

        create() {
          this.state = "start";
          this.wships = [];
          this.drones = [];
          this.shots = [];
          this.eshots = [];
          this.makeTextures();
          this.add.rectangle(0, 0, W, H, 0x050816).setOrigin(0).setDepth(0);
          this.far = this.add.tileSprite(0, 0, W, H, "stars-far").setOrigin(0).setDepth(1);
          this.near = this.add.tileSprite(0, 0, W, H, "stars-near").setOrigin(0).setDepth(2);

          this.ship = this.add.image(W / 2, 660, "pship").setDepth(10);
          this.add
            .particles(0, 0, "spark", {
              lifespan: 260,
              speed: { min: 70, max: 140 },
              angle: { min: 80, max: 100 },
              scale: { start: 0.55, end: 0 },
              tint: [0x7dd3fc, 0xffffff],
              frequency: 28,
              blendMode: "ADD",
              follow: this.ship,
              followOffset: { x: 0, y: 30 },
            })
            .setDepth(9);

          this.add.image(0, 0, "canopy").setOrigin(0).setDepth(30);
          this.buildHud();

          this.input.addPointer(2);
          this.joy = createJoystick(this, { x: 84, y: 690, radius: 58, depth: 90 });
          this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onDown(p));
          const kb = this.input.keyboard!;
          this.keys = {
            left: kb.addKey("LEFT"), right: kb.addKey("RIGHT"), up: kb.addKey("UP"), down: kb.addKey("DOWN"),
            a: kb.addKey("A"), d: kb.addKey("D"), w: kb.addKey("W"), s: kb.addKey("S"),
            space: kb.addKey("SPACE"),
          };
          // Space: 누르는 동안 사격(시작/종료 화면에서는 시작·재시도) · Shift/X/B: 충격파
          kb.on("keydown-SPACE", () => {
            if (this.state !== "play") this.onAnyStart();
          });
          ["SHIFT", "X", "B"].forEach((key) => kb.on(`keydown-${key}`, () => this.shock()));
          kb.on("keydown-ENTER", () => this.onAnyStart());
          this.showStart();
        }

        makeTextures() {
          const g = this.make.graphics({ x: 0, y: 0 }, false);
          g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
          g.generateTexture("spark", 16, 16);
          g.clear();
          // 플레이어 기체 (위쪽이 앞)
          g.translateCanvas(32, 36);
          g.fillStyle(0x1e293b, 1).fillTriangle(0, -34, -30, 28, 30, 28);
          g.fillStyle(0x334155, 1).fillTriangle(0, -34, -14, 28, 14, 28);
          g.fillStyle(0x38bdf8, 1).fillTriangle(0, -34, -30, 28, -20, 28).fillTriangle(0, -34, 30, 28, 20, 28);
          g.fillStyle(0x7dd3fc, 1).fillEllipse(0, -6, 12, 24);
          g.fillStyle(0xe2e8f0, 0.9).fillEllipse(-2, -10, 4, 10);
          g.fillStyle(0xfacc15, 1).fillRect(-26, 20, 6, 8).fillRect(20, 20, 6, 8);
          g.generateTexture("pship", 64, 72);
          g.clear();
          // 적 드론
          g.translateCanvas(22, 20);
          g.fillStyle(0x7f1d1d, 1).fillTriangle(0, 18, -20, -14, 20, -14);
          g.fillStyle(0xef4444, 1).fillTriangle(0, 12, -14, -12, 14, -12);
          g.fillStyle(0xfde68a, 1).fillCircle(0, -4, 5);
          g.generateTexture("drone", 44, 40);
          g.clear();
          // 타깃 함선(접시형)
          g.fillStyle(0x0b1230, 0.5).fillEllipse(70, 36, 134, 52);
          g.fillStyle(0x64748b, 1).fillEllipse(68, 32, 128, 48);
          g.fillStyle(0x94a3b8, 1).fillEllipse(68, 28, 118, 36);
          g.fillStyle(0x7dd3fc, 0.9).fillEllipse(68, 18, 50, 24);
          g.fillStyle(0xfff3c4, 1).fillRoundedRect(22, 22, 92, 26, 8);
          g.lineStyle(2, 0x3a2410, 1).strokeRoundedRect(22, 22, 92, 26, 8);
          g.fillStyle(0xfacc15, 1).fillCircle(14, 34, 4).fillCircle(122, 34, 4);
          g.generateTexture("saucer", 140, 64);
          g.clear();
          // 탄
          g.fillStyle(0x67e8f9, 1).fillRoundedRect(0, 0, 5, 18, 2);
          g.generateTexture("laser", 5, 18);
          g.clear();
          g.fillStyle(0xfb7185, 1).fillCircle(6, 6, 6);
          g.fillStyle(0xffffff, 0.9).fillCircle(6, 6, 3);
          g.generateTexture("ebullet", 12, 12);
          g.destroy();

          // 별(2겹, 512x512 POT)
          const mk = (key: string, count: number, size: [number, number], alpha: [number, number], nebula: boolean) => {
            if (this.textures.exists(key)) this.textures.remove(key);
            const tex = this.textures.createCanvas(key, 512, 512)!;
            const ctx = tex.getContext();
            if (nebula) {
              ["rgba(76,29,149,0.35)", "rgba(14,116,144,0.28)", "rgba(157,23,77,0.22)"].forEach((col, i) => {
                const x = 120 + i * 140;
                const y = 100 + i * 150;
                const gr = ctx.createRadialGradient(x, y, 0, x, y, 190);
                gr.addColorStop(0, col);
                gr.addColorStop(1, "rgba(0,0,0,0)");
                ctx.fillStyle = gr;
                ctx.fillRect(0, 0, 512, 512);
              });
            }
            for (let i = 0; i < count; i++) {
              ctx.fillStyle = `rgba(255,255,255,${alpha[0] + Math.random() * (alpha[1] - alpha[0])})`;
              const r = size[0] + Math.random() * (size[1] - size[0]);
              ctx.beginPath();
              ctx.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2);
              ctx.fill();
            }
            tex.refresh();
          };
          mk("stars-far", 70, [0.4, 1.0], [0.3, 0.8], true);
          mk("stars-near", 26, [1.0, 2.0], [0.6, 1], false);

          // 콕핏 캐노피 프레임 + 계기판 (한 번만 그려서 이미지로 사용)
          if (this.textures.exists("canopy")) this.textures.remove("canopy");
          const cv = this.textures.createCanvas("canopy", W, H)!;
          const c = cv.getContext();
          c.lineJoin = "round";
          // 좌우 지지대
          const strut = (x1: number, y1: number, x2: number, y2: number, w: number) => {
            c.strokeStyle = "#0b1020";
            c.lineWidth = w;
            c.beginPath();
            c.moveTo(x1, y1);
            c.lineTo(x2, y2);
            c.stroke();
            c.strokeStyle = "rgba(125,211,252,0.28)";
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(x1 + w / 2, y1);
            c.lineTo(x2 + w / 2, y2);
            c.stroke();
          };
          strut(-10, 0, 36, DASH_Y, 40);
          strut(W + 10, 0, W - 36, DASH_Y, 40);
          c.fillStyle = "#0b1020";
          c.fillRect(0, 0, W, 8);
          // 유리 반사
          const gl = c.createLinearGradient(0, 0, W, DASH_Y);
          gl.addColorStop(0, "rgba(125,211,252,0.10)");
          gl.addColorStop(0.3, "rgba(125,211,252,0)");
          gl.addColorStop(1, "rgba(125,211,252,0.05)");
          c.fillStyle = gl;
          c.fillRect(0, 0, W, DASH_Y);
          // 계기판
          const dg = c.createLinearGradient(0, DASH_Y - 6, 0, H);
          dg.addColorStop(0, "#1f2a44");
          dg.addColorStop(1, "#080c18");
          c.fillStyle = dg;
          c.beginPath();
          c.moveTo(0, H);
          c.lineTo(0, DASH_Y + 20);
          c.quadraticCurveTo(W / 2, DASH_Y - 36, W, DASH_Y + 20);
          c.lineTo(W, H);
          c.closePath();
          c.fill();
          c.strokeStyle = "rgba(125,211,252,0.6)";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(0, DASH_Y + 20);
          c.quadraticCurveTo(W / 2, DASH_Y - 36, W, DASH_Y + 20);
          c.stroke();
          // 레이더 테두리
          c.fillStyle = "#04101c";
          c.beginPath();
          c.arc(W / 2, H - 50, 52, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "#38bdf8";
          c.lineWidth = 3;
          c.stroke();
          cv.refresh();
        }

        buildHud() {
          const t = (x: number, y: number, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(x, y, "", { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", ...extra }).setDepth(41);
          this.panel = this.add.rectangle(W / 2, 46, 440, 60, 0x0b1230, 0.8).setDepth(40).setStrokeStyle(2, 0xffd166, 0.9);
          this.hud = {
            prompt: this.add.text(W / 2, 44, "", { fontFamily: FONT, fontSize: "18px", color: "#ffffff", align: "center", wordWrap: { width: 410 } }).setOrigin(0.5).setDepth(41),
            gate: t(W / 2, 76, 11, "#ffd166").setOrigin(0.5, 0),
            score: t(26, H - 92, 26, "#ffffff"),
            shield: t(26, H - 50, 24, "#fb7185"),
            combo: t(26, H - 22, 14, "#ffb703"),
            shock: t(W - 36, H - 78, 15, "#7dd3fc", { align: "center" }).setOrigin(0.5, 0).setX(W - 66),
            center: t(W / 2, 360, 80, "#ffffff").setOrigin(0.5).setDepth(70),
          };
          this.add.text(26, H - 112, "SCORE", { fontFamily: FONT, fontSize: "11px", color: "#7dd3fc", fontStyle: "bold" }).setDepth(41);
          this.add.text(26, H - 68, "SHIELD", { fontFamily: FONT, fontSize: "11px", color: "#7dd3fc", fontStyle: "bold" }).setDepth(41);
          this.shockBtn = this.add.rectangle(W - 66, H - 56, 96, 64, 0x0e7490, 0.55).setDepth(40).setStrokeStyle(2, 0x67e8f9, 0.9);
          // 폰용 FIRE 버튼 (키보드는 Space)
          this.fireBtn = this.add.rectangle(W - 172, H - 56, 96, 64, 0xb91c1c, 0.55).setDepth(40).setStrokeStyle(2, 0xfca5a5, 0.9);
          this.add.text(W - 172, H - 56, "FIRE", { fontFamily: FONT, fontSize: "20px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5).setDepth(41);
          this.add.text(W - 66, H - 22, "Shift", { fontFamily: FONT, fontSize: "10px", color: "#7dd3fc" }).setOrigin(0.5).setDepth(41);
          this.add.text(W - 172, H - 22, "Space", { fontFamily: FONT, fontSize: "10px", color: "#fca5a5" }).setOrigin(0.5).setDepth(41);
          this.radar = this.add.graphics().setDepth(42);
          this.setHud(false);
        }

        setHud(v: boolean) {
          this.panel.setVisible(v);
          Object.values(this.hud).forEach((o) => o.setVisible(v));
        }

        // ---------- 흐름 ----------
        showStart() {
          this.state = "start";
          this.setHud(false);
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.6);
          const title = this.add.text(W / 2, 250, "COCKPIT", { fontFamily: FONT, fontSize: "64px", color: "#7dd3fc", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5);
          const sub = this.add
            .text(W / 2, 400, "문제에 맞는 단어의 함선을 격추하세요!\n오답 함선을 쏘면 감점 · 드론의 탄은 피하세요\n\n← → ↑ ↓ (또는 WASD): 이동\nSpace: 누르고 있는 동안 사격\nShift / X / B: 충격파 (탄과 드론 소거)\n\n(폰: 왼쪽 조이패드로 이동 · FIRE / SHOCK 버튼)", { fontFamily: FONT, fontSize: "18px", color: "#fff", align: "center", lineSpacing: 8 })
            .setOrigin(0.5);
          const go = this.add.text(W / 2, 560, "▶  TAP TO START", { fontFamily: FONT, fontSize: "26px", color: "#0b1230", backgroundColor: "#7dd3fc", padding: { x: 22, y: 12 }, fontStyle: "bold" }).setOrigin(0.5);
          this.tweens.add({ targets: go, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
          this.overlay = this.add.container(0, 0, [dim, title, sub, go]).setDepth(100);
        }

        onAnyStart() {
          if (this.state === "start") this.startGame();
          else if (this.state === "done") this.scene.restart();
        }

        startGame() {
          this.overlay?.destroy();
          this.overlay = null;
          this.order = [...questions];
          this.qIndex = 0;
          this.score = 0;
          this.combo = 0;
          this.correctCount = 0;
          this.shield = 3;
          this.shocks = 2;
          this.setHud(true);
          this.loadQuestion();
        }

        loadQuestion() {
          this.wships.forEach((w) => w.c.destroy());
          this.wships = [];
          this.qDone = false;
          this.qStart = this.time.now;
          const q = this.order[this.qIndex];
          const words = Phaser.Utils.Array.Shuffle([...q.choices]).slice(0, 4);
          const xs = Phaser.Utils.Array.Shuffle([95, 215, 335, 455]);
          words.forEach((word, i) => {
            const saucer = this.add.image(0, 0, "saucer");
            const label = this.add.text(0, 6, word, { fontFamily: FONT, fontSize: "16px", color: "#10172e", fontStyle: "bold" }).setOrigin(0.5);
            if (label.width > 84) label.setScale(84 / label.width);
            const barBg = this.add.rectangle(0, 40, 86, 6, 0x000000, 0.5);
            const bar = this.add.rectangle(-43, 40, 86, 6, 0x4ade80).setOrigin(0, 0.5);
            const c = this.add.container(xs[i], -50 - i * 110, [saucer, label, barBg, bar]).setDepth(8);
            this.wships.push({
              c,
              saucer,
              bar,
              word,
              correct: word === q.answer,
              hp: 5,
              vy: 38 + this.qIndex * 2.5 + Math.random() * 10,
              x0: xs[i],
              phase: Math.random() * 6.28,
              dead: false,
            });
          });
          this.hud.prompt.setText(q.prompt);
          this.hud.gate.setText(`TARGET ${this.qIndex + 1} / ${this.order.length}`);
          this.refreshHud();
          this.state = "play";
        }

        refreshHud() {
          this.hud.score.setText(`${this.score}`);
          this.hud.shield.setText("♥".repeat(this.shield) + "♡".repeat(Math.max(0, MAX_SHIELD - this.shield)));
          this.hud.combo.setText(this.combo > 1 ? `COMBO x${this.combo}` : "");
          this.hud.shock.setText(`SHOCK\n×${this.shocks}`);
          this.shockBtn.setFillStyle(0x0e7490, this.shocks > 0 ? 0.65 : 0.2);
        }

        // ---------- 입력 ----------
        onDown(p: Phaser.Input.Pointer) {
          if (this.state === "start" || this.state === "done") return this.onAnyStart();
          if (this.state !== "play") return;
          if (p.y > DASH_Y - 10 && p.x > W - 118) this.shock();
        }

        // 사격: Space를 누르는 동안, 또는 폰에서 FIRE 버튼을 누르는 동안
        fireHeld(): boolean {
          if (this.keys.space.isDown) return true;
          let held = false;
          this.input.manager.pointers.forEach((p) => {
            if (p.isDown && p.wasTouch && p.y > DASH_Y - 10 && p.x > W - 222 && p.x < W - 122) held = true;
          });
          this.fireBtn.setFillStyle(0xb91c1c, held || this.keys.space.isDown ? 0.9 : 0.55);
          return held;
        }

        shock() {
          if (this.state !== "play" || this.shocks <= 0) return;
          this.shocks--;
          const ring = this.add.circle(this.ship.x, this.ship.y, 20, 0x67e8f9, 0.25).setStrokeStyle(5, 0x67e8f9, 1).setDepth(45);
          this.tweens.add({ targets: ring, scale: 22, alpha: 0, duration: 650, ease: "Quad.out", onComplete: () => ring.destroy() });
          this.cameras.main.flash(180, 120, 220, 255);
          this.eshots.forEach((b) => b.img.destroy());
          this.eshots = [];
          [...this.drones].forEach((d) => this.killDrone(d, false));
          this.refreshHud();
        }

        // ---------- 업데이트 ----------
        update(time: number, delta: number) {
          const dt = Math.min(delta, 33) / 1000;
          this.far.tilePositionY -= 40 * dt;
          this.near.tilePositionY -= 120 * dt;
          if (this.state === "play") {
            this.moveShip(dt);
            if (this.fireHeld()) this.autoFire(time);
            this.spawnDrones(dt, time);
            this.stepEntities(dt, time);
            this.collide(time);
            this.checkBottom();
          }
          this.drawRadar(time);
        }

        moveShip(dt: number) {
          const k = this.keys;
          let dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
          let dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
          const SPEED = 420;
          const jv = this.joy.vec;
          if (jv.active) {
            // 폰: 조이패드 (기울인 만큼 빠르게)
            dx = jv.x;
            dy = jv.y;
            this.ship.x += jv.x * SPEED * dt;
            this.ship.y += jv.y * SPEED * dt;
          } else if (dx || dy) {
            // 키보드: 누르는 동안 바로 움직인다
            const l = Math.hypot(dx, dy);
            this.ship.x += (dx / l) * SPEED * dt;
            this.ship.y += (dy / l) * SPEED * dt;
          }
          this.ship.x = Phaser.Math.Clamp(this.ship.x, 40, W - 40);
          this.ship.y = Phaser.Math.Clamp(this.ship.y, 130, DASH_Y - 50);
          this.ship.rotation += (Phaser.Math.Clamp(dx * 0.3, -0.35, 0.35) - this.ship.rotation) * Math.min(1, 10 * dt);
        }

        autoFire(time: number) {
          if (time - this.lastShot < 140) return;
          this.lastShot = time;
          this.side = -this.side;
          const img = this.add.image(this.ship.x + this.side * 14, this.ship.y - 30, "laser").setDepth(7);
          this.shots.push({ img, vx: 0, vy: -780 });
        }

        spawnDrones(dt: number, time: number) {
          this.droneAcc += dt;
          const interval = Math.max(1.0, 2.4 - this.qIndex * 0.08);
          if (this.droneAcc < interval || this.drones.length >= 4 + Math.floor(this.qIndex / 4)) return;
          this.droneAcc = 0;
          const x = Phaser.Math.Between(50, W - 50);
          const img = this.add.image(x, -30, "drone").setDepth(8);
          this.drones.push({ img, vy: 85 + this.qIndex * 3, x0: x, phase: Math.random() * 6.28, nextShot: time + 900 + Math.random() * 900 });
        }

        stepEntities(dt: number, time: number) {
          // 플레이어 탄
          for (const b of [...this.shots]) {
            b.img.y += b.vy * dt;
            if (b.img.y < -30) this.removeBullet(this.shots, b);
          }
          // 적 탄
          for (const b of [...this.eshots]) {
            b.img.x += b.vx * dt;
            b.img.y += b.vy * dt;
            if (b.img.y > H + 20 || b.img.x < -20 || b.img.x > W + 20) this.removeBullet(this.eshots, b);
          }
          // 드론
          for (const d of [...this.drones]) {
            d.img.y += d.vy * dt;
            d.img.x = d.x0 + Math.sin(time / 600 + d.phase) * 70;
            if (time >= d.nextShot && d.img.y > 20 && d.img.y < DASH_Y - 160) {
              d.nextShot = time + 1700 + Math.random() * 800;
              const ang = Math.atan2(this.ship.y - d.img.y, this.ship.x - d.img.x);
              const img = this.add.image(d.img.x, d.img.y + 12, "ebullet").setDepth(7);
              this.eshots.push({ img, vx: Math.cos(ang) * 230, vy: Math.sin(ang) * 230 });
            }
            if (d.img.y > H + 40) {
              d.img.destroy();
              this.drones = this.drones.filter((o) => o !== d);
            }
          }
          // 타깃 함선
          for (const w of this.wships) {
            if (w.dead) continue;
            w.c.y += w.vy * dt;
            w.c.x = w.x0 + Math.sin(time / 900 + w.phase) * 16;
          }
        }

        removeBullet(arr: Bullet[], b: Bullet) {
          b.img.destroy();
          const i = arr.indexOf(b);
          if (i >= 0) arr.splice(i, 1);
        }

        collide(time: number) {
          // 플레이어 탄 vs 드론 / 타깃 함선
          for (const b of [...this.shots]) {
            let used = false;
            for (const d of [...this.drones]) {
              if (Math.abs(b.img.x - d.img.x) < 22 && Math.abs(b.img.y - d.img.y) < 20) {
                this.killDrone(d, true);
                used = true;
                break;
              }
            }
            if (!used && this.state === "play") {
              for (const w of this.wships) {
                if (w.dead) continue;
                if (Math.abs(b.img.x - w.c.x) < 62 && Math.abs(b.img.y - w.c.y) < 22) {
                  this.hitWShip(w);
                  used = true;
                  break;
                }
              }
            }
            if (used) this.removeBullet(this.shots, b);
          }
          // 적 탄 / 드론 vs 플레이어
          for (const b of [...this.eshots]) {
            if (Math.hypot(b.img.x - this.ship.x, b.img.y - this.ship.y) < 20) {
              this.removeBullet(this.eshots, b);
              this.hurt(time);
            }
          }
          for (const d of [...this.drones]) {
            if (Math.hypot(d.img.x - this.ship.x, d.img.y - this.ship.y) < 32) {
              this.killDrone(d, false);
              this.hurt(time);
            }
          }
        }

        killDrone(d: Drone, byShot: boolean) {
          this.burst(d.img.x, d.img.y, [0xfb7185, 0xfde68a, 0xffffff], 14);
          d.img.destroy();
          this.drones = this.drones.filter((o) => o !== d);
          if (byShot) {
            this.score += 10;
            this.refreshHud();
          }
        }

        hitWShip(w: WShip) {
          w.hp--;
          w.saucer.setTintFill(0xffffff);
          this.time.delayedCall(60, () => w.saucer.active && w.saucer.clearTint());
          w.bar.width = Math.max(0, (86 * w.hp) / 5);
          if (w.hp > 0) return;
          w.dead = true;
          this.burst(w.c.x, w.c.y, w.correct ? [0xffd166, 0x4ade80, 0xffffff] : [0xef4444, 0xffffff], w.correct ? 40 : 22);
          if (w.correct) this.onCorrect(w);
          else this.onWrong(w);
          w.c.destroy();
        }

        onCorrect(w: WShip) {
          this.qDone = true;
          this.correctCount++;
          this.combo++;
          const gain = 100 + (this.combo - 1) * 20;
          this.score += gain;
          this.floatText(w.c.x, w.c.y - 30, `TARGET DOWN +${gain}`, "#4ade80", 26);
          this.cameras.main.flash(150, 255, 244, 170);
          if (this.correctCount % 3 === 0) {
            this.shield = Math.min(MAX_SHIELD, this.shield + 1);
            this.shocks = Math.min(3, this.shocks + 1);
            this.floatText(W / 2, 330, "SHIELD + SHOCK +1", "#7dd3fc", 24);
          }
          this.endQuestion(1200);
        }

        onWrong(w: WShip) {
          this.combo = 0;
          this.score = Math.max(0, this.score - 50);
          this.cameras.main.shake(200, 0.008);
          this.floatText(w.c.x, w.c.y - 30, "WRONG -50", "#ff6b6b", 26);
          this.refreshHud();
        }

        checkBottom() {
          for (const w of this.wships) {
            if (w.dead || w.c.y < DASH_Y - 40) continue;
            w.dead = true;
            if (w.correct && !this.qDone) {
              this.qDone = true;
              this.combo = 0;
              this.floatText(w.c.x, DASH_Y - 90, "TARGET ESCAPED", "#ff6b6b", 26);
              this.floatText(W / 2, 330, w.word, "#4ade80", 36);
              this.cameras.main.shake(260, 0.01);
              this.shield--;
              this.refreshHud();
              w.c.destroy();
              if (this.shield <= 0) return this.showResult();
              this.endQuestion(1700);
            } else {
              w.c.destroy();
            }
          }
        }

        hurt(time: number) {
          if (time < this.invulUntil || this.state === "done") return;
          this.invulUntil = time + 1300;
          this.shield--;
          this.combo = 0;
          this.cameras.main.shake(260, 0.014);
          this.cameras.main.flash(150, 255, 60, 60);
          this.tweens.add({ targets: this.ship, alpha: 0.3, duration: 90, yoyo: true, repeat: 6, onComplete: () => this.ship.setAlpha(1) });
          this.burst(this.ship.x, this.ship.y, [0xfb7185, 0xffffff], 18);
          this.refreshHud();
          if (this.shield <= 0) this.showResult();
        }

        endQuestion(delay: number) {
          if (this.state !== "play") return;
          this.state = "between";
          this.time.delayedCall(delay, () => {
            if (this.state === "done") return;
            this.qIndex++;
            if (this.qIndex >= this.order.length) this.showResult();
            else this.loadQuestion();
          });
        }

        showResult() {
          this.state = "done";
          this.wships.forEach((w) => w.c.destroy());
          this.wships = [];
          this.drones.forEach((d) => d.img.destroy());
          this.drones = [];
          this.eshots.forEach((b) => b.img.destroy());
          this.eshots = [];
          this.setHud(false);
          const total = this.order.length;
          const win = this.shield > 0;
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.72).setDepth(100);
          const T = (y: number, s: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(W / 2, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6, align: "center", ...extra }).setOrigin(0.5).setDepth(101);
          this.overlay = this.add.container(0, 0, [
            dim,
            T(250, win ? "MISSION CLEAR" : "SHIP DESTROYED", 44, win ? "#4ade80" : "#fb7185"),
            T(350, `${this.score}`, 80, "#ffffff"),
            T(430, `Targets  ${this.correctCount} / ${total}`, 26, "#ffffff"),
            T(540, "↻  TAP TO RETRY", 24, "#0b1230", { backgroundColor: "#7dd3fc", padding: { x: 20, y: 10 }, strokeThickness: 0 }),
          ]).setDepth(100);
          finishRef.current?.({ score: this.score, correct: this.correctCount, total });
        }

        // ---------- 레이더 / 이펙트 ----------
        drawRadar(time: number) {
          const g = this.radar;
          g.clear();
          if (this.state === "start") return;
          const cx = W / 2;
          const cy = H - 50;
          const R = 46;
          g.lineStyle(1, 0x38bdf8, 0.35).strokeCircle(cx, cy, R * 0.5).lineBetween(cx - R, cy, cx + R, cy).lineBetween(cx, cy - R, cx, cy + R);
          // 스윕
          const a = (time / 900) % (Math.PI * 2);
          g.lineStyle(2, 0x38bdf8, 0.6).lineBetween(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          g.fillStyle(0x7dd3fc, 1).fillCircle(cx, cy, 3);
          const blip = (x: number, y: number, color: number, r: number) => {
            const dx = ((x - this.ship.x) / W) * R * 1.9;
            const dy = ((y - this.ship.y) / H) * R * 1.9;
            if (dx * dx + dy * dy > (R - 3) * (R - 3)) return;
            g.fillStyle(color, 1).fillCircle(cx + dx, cy + dy, r);
          };
          this.drones.forEach((d) => blip(d.img.x, d.img.y, 0xef4444, 2.5));
          const hint = this.state === "play" && time - this.qStart > 9000 && Math.floor(time / 300) % 2 === 0;
          this.wships.forEach((w) => {
            if (w.dead) return;
            blip(w.c.x, w.c.y, w.correct && hint ? 0x4ade80 : 0xffffff, w.correct && hint ? 4 : 3);
          });
        }

        burst(x: number, y: number, tints: number[], qty: number) {
          const em = this.add.particles(x, y, "spark", {
            speed: { min: 100, max: 380 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 400, max: 800 },
            scale: { start: 0.6, end: 0 },
            tint: tints,
            blendMode: "ADD",
            emitting: false,
          });
          em.setDepth(50);
          em.explode(qty);
          this.time.delayedCall(1000, () => em.destroy());
        }

        floatText(x: number, y: number, text: string, color: string, size: number) {
          const t = this.add
            .text(Phaser.Math.Clamp(x, 120, W - 120), y, text, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6 })
            .setOrigin(0.5)
            .setDepth(60)
            .setScale(0.4);
          this.tweens.add({ targets: t, scale: 1, duration: 180, ease: "Back.out" });
          this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1000, delay: 300, ease: "Quad.out", onComplete: () => t.destroy() });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: W,
        height: H,
        backgroundColor: "#050816",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: CockpitScene,
        input: { touch: { capture: true } },
      });
      if (process.env.NODE_ENV !== "production") (window as unknown as { __archeryGame?: Phaser.Game }).__archeryGame = game;
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
      game = null;
    };
    // questions는 마운트 시 1회만 사용(바꾸려면 key로 재마운트)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="w-full mx-auto rounded-2xl overflow-hidden shadow-2xl touch-none select-none" style={{ maxWidth: 480, aspectRatio: `${W} / ${H}` }} />;
}
