"use client";

import { useEffect, useRef } from "react";
import type { ArcheryQuestion } from "./ArcheryPhaser";

/**
 * 단어 레이싱 (위에서 내려다보는 2D)
 *  - 도로 4차선, 줄마다 4개의 단어 게이트. 문제에 맞는 게이트가 있는 차선으로 통과한다.
 *  - 속도가 높을수록 차선 이동 때 미끄러져(오버슛) 옆 차선 게이트로 들어갈 수 있다.
 *    미끄러질 때 반대 방향을 누르면 카운터 스티어로 슬라이드를 잡는다.
 *  - trial: 혼자 달리는 타임 트라이얼(오답 +3초). race: 다른 차들이 장애물.
 */
export type RaceMode = "trial" | "race";

type Props = {
  questions: ArcheryQuestion[]; // choices 4개(차선 수와 같음)
  mode: RaceMode;
  rows?: number;
  onFinish?: (r: { time: number; penalty: number; correct: number; total: number; rank?: number }) => void;
};

const W = 540;
const H = 900;
const ROAD_L = 60;
const LANES = 4;
const LANE_W = 105;
const ROAD_R = ROAD_L + LANES * LANE_W; // 480
const CAR_Y = 740;
const MAX_V = 900;
const MIN_V = 180;
const ROW_GAP = 1100;
const FIRST_GATE = 1400;
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export default function RaceGame({ questions, mode, rows = 10, onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;

      type Row = {
        c: Phaser.GameObjects.Container;
        zones: Phaser.GameObjects.Rectangle[];
        G: number;
        correctLane: number;
        crossed: boolean;
        q: ArcheryQuestion;
      };
      type AI = { c: Phaser.GameObjects.Container; x: number; tl: number; worldY: number; speed: number; nextChange: number; finT: number | null };

      const laneX = (i: number) => ROAD_L + LANE_W * (i + 0.5);
      const fmt = (t: number) => `${t.toFixed(2)}s`;

      // 차 텍스처는 중심이 (24,40)인 48x80 캔버스에 그린다 (한 번만 생성해서 이미지로 사용)
      function drawCar(g: Phaser.GameObjects.Graphics, color: number) {
        g.translateCanvas(24, 40);
        g.fillStyle(0x000000, 0.28).fillRoundedRect(-17, -29, 36, 64, 9); // 그림자
        g.fillStyle(0x111111, 1);
        g.fillRoundedRect(-21, -22, 7, 16, 2).fillRoundedRect(14, -22, 7, 16, 2); // 앞바퀴
        g.fillRoundedRect(-21, 12, 7, 16, 2).fillRoundedRect(14, 12, 7, 16, 2); // 뒷바퀴
        g.fillStyle(color, 1).fillRoundedRect(-16, -32, 32, 64, 10);
        g.fillStyle(0xffffff, 0.2).fillRoundedRect(-16, -32, 32, 20, 10);
        g.fillStyle(0x0f172a, 0.92).fillRoundedRect(-11, -14, 22, 14, 4); // 앞유리
        g.fillStyle(0x0f172a, 0.8).fillRoundedRect(-11, 8, 22, 9, 3); // 뒷유리
        g.fillStyle(0xfff3b0, 1).fillRect(-13, -31, 6, 3).fillRect(7, -31, 6, 3); // 헤드라이트
        g.fillStyle(0xff4d4d, 1).fillRect(-13, 29, 6, 3).fillRect(7, 29, 6, 3); // 후미등
      }

      class RaceScene extends Phaser.Scene {
        state: "start" | "countdown" | "run" | "done" = "start";
        rowsData: Row[] = [];
        nextRow = 0;
        finishY = 0;
        dist = 0;
        speed = 0;
        t = 0;
        penalty = 0;
        correctCount = 0;
        x = laneX(1);
        vx = 0;
        tl = 1;
        counterUntil = 0;
        hitCooldown = 0;
        gasKey = false;
        gasPtr: number | null = null;
        swipeStart: { id: number; x: number; y: number } | null = null;
        ais: AI[] = [];
        skids: { r: Phaser.GameObjects.Rectangle }[] = [];
        trees: { img: Phaser.GameObjects.Image; w: number }[] = [];
        road!: Phaser.GameObjects.TileSprite;
        car!: Phaser.GameObjects.Container;
        smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
        lines!: Phaser.GameObjects.Graphics;
        ctrl!: Phaser.GameObjects.Graphics;
        meter!: Phaser.GameObjects.Graphics;
        panel!: Phaser.GameObjects.Graphics;
        txt!: {
          prompt: Phaser.GameObjects.Text;
          rowLabel: Phaser.GameObjects.Text;
          time: Phaser.GameObjects.Text;
          pos: Phaser.GameObjects.Text;
          center: Phaser.GameObjects.Text;
        };
        overlay: Phaser.GameObjects.Container | null = null;
        keys!: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key; up: Phaser.Input.Keyboard.Key; w: Phaser.Input.Keyboard.Key; space: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key };

        constructor() {
          super("race");
        }

        create() {
          // 재시작 대비 상태 초기화
          this.rowsData = [];
          this.ais = [];
          this.skids = [];
          this.trees = [];
          this.overlay = null;
          this.nextRow = 0;
          this.dist = 0;
          this.speed = 0;
          this.t = 0;
          this.penalty = 0;
          this.correctCount = 0;
          this.x = laneX(1);
          this.vx = 0;
          this.tl = 1;
          this.gasPtr = null;
          this.gasKey = false;

          this.makeTextures();
          this.road = this.add.tileSprite(0, 0, W, H, "road").setOrigin(0).setDepth(0);
          for (let i = 0; i < 14; i++) {
            const left = i % 2 === 0;
            const img = this.add.image(left ? Phaser.Math.Between(8, 44) : Phaser.Math.Between(496, 532), 0, "tree").setDepth(3).setScale(Phaser.Math.FloatBetween(0.8, 1.3));
            this.trees.push({ img, w: i * 130 + Phaser.Math.Between(0, 60) });
          }
          this.lines = this.add.graphics().setDepth(2);

          this.buildRows();
          this.buildCars();
          this.smoke = this.add.particles(0, 0, "spark", {
            lifespan: 600,
            scale: { start: 0.9, end: 0 },
            alpha: { start: 0.5, end: 0 },
            speed: { min: 10, max: 50 },
            tint: 0xdddddd,
            emitting: false,
          });
          this.smoke.setDepth(9);

          this.buildHud();
          this.input.addPointer(2);
          this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onDown(p));
          this.input.on("pointerup", (p: Phaser.Input.Pointer) => this.onUp(p));
          const kb = this.input.keyboard!;
          this.keys = {
            left: kb.addKey("LEFT"),
            right: kb.addKey("RIGHT"),
            a: kb.addKey("A"),
            d: kb.addKey("D"),
            up: kb.addKey("UP"),
            w: kb.addKey("W"),
            space: kb.addKey("SPACE"),
            down: kb.addKey("DOWN"),
            s: kb.addKey("S"),
          };
          kb.on("keydown-LEFT", () => this.steer(-1));
          kb.on("keydown-A", () => this.steer(-1));
          kb.on("keydown-RIGHT", () => this.steer(1));
          kb.on("keydown-D", () => this.steer(1));
          kb.on("keydown-SPACE", () => this.onAnyStart());
          kb.on("keydown-ENTER", () => this.onAnyStart());

          this.showStart();
        }

        makeTextures() {
          const g = this.make.graphics({ x: 0, y: 0 }, false);
          g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
          g.generateTexture("spark", 16, 16);
          g.clear();
          // 도로 타일: 가로·세로 모두 2의 제곱(1024x256)이어야 WebGL TileSprite가 빠르다
          g.fillStyle(0x2f7a3b, 1).fillRect(0, 0, 1024, 128);
          g.fillStyle(0x3a8a46, 1).fillRect(0, 128, 1024, 128);
          g.fillStyle(0x3b3f4a, 1).fillRect(ROAD_L, 0, ROAD_R - ROAD_L, 256);
          g.fillStyle(0x434855, 1).fillRect(ROAD_L, 0, ROAD_R - ROAD_L, 128);
          g.fillStyle(0xf1f5f9, 1).fillRect(ROAD_L + 4, 0, 6, 256).fillRect(ROAD_R - 10, 0, 6, 256);
          for (let i = 1; i < LANES; i++) {
            const x = ROAD_L + i * LANE_W;
            g.fillStyle(0xe2e8f0, 0.9).fillRect(x - 2, 24, 4, 64).fillRect(x - 2, 152, 4, 64);
          }
          g.generateTexture("road", 1024, 256);
          g.clear();
          // 나무
          g.fillStyle(0x5b3a1e, 1).fillRect(10, 22, 6, 12);
          g.fillStyle(0x1f6b34, 1).fillCircle(13, 15, 14);
          g.fillStyle(0x2c8a46, 1).fillCircle(10, 11, 9);
          g.generateTexture("tree", 26, 36);
          g.clear();
          // 게이트 이름표
          const pw = LANE_W - 14;
          g.fillStyle(0xfff3c4, 1).fillRoundedRect(1, 1, pw, 36, 9);
          g.lineStyle(2, 0x3a2410, 1).strokeRoundedRect(1, 1, pw, 36, 9);
          g.generateTexture("plate", pw + 2, 38);
          g.destroy();
          // 차 (색마다 1장)
          [0xe63946, 0x3b82f6, 0x22c55e, 0xfacc15].forEach((col) => {
            const cg = this.make.graphics({ x: 0, y: 0 }, false);
            drawCar(cg, col);
            cg.generateTexture(`car-${col}`, 48, 80);
            cg.destroy();
          });
        }

        buildRows() {
          const n = Math.min(rows, questions.length);
          for (let r = 0; r < n; r++) {
            const q = questions[r];
            const choices = Phaser.Utils.Array.Shuffle([...q.choices]).slice(0, LANES);
            const correctLane = Math.max(0, choices.indexOf(q.answer));
            const G = FIRST_GATE + r * ROW_GAP;
            const kids: Phaser.GameObjects.GameObject[] = [];
            const zones: Phaser.GameObjects.Rectangle[] = [];
            kids.push(this.add.rectangle((ROAD_L + ROAD_R) / 2, 0, ROAD_R - ROAD_L, 6, 0xffffff, 0.55));
            for (let i = 0; i < LANES; i++) {
              const cx = laneX(i);
              const z = this.add.rectangle(cx, 0, LANE_W - 8, 70, 0x60a5fa, 0.16);
              zones.push(z);
              const label = this.add.text(cx, -30, choices[i] ?? "", { fontFamily: FONT, fontSize: "17px", color: "#10172e", fontStyle: "bold" }).setOrigin(0.5);
              const maxW = LANE_W - 24;
              if (label.width > maxW) label.setScale(maxW / label.width);
              const plate = this.add.image(cx, -30, "plate");
              kids.push(z, plate, label);
            }
            const c = this.add.container(0, -500, kids).setDepth(5);
            this.rowsData.push({ c, zones, G, correctLane, crossed: false, q });
          }
          this.finishY = FIRST_GATE + (n - 1) * ROW_GAP + 650;
        }

        buildCars() {
          this.car = this.add.container(this.x, CAR_Y, [this.add.image(0, 0, "car-" + 0xe63946)]).setDepth(8);
          if (mode === "race") {
            const colors = [0x3b82f6, 0x22c55e, 0xfacc15];
            const lanes = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]);
            colors.forEach((col, i) => {
              const c = this.add.container(laneX(lanes[i]), -200, [this.add.image(0, 0, "car-" + col)]).setDepth(7);
              this.ais.push({ c, x: laneX(lanes[i]), tl: lanes[i], worldY: 900 + i * 700, speed: 400 + Math.random() * 170, nextChange: 2 + Math.random() * 3, finT: null });
            });
          }
        }

        buildHud() {
          this.panel = this.add.graphics().setDepth(40);
          this.panel.fillStyle(0x0b1230, 0.8).fillRoundedRect(20, 10, W - 40, 76, 16);
          this.panel.lineStyle(2, 0xffd166, 0.9).strokeRoundedRect(20, 10, W - 40, 76, 16);
          const t = (x: number, y: number, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(x, y, "", { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 4, ...extra }).setDepth(42);
          this.txt = {
            rowLabel: t(34, 16, 13, "#ffd166", { strokeThickness: 0 }),
            prompt: this.add.text(W / 2, 54, "", { fontFamily: FONT, fontSize: "19px", color: "#ffffff", align: "center", wordWrap: { width: W - 80 } }).setOrigin(0.5).setDepth(42),
            time: t(20, 98, 28, "#ffffff"),
            pos: t(W - 20, 98, 24, "#ffd166").setOrigin(1, 0),
            center: t(W / 2, 360, 80, "#ffffff").setOrigin(0.5).setDepth(70),
          };
          this.meter = this.add.graphics().setDepth(41);
          this.ctrl = this.add.graphics().setDepth(41);
          const labels: [number, string][] = [[90, "◀"], [270, "GAS"], [450, "▶"]];
          labels.forEach(([x, s]) => this.add.text(x, H - 54, s, { fontFamily: FONT, fontSize: "30px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5).setDepth(43).setAlpha(0.9));
          this.setHud(false);
        }

        setHud(v: boolean) {
          this.panel.setVisible(v);
          this.txt.rowLabel.setVisible(v);
          this.txt.prompt.setVisible(v);
          this.txt.time.setVisible(v);
          this.txt.pos.setVisible(v && mode === "race");
        }

        // ---------- 흐름 ----------
        showStart() {
          this.state = "start";
          this.setHud(false);
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.66);
          const title = this.add.text(W / 2, 250, mode === "trial" ? "WORD RACE" : "WORD GRAND PRIX", { fontFamily: FONT, fontSize: "44px", color: "#ffd166", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5);
          const sub = this.add
            .text(
              W / 2,
              370,
              `${mode === "trial" ? "TIME TRIAL · 오답 +3초" : "RACE · 다른 차를 피하세요"}\n문제에 맞는 단어 차선으로 통과!\n\n빠를수록 미끄러져요 → 미끄러질 때\n반대 방향을 누르면 카운터!\n\n◀ ▶ 차선 이동 · GAS 길게 누르면 가속\n(키보드: ← → / ↑ 또는 Space)`,
              { fontFamily: FONT, fontSize: "19px", color: "#fff", align: "center", lineSpacing: 6 },
            )
            .setOrigin(0.5);
          const go = this.add.text(W / 2, 580, "▶  TAP TO START", { fontFamily: FONT, fontSize: "26px", color: "#0b1230", backgroundColor: "#ffd166", padding: { x: 22, y: 12 }, fontStyle: "bold" }).setOrigin(0.5);
          this.tweens.add({ targets: go, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
          this.overlay = this.add.container(0, 0, [dim, title, sub, go]).setDepth(100);
        }

        onAnyStart() {
          if (this.state === "start") this.startCountdown();
          else if (this.state === "done") this.scene.restart();
        }

        startCountdown() {
          this.overlay?.destroy();
          this.overlay = null;
          this.setHud(true);
          this.state = "countdown";
          this.updatePrompt();
          let n = 3;
          const tick = () => {
            if (n > 0) {
              this.txt.center.setText(String(n)).setScale(1.6).setAlpha(1);
              this.tweens.add({ targets: this.txt.center, scale: 1, alpha: 0.4, duration: 800 });
              n--;
              this.time.delayedCall(900, tick);
            } else {
              this.txt.center.setText("GO!").setScale(1.6).setAlpha(1);
              this.tweens.add({ targets: this.txt.center, scale: 1.1, alpha: 0, duration: 800 });
              this.speed = 260;
              this.state = "run";
            }
          };
          tick();
        }

        updatePrompt() {
          const r = this.rowsData[Math.min(this.nextRow, this.rowsData.length - 1)];
          this.txt.rowLabel.setText(`GATE ${Math.min(this.nextRow + 1, this.rowsData.length)} / ${this.rowsData.length}`);
          this.txt.prompt.setText(r ? r.q.prompt : "");
        }

        // ---------- 입력 ----------
        steer(dir: number) {
          if (this.state === "start" || this.state === "done") return;
          const tx = laneX(this.tl);
          const sliding = Math.abs(this.vx) > 60 && Math.sign(this.vx) === -dir && (this.x - tx) * this.vx > 0;
          if (sliding) {
            // 카운터 스티어: 슬라이드를 잡는다
            this.vx *= 0.2;
            this.counterUntil = this.time.now + 450;
            this.floatText(this.x, CAR_Y - 70, "COUNTER!", "#7dd3fc", 24);
            this.smoke.emitParticleAt(this.x, CAR_Y + 30, 4);
            return;
          }
          this.tl = Phaser.Math.Clamp(this.tl + dir, 0, LANES - 1);
        }

        onDown(p: Phaser.Input.Pointer) {
          if (this.state === "start" || this.state === "done") return this.onAnyStart();
          if (p.y > H - 100) {
            if (p.x < 180) this.steer(-1);
            else if (p.x > 360) this.steer(1);
            else this.gasPtr = p.id;
          } else {
            this.swipeStart = { id: p.id, x: p.x, y: p.y };
          }
        }

        onUp(p: Phaser.Input.Pointer) {
          if (this.gasPtr === p.id) this.gasPtr = null;
          if (this.swipeStart && this.swipeStart.id === p.id) {
            const dx = p.x - this.swipeStart.x;
            if (Math.abs(dx) > 40) this.steer(dx > 0 ? 1 : -1);
            else this.gasPtr = this.gasPtr; // 탭은 무시
            this.swipeStart = null;
          }
        }

        // ---------- 업데이트 ----------
        update(time: number, delta: number) {
          const dt = Math.min(delta, 33) / 1000;
          const k = this.keys;
          const gas = this.gasPtr !== null || k.up.isDown || k.w.isDown || k.space.isDown;
          const brake = k.down.isDown || k.s.isDown;

          if (this.state === "run") {
            if (gas) this.speed += (MAX_V - this.speed) * 0.7 * dt + 120 * dt;
            else this.speed -= 230 * dt;
            if (brake) this.speed -= 650 * dt;
            this.speed = Phaser.Math.Clamp(this.speed, MIN_V, MAX_V);
            this.dist += this.speed * dt;
            this.t += dt;
          }

          this.stepSteering(dt, time);
          this.draw(time);

          if (this.state === "run") {
            this.checkGates();
            if (mode === "race") this.stepAI(dt);
            if (this.dist >= this.finishY) this.finish();
          }
        }

        stepSteering(dt: number, time: number) {
          const tx = laneX(this.tl);
          const sp = Math.min(1, this.speed / MAX_V);
          const grip = 1 - 0.95 * Math.pow(sp, 1.2);
          let zeta = 0.12 + 0.88 * grip;
          if (time < this.counterUntil) zeta = 1;
          const kk = 110;
          const steps = 2;
          for (let s = 0; s < steps; s++) {
            const h = dt / steps;
            const a = kk * (tx - this.x) - 2 * zeta * Math.sqrt(kk) * this.vx;
            this.vx += a * h;
            this.x += this.vx * h;
          }
          if (this.x < ROAD_L + 22) {
            this.x = ROAD_L + 22;
            this.vx = Math.abs(this.vx) * 0.3;
            if (this.state === "run") this.speed *= 0.985;
          } else if (this.x > ROAD_R - 22) {
            this.x = ROAD_R - 22;
            this.vx = -Math.abs(this.vx) * 0.3;
            if (this.state === "run") this.speed *= 0.985;
          }
        }

        checkGates() {
          while (this.nextRow < this.rowsData.length && this.dist >= this.rowsData[this.nextRow].G) {
            this.crossGate(this.rowsData[this.nextRow]);
            this.nextRow++;
            if (this.nextRow < this.rowsData.length) this.updatePrompt();
          }
        }

        crossGate(r: Row) {
          r.crossed = true;
          const lane = Phaser.Math.Clamp(Math.floor((this.x - ROAD_L) / LANE_W), 0, LANES - 1);
          const ok = lane === r.correctLane;
          r.zones[r.correctLane].setFillStyle(0x4ade80, 0.5);
          if (ok) {
            this.correctCount++;
            this.floatText(laneX(lane), CAR_Y - 90, "GATE!", "#4ade80", 30);
            this.burst(laneX(lane), CAR_Y - 40, [0xffd166, 0x4ade80, 0xffffff]);
            this.cameras.main.flash(120, 200, 255, 200);
          } else {
            r.zones[lane].setFillStyle(0xef4444, 0.5);
            this.speed = Math.max(MIN_V, this.speed * 0.5);
            if (mode === "trial") {
              this.penalty += 3;
              this.floatText(laneX(lane), CAR_Y - 90, "+3.0s", "#ff6b6b", 32);
            } else {
              this.floatText(laneX(lane), CAR_Y - 90, "WRONG", "#ff6b6b", 32);
            }
            this.cameras.main.shake(220, 0.01);
          }
        }

        stepAI(dt: number) {
          for (const a of this.ais) {
            a.worldY += a.speed * dt;
            a.nextChange -= dt;
            if (a.nextChange <= 0) {
              a.nextChange = 2 + Math.random() * 4;
              a.tl = Phaser.Math.Clamp(a.tl + (Math.random() < 0.5 ? -1 : 1), 0, LANES - 1);
            }
            a.x += (laneX(a.tl) - a.x) * Math.min(1, 3 * dt);
            if (a.finT === null && a.worldY >= this.finishY) a.finT = this.t;
            // 충돌 (앞에 있는 차만)
            const dy = a.worldY - this.dist;
            if (dy > -10 && dy < 62 && Math.abs(a.x - this.x) < 34 && this.time.now > this.hitCooldown) {
              this.hitCooldown = this.time.now + 900;
              this.speed = Math.min(this.speed, a.speed * 0.8);
              this.vx += (this.x >= a.x ? 1 : -1) * 220;
              this.cameras.main.shake(260, 0.014);
              this.floatText(this.x, CAR_Y - 70, "CRASH!", "#ff6b6b", 30);
              this.burst(this.x, CAR_Y - 30, [0xff9f1c, 0xffffff, 0xef4444]);
            }
          }
          const ahead = this.ais.filter((a) => a.worldY > this.dist).length;
          this.txt.pos.setText(`POS ${ahead + 1} / ${this.ais.length + 1}`);
        }

        finish() {
          if (this.state !== "run") return;
          this.state = "done";
          const total = this.rowsData.length;
          const time = this.t + this.penalty;
          const rank = mode === "race" ? 1 + this.ais.filter((a) => a.finT !== null).length : undefined;

          let best: number | null = null;
          if (mode === "trial") {
            try {
              const key = "race-best-trial";
              const prev = Number(localStorage.getItem(key));
              best = prev > 0 ? Math.min(prev, time) : time;
              localStorage.setItem(key, String(best));
            } catch {
              best = null;
            }
          }
          const par = this.finishY / 600;
          const medal = time <= par ? ["GOLD", "#ffd166"] : time <= par * 1.2 ? ["SILVER", "#cbd5e1"] : time <= par * 1.5 ? ["BRONZE", "#d6935a"] : ["FINISH", "#94a3b8"];

          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.72);
          const items: Phaser.GameObjects.GameObject[] = [dim];
          const T = (y: number, s: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(W / 2, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6, align: "center", ...extra }).setOrigin(0.5);
          if (mode === "race") {
            items.push(T(230, `${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"} PLACE`, 56, rank === 1 ? "#ffd166" : "#ffffff"));
          } else {
            items.push(T(230, medal[0], 56, medal[1]));
          }
          items.push(T(320, fmt(time), 64, "#ffffff"));
          items.push(T(390, mode === "trial" ? `주행 ${fmt(this.t)}  +  패널티 ${this.penalty.toFixed(1)}s` : `주행 ${fmt(this.t)}`, 20, "#cbd5e1", { strokeThickness: 0 }));
          items.push(T(430, `Correct  ${this.correctCount} / ${total}`, 26, "#ffffff"));
          if (best !== null) items.push(T(472, `BEST  ${fmt(best)}`, 22, "#7dd3fc", { strokeThickness: 0 }));
          items.push(
            T(560, "↻  TAP TO RETRY", 24, "#0b1230", { backgroundColor: "#ffd166", padding: { x: 20, y: 10 }, strokeThickness: 0 }),
          );
          this.overlay = this.add.container(0, 0, items).setDepth(100);
          this.burst(W / 2, 280, [0xffd166, 0xffffff, 0xff9f1c]);
          finishRef.current?.({ time, penalty: this.penalty, correct: this.correctCount, total, rank });
        }

        // ---------- 그리기 ----------
        draw(time: number) {
          this.road.tilePositionY = -this.dist;

          // 나무
          this.trees.forEach((tr) => {
            tr.img.y = ((tr.w + this.dist) % (H + 160)) - 80;
          });

          // 게이트 / 결승선
          this.rowsData.forEach((r) => {
            r.c.y = CAR_Y - (r.G - this.dist);
            r.c.setVisible(r.c.y > -120 && r.c.y < H + 120); // 화면 밖 줄은 그리지 않는다
          });

          // 내 차
          this.car.setPosition(this.x, CAR_Y);
          this.car.rotation = Phaser.Math.Clamp(this.vx / 380, -0.55, 0.55);
          const sliding = Math.abs(this.vx) > 140 && this.speed > 350;
          if (sliding && time % 3 < 1.6) {
            this.smoke.emitParticleAt(this.x, CAR_Y + 30, 1);
            this.addSkid();
          }
          // 스키드 이동/제거
          for (const s of [...this.skids]) {
            s.r.y += this.speed * (1 / 60);
            s.r.alpha -= 0.004;
            if (s.r.y > H + 20 || s.r.alpha <= 0) {
              s.r.destroy();
              this.skids = this.skids.filter((o) => o !== s);
            }
          }

          // AI 차
          this.ais.forEach((a) => {
            a.c.setPosition(a.x, CAR_Y - (a.worldY - this.dist));
            a.c.setVisible(a.c.y > -100 && a.c.y < H + 100);
            a.c.rotation = Phaser.Math.Clamp((laneX(a.tl) - a.x) / 80, -0.4, 0.4);
          });

          // 속도선
          const L = this.lines;
          L.clear();
          if (this.speed > 600) {
            const alpha = (this.speed - 600) / 300 * 0.5;
            for (let i = 0; i < 14; i++) {
              const px = i % 2 === 0 ? 10 + ((i * 37) % 40) : ROAD_R + 6 + ((i * 29) % 40);
              const py = ((i * 97 + this.dist * 1.6) % (H + 100)) - 50;
              L.lineStyle(2, 0xffffff, alpha).lineBetween(px, py, px, py + 40 + this.speed / 30);
            }
          }

          // HUD
          this.txt.time.setText(fmt(this.t + this.penalty));
          const m = this.meter;
          m.clear();
          m.fillStyle(0x000000, 0.45).fillRoundedRect(16, H - 124, 508, 14, 7);
          const sp = (this.speed - MIN_V) / (MAX_V - MIN_V);
          const col = sp < 0.6 ? 0x4ade80 : sp < 0.85 ? 0xfacc15 : 0xef4444;
          m.fillStyle(col, 1).fillRoundedRect(18, H - 122, 504 * sp, 10, 5);
          m.lineStyle(2, 0xffffff, 0.8).lineBetween(18 + 504 * 0.85, H - 126, 18 + 504 * 0.85, H - 106); // 위험 구간

          const c = this.ctrl;
          c.clear();
          c.fillStyle(0xffffff, 0.12).fillRoundedRect(10, H - 90, 160, 76, 14).fillRoundedRect(370, H - 90, 160, 76, 14);
          c.fillStyle(this.gasPtr !== null || this.keys.up.isDown || this.keys.space.isDown ? 0x4ade80 : 0xffffff, this.gasPtr !== null ? 0.45 : 0.14).fillRoundedRect(180, H - 90, 180, 76, 14);
        }

        addSkid() {
          [-12, 12].forEach((o) => {
            const r = this.add.rectangle(this.x + o, CAR_Y + 24, 4, 12, 0x0a0a0a, 0.45).setDepth(1);
            this.skids.push({ r });
          });
          if (this.skids.length > 120) {
            const old = this.skids.shift();
            old?.r.destroy();
          }
        }

        burst(x: number, y: number, tints: number[]) {
          const em = this.add.particles(x, y, "spark", {
            speed: { min: 100, max: 380 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 400, max: 800 },
            scale: { start: 0.6, end: 0 },
            gravityY: 300,
            tint: tints,
            blendMode: "ADD",
            emitting: false,
          });
          em.setDepth(50);
          em.explode(22);
          this.time.delayedCall(1000, () => em.destroy());
        }

        floatText(x: number, y: number, text: string, color: string, size: number) {
          const t = this.add
            .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6 })
            .setOrigin(0.5)
            .setDepth(60)
            .setScale(0.4);
          this.tweens.add({ targets: t, scale: 1, duration: 180, ease: "Back.out" });
          this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 900, delay: 250, ease: "Quad.out", onComplete: () => t.destroy() });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: W,
        height: H,
        backgroundColor: "#0b1230",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: RaceScene,
        input: { touch: { capture: true } },
      });
      if (process.env.NODE_ENV !== "production") (window as unknown as { __archeryGame?: Phaser.Game }).__archeryGame = game;
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
      game = null;
    };
    // questions/mode는 마운트 시 1회만 사용(바꾸려면 key로 재마운트)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="w-full mx-auto rounded-2xl overflow-hidden shadow-2xl touch-none select-none" style={{ maxWidth: 480, aspectRatio: `${W} / ${H}` }} />;
}
