"use client";

import { useEffect, useRef, useState } from "react";
import type { ArcheryQuestion } from "./ArcheryPhaser";

/**
 * 낙하 서바이벌 활쏘기
 *  - words  : 뜻(문제)에 맞는 단어를 쏜다. 오답 단어는 쏘면 감점, 그냥 두면 사라진다.
 *  - letters: 뜻을 보고, 떨어지는 알파벳을 순서대로 쏴서 철자를 완성한다.
 *  - 가끔 내려오는 "기능 과녁"(목숨/슬로우/폭탄/x2/시간)을 쏘면 효과가 발동한다.
 */
export type FallKind = "words" | "letters";

type Props = {
  kind: FallKind;
  questions: ArcheryQuestion[]; // words: prompt/answer/choices, letters: prompt(뜻)/answer(단어)
  pool?: string[]; // words 모드의 오답 후보
  lives?: number;
  hint?: boolean; // letters: 다음 글자 힌트(반짝임)
  titleSub?: string;
  onFinish?: (r: { score: number; correct: number; total: number }) => void;
};

type PowerType = "life" | "slow" | "bomb" | "x2" | "time";

const POWER_INFO: Record<PowerType, { label: string; color: number; text: string }> = {
  life: { label: "LIFE", color: 0xef4444, text: "+1 목숨" },
  slow: { label: "SLOW", color: 0x38bdf8, text: "슬로우!" },
  bomb: { label: "BOMB", color: 0xf97316, text: "폭탄!" },
  x2: { label: "x2", color: 0xfacc15, text: "점수 2배!" },
  time: { label: "+TIME", color: 0x22c55e, text: "+8초" },
};

export default function ArcheryFall({ kind, questions, pool = [], lives = 3, hint = true, titleSub, onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const [dims, setDims] = useState<{ W: number; H: number } | null>(null);

  // 폰 세로 화면이면 세로로 긴 캔버스, 아니면 4:3
  useEffect(() => {
    const portrait = window.innerWidth < 640;
    setDims(portrait ? { W: 540, H: 900 } : { W: 960, H: 720 });
  }, []);

  useEffect(() => {
    if (!dims) return;
    const { W, H } = dims;
    let game: Phaser.Game | null = null;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;

      const GROUND_Y = H - 58;
      const BOW_X = W / 2;
      const BOW_Y = GROUND_Y - 62;
      const PANEL_Y = 52;
      const PANEL_W = Math.min(W - 40, 720);
      const MAX_LIVES = 5;
      const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

      type Item = {
        c: Phaser.GameObjects.Container;
        glow: Phaser.GameObjects.Graphics | null;
        label: string; // words: 단어, letters: 소문자 글자
        type: "word" | "letter" | "power";
        power?: PowerType;
        correct: boolean;
        r: number;
        vy: number;
        x0: number;
        phase: number;
        dead: boolean;
      };
      type Arrow = { c: Phaser.GameObjects.Container; vx: number; vy: number };

      class FallScene extends Phaser.Scene {
        state: "start" | "play" | "between" | "done" = "start";
        order: ArcheryQuestion[] = [];
        qIndex = 0;
        score = 0;
        combo = 0;
        livesLeft = lives;
        correctCount = 0;
        items: Item[] = [];
        arrows: Arrow[] = [];
        aim = -Math.PI / 2;
        charging = false;
        charge = 0;
        chargeStart = 0;
        lastFire = 0;
        spawnAcc = 0;
        correctAt = 0;
        correctSpawned = false;
        lastNeededSpawn = 0;
        lastPowerAt = 0;
        slowUntil = 0;
        doubleUntil = 0;
        idx = 0; // letters: 채운 글자 수
        timeLeft = 0;
        timeMax = 1;
        bow!: Phaser.GameObjects.Graphics;
        aimDots!: Phaser.GameObjects.Graphics;
        powerBar!: Phaser.GameObjects.Graphics;
        panel!: Phaser.GameObjects.Graphics;
        slotGfx!: Phaser.GameObjects.Graphics;
        slotTexts: Phaser.GameObjects.Text[] = [];
        clouds: Phaser.GameObjects.Image[] = [];
        overlay: Phaser.GameObjects.Container | null = null;
        hud!: {
          score: Phaser.GameObjects.Text;
          combo: Phaser.GameObjects.Text;
          lives: Phaser.GameObjects.Text;
          q: Phaser.GameObjects.Text;
          prompt: Phaser.GameObjects.Text;
          fx: Phaser.GameObjects.Text;
        };

        constructor() {
          super("fall");
        }

        // ================= 준비 =================
        create() {
          this.makeTextures();
          this.buildBackground();
          this.bow = this.add.graphics().setDepth(20);
          this.aimDots = this.add.graphics().setDepth(15);
          this.powerBar = this.add.graphics().setDepth(30);
          this.panel = this.add.graphics().setDepth(40);
          this.slotGfx = this.add.graphics().setDepth(41);
          const t = (x: number, y: number, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(x, y, "", { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 4, ...extra }).setDepth(42);
          this.hud = {
            score: t(16, 10, 26, "#ffffff"),
            combo: t(16, 40, 18, "#ffb703").setVisible(true),
            lives: t(W - 16, 10, 28, "#ff5d6c").setOrigin(1, 0),
            q: t(0, 0, 13, "#ffd166"),
            prompt: this.add
              .text(W / 2, 0, "", { fontFamily: FONT, fontSize: "20px", color: "#ffffff", align: "center", wordWrap: { width: PANEL_W - 40 } })
              .setOrigin(0.5)
              .setDepth(42),
            fx: t(W / 2, H - 28, 18, "#7dd3fc").setOrigin(0.5),
          };
          this.setHudVisible(false);

          this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.updateAim(p));
          this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onDown(p));
          this.input.on("pointerup", () => this.onUp());
          this.showStart();
        }

        makeTextures() {
          const g = this.make.graphics({ x: 0, y: 0 }, false);
          g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
          g.generateTexture("spark", 16, 16);
          g.clear();
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
          g.fillStyle(0xffffff, 0.9);
          g.fillEllipse(60, 42, 110, 34).fillCircle(42, 32, 22).fillCircle(70, 26, 28).fillCircle(96, 34, 20);
          g.generateTexture("cloud", 130, 70);
          g.destroy();
        }

        buildBackground() {
          if (this.textures.exists("sky")) this.textures.remove("sky");
          const sky = this.textures.createCanvas("sky", W, H)!;
          const ctx = sky.getContext();
          const grd = ctx.createLinearGradient(0, 0, 0, H);
          grd.addColorStop(0, "#14275e");
          grd.addColorStop(0.5, "#4f8bd6");
          grd.addColorStop(0.85, "#ffd9a0");
          grd.addColorStop(1, "#ffb37a");
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, W, H);
          sky.refresh();
          this.add.image(0, 0, "sky").setOrigin(0).setDepth(0);

          const sun = this.add.graphics().setDepth(1);
          const sx = W * 0.8;
          const sy = GROUND_Y - 150;
          for (let i = 6; i >= 1; i--) {
            sun.fillStyle(0xfff0b0, 0.04 * (7 - i)).fillCircle(sx, sy, 30 + i * 22);
          }
          sun.fillStyle(0xfff7d6, 1).fillCircle(sx, sy, 32);

          for (let i = 0; i < 50; i++) {
            const s = this.add
              .image(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.45), "star")
              .setScale(Phaser.Math.FloatBetween(0.2, 0.5))
              .setAlpha(Phaser.Math.FloatBetween(0.3, 0.9))
              .setDepth(1);
            this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(900, 2200), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500) });
          }
          for (let i = 0; i < 7; i++) {
            this.clouds.push(
              this.add
                .image(Phaser.Math.Between(0, W), Phaser.Math.Between(120, H * 0.6), "cloud")
                .setAlpha(Phaser.Math.FloatBetween(0.3, 0.7))
                .setScale(Phaser.Math.FloatBetween(0.7, 1.4))
                .setDepth(2),
            );
          }
          const mtn = (color: number, alpha: number, base: number, peaks: number[]) => {
            const m = this.add.graphics().setDepth(3);
            m.fillStyle(color, alpha).beginPath().moveTo(0, GROUND_Y);
            peaks.forEach((h, i) => m.lineTo((i / (peaks.length - 1)) * W, base - h));
            m.lineTo(W, GROUND_Y).closePath().fillPath();
          };
          mtn(0x5a4a8a, 0.75, GROUND_Y - 20, [90, 190, 110, 230, 120, 170, 100, 210, 80]);
          mtn(0x2f3b66, 0.95, GROUND_Y + 4, [40, 110, 60, 140, 50, 120, 70, 100, 45]);

          const ground = this.add.graphics().setDepth(4);
          ground.fillStyle(0x2a5d34, 1).fillRect(0, GROUND_Y, W, H - GROUND_Y);
          ground.fillStyle(0x3f8a4b, 1).fillRect(0, GROUND_Y, W, 10);
          ground.fillStyle(0x1d4126, 1).fillRect(0, GROUND_Y + 30, W, H);
          for (let x = 0; x < W; x += 14) ground.fillStyle(0x4aa05a, 1).fillTriangle(x, GROUND_Y, x + 5, GROUND_Y - 9 - (x % 5), x + 10, GROUND_Y);

          const plat = this.add.graphics().setDepth(5);
          plat.fillStyle(0x5b3a1e, 1).fillRect(BOW_X - 42, BOW_Y + 38, 84, GROUND_Y - BOW_Y - 38);
          plat.fillStyle(0x8a5a2b, 1).fillRoundedRect(BOW_X - 54, BOW_Y + 30, 108, 14, 5);
          plat.lineStyle(2, 0x3a2410, 1).strokeRoundedRect(BOW_X - 54, BOW_Y + 30, 108, 14, 5);
        }

        setHudVisible(v: boolean) {
          this.panel.setVisible(v);
          this.slotGfx.setVisible(v);
          Object.values(this.hud).forEach((o) => o.setVisible(v));
          this.slotTexts.forEach((o) => o.setVisible(v));
        }

        // ================= 흐름 =================
        showStart() {
          this.state = "start";
          this.clearAll();
          this.setHudVisible(false);
          this.overlay?.destroy();
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.62);
          const title = this.add
            .text(W / 2, H * 0.3, kind === "words" ? "WORD RAIN" : "SPELL RAIN", { fontFamily: FONT, fontSize: `${Math.round(W * 0.07)}px`, color: "#ffd166", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 })
            .setOrigin(0.5);
          const sub = this.add
            .text(W / 2, H * 0.42, `${titleSub ?? (kind === "words" ? "뜻에 맞는 단어만 쏘세요" : "글자를 순서대로 쏴서 단어를 완성하세요")}\n놓치지 마세요 · 아이템 과녁도 노려보세요`, {
              fontFamily: FONT,
              fontSize: "20px",
              color: "#fff",
              align: "center",
              lineSpacing: 8,
              wordWrap: { width: W - 60 },
            })
            .setOrigin(0.5);
          const go = this.add
            .text(W / 2, H * 0.56, "▶  TAP TO START", { fontFamily: FONT, fontSize: "28px", color: "#0b1230", backgroundColor: "#ffd166", padding: { x: 24, y: 12 }, fontStyle: "bold" })
            .setOrigin(0.5);
          this.tweens.add({ targets: go, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
          this.overlay = this.add.container(0, 0, [dim, title, sub, go]).setDepth(100);
        }

        startGame() {
          this.overlay?.destroy();
          this.overlay = null;
          this.order = [...questions];
          this.qIndex = 0;
          this.score = 0;
          this.combo = 0;
          this.livesLeft = lives;
          this.correctCount = 0;
          this.slowUntil = 0;
          this.doubleUntil = 0;
          this.setHudVisible(true);
          this.loadQuestion();
        }

        clearAll() {
          this.items.forEach((i) => i.c.destroy());
          this.items = [];
          this.arrows.forEach((a) => a.c.destroy());
          this.arrows = [];
          this.slotTexts.forEach((s) => s.destroy());
          this.slotTexts = [];
        }

        loadQuestion() {
          this.clearAll();
          const q = this.order[this.qIndex];
          this.spawnAcc = 9999;
          this.correctSpawned = false;
          this.correctAt = this.time.now + Phaser.Math.Between(1200, 2400);
          this.lastNeededSpawn = 0;
          this.idx = 0;

          const isLetters = kind === "letters";
          const panelH = isLetters ? 132 : 84;
          this.panel.clear();
          this.panel.fillStyle(0x0b1230, 0.78).fillRoundedRect((W - PANEL_W) / 2, PANEL_Y, PANEL_W, panelH, 16);
          this.panel.lineStyle(2, 0xffd166, 0.9).strokeRoundedRect((W - PANEL_W) / 2, PANEL_Y, PANEL_W, panelH, 16);
          this.hud.q.setPosition((W - PANEL_W) / 2 + 14, PANEL_Y + 8).setText(`WORD ${this.qIndex + 1} / ${this.order.length}`);
          this.hud.prompt.setPosition(W / 2, PANEL_Y + (isLetters ? 44 : 48)).setText(q.prompt);

          if (isLetters) {
            const len = q.answer.length;
            this.timeMax = 18 + len * 4;
            this.timeLeft = this.timeMax;
            const slotW = Math.min(40, (PANEL_W - 40) / len - 6);
            const total = len * (slotW + 6) - 6;
            for (let i = 0; i < len; i++) {
              const x = W / 2 - total / 2 + i * (slotW + 6) + slotW / 2;
              this.slotTexts.push(
                this.add.text(x, PANEL_Y + 88, "", { fontFamily: FONT, fontSize: `${Math.round(slotW * 0.75)}px`, color: "#fff", fontStyle: "bold" }).setOrigin(0.5).setDepth(42),
              );
            }
            this.drawSlots();
          } else {
            this.slotGfx.clear();
          }
          this.refreshHud();
          this.state = "play";
        }

        drawSlots() {
          const q = this.order[this.qIndex];
          const len = q.answer.length;
          const slotW = Math.min(40, (PANEL_W - 40) / len - 6);
          const total = len * (slotW + 6) - 6;
          this.slotGfx.clear();
          for (let i = 0; i < len; i++) {
            const x = W / 2 - total / 2 + i * (slotW + 6);
            const filled = i < this.idx;
            const cur = i === this.idx;
            this.slotGfx.fillStyle(filled ? 0x16a34a : 0x1e293b, 1).fillRoundedRect(x, PANEL_Y + 66, slotW, 44, 8);
            this.slotGfx.lineStyle(cur ? 3 : 1.5, cur ? 0xffd166 : 0x64748b, 1).strokeRoundedRect(x, PANEL_Y + 66, slotW, 44, 8);
            this.slotTexts[i]?.setText(filled ? q.answer[i].toUpperCase() : "");
          }
        }

        refreshHud() {
          this.hud.score.setText(`${this.score}`);
          this.hud.combo.setText(this.combo > 1 ? `COMBO x${this.combo}` : "");
          this.hud.lives.setText("♥".repeat(this.livesLeft));
          this.refreshGlow();
        }

        refreshGlow() {
          if (kind !== "letters") return;
          const need = this.needed();
          this.items.forEach((i) => i.glow?.setVisible(hint && i.type === "letter" && i.label === need));
        }

        needed(): string {
          const q = this.order[this.qIndex];
          return q ? q.answer[this.idx]?.toLowerCase() ?? "" : "";
        }

        // ================= 입력 =================
        updateAim(p: Phaser.Input.Pointer) {
          if (this.state === "start" || this.state === "done") return;
          let a = Math.atan2(p.y - BOW_Y, p.x - BOW_X);
          if (a > -0.2) a = a <= Math.PI / 2 ? -0.2 : -Math.PI + 0.2;
          this.aim = Phaser.Math.Clamp(a, -Math.PI + 0.2, -0.2);
        }

        onDown(p: Phaser.Input.Pointer) {
          if (this.state === "start") return this.startGame();
          if (this.state === "done") return this.showStart();
          if (this.state !== "play" && this.state !== "between") return;
          this.updateAim(p);
          this.charging = true;
          this.chargeStart = this.time.now;
        }

        onUp() {
          if (!this.charging) return;
          this.charging = false;
          if (this.time.now - this.lastFire < 280) return;
          // 짧게 탭하면 기본 파워로 바로 발사
          this.fire(this.charge < 0.12 ? 0.75 : this.charge);
        }

        fire(power: number) {
          if (this.state !== "play") return;
          this.lastFire = this.time.now;
          const speed = 380 + power * 840;
          const vx = Math.cos(this.aim) * speed;
          const vy = Math.sin(this.aim) * speed;
          const gfx = this.add.graphics();
          gfx.lineStyle(4, 0xd9b382, 1).lineBetween(-52, 0, 0, 0);
          gfx.fillStyle(0xcfd8dc, 1).fillTriangle(0, 0, -12, -6, -12, 6);
          gfx.fillStyle(0xe63946, 1).fillTriangle(-52, 0, -64, -7, -46, 0).fillTriangle(-52, 0, -64, 7, -46, 0);
          const c = this.add.container(BOW_X + Math.cos(this.aim) * 40, BOW_Y + Math.sin(this.aim) * 40, [gfx]).setDepth(25).setRotation(this.aim);
          this.arrows.push({ c, vx, vy });
          this.charge = 0;
          this.puff(BOW_X + Math.cos(this.aim) * 30, BOW_Y + Math.sin(this.aim) * 30, 0xffffff, 6);
        }

        // ================= 스폰 =================
        level() {
          return this.qIndex;
        }

        itemSpeedBase() {
          return Math.min(130, 45 + this.level() * 3);
        }

        pickX(r: number): number {
          let best = W / 2;
          let bestD = -1;
          for (let k = 0; k < 10; k++) {
            const x = Phaser.Math.Between(r + 20, W - r - 20);
            let d = 9999;
            this.items.forEach((i) => {
              if (i.c.y < 220) d = Math.min(d, Math.abs(i.c.x - x));
            });
            if (d > bestD) {
              bestD = d;
              best = x;
            }
          }
          return best;
        }

        spawnItem(opts: { type: "word" | "letter" | "power"; label: string; correct?: boolean; power?: PowerType }) {
          const isWord = opts.type === "word";
          const r = opts.type === "word" ? 34 : opts.type === "letter" ? 30 : 32;
          const x = this.pickX(r);
          const g = this.add.graphics();
          let glow: Phaser.GameObjects.Graphics | null = null;
          const kids: Phaser.GameObjects.GameObject[] = [g];

          if (isWord) {
            g.fillStyle(0x000000, 0.25).fillCircle(3, 4, r + 2);
            ([[r + 2, 0x3a2410], [r, 0xe63946], [r * 0.74, 0xffffff], [r * 0.48, 0xe63946]] as [number, number][]).forEach(([rad, col]) => g.fillStyle(col, 1).fillCircle(0, 0, rad));
            const label = this.add.text(0, r + 16, opts.label, { fontFamily: FONT, fontSize: "17px", color: "#10172e", fontStyle: "bold" }).setOrigin(0.5);
            const maxW = 150;
            if (label.width > maxW) label.setScale(maxW / label.width);
            const pw = label.width * label.scaleX + 16;
            const plate = this.add.graphics();
            plate.fillStyle(0xfff3c4, 1).fillRoundedRect(-pw / 2, r + 3, pw, 26, 8);
            plate.lineStyle(2, 0x3a2410, 1).strokeRoundedRect(-pw / 2, r + 3, pw, 26, 8);
            kids.push(plate, label);
          } else if (opts.type === "letter") {
            g.fillStyle(0x000000, 0.25).fillCircle(3, 4, r + 2);
            g.fillStyle(0x1e3a8a, 1).fillCircle(0, 0, r);
            g.lineStyle(4, 0xffd166, 1).strokeCircle(0, 0, r - 2);
            glow = this.add.graphics();
            glow.lineStyle(5, 0x4ade80, 1).strokeCircle(0, 0, r + 8);
            glow.setVisible(false);
            this.tweens.add({ targets: glow, alpha: 0.3, duration: 450, yoyo: true, repeat: -1 });
            const t = this.add.text(0, 0, opts.label.toUpperCase(), { fontFamily: FONT, fontSize: "34px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
            kids.push(glow, t);
          } else {
            const info = POWER_INFO[opts.power!];
            g.fillStyle(0x000000, 0.25).fillCircle(3, 4, r + 2);
            g.fillStyle(info.color, 1).fillCircle(0, 0, r);
            g.lineStyle(4, 0xffffff, 1).strokeCircle(0, 0, r - 2);
            g.lineStyle(3, 0xffffff, 0.6).strokeCircle(0, 0, r + 7);
            const t = this.add.text(0, 0, info.label, { fontFamily: FONT, fontSize: "16px", color: "#ffffff", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 3 }).setOrigin(0.5);
            kids.push(t);
          }

          const c = this.add.container(x, -r - 30, kids).setDepth(10);
          const item: Item = {
            c,
            glow,
            label: opts.label,
            type: opts.type,
            power: opts.power,
            correct: !!opts.correct,
            r,
            vy: this.itemSpeedBase() + Math.random() * 28,
            x0: x,
            phase: Math.random() * 6.28,
            dead: false,
          };
          this.items.push(item);
          this.refreshGlow();
          return item;
        }

        distractor(q: ArcheryQuestion): string {
          const cand = Array.from(new Set([...pool, ...q.choices])).filter((w) => w !== q.answer);
          const alive = new Set(this.items.map((i) => i.label));
          const fresh = cand.filter((w) => !alive.has(w));
          const src = fresh.length ? fresh : cand;
          return src[Math.floor(Math.random() * src.length)] ?? "—";
        }

        randomLetter(q: ArcheryQuestion): string {
          if (Math.random() < 0.45) {
            const rest = q.answer.slice(this.idx).toLowerCase();
            if (rest.length) return rest[Math.floor(Math.random() * rest.length)];
          }
          return "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
        }

        maybePower(): boolean {
          const now = this.time.now;
          if (now - this.lastPowerAt < 9000 || this.items.some((i) => i.type === "power")) return false;
          if (Math.random() > 0.18) return false;
          const types: PowerType[] = ["slow", "bomb", "x2"];
          if (this.livesLeft < MAX_LIVES) types.push("life");
          if (kind === "letters") types.push("time", "time");
          this.lastPowerAt = now;
          const p = types[Math.floor(Math.random() * types.length)];
          this.spawnItem({ type: "power", label: p, power: p });
          return true;
        }

        runSpawner(delta: number) {
          const q = this.order[this.qIndex];
          const now = this.time.now;
          const interval = Math.max(450, 1000 - this.level() * 25);
          const maxAlive = Math.min(kind === "words" ? 12 : 10, 6 + Math.floor(this.level() / 3));
          this.spawnAcc += delta;

          if (kind === "words") {
            if (!this.correctSpawned && now >= this.correctAt) {
              this.correctSpawned = true;
              this.spawnItem({ type: "word", label: q.answer, correct: true });
              return;
            }
          } else {
            const need = this.needed();
            const hasNeeded = this.items.some((i) => i.type === "letter" && i.label === need);
            if (need && !hasNeeded && now - this.lastNeededSpawn > 2200) {
              this.lastNeededSpawn = now;
              this.spawnItem({ type: "letter", label: need, correct: true });
              return;
            }
          }

          if (this.spawnAcc < interval || this.items.length >= maxAlive) return;
          this.spawnAcc = 0;
          if (this.maybePower()) return;
          if (kind === "words") this.spawnItem({ type: "word", label: this.distractor(q) });
          else this.spawnItem({ type: "letter", label: this.randomLetter(q) });
        }

        // ================= 업데이트 =================
        update(time: number, delta: number) {
          const dt = Math.min(delta, 33) / 1000;
          this.clouds.forEach((c, i) => {
            c.x -= (5 + i * 2) * dt;
            if (c.x < -150) c.x = W + 150;
          });

          if (this.charging) {
            const k = ((time - this.chargeStart) / 1000) * 0.95;
            this.charge = k % 2 < 1 ? k % 1 : 1 - (k % 1);
          } else {
            this.charge = 0;
          }
          this.drawBow();

          if (this.state === "play") {
            this.runSpawner(delta);
            const slow = time < this.slowUntil ? 0.4 : 1;
            this.items.forEach((it) => {
              it.c.y += it.vy * slow * dt;
              it.c.x = it.x0 + Math.sin(time / 1000 * 1.2 + it.phase) * 8;
              it.c.rotation = Math.sin(time / 1000 + it.phase) * 0.08;
            });
            this.checkGround();
            if (kind === "letters") this.tickTimer(dt);
          }
          this.stepArrows(dt);
          this.drawFx(time);
        }

        drawFx(time: number) {
          const parts: string[] = [];
          if (time < this.slowUntil) parts.push(`SLOW ${Math.ceil((this.slowUntil - time) / 1000)}s`);
          if (time < this.doubleUntil) parts.push(`x2 ${Math.ceil((this.doubleUntil - time) / 1000)}s`);
          this.hud.fx.setText(parts.join("   "));
        }

        tickTimer(dt: number) {
          this.timeLeft -= dt;
          const x = (W - PANEL_W) / 2 + 14;
          const w = PANEL_W - 28;
          const g = this.slotGfx;
          // 타이머 바는 슬롯 그래픽 위에 덧그린다(슬롯 redraw 시 같이 지워지므로 매 프레임 갱신)
          this.drawSlots();
          const ratio = Math.max(0, this.timeLeft / this.timeMax);
          g.fillStyle(0x334155, 1).fillRoundedRect(x, PANEL_Y + 116, w, 8, 4);
          g.fillStyle(ratio > 0.3 ? 0x4ade80 : 0xef4444, 1).fillRoundedRect(x, PANEL_Y + 116, w * ratio, 8, 4);
          if (this.timeLeft <= 0) {
            const q = this.order[this.qIndex];
            this.floatText(W / 2, H * 0.4, "TIME UP", "#ff6b6b", 40);
            this.floatText(W / 2, H * 0.4 + 50, q.answer.toUpperCase(), "#4ade80", 36);
            this.endQuestion(false);
          }
        }

        checkGround() {
          for (const it of [...this.items]) {
            if (it.c.y < GROUND_Y - it.r * 0.5) continue;
            if (it.type === "word" && it.correct) {
              const q = this.order[this.qIndex];
              this.puff(it.c.x, GROUND_Y, 0xc9a66b, 16);
              this.floatText(Phaser.Math.Clamp(it.c.x, 90, W - 90), GROUND_Y - 80, "MISSED!", "#ff6b6b", 34);
              this.floatText(W / 2, H * 0.4, q.answer, "#4ade80", 38);
              this.endQuestion(false);
              return;
            }
            this.puff(it.c.x, GROUND_Y, 0xc9a66b, 6);
            this.removeItem(it, false);
          }
        }

        removeItem(it: Item, withBurst: boolean, tints: number[] = [0xffffff], stars = false) {
          if (withBurst) this.burst(it.c.x, it.c.y, tints, stars ? 26 : 16, stars);
          it.dead = true;
          it.c.destroy();
          this.items = this.items.filter((o) => o !== it);
        }

        stepArrows(dt: number) {
          for (const a of [...this.arrows]) {
            for (let s = 0; s < 3; s++) {
              const h = dt / 3;
              a.c.x += a.vx * h;
              a.c.y += a.vy * h;
              a.vy += 720 * h;
              a.c.rotation = Math.atan2(a.vy, a.vx);
              if (this.state === "play" && this.tryHit(a)) break;
            }
            if (!this.arrows.includes(a)) continue;
            if (a.c.y >= GROUND_Y - 4 || a.c.x > W + 80 || a.c.x < -80 || a.c.y < -200) {
              if (a.c.y >= GROUND_Y - 4) this.puff(a.c.x, GROUND_Y, 0xc9a66b, 6);
              this.killArrow(a);
              continue;
            }
            const trail = this.add.image(a.c.x, a.c.y, "spark").setScale(0.3).setTint(0xfff1b8).setAlpha(0.7).setDepth(24);
            this.tweens.add({ targets: trail, alpha: 0, scale: 0.05, duration: 300, onComplete: () => trail.destroy() });
          }
        }

        killArrow(a: Arrow) {
          a.c.destroy();
          this.arrows = this.arrows.filter((o) => o !== a);
        }

        tryHit(a: Arrow): boolean {
          for (const it of this.items) {
            if (it.dead) continue;
            const dx = a.c.x - it.c.x;
            const dy = a.c.y - it.c.y;
            if (dx * dx + dy * dy <= (it.r + 2) * (it.r + 2)) {
              this.killArrow(a);
              this.onHit(it);
              return true;
            }
          }
          return false;
        }

        // ================= 판정 =================
        mult() {
          return this.time.now < this.doubleUntil ? 2 : 1;
        }

        onHit(it: Item) {
          if (it.type === "power") return this.onPower(it);
          const ok = it.type === "word" ? it.correct : it.label === this.needed();
          if (!ok) return this.onWrong(it);

          if (it.type === "word") {
            this.correctCount++;
            this.combo++;
            const gain = (100 + (this.combo - 1) * 20) * this.mult();
            this.score += gain;
            this.burst(it.c.x, it.c.y, [0xffd166, 0xfff3b0, 0xffffff, 0x4ade80], 40, true);
            this.ring(it.c.x, it.c.y, 0x4ade80);
            this.cameras.main.flash(160, 255, 244, 170);
            this.floatText(it.c.x, it.c.y - 40, `+${gain}`, "#ffd166", 34);
            if (this.combo > 1) this.floatText(it.c.x, it.c.y - 80, `COMBO x${this.combo}`, "#ff9f1c", 24);
            this.removeItem(it, false);
            this.endQuestion(true);
          } else {
            this.combo++;
            const gain = (40 + (this.combo - 1) * 8) * this.mult();
            this.score += gain;
            this.burst(it.c.x, it.c.y, [0xffd166, 0xffffff, 0x4ade80], 22, true);
            this.floatText(it.c.x, it.c.y - 30, `+${gain}`, "#ffd166", 26);
            this.removeItem(it, false);
            this.idx++;
            this.drawSlots();
            if (this.idx >= this.order[this.qIndex].answer.length) {
              this.correctCount++;
              this.score += 100 * this.mult();
              const q = this.order[this.qIndex];
              this.floatText(W / 2, H * 0.4, q.answer.toUpperCase(), "#4ade80", 48);
              this.floatText(W / 2, H * 0.4 + 56, "+100 COMPLETE", "#ffd166", 28);
              this.cameras.main.flash(200, 255, 244, 170);
              this.endQuestion(true);
            }
          }
          this.refreshHud();
        }

        onWrong(it: Item) {
          this.combo = 0;
          this.score = Math.max(0, this.score - (kind === "words" ? 30 : 20));
          this.cameras.main.shake(180, 0.008);
          this.floatText(it.c.x, it.c.y - 40, kind === "words" ? "-30" : "-20", "#ff6b6b", 28);
          this.removeItem(it, true, [0xef4444, 0x7f1d1d, 0xffffff]);
          this.refreshHud();
        }

        onPower(it: Item) {
          const p = it.power!;
          const info = POWER_INFO[p];
          this.burst(it.c.x, it.c.y, [info.color, 0xffffff], 34, true);
          this.ring(it.c.x, it.c.y, info.color);
          this.floatText(it.c.x, it.c.y - 40, info.text, "#ffffff", 30);
          this.removeItem(it, false);
          if (p === "life") this.livesLeft = Math.min(MAX_LIVES, this.livesLeft + 1);
          if (p === "slow") this.slowUntil = this.time.now + 6000;
          if (p === "x2") this.doubleUntil = this.time.now + 8000;
          if (p === "time") this.timeLeft = Math.min(this.timeMax + 8, this.timeLeft + 8);
          if (p === "bomb") {
            this.cameras.main.flash(220, 255, 180, 80);
            this.cameras.main.shake(260, 0.012);
            const need = this.needed();
            [...this.items].forEach((o) => {
              if (o.type === "power") return;
              if (o.type === "word" && o.correct) return;
              if (o.type === "letter" && o.label === need) return;
              this.removeItem(o, true, [0xf97316, 0xfacc15, 0xffffff]);
            });
          }
          this.refreshHud();
        }

        endQuestion(ok: boolean) {
          if (this.state !== "play") return;
          this.state = "between";
          if (!ok) {
            this.livesLeft--;
            this.combo = 0;
            this.cameras.main.shake(240, 0.01);
          }
          // 남은 과녁은 아래로 사라진다
          this.items.forEach((o) => {
            this.tweens.add({ targets: o.c, alpha: 0, y: o.c.y + 120, duration: 600, onComplete: () => o.c.destroy() });
          });
          this.items = [];
          this.refreshHud();
          this.time.delayedCall(ok ? 1200 : 1800, () => {
            if (this.livesLeft <= 0) this.showResult();
            else this.nextQuestion();
          });
        }

        nextQuestion() {
          this.qIndex++;
          if (this.qIndex >= this.order.length) this.showResult();
          else this.loadQuestion();
        }

        showResult() {
          this.state = "done";
          this.clearAll();
          this.setHudVisible(false);
          this.bow.clear();
          this.aimDots.clear();
          this.powerBar.clear();
          const total = this.order.length;
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.7);
          const t1 = this.add.text(W / 2, H * 0.24, this.livesLeft <= 0 ? "GAME OVER" : "CLEAR!", { fontFamily: FONT, fontSize: "52px", color: "#ffd166", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5);
          const t2 = this.add.text(W / 2, H * 0.37, `${this.score}`, { fontFamily: FONT, fontSize: "80px", color: "#fff", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5);
          const t3 = this.add.text(W / 2, H * 0.48, `Correct  ${this.correctCount} / ${total}`, { fontFamily: FONT, fontSize: "28px", color: "#fff" }).setOrigin(0.5);
          const t4 = this.add
            .text(W / 2, H * 0.6, "↻  TAP TO PLAY AGAIN", { fontFamily: FONT, fontSize: "24px", color: "#0b1230", backgroundColor: "#ffd166", padding: { x: 20, y: 10 }, fontStyle: "bold" })
            .setOrigin(0.5);
          this.overlay = this.add.container(0, 0, [dim, t1, t2, t3, t4]).setDepth(100);
          this.burst(W / 2, H * 0.37, [0xffd166, 0xffffff, 0xff9f1c], 50, true);
          finishRef.current?.({ score: this.score, correct: this.correctCount, total });
        }

        // ================= 그리기/이펙트 =================
        drawBow() {
          const g = this.bow;
          g.clear();
          if (this.state === "start" || this.state === "done") return;
          g.setPosition(BOW_X, BOW_Y).setRotation(this.aim);
          const pull = this.charging ? this.charge : 0;
          const R = 58;
          g.lineStyle(7, 0x8a4b1f, 1).beginPath().arc(0, 0, R, -1.05, 1.05, false).strokePath();
          g.lineStyle(3, 0xffd166, 1).beginPath().arc(0, 0, R, -1.05, 1.05, false).strokePath();
          const ty = Math.sin(1.05) * R;
          const tx = Math.cos(1.05) * R;
          const nock = -pull * 34;
          g.lineStyle(2, 0xffffff, 0.95).lineBetween(tx, -ty, nock, 0).lineBetween(tx, ty, nock, 0);
          g.lineStyle(4, 0xd9b382, 1).lineBetween(nock, 0, nock + 70, 0);
          g.fillStyle(0xcfd8dc, 1).fillTriangle(nock + 82, 0, nock + 70, -6, nock + 70, 6);

          const d = this.aimDots;
          d.clear();
          if (this.charging) {
            const speed = 380 + this.charge * 840;
            let x = BOW_X + Math.cos(this.aim) * 40;
            let y = BOW_Y + Math.sin(this.aim) * 40;
            let vx = Math.cos(this.aim) * speed;
            let vy = Math.sin(this.aim) * speed;
            for (let i = 0; i < 26; i++) {
              for (let s = 0; s < 3; s++) {
                x += vx * 0.016;
                y += vy * 0.016;
                vy += 720 * 0.016;
              }
              d.fillStyle(0xffffff, 0.8 - i * 0.03).fillCircle(x, y, 3.2 - i * 0.07);
            }
          }
          const b = this.powerBar;
          b.clear();
          if (this.charging) {
            b.fillStyle(0x000000, 0.5).fillRoundedRect(BOW_X - 70, BOW_Y + 62, 140, 14, 7);
            const col = this.charge < 0.5 ? 0x4ade80 : this.charge < 0.8 ? 0xfacc15 : 0xef4444;
            b.fillStyle(col, 1).fillRoundedRect(BOW_X - 68, BOW_Y + 64, 136 * this.charge, 10, 5);
          }
        }

        burst(x: number, y: number, tints: number[], qty: number, stars: boolean) {
          const em = this.add.particles(x, y, stars ? "star" : "spark", {
            speed: { min: 120, max: 460 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 500, max: 1000 },
            scale: { start: stars ? 1.0 : 0.7, end: 0 },
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
            .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6 })
            .setOrigin(0.5)
            .setDepth(60)
            .setScale(0.4);
          this.tweens.add({ targets: t, scale: 1, duration: 200, ease: "Back.out" });
          this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1100, delay: 300, ease: "Quad.out", onComplete: () => t.destroy() });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: W,
        height: H,
        backgroundColor: "#0b1230",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: FallScene,
        input: { touch: { capture: true } },
      });
      if (process.env.NODE_ENV !== "production") (window as unknown as { __archeryGame?: Phaser.Game }).__archeryGame = game;
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
      game = null;
    };
    // questions 등은 마운트 시 1회만 사용(바꾸려면 key로 재마운트)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims]);

  return (
    <div
      ref={hostRef}
      className="w-full mx-auto rounded-2xl overflow-hidden shadow-2xl touch-none select-none"
      style={{ maxWidth: dims && dims.H > dims.W ? 520 : 960, aspectRatio: dims ? `${dims.W} / ${dims.H}` : "4 / 3" }}
    />
  );
}
