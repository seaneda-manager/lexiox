"use client";

import { useEffect, useRef } from "react";

export type ArcheryQuestion = {
  id: string;
  prompt: string; // 위쪽 패널에 보이는 문제(여러 줄 가능)
  answer: string;
  choices: string[]; // answer 포함 4개
};

export type ArcheryMotion = "hang" | "fall" | "fly";

type Props = {
  questions: ArcheryQuestion[];
  motion?: ArcheryMotion; // hang: 매달림 / fall: 하늘에서 떨어짐 / fly: 날아감
  titleSub?: string; // 시작 화면에 표시할 설명
  onFinish?: (result: { score: number; correct: number; total: number }) => void;
};

const W = 960;
const H = 540;
const GROUND_Y = 478;
const BOW_Y = 408;
const GRAVITY = 720;
const MAX_ARROWS = 3;

export default function ArcheryPhaser({ questions, motion = "hang", titleSub, onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;
      // 떨어지는 과녁은 사방에서 내려오므로 활을 가운데에 둔다
      const BOW_X = motion === "fall" ? W / 2 : 118;

      type Target = {
        c: Phaser.GameObjects.Container;
        baseY: number;
        phase: number;
        speed: number;
        amp: number;
        r: number;
        vx: number;
        vy: number;
        x0: number;
        word: string;
        correct: boolean;
        dead: boolean;
      };

      class ArcheryScene extends Phaser.Scene {
        state: "start" | "ready" | "charging" | "flying" | "resolving" | "done" = "start";
        qIndex = 0;
        score = 0;
        combo = 0;
        correctCount = 0;
        arrowsLeft = MAX_ARROWS;
        targets: Target[] = [];
        aim = -0.35;
        charge = 0;
        chargeStart = 0;
        bow!: Phaser.GameObjects.Graphics;
        aimDots!: Phaser.GameObjects.Graphics;
        powerBar!: Phaser.GameObjects.Graphics;
        clouds: Phaser.GameObjects.Image[] = [];
        arrow: {
          c: Phaser.GameObjects.Container;
          vx: number;
          vy: number;
          stuck?: { t: Target; ox: number; oy: number };
        } | null = null;
        hud!: {
          score: Phaser.GameObjects.Text;
          combo: Phaser.GameObjects.Text;
          arrows: Phaser.GameObjects.Text;
          q: Phaser.GameObjects.Text;
          def: Phaser.GameObjects.Text;
        };
        overlay: Phaser.GameObjects.Container | null = null;
        panelGfx!: Phaser.GameObjects.Graphics;
        order: ArcheryQuestion[] = [];
        qDone = false;

        constructor() {
          super("archery");
        }

        create() {
          this.makeTextures();
          this.buildBackground();
          this.bow = this.add.graphics().setDepth(20);
          this.aimDots = this.add.graphics().setDepth(15);
          this.powerBar = this.add.graphics().setDepth(30);
          this.buildHud();

          this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.updateAim(p));
          this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onDown(p));
          this.input.on("pointerup", () => this.onUp());

          this.showStart();
        }

        // ---------- 텍스처(에셋 없이 코드로 생성) ----------
        makeTextures() {
          const g = this.make.graphics({ x: 0, y: 0 }, false);
          // spark
          g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
          g.generateTexture("spark", 16, 16);
          g.clear();
          // star
          g.fillStyle(0xffffff, 1);
          const pts: Phaser.Math.Vector2[] = [];
          for (let i = 0; i < 10; i++) {
            const rad = i % 2 === 0 ? 10 : 4.5;
            const a = (Math.PI / 5) * i - Math.PI / 2;
            pts.push(new Phaser.Math.Vector2(12 + Math.cos(a) * rad, 12 + Math.sin(a) * rad));
          }
          g.fillPoints(pts, true);
          g.generateTexture("star", 24, 24);
          g.clear();
          // cloud
          g.fillStyle(0xffffff, 0.9);
          g.fillEllipse(60, 42, 110, 34);
          g.fillCircle(42, 32, 22);
          g.fillCircle(70, 26, 28);
          g.fillCircle(96, 34, 20);
          g.generateTexture("cloud", 130, 70);
          g.destroy();
        }

        buildBackground() {
          // 하늘 그라디언트
          if (this.textures.exists("sky")) this.textures.remove("sky");
          const sky = this.textures.createCanvas("sky", W, H)!;
          const ctx = sky.getContext();
          const grd = ctx.createLinearGradient(0, 0, 0, H);
          grd.addColorStop(0, "#1e3a8a");
          grd.addColorStop(0.45, "#4f8bd6");
          grd.addColorStop(0.8, "#ffd9a0");
          grd.addColorStop(1, "#ffb37a");
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, W, H);
          sky.refresh();
          this.add.image(0, 0, "sky").setOrigin(0).setDepth(0);

          // 태양 글로우
          const sun = this.add.graphics().setDepth(1);
          for (let i = 6; i >= 1; i--) {
            sun.fillStyle(0xfff0b0, 0.07 * (7 - i) * 0.6);
            sun.fillCircle(780, 330, 30 + i * 24);
          }
          sun.fillStyle(0xfff7d6, 1).fillCircle(780, 330, 34);
          this.tweens.add({ targets: sun, scale: 1.04, duration: 2400, yoyo: true, repeat: -1, ease: "Sine.inOut" });

          // 별(위쪽)
          for (let i = 0; i < 40; i++) {
            const s = this.add
              .image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, 180), "star")
              .setScale(Phaser.Math.FloatBetween(0.2, 0.5))
              .setAlpha(Phaser.Math.FloatBetween(0.3, 0.9))
              .setDepth(1);
            this.tweens.add({
              targets: s,
              alpha: 0.1,
              duration: Phaser.Math.Between(900, 2200),
              yoyo: true,
              repeat: -1,
              delay: Phaser.Math.Between(0, 1500),
            });
          }

          // 구름 (패럴랙스)
          for (let i = 0; i < 6; i++) {
            const c = this.add
              .image(Phaser.Math.Between(0, W), Phaser.Math.Between(60, 300), "cloud")
              .setAlpha(Phaser.Math.FloatBetween(0.35, 0.8))
              .setScale(Phaser.Math.FloatBetween(0.7, 1.5))
              .setDepth(2);
            this.clouds.push(c);
          }

          // 산 2겹
          const mtn = (color: number, alpha: number, base: number, peaks: number[]) => {
            const m = this.add.graphics().setDepth(3);
            m.fillStyle(color, alpha);
            m.beginPath();
            m.moveTo(0, GROUND_Y);
            peaks.forEach((h, i) => {
              m.lineTo((i / (peaks.length - 1)) * W, base - h);
            });
            m.lineTo(W, GROUND_Y);
            m.closePath();
            m.fillPath();
          };
          mtn(0x5a4a8a, 0.75, 440, [90, 190, 110, 230, 120, 170, 100, 210, 80]);
          mtn(0x2f3b66, 0.95, 470, [40, 110, 60, 140, 50, 120, 70, 100, 45]);

          // 땅
          const ground = this.add.graphics().setDepth(4);
          ground.fillStyle(0x2a5d34, 1).fillRect(0, GROUND_Y, W, H - GROUND_Y);
          ground.fillStyle(0x3f8a4b, 1).fillRect(0, GROUND_Y, W, 10);
          ground.fillStyle(0x1d4126, 1).fillRect(0, GROUND_Y + 34, W, H);
          for (let x = 0; x < W; x += 14) {
            ground.fillStyle(0x4aa05a, 1).fillTriangle(x, GROUND_Y, x + 5, GROUND_Y - 9 - (x % 5), x + 10, GROUND_Y);
          }

          // 궁수 플랫폼
          const plat = this.add.graphics().setDepth(5);
          plat.fillStyle(0x5b3a1e, 1).fillRect(BOW_X - 42, BOW_Y + 38, 84, GROUND_Y - BOW_Y - 38);
          plat.fillStyle(0x8a5a2b, 1).fillRoundedRect(BOW_X - 54, BOW_Y + 30, 108, 14, 5);
          plat.lineStyle(2, 0x3a2410, 1).strokeRoundedRect(BOW_X - 54, BOW_Y + 30, 108, 14, 5);
        }

        buildHud() {
          this.panelGfx = this.add.graphics().setDepth(40);
          this.panelGfx.fillStyle(0x0b1230, 0.72).fillRoundedRect(170, 14, 620, 92, 18);
          this.panelGfx.lineStyle(2, 0xffd166, 0.9).strokeRoundedRect(170, 14, 620, 92, 18);

          const font = "system-ui, -apple-system, 'Segoe UI', sans-serif";
          this.hud = {
            q: this.add.text(190, 22, "", { fontFamily: font, fontSize: "14px", color: "#ffd166", fontStyle: "bold" }).setDepth(41),
            def: this.add
              .text(480, 66, "", {
                fontFamily: font,
                fontSize: "21px",
                color: "#ffffff",
                align: "center",
                wordWrap: { width: 580 },
              })
              .setOrigin(0.5)
              .setDepth(41),
            score: this.add.text(24, 20, "", { fontFamily: font, fontSize: "26px", color: "#fff", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 5 }).setDepth(41),
            combo: this.add.text(24, 56, "", { fontFamily: font, fontSize: "20px", color: "#ffb703", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 4 }).setDepth(41),
            arrows: this.add.text(W - 24, 22, "", { fontFamily: font, fontSize: "24px", color: "#fff", stroke: "#0b1230", strokeThickness: 5 }).setOrigin(1, 0).setDepth(41),
          };
          this.setHudVisible(false);
        }

        setHudVisible(v: boolean) {
          this.panelGfx.setVisible(v);
          Object.values(this.hud).forEach((t) => t.setVisible(v));
        }

        refreshHud() {
          const q = this.order[this.qIndex];
          this.hud.q.setText(`WORD ${this.qIndex + 1} / ${this.order.length}`);
          this.hud.def.setText(q ? q.prompt : "");
          this.hud.score.setText(`${this.score}`);
          this.hud.combo.setText(this.combo > 1 ? `COMBO x${this.combo}` : "");
          this.hud.arrows.setText("ARROWS  " + "●".repeat(this.arrowsLeft) + "○".repeat(MAX_ARROWS - this.arrowsLeft));
        }

        // ---------- 흐름 ----------
        showStart() {
          this.state = "start";
          this.setHudVisible(false);
          this.clearOverlay();
          const font = "system-ui, -apple-system, 'Segoe UI', sans-serif";
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.6);
          const title = this.add.text(W / 2, 190, "VOCABULARY ARCHERY", { fontFamily: font, fontSize: "56px", color: "#ffd166", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5);
          const sub = this.add.text(W / 2, 262, `${titleSub ?? "맞는 과녁을 쏘세요"}\nHold to charge · Release to shoot`, { fontFamily: font, fontSize: "22px", color: "#fff", align: "center", lineSpacing: 8 }).setOrigin(0.5);
          const go = this.add.text(W / 2, 360, "▶  CLICK / TAP TO START", { fontFamily: font, fontSize: "28px", color: "#0b1230", backgroundColor: "#ffd166", padding: { x: 24, y: 12 }, fontStyle: "bold" }).setOrigin(0.5);
          this.tweens.add({ targets: go, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
          this.overlay = this.add.container(0, 0, [dim, title, sub, go]).setDepth(100);
        }

        clearOverlay() {
          this.overlay?.destroy();
          this.overlay = null;
        }

        startGame() {
          this.clearOverlay();
          this.order = [...questions];
          this.qIndex = 0;
          this.score = 0;
          this.combo = 0;
          this.correctCount = 0;
          this.setHudVisible(true);
          this.loadQuestion();
        }

        loadQuestion() {
          this.targets.forEach((t) => t.c.destroy());
          this.targets = [];
          this.arrow?.c.destroy();
          this.arrow = null;
          this.arrowsLeft = MAX_ARROWS;
          const q = this.order[this.qIndex];
          const choices = Phaser.Utils.Array.Shuffle([...q.choices]);
          this.qDone = false;
          const xs = [430, 580, 730, 880];
          const fallCols = Phaser.Utils.Array.Shuffle([150, 340, 620, 810]); // 활(가운데) 양옆
          const ys = Phaser.Utils.Array.Shuffle([170, 250, 330, 215]);
          choices.slice(0, 4).forEach((word, i) => {
            let sx = xs[i];
            let sy = ys[i];
            if (motion === "fall") {
              sx = fallCols[i];
              sy = -70 - Math.random() * 230;
            } else if (motion === "fly") {
              sx = 620 + i * 190;
            }
            const t = this.makeTarget(word, word === q.answer, sx, sy);
            t.x0 = sx;
            if (motion === "fall") t.vy = Phaser.Math.Between(48, 70);
            if (motion === "fly") {
              t.vx = -Phaser.Math.Between(70, 95);
              t.baseY = ys[i];
              t.c.y = ys[i];
            }
            t.c.setAlpha(0).setScale(0.3);
            this.tweens.add({ targets: t.c, alpha: 1, scale: 1, duration: 450, delay: i * 90, ease: "Back.out" });
            this.targets.push(t);
          });
          this.refreshHud();
          this.state = "ready";
        }

        makeTarget(word: string, correct: boolean, x: number, y: number): Target {
          const r = 54;
          const g = this.add.graphics();
          if (motion === "hang") {
            g.lineStyle(3, 0x6b4a2a, 1).lineBetween(0, -r, 0, -700);
          } else if (motion === "fall") {
            // 낙하산
            g.fillStyle(0xfff3c4, 1).fillEllipse(0, -r - 48, 120, 60);
            g.fillStyle(0xe63946, 1).fillEllipse(0, -r - 48, 40, 60);
            g.lineStyle(2, 0xffffff, 0.9);
            [-56, -20, 20, 56].forEach((x) => g.lineBetween(x, -r - 40, x * 0.35, -r * 0.7));
          } else {
            // 날개
            g.fillStyle(0xffffff, 0.95);
            g.fillTriangle(-r + 6, -6, -r - 44, -34, -r - 6, 14);
            g.fillTriangle(r - 6, -6, r + 44, -34, r + 6, 14);
            g.lineStyle(2, 0x9fb4d6, 1);
            g.lineBetween(-r + 6, -6, -r - 44, -34);
            g.lineBetween(r - 6, -6, r + 44, -34);
          }
          // 그림자 링
          g.fillStyle(0x000000, 0.25).fillCircle(4, 5, r + 3);
          // 과녁 링
          const rings: [number, number][] = [
            [r + 3, 0x3a2410],
            [r, 0xe63946],
            [r * 0.78, 0xffffff],
            [r * 0.56, 0xe63946],
            [r * 0.34, 0xffffff],
          ];
          rings.forEach(([rad, col]) => g.fillStyle(col, 1).fillCircle(0, 0, rad));
          // 단어 플라크
          const label = this.add.text(0, 0, word, { fontFamily: "system-ui, 'Segoe UI', sans-serif", fontSize: "19px", color: "#10172e", fontStyle: "bold" }).setOrigin(0.5);
          const maxW = 100;
          if (label.width > maxW) label.setScale(maxW / label.width);
          const pw = Math.max(70, label.width * label.scaleX + 22);
          const plate = this.add.graphics();
          plate.fillStyle(0xfff3c4, 1).fillRoundedRect(-pw / 2, -15, pw, 30, 8);
          plate.lineStyle(2, 0x3a2410, 1).strokeRoundedRect(-pw / 2, -15, pw, 30, 8);
          const c = this.add.container(x, y, [g, plate, label]).setDepth(10);
          return {
            c,
            baseY: y,
            phase: Math.random() * Math.PI * 2,
            speed: Phaser.Math.FloatBetween(0.8, 1.5),
            amp: Phaser.Math.Between(18, 42),
            r,
            vx: 0,
            vy: 0,
            x0: x,
            word,
            correct,
            dead: false,
          };
        }

        // ---------- 입력 ----------
        updateAim(p: Phaser.Input.Pointer) {
          if (this.state !== "ready" && this.state !== "charging") return;
          const a = Math.atan2(p.y - BOW_Y, p.x - BOW_X);
          if (motion === "fall") {
            // 위쪽 전체(좌우 수평 근처까지)로 조준
            let b = a;
            if (b > -0.2) b = b <= Math.PI / 2 ? -0.2 : -Math.PI + 0.2;
            this.aim = Phaser.Math.Clamp(b, -Math.PI + 0.2, -0.2);
          } else {
            this.aim = Phaser.Math.Clamp(a, -1.25, 0.25);
          }
        }

        onDown(p: Phaser.Input.Pointer) {
          if (this.state === "start") {
            this.startGame();
            return;
          }
          if (this.state === "done") {
            this.showStart();
            return;
          }
          if (this.state !== "ready") return;
          this.updateAim(p);
          this.state = "charging";
          this.chargeStart = this.time.now;
        }

        onUp() {
          if (this.state !== "charging") return;
          const power = this.charge;
          if (power < 0.12) {
            this.state = "ready";
            return;
          }
          this.fire(power);
        }

        fire(power: number) {
          const speed = 320 + power * 780;
          const vx = Math.cos(this.aim) * speed;
          const vy = Math.sin(this.aim) * speed;
          const tipX = BOW_X + Math.cos(this.aim) * 40;
          const tipY = BOW_Y + Math.sin(this.aim) * 40;
          this.arrowsLeft--;
          this.refreshHud();

          const gfx = this.add.graphics();
          gfx.lineStyle(4, 0xd9b382, 1).lineBetween(-52, 0, 0, 0);
          gfx.fillStyle(0xcfd8dc, 1).fillTriangle(0, 0, -12, -6, -12, 6);
          gfx.fillStyle(0xe63946, 1).fillTriangle(-52, 0, -64, -7, -46, 0).fillTriangle(-52, 0, -64, 7, -46, 0);
          const c = this.add.container(tipX, tipY, [gfx]).setDepth(25).setRotation(this.aim);
          this.arrow = { c, vx, vy };
          this.state = "flying";
          this.charge = 0;
          this.cameras.main.shake(90, 0.003);
          this.puff(BOW_X + Math.cos(this.aim) * 30, BOW_Y + Math.sin(this.aim) * 30, 0xffffff, 8);
        }

        // ---------- 업데이트 ----------
        update(time: number, delta: number) {
          const dt = Math.min(delta, 33) / 1000;

          // 구름 이동
          this.clouds.forEach((c, i) => {
            c.x -= (6 + i * 3) * dt;
            if (c.x < -150) c.x = W + 150;
          });

          // 과녁 흔들림
          const sec = time / 1000;
          this.targets.forEach((t) => {
            if (t.dead) return;
            if (motion === "hang") {
              t.c.y = t.baseY + Math.sin(sec * t.speed + t.phase) * t.amp;
              t.c.rotation = Math.sin(sec * t.speed * 0.7 + t.phase) * 0.06;
            } else if (motion === "fall") {
              t.c.y += t.vy * dt;
              t.c.x = t.x0 + Math.sin(sec * t.speed + t.phase) * 14;
              t.c.rotation = Math.sin(sec * t.speed + t.phase) * 0.08;
            } else {
              t.c.x += t.vx * dt;
              t.c.y = t.baseY + Math.sin(sec * t.speed + t.phase) * t.amp * 0.6;
              t.c.rotation = 0;
            }
          });
          this.checkEscapes();

          // 충전
          if (this.state === "charging") {
            const k = ((time - this.chargeStart) / 1000) * 0.95;
            this.charge = k % 2 < 1 ? k % 1 : 1 - (k % 1); // 핑퐁
          } else if (this.state !== "flying") {
            this.charge = 0;
          }

          this.drawBow();

          // 비행
          if (this.state === "flying" && this.arrow && !this.arrow.stuck) this.stepArrow(dt);

          // 박힌 화살은 과녁 따라감
          if (this.arrow?.stuck) {
            const s = this.arrow.stuck;
            this.arrow.c.setPosition(s.t.c.x + s.ox, s.t.c.y + s.oy);
          }
        }

        // 떨어지거나 날아가 버린 과녁 처리 (정답이면 실패)
        checkEscapes() {
          if (motion === "hang" || this.qDone) return;
          if (this.state === "start" || this.state === "done") return;
          for (const t of this.targets) {
            if (t.dead) continue;
            const gone = motion === "fall" ? t.c.y > GROUND_Y - 18 : t.c.x < -t.r - 50;
            if (!gone) continue;
            t.dead = true;
            if (t.correct) {
              this.onLost(t);
              return;
            }
            if (motion === "fall") this.puff(t.c.x, GROUND_Y, 0xc9a66b, 10);
            this.tweens.add({ targets: t.c, alpha: 0, duration: 250 });
          }
        }

        onLost(t: Target) {
          this.qDone = true;
          this.state = "resolving";
          this.combo = 0;
          this.arrow?.c.destroy();
          this.arrow = null;
          this.targets.forEach((o) => (o.dead = true));
          if (motion === "fall") this.puff(t.c.x, GROUND_Y, 0xc9a66b, 16);
          this.cameras.main.shake(220, 0.008);
          this.floatText(W / 2, 170, "TOO LATE", "#ff6b6b", 38);
          this.floatText(W / 2, 220, `ANSWER: ${t.word}`, "#4ade80", 30);
          this.refreshHud();
          this.time.delayedCall(1500, () => this.nextQuestion());
        }

        drawBow() {
          const g = this.bow;
          g.clear();
          g.setPosition(BOW_X, BOW_Y).setRotation(this.aim);
          const pull = this.state === "charging" ? this.charge : 0;
          const R = 58;
          // 활 몸체
          g.lineStyle(7, 0x8a4b1f, 1);
          g.beginPath();
          g.arc(0, 0, R, -1.05, 1.05, false);
          g.strokePath();
          g.lineStyle(3, 0xffd166, 1);
          g.beginPath();
          g.arc(0, 0, R, -1.05, 1.05, false);
          g.strokePath();
          const ty = Math.sin(1.05) * R;
          const tx = Math.cos(1.05) * R;
          const nock = -pull * 34;
          g.lineStyle(2, 0xffffff, 0.95);
          g.lineBetween(tx, -ty, nock, 0);
          g.lineBetween(tx, ty, nock, 0);
          // 장전된 화살
          if (this.state === "ready" || this.state === "charging") {
            g.lineStyle(4, 0xd9b382, 1).lineBetween(nock, 0, nock + 70, 0);
            g.fillStyle(0xcfd8dc, 1).fillTriangle(nock + 82, 0, nock + 70, -6, nock + 70, 6);
          }

          // 궤적 미리보기
          const d = this.aimDots;
          d.clear();
          if (this.state === "charging") {
            const speed = 320 + this.charge * 780;
            let x = BOW_X + Math.cos(this.aim) * 40;
            let y = BOW_Y + Math.sin(this.aim) * 40;
            let vx = Math.cos(this.aim) * speed;
            let vy = Math.sin(this.aim) * speed;
            for (let i = 0; i < 26; i++) {
              for (let s = 0; s < 3; s++) {
                x += vx * 0.016;
                y += vy * 0.016;
                vy += GRAVITY * 0.016;
              }
              d.fillStyle(0xffffff, 0.8 - i * 0.03).fillCircle(x, y, 3.2 - i * 0.07);
            }
          }

          // 파워 바
          const b = this.powerBar;
          b.clear();
          if (this.state === "charging") {
            b.fillStyle(0x000000, 0.5).fillRoundedRect(BOW_X - 70, BOW_Y + 62, 140, 14, 7);
            const col = this.charge < 0.5 ? 0x4ade80 : this.charge < 0.8 ? 0xfacc15 : 0xef4444;
            b.fillStyle(col, 1).fillRoundedRect(BOW_X - 68, BOW_Y + 64, 136 * this.charge, 10, 5);
          }
        }

        stepArrow(dt: number) {
          const a = this.arrow!;
          const steps = 3;
          for (let s = 0; s < steps; s++) {
            const h = dt / steps;
            a.c.x += a.vx * h;
            a.c.y += a.vy * h;
            a.vy += GRAVITY * h;
            a.c.rotation = Math.atan2(a.vy, a.vx);

            // 과녁 충돌
            for (const t of this.targets) {
              if (t.dead) continue;
              const dx = a.c.x - t.c.x;
              const dy = a.c.y - t.c.y;
              if (dx * dx + dy * dy <= t.r * t.r) {
                this.onHit(t, dx, dy);
                return;
              }
            }
            // 땅/화면 밖
            if (a.c.y >= GROUND_Y - 4 || a.c.x > W + 80 || a.c.x < -80) {
              this.onMiss();
              return;
            }
          }
          // 꼬리 효과
          const trail = this.add.image(a.c.x, a.c.y, "spark").setScale(0.35).setTint(0xfff1b8).setAlpha(0.7).setDepth(24);
          this.tweens.add({ targets: trail, alpha: 0, scale: 0.05, duration: 350, onComplete: () => trail.destroy() });
        }

        onHit(t: Target, dx: number, dy: number) {
          const a = this.arrow!;
          a.stuck = { t, ox: dx + t.c.x - t.c.x, oy: dy };
          a.stuck.ox = dx;
          a.vx = a.vy = 0;
          this.state = "resolving";
          const wx = t.c.x;
          const wy = t.c.y;
          this.cameras.main.shake(t.correct ? 160 : 260, t.correct ? 0.006 : 0.012);

          if (t.correct) {
            this.qDone = true;
            this.correctCount++;
            this.combo++;
            const gain = 100 + (this.combo - 1) * 25 + this.arrowsLeft * 20;
            this.score += gain;
            this.burst(wx, wy, [0xffd166, 0xfff3b0, 0xffffff, 0x4ade80], 40, true);
            this.ring(wx, wy, 0x4ade80);
            this.cameras.main.flash(180, 255, 244, 170);
            this.floatText(wx, wy - 80, `+${gain}`, "#ffd166", 40);
            if (this.combo > 1) this.floatText(wx, wy - 120, `COMBO x${this.combo}!`, "#ff9f1c", 28);
            this.tweens.add({ targets: t.c, scale: 1.25, duration: 220, yoyo: true, ease: "Back.out" });
            // 나머지 과녁은 낙하
            this.targets.forEach((o) => {
              if (o === t) return;
              o.dead = true;
              this.tweens.add({ targets: o.c, y: o.c.y + 700, angle: Phaser.Math.Between(-40, 40), alpha: 0, duration: 800, ease: "Quad.in" });
            });
            this.refreshHud();
            this.time.delayedCall(1300, () => this.nextQuestion());
          } else {
            this.combo = 0;
            t.dead = true;
            this.burst(wx, wy, [0xef4444, 0x7f1d1d, 0xffffff], 26, false);
            this.cameras.main.flash(200, 255, 80, 80);
            this.floatText(wx, wy - 80, "WRONG", "#ff6b6b", 34);
            this.tweens.add({ targets: t.c, y: t.c.y + 40, angle: 18, alpha: 0.35, duration: 450, ease: "Quad.in" });
            // 박힌 화살도 같이 사라지게
            this.tweens.add({ targets: a.c, alpha: 0, duration: 450, delay: 150 });
            this.afterAttempt();
          }
        }

        onMiss() {
          const a = this.arrow!;
          this.state = "resolving";
          this.combo = 0;
          this.puff(a.c.x, Math.min(a.c.y, GROUND_Y), 0xc9a66b, 14);
          this.floatText(Phaser.Math.Clamp(a.c.x, 60, W - 60), GROUND_Y - 50, "MISS", "#cbd5e1", 30);
          this.cameras.main.shake(100, 0.004);
          this.tweens.add({ targets: a.c, alpha: 0, duration: 500, delay: 200 });
          this.afterAttempt();
        }

        afterAttempt() {
          this.refreshHud();
          if (this.qDone) return;
          const alive = this.targets.some((t) => !t.dead);
          if (this.arrowsLeft > 0 && alive) {
            this.time.delayedCall(650, () => {
              if (this.qDone) return;
              this.arrow?.c.destroy();
              this.arrow = null;
              this.state = "ready";
            });
          } else {
            this.qDone = true;
            this.targets.forEach((t) => {
              if (!t.correct) t.dead = true;
            });
            const rt = this.targets.find((t) => t.correct);
            if (rt) rt.dead = true;
            // 화살 소진 → 정답 공개
            const right = this.targets.find((t) => t.correct);
            if (right) {
              this.ring(right.c.x, right.c.y, 0x4ade80);
              this.floatText(right.c.x, right.c.y - 80, "ANSWER", "#4ade80", 30);
              this.tweens.add({ targets: right.c, scale: 1.2, duration: 300, yoyo: true, repeat: 2 });
            }
            this.time.delayedCall(1700, () => this.nextQuestion());
          }
        }

        nextQuestion() {
          this.qIndex++;
          if (this.qIndex >= this.order.length) this.showResult();
          else this.loadQuestion();
        }

        showResult() {
          this.state = "done";
          this.targets.forEach((t) => t.c.destroy());
          this.targets = [];
          this.arrow?.c.destroy();
          this.arrow = null;
          this.setHudVisible(false);
          this.bow.clear();
          const font = "system-ui, -apple-system, 'Segoe UI', sans-serif";
          const total = this.order.length;
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.7);
          const t1 = this.add.text(W / 2, 150, "RESULT", { fontFamily: font, fontSize: "54px", color: "#ffd166", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5);
          const t2 = this.add.text(W / 2, 240, `${this.score}`, { fontFamily: font, fontSize: "84px", color: "#fff", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5);
          const t3 = this.add.text(W / 2, 312, `Correct  ${this.correctCount} / ${total}`, { fontFamily: font, fontSize: "28px", color: "#fff" }).setOrigin(0.5);
          const t4 = this.add.text(W / 2, 392, "↻  CLICK TO PLAY AGAIN", { fontFamily: font, fontSize: "24px", color: "#0b1230", backgroundColor: "#ffd166", padding: { x: 20, y: 10 }, fontStyle: "bold" }).setOrigin(0.5);
          this.tweens.add({ targets: t2, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: "Sine.inOut" });
          this.overlay = this.add.container(0, 0, [dim, t1, t2, t3, t4]).setDepth(100);
          this.burst(W / 2, 240, [0xffd166, 0xffffff, 0xff9f1c], 60, true);
          finishRef.current?.({ score: this.score, correct: this.correctCount, total });
        }

        // ---------- 이펙트 ----------
        burst(x: number, y: number, tints: number[], qty: number, stars: boolean) {
          const em = this.add.particles(x, y, stars ? "star" : "spark", {
            speed: { min: 120, max: 460 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 500, max: 1000 },
            scale: { start: stars ? 1.1 : 0.7, end: 0 },
            gravityY: 520,
            rotate: { min: 0, max: 360 },
            tint: tints,
            blendMode: "ADD",
            emitting: false,
          });
          em.setDepth(50);
          em.explode(qty);
          this.time.delayedCall(1300, () => em.destroy());
        }

        puff(x: number, y: number, tint: number, qty: number) {
          const em = this.add.particles(x, y, "spark", {
            speed: { min: 30, max: 160 },
            angle: { min: 180, max: 360 },
            lifespan: 600,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint,
            emitting: false,
          });
          em.setDepth(50);
          em.explode(qty);
          this.time.delayedCall(900, () => em.destroy());
        }

        ring(x: number, y: number, color: number) {
          const r = this.add.graphics().setDepth(45);
          r.lineStyle(6, color, 1).strokeCircle(0, 0, 40);
          r.setPosition(x, y);
          this.tweens.add({ targets: r, scale: 3.2, alpha: 0, duration: 650, ease: "Quad.out", onComplete: () => r.destroy() });
        }

        floatText(x: number, y: number, text: string, color: string, size: number) {
          const t = this.add
            .text(x, y, text, { fontFamily: "system-ui, 'Segoe UI', sans-serif", fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6 })
            .setOrigin(0.5)
            .setDepth(60)
            .setScale(0.4);
          this.tweens.add({ targets: t, scale: 1, duration: 200, ease: "Back.out" });
          this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1100, delay: 250, ease: "Quad.out", onComplete: () => t.destroy() });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: W,
        height: H,
        backgroundColor: "#0b1230",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: ArcheryScene,
        input: { touch: { capture: true } },
      });
      if (process.env.NODE_ENV !== "production") (window as unknown as { __archeryGame?: Phaser.Game }).__archeryGame = game;
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
      game = null;
    };
    // questions는 마운트 시 1회만 사용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="w-full max-w-5xl mx-auto aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl touch-none select-none" />;
}
