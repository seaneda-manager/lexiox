"use client";

import { useEffect, useRef } from "react";
import type { ArcheryQuestion } from "./ArcheryPhaser";

/**
 * 클레이 사격: 좌우 트랩에서 단어가 붙은 접시가 날아오른다. 뜻에 맞는 단어의 접시만 쏜다.
 *  - 마우스/터치한 곳이 조준점. 클릭(탭)하면 발사. 장전 2발, 다 쓰면 잠깐 재장전.
 *  - 정답 접시 명중 +100 (+콤보), 오답 접시 명중 -50, 정답 접시를 땅에 떨어뜨리면 목숨 -1 (3개).
 */
type Props = {
  questions: ArcheryQuestion[];
  onFinish?: (r: { score: number; correct: number; total: number }) => void;
};

const W = 960;
const H = 540;
const GROUND = 468;
const GRAV = 520;
const SHELLS = 2;
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export default function ClayGame({ questions, onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;

      type Clay = {
        c: Phaser.GameObjects.Container;
        disc: Phaser.GameObjects.Image;
        word: string;
        correct: boolean;
        vx: number;
        vy: number;
        dead: boolean;
      };

      class ClayScene extends Phaser.Scene {
        state: "start" | "play" | "between" | "done" = "start";
        order: ArcheryQuestion[] = [];
        qi = 0;
        score = 0;
        combo = 0;
        lives = 3;
        correctCount = 0;
        shells = SHELLS;
        reloading = false;
        qDone = false;
        clays: Clay[] = [];
        resolved = 0;
        launched = 0;
        total = 0;
        cross!: Phaser.GameObjects.Image;
        hud!: Record<"prompt" | "gate" | "score" | "combo" | "lives" | "shells", Phaser.GameObjects.Text>;
        panel!: Phaser.GameObjects.Rectangle;
        overlay: Phaser.GameObjects.Container | null = null;

        constructor() {
          super("clay");
        }

        create() {
          this.state = "start";
          this.clays = [];
          this.makeTextures();
          this.buildScene();
          this.cross = this.add.image(W / 2, H / 2, "cross").setDepth(60);
          this.input.setDefaultCursor("none");
          this.buildHud();
          this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.cross.setPosition(p.x, p.y));
          this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onDown(p));
          this.input.keyboard!.on("keydown-SPACE", () => this.onAnyStart());
          this.input.keyboard!.on("keydown-ENTER", () => this.onAnyStart());
          this.showStart();
        }

        makeTextures() {
          const g = this.make.graphics({ x: 0, y: 0 }, false);
          g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
          g.generateTexture("spark", 16, 16);
          g.clear();
          // 접시
          g.fillStyle(0xea580c, 1).fillEllipse(34, 20, 64, 20);
          g.fillStyle(0xf97316, 1).fillEllipse(34, 17, 60, 16);
          g.fillStyle(0xfdba74, 1).fillEllipse(34, 14, 36, 8);
          g.generateTexture("disc", 68, 34);
          g.clear();
          // 조준선
          g.lineStyle(3, 0xffffff, 0.95).strokeCircle(26, 26, 18);
          g.lineStyle(2, 0xef4444, 1).strokeCircle(26, 26, 3);
          g.lineStyle(3, 0xffffff, 0.95);
          g.lineBetween(26, 2, 26, 14).lineBetween(26, 38, 26, 50).lineBetween(2, 26, 14, 26).lineBetween(38, 26, 50, 26);
          g.generateTexture("cross", 52, 52);
          g.destroy();
        }

        buildScene() {
          if (this.textures.exists("clay-sky")) this.textures.remove("clay-sky");
          const sky = this.textures.createCanvas("clay-sky", W, H)!;
          const ctx = sky.getContext();
          const gr = ctx.createLinearGradient(0, 0, 0, H);
          gr.addColorStop(0, "#1e3a8a");
          gr.addColorStop(0.5, "#60a5fa");
          gr.addColorStop(0.78, "#fde68a");
          gr.addColorStop(1, "#fdba74");
          ctx.fillStyle = gr;
          ctx.fillRect(0, 0, W, H);
          // 구름
          for (let i = 0; i < 9; i++) {
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            const x = Math.random() * W;
            const y = 60 + Math.random() * 220;
            for (let k = 0; k < 5; k++) {
              ctx.beginPath();
              ctx.ellipse(x + k * 22, y + (k % 2) * 6, 34, 16, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          // 먼 산
          ctx.fillStyle = "#4b5d86";
          ctx.beginPath(); ctx.moveTo(0, GROUND);
          [[0, 70], [120, 130], [260, 80], [420, 150], [560, 90], [720, 140], [860, 85], [960, 120]].forEach(([x, h]) => ctx.lineTo(x, GROUND - h));
          ctx.lineTo(W, GROUND); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#2f5d3a";
          ctx.beginPath(); ctx.moveTo(0, GROUND);
          [[0, 30], [200, 56], [380, 34], [620, 60], [800, 38], [960, 50]].forEach(([x, h]) => ctx.lineTo(x, GROUND - h));
          ctx.lineTo(W, GROUND); ctx.closePath(); ctx.fill();
          // 들판
          ctx.fillStyle = "#3f8a4b";
          ctx.fillRect(0, GROUND, W, H - GROUND);
          ctx.fillStyle = "#2f7a3b";
          for (let x = 0; x < W; x += 60) ctx.fillRect(x, GROUND, 30, H - GROUND);
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          ctx.fillRect(0, GROUND, W, 5);
          // 트랩 하우스
          const trap = (x: number) => {
            ctx.fillStyle = "#44403c"; ctx.fillRect(x - 36, GROUND - 26, 72, 30);
            ctx.fillStyle = "#78716c"; ctx.fillRect(x - 40, GROUND - 32, 80, 10);
            ctx.fillStyle = "#1c1917"; ctx.fillRect(x - 18, GROUND - 22, 36, 14);
          };
          trap(60);
          trap(W - 60);
          sky.refresh();
          this.add.image(0, 0, "clay-sky").setOrigin(0).setDepth(0);
        }

        buildHud() {
          const t = (x: number, y: number, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(x, y, "", { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 4, ...extra }).setDepth(50);
          this.panel = this.add.rectangle(W / 2, 40, 560, 58, 0x0b1230, 0.78).setDepth(49).setStrokeStyle(2, 0xffd166, 0.9);
          this.hud = {
            prompt: this.add.text(W / 2, 38, "", { fontFamily: FONT, fontSize: "19px", color: "#fff", align: "center", wordWrap: { width: 530 } }).setOrigin(0.5).setDepth(51),
            gate: t(W / 2, 70, 12, "#ffd166", { strokeThickness: 3 }).setOrigin(0.5, 0),
            score: t(18, 12, 30, "#fff"),
            combo: t(18, 50, 19, "#ffb703"),
            lives: t(W - 18, 12, 28, "#ff5d6c").setOrigin(1, 0),
            shells: t(W - 18, 50, 22, "#fde68a").setOrigin(1, 0),
          };
          this.setHud(false);
        }

        setHud(v: boolean) {
          this.panel.setVisible(v);
          Object.values(this.hud).forEach((o) => o.setVisible(v));
        }

        refreshHud() {
          this.hud.score.setText(`${this.score}`);
          this.hud.combo.setText(this.combo > 1 ? `COMBO x${this.combo}` : "");
          this.hud.lives.setText("♥".repeat(this.lives));
          this.hud.shells.setText(this.reloading ? "RELOAD..." : "▮".repeat(this.shells) + "▯".repeat(SHELLS - this.shells));
        }

        // ---------- 흐름 ----------
        showStart() {
          this.state = "start";
          this.setHud(false);
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.55).setDepth(90);
          const title = this.add.text(W / 2, 150, "CLAY SHOOTING", { fontFamily: FONT, fontSize: "62px", color: "#fdba74", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5).setDepth(91);
          const sub = this.add
            .text(W / 2, 290, "뜻에 맞는 단어의 접시만 쏘세요!\n오답 접시를 쏘면 -50 · 정답 접시를 놓치면 목숨 -1\n\n마우스/터치로 조준 · 클릭(탭)으로 발사 · 장전 2발", { fontFamily: FONT, fontSize: "21px", color: "#fff", align: "center", lineSpacing: 8 })
            .setOrigin(0.5)
            .setDepth(91);
          const go = this.add.text(W / 2, 410, "▶  CLICK TO START", { fontFamily: FONT, fontSize: "28px", color: "#0b1230", backgroundColor: "#fdba74", padding: { x: 24, y: 12 }, fontStyle: "bold" }).setOrigin(0.5).setDepth(91);
          this.tweens.add({ targets: go, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
          this.overlay = this.add.container(0, 0, [dim, title, sub, go]).setDepth(90);
        }

        onAnyStart() {
          if (this.state === "start") this.startGame();
          else if (this.state === "done") this.scene.restart();
        }

        startGame() {
          this.overlay?.destroy();
          this.overlay = null;
          this.order = [...questions];
          this.qi = 0;
          this.score = 0;
          this.combo = 0;
          this.lives = 3;
          this.correctCount = 0;
          this.shells = SHELLS;
          this.reloading = false;
          this.setHud(true);
          this.loadRound();
        }

        loadRound() {
          this.clays.forEach((c) => c.c.destroy());
          this.clays = [];
          this.qDone = false;
          this.resolved = 0;
          const q = this.order[this.qi];
          const words = Phaser.Utils.Array.Shuffle([...q.choices]).slice(0, 4);
          this.total = words.length;
          this.hud.prompt.setText(q.prompt);
          this.hud.gate.setText(`ROUND ${this.qi + 1} / ${this.order.length}`);
          this.refreshHud();
          this.state = "play";
          words.forEach((w, i) => {
            this.time.delayedCall(700 + i * 520, () => {
              if (this.state === "play") this.launch(w, w === q.answer, i % 2 === 0 ? -1 : 1);
            });
          });
        }

        launch(word: string, correct: boolean, side: -1 | 1) {
          const sx = side === -1 ? 70 : W - 70;
          const disc = this.add.image(0, 0, "disc");
          const label = this.add
            .text(0, 30, word, { fontFamily: FONT, fontSize: "17px", color: "#10172e", fontStyle: "bold", backgroundColor: "#fff3c4", padding: { x: 8, y: 3 } })
            .setOrigin(0.5);
          if (label.width > 150) label.setScale(150 / label.width);
          const c = this.add.container(sx, GROUND - 24, [disc, label]).setDepth(20);
          this.clays.push({
            c,
            disc,
            word,
            correct,
            vx: (side === -1 ? 1 : -1) * Phaser.Math.Between(190, 330),
            vy: -Phaser.Math.Between(430, 560),
            dead: false,
          });
          this.puff(sx, GROUND - 20, 0xe7e5e4, 6);
          this.tweens.add({ targets: disc, rotation: Math.PI * 4 * side, duration: 2600 });
        }

        // ---------- 입력 / 발사 ----------
        onDown(p: Phaser.Input.Pointer) {
          if (this.state === "start" || this.state === "done") return this.onAnyStart();
          if (this.state !== "play" || this.reloading || this.shells <= 0) return;
          this.shells--;
          // 총구 반동 + 섬광
          this.cameras.main.shake(70, 0.003);
          const flash = this.add.circle(p.x, p.y, 30, 0xfff3b0, 0.7).setDepth(55);
          this.tweens.add({ targets: flash, scale: 0.2, alpha: 0, duration: 140, onComplete: () => flash.destroy() });
          this.tweens.add({ targets: this.cross, y: p.y - 14, duration: 60, yoyo: true });

          // 산탄: 조준점 근처의 가장 가까운 접시를 맞힌다
          let hit: Clay | null = null;
          let best = 54;
          for (const cl of this.clays) {
            if (cl.dead) continue;
            const d = Math.hypot(cl.c.x - p.x, cl.c.y - p.y);
            if (d < best) {
              best = d;
              hit = cl;
            }
          }
          if (hit) this.onHit(hit);
          else this.puff(p.x, p.y, 0xffffff, 5);

          if (this.shells <= 0) {
            this.reloading = true;
            this.floatText(W - 90, 96, "RELOAD", "#fde68a", 20);
            this.time.delayedCall(900, () => {
              this.shells = SHELLS;
              this.reloading = false;
              this.refreshHud();
            });
          }
          this.refreshHud();
        }

        onHit(cl: Clay) {
          cl.dead = true;
          const x = cl.c.x;
          const y = cl.c.y;
          this.burst(x, y, cl.correct ? [0xf97316, 0xfdba74, 0xffffff, 0xffd166] : [0xef4444, 0x7f1d1d, 0xffffff], cl.correct ? 34 : 20);
          cl.c.destroy();
          this.resolved++;
          if (cl.correct) {
            this.correctCount++;
            this.combo++;
            const gain = 100 + (this.combo - 1) * 20;
            this.score += gain;
            this.floatText(x, y - 20, `+${gain}`, "#ffd166", 34);
            if (this.combo > 1) this.floatText(x, y - 56, `COMBO x${this.combo}`, "#ff9f1c", 22);
            this.cameras.main.flash(120, 255, 235, 180);
            this.endRound(true, 1100);
          } else {
            this.combo = 0;
            this.score = Math.max(0, this.score - 50);
            this.floatText(x, y - 20, "WRONG -50", "#ff6b6b", 26);
            this.cameras.main.shake(180, 0.008);
          }
          this.refreshHud();
        }

        endRound(ok: boolean, delay: number) {
          if (this.qDone) return;
          this.qDone = true;
          this.state = "between";
          if (!ok) {
            this.lives--;
            this.combo = 0;
            this.cameras.main.shake(240, 0.01);
          }
          this.refreshHud();
          this.time.delayedCall(delay, () => {
            if (this.state === "done") return;
            if (this.lives <= 0) return this.showResult();
            this.qi++;
            if (this.qi >= this.order.length) this.showResult();
            else this.loadRound();
          });
        }

        // ---------- 업데이트 ----------
        update(_t: number, delta: number) {
          const dt = Math.min(delta, 33) / 1000;
          for (const cl of [...this.clays]) {
            if (cl.dead) continue;
            cl.vy += GRAV * dt;
            cl.c.x += cl.vx * dt;
            cl.c.y += cl.vy * dt;
            if (cl.c.y > GROUND - 6 && cl.vy > 0) {
              cl.dead = true;
              this.puff(cl.c.x, GROUND, 0xe7e5e4, 8);
              cl.c.destroy();
              this.resolved++;
              if (cl.correct && !this.qDone) {
                this.floatText(Phaser.Math.Clamp(cl.c.x, 100, W - 100), GROUND - 60, "MISSED!", "#ff6b6b", 32);
                this.floatText(W / 2, 220, cl.word, "#4ade80", 38);
                this.endRound(false, 1700);
              }
            } else if (cl.c.x < -80 || cl.c.x > W + 80) {
              // 화면 밖으로 날아가도 땅에 닿은 것으로 처리
              cl.dead = true;
              cl.c.destroy();
              this.resolved++;
              if (cl.correct && !this.qDone) {
                this.floatText(W / 2, 220, `MISSED  ${cl.word}`, "#ff6b6b", 32);
                this.endRound(false, 1700);
              }
            }
          }
        }

        showResult() {
          this.state = "done";
          this.clays.forEach((c) => c.c.destroy());
          this.clays = [];
          this.setHud(false);
          this.input.setDefaultCursor("default");
          this.cross.setVisible(false);
          const total = this.order.length;
          const win = this.lives > 0;
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.7).setDepth(90);
          const T = (y: number, s: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(W / 2, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6, align: "center", ...extra }).setOrigin(0.5).setDepth(91);
          this.overlay = this.add.container(0, 0, [
            dim,
            T(120, win ? "COMPLETE!" : "GAME OVER", 56, win ? "#fdba74" : "#fb7185"),
            T(230, `${this.score}`, 84, "#ffffff"),
            T(310, `정답 접시 ${this.correctCount} / ${total}`, 26, "#fff", { strokeThickness: 0 }),
            T(420, "↻  CLICK TO RETRY", 24, "#0b1230", { backgroundColor: "#fdba74", padding: { x: 20, y: 10 }, strokeThickness: 0 }),
          ]).setDepth(90);
          finishRef.current?.({ score: this.score, correct: this.correctCount, total });
        }

        // ---------- 이펙트 ----------
        burst(x: number, y: number, tints: number[], qty: number) {
          const em = this.add.particles(x, y, "spark", {
            speed: { min: 120, max: 420 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 400, max: 800 },
            scale: { start: 0.7, end: 0 },
            gravityY: 600,
            tint: tints,
            emitting: false,
          });
          em.setDepth(40);
          em.explode(qty);
          this.time.delayedCall(1000, () => em.destroy());
        }

        puff(x: number, y: number, tint: number, qty: number) {
          const em = this.add.particles(x, y, "spark", {
            speed: { min: 20, max: 110 },
            angle: { min: 200, max: 340 },
            lifespan: 550,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.7, end: 0 },
            tint,
            emitting: false,
          });
          em.setDepth(30);
          em.explode(qty);
          this.time.delayedCall(800, () => em.destroy());
        }

        floatText(x: number, y: number, text: string, color: string, size: number) {
          const t = this.add
            .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6 })
            .setOrigin(0.5)
            .setDepth(70)
            .setScale(0.4);
          this.tweens.add({ targets: t, scale: 1, duration: 170, ease: "Back.out" });
          this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 950, delay: 300, onComplete: () => t.destroy() });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: W,
        height: H,
        backgroundColor: "#1e3a8a",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: ClayScene,
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

  return <div ref={hostRef} className="w-full mx-auto rounded-2xl overflow-hidden shadow-2xl touch-none select-none" style={{ maxWidth: 960, aspectRatio: `${W} / ${H}` }} />;
}
