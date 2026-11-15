"use client";

import { useEffect, useRef } from "react";
import type { ArcheryQuestion } from "./ArcheryPhaser";
import { createJoystick, type Joystick } from "@/lib/workout/virtualJoystick";

/**
 * 단어 드리프트 (위에서 내려다보는 2D 서킷)
 *  - 속도가 높을 때 크게 꺾거나 DRIFT(핸드브레이크)를 누르면 차가 미끄러진다.
 *  - 미끄러진 각도 × 속도로 드리프트 점수가 쌓이고, 끊기지 않으면 배율이 오른다.
 *  - 코스에 놓인 단어 게이트 3개 중 정답이 있는 쪽으로 통과하면 보너스.
 */
type Props = {
  questions: ArcheryQuestion[];
  laps?: number;
  gatesPerLap?: number;
  view?: "top" | "cockpit"; // top: 위에서 내려다봄 / cockpit: 차 안 1인칭(의사 3D)
  assist?: boolean; // 어시스트: 드리프트가 쉽게 걸리고 스핀·코스 이탈에 관대. 드리프트 점수는 ×0.7
  onFinish?: (r: { time: number; driftScore: number; correct: number; total: number; score: number }) => void;
};

const W = 960;
const H = 540;
const WORLD_W = 2600;
const WORLD_H = 1800;
const TRACK_W = 250;
const MAX_V = 820;
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// 서킷 제어점 (시계 방향). 0번 점에서 동쪽으로 출발
const CTRL: [number, number][] = [
  [1300, 260], [2000, 300], [2350, 620], [2200, 980], [1750, 1060],
  [1500, 1260], [1760, 1520], [1200, 1620], [620, 1520], [360, 1120],
  [600, 760], [1020, 660], [900, 430],
];

type P = { x: number; y: number };

function buildTrack(): P[] {
  const pts: P[] = [];
  const n = CTRL.length;
  for (let i = 0; i < n; i++) {
    const p0 = CTRL[(i - 1 + n) % n];
    const p1 = CTRL[i];
    const p2 = CTRL[(i + 1) % n];
    const p3 = CTRL[(i + 2) % n];
    for (let s = 0; s < 40; s++) {
      const t = s / 40;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  return pts;
}

export default function DriftGame({ questions, laps = 2, gatesPerLap = 6, assist = false, view = "top", onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;

      const track = buildTrack();
      const N = track.length;
      const tangent = (i: number): P => {
        const a = track[(i - 1 + N) % N];
        const b = track[(i + 1) % N];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const l = Math.hypot(dx, dy) || 1;
        return { x: dx / l, y: dy / l };
      };
      const gateIdx = Array.from({ length: gatesPerLap }, (_, k) => Math.floor(50 + (k * (N - 110)) / gatesPerLap));
      const PROG0 = 8; // 출발 위치(트랙 인덱스)

      type Gate = {
        idx: number;
        rect: Phaser.GameObjects.Rectangle;
        plates: Phaser.GameObjects.Image[];
        texts: Phaser.GameObjects.Text[];
        nx: number;
        ny: number;
        correctSlot: number;
        res: number; // 0 미통과 / 1 정답 / 2 오답
      };

      class DriftScene extends Phaser.Scene {
        state: "start" | "countdown" | "run" | "done" = "start";
        x = 0;
        y = 0;
        theta = 0;
        vx = 0;
        vy = 0;
        steer = 0;
        sliding = false;
        offT = 0;
        slip = 0;
        onTrack = true;
        idx = 0;
        lastIdx = 0;
        prog = 0;
        t = 0;
        score = 0;
        correct = 0;
        gates: Gate[] = [];
        gateNo = 0; // 전체 게이트 순번
        chain = { active: false, t: 0, pts: 0, none: 0 };
        qOrder: { q: ArcheryQuestion; choices: string[] }[] = [];
        car!: Phaser.GameObjects.Image;
        camTarget!: Phaser.GameObjects.Rectangle;
        skid!: Phaser.GameObjects.RenderTexture;
        smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
        dust!: Phaser.GameObjects.Particles.ParticleEmitter;
        hud!: Record<"score" | "chain" | "prompt" | "gate" | "info" | "center", Phaser.GameObjects.Text>;
        panel!: Phaser.GameObjects.Rectangle;
        mini!: Phaser.GameObjects.Image;
        miniDot!: Phaser.GameObjects.Rectangle;
        btns: { name: "left" | "right" | "gas" | "drift"; r: Phaser.GameObjects.Rectangle; x: number; y: number; w: number; h: number }[] = [];
        keys!: Record<string, Phaser.Input.Keyboard.Key>;
        overlay: Phaser.GameObjects.Container | null = null;
        joy!: Joystick;
        trackImg!: Phaser.GameObjects.Image;
        cctx!: CanvasRenderingContext2D;
        cTex!: Phaser.Textures.CanvasTexture;
        cview!: Phaser.GameObjects.Image;
        cwheel!: Phaser.GameObjects.Image;
        speedNeedle!: Phaser.GameObjects.Rectangle;
        slipNeedle!: Phaser.GameObjects.Rectangle;
        skyGrad!: CanvasGradient;

        constructor() {
          super("drift");
        }

        // ================= 준비 =================
        create() {
          this.state = "start";
          this.gates = [];
          this.btns = [];
          this.qOrder = [];
          this.chain = { active: false, t: 0, pts: 0, none: 0 };
          this.score = 0;
          this.correct = 0;
          this.t = 0;
          this.gateNo = 0;
          this.vx = this.vy = 0;
          this.steer = 0;
          this.sliding = false;

          this.makeTextures();
          this.buildTrackTexture();
          this.skid = this.add.renderTexture(0, 0, WORLD_W, WORLD_H).setOrigin(0).setDepth(1);

          // 문제 순서(게이트마다 정답 포함 3지선다)
          const total = laps * gatesPerLap;
          for (let i = 0; i < total; i++) {
            const q = questions[i % questions.length];
            const others = Phaser.Utils.Array.Shuffle(q.choices.filter((c) => c !== q.answer)).slice(0, 2);
            this.qOrder.push({ q, choices: Phaser.Utils.Array.Shuffle([q.answer, ...others]) });
          }
          this.buildGates();

          // 출발 위치
          const p = track[PROG0];
          const tg = tangent(PROG0);
          this.x = p.x;
          this.y = p.y;
          this.theta = Math.atan2(tg.y, tg.x);
          this.idx = this.lastIdx = PROG0;
          this.prog = PROG0;

          this.car = this.add.image(this.x, this.y, "dcar").setDepth(8).setScale(0.8);
          this.smoke = this.add.particles(0, 0, "dspark", {
            lifespan: 700,
            scale: { start: 0.8, end: 2.2 },
            alpha: { start: 0.45, end: 0 },
            speed: { min: 5, max: 35 },
            tint: 0xeeeeee,
            emitting: false,
          });
          this.smoke.setDepth(9);
          this.dust = this.add.particles(0, 0, "dspark", {
            lifespan: 500,
            scale: { start: 0.7, end: 1.6 },
            alpha: { start: 0.5, end: 0 },
            speed: { min: 20, max: 70 },
            tint: 0xb48a54,
            emitting: false,
          });
          this.dust.setDepth(9);

          this.camTarget = this.add.rectangle(this.x, this.y, 4, 4, 0, 0);
          this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
          this.cameras.main.startFollow(this.camTarget, true, 0.12, 0.12);
          this.cameras.main.centerOn(this.x, this.y);

          this.buildHud();
          if (view === "cockpit") this.setupCockpit();
          this.input.addPointer(3);
          this.input.on("pointerdown", () => this.onAnyStart());
          const kb = this.input.keyboard!;
          this.keys = {
            left: kb.addKey("LEFT"), right: kb.addKey("RIGHT"), a: kb.addKey("A"), d: kb.addKey("D"),
            up: kb.addKey("UP"), w: kb.addKey("W"), down: kb.addKey("DOWN"), s: kb.addKey("S"), space: kb.addKey("SPACE"),
            shift: kb.addKey("SHIFT"),
          };
          kb.on("keydown-ENTER", () => this.onAnyStart());
          kb.on("keydown-SPACE", () => this.onAnyStart());
          this.showStart();
        }

        makeTextures() {
          const g = this.make.graphics({ x: 0, y: 0 }, false);
          g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
          g.generateTexture("dspark", 16, 16);
          g.clear();
          g.fillStyle(0x0a0a0a, 1).fillCircle(3, 3, 3);
          g.generateTexture("dskid", 6, 6);
          g.clear();
          const pw = 96;
          g.fillStyle(0xfff3c4, 1).fillRoundedRect(1, 1, pw, 36, 9);
          g.lineStyle(2, 0x3a2410, 1).strokeRoundedRect(1, 1, pw, 36, 9);
          g.generateTexture("dplate", pw + 2, 38);
          g.clear();
          // 차 (위쪽이 앞)
          g.translateCanvas(24, 40);
          g.fillStyle(0x000000, 0.28).fillRoundedRect(-17, -29, 36, 64, 9);
          g.fillStyle(0x111111, 1);
          g.fillRoundedRect(-21, -22, 7, 16, 2).fillRoundedRect(14, -22, 7, 16, 2);
          g.fillRoundedRect(-21, 12, 7, 16, 2).fillRoundedRect(14, 12, 7, 16, 2);
          g.fillStyle(0xe63946, 1).fillRoundedRect(-16, -32, 32, 64, 10);
          g.fillStyle(0xffffff, 0.22).fillRoundedRect(-16, -32, 32, 20, 10);
          g.fillStyle(0xffffff, 1).fillRect(-3, -32, 6, 64); // 레이싱 스트라이프
          g.fillStyle(0x0f172a, 0.92).fillRoundedRect(-11, -14, 22, 14, 4);
          g.fillStyle(0x0f172a, 0.8).fillRoundedRect(-11, 8, 22, 9, 3);
          g.fillStyle(0xfff3b0, 1).fillRect(-13, -31, 6, 3).fillRect(7, -31, 6, 3);
          g.fillStyle(0xff4d4d, 1).fillRect(-13, 29, 6, 3).fillRect(7, 29, 6, 3);
          g.generateTexture("dcar", 48, 80);
          g.destroy();
        }

        buildTrackTexture() {
          // 장면을 다시 시작하면 같은 키의 텍스처가 남아 있어 createCanvas가 null을 돌려준다 → 먼저 지운다
          if (this.textures.exists("dtrack")) this.textures.remove("dtrack");
          if (this.textures.exists("dmini")) this.textures.remove("dmini");
          const tex = this.textures.createCanvas("dtrack", WORLD_W, WORLD_H)!;
          const ctx = tex.getContext();
          ctx.fillStyle = "#2f7a3b";
          ctx.fillRect(0, 0, WORLD_W, WORLD_H);
          // 잔디 얼룩
          for (let i = 0; i < 260; i++) {
            ctx.fillStyle = i % 2 ? "rgba(20,70,35,0.25)" : "rgba(80,160,90,0.18)";
            ctx.beginPath();
            ctx.arc(Math.random() * WORLD_W, Math.random() * WORLD_H, 30 + Math.random() * 90, 0, Math.PI * 2);
            ctx.fill();
          }
          const path = () => {
            ctx.beginPath();
            track.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
            ctx.closePath();
          };
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          // 연석(빨강/흰) → 아스팔트 → 중앙선
          path();
          ctx.strokeStyle = "#f1f5f9";
          ctx.lineWidth = TRACK_W + 40;
          ctx.stroke();
          path();
          ctx.strokeStyle = "#d62839";
          ctx.lineWidth = TRACK_W + 40;
          ctx.setLineDash([46, 46]);
          ctx.stroke();
          ctx.setLineDash([]);
          path();
          ctx.strokeStyle = "#3b404c";
          ctx.lineWidth = TRACK_W;
          ctx.stroke();
          path();
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 4;
          ctx.setLineDash([36, 44]);
          ctx.stroke();
          ctx.setLineDash([]);
          // 출발선(체커)
          const s0 = track[0];
          const t0 = tangent(0);
          ctx.save();
          ctx.translate(s0.x, s0.y);
          ctx.rotate(Math.atan2(t0.y, t0.x));
          for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 10; c++) {
              ctx.fillStyle = (r + c) % 2 ? "#ffffff" : "#111111";
              ctx.fillRect(-12 + r * 12, -TRACK_W / 2 + (c * TRACK_W) / 10, 12, TRACK_W / 10);
            }
          }
          ctx.restore();
          // 덤불
          for (let i = 0; i < 160; i++) {
            const x = Math.random() * WORLD_W;
            const y = Math.random() * WORLD_H;
            let d = Infinity;
            for (let k = 0; k < N; k += 6) d = Math.min(d, Math.hypot(track[k].x - x, track[k].y - y));
            if (d < TRACK_W / 2 + 70) continue;
            ctx.fillStyle = "#1c5a2c";
            ctx.beginPath();
            ctx.arc(x, y, 16 + Math.random() * 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#2f8a46";
            ctx.beginPath();
            ctx.arc(x - 4, y - 5, 10 + Math.random() * 8, 0, Math.PI * 2);
            ctx.fill();
          }
          tex.refresh();
          this.trackImg = this.add.image(0, 0, "dtrack").setOrigin(0).setDepth(0);

          // 미니맵
          const mw = 200;
          const mh = Math.round((200 * WORLD_H) / WORLD_W);
          const mm = this.textures.createCanvas("dmini", mw, mh)!;
          const mc = mm.getContext();
          mc.fillStyle = "rgba(11,18,48,0.7)";
          mc.fillRect(0, 0, mw, mh);
          mc.strokeStyle = "#cbd5e1";
          mc.lineWidth = 6;
          mc.lineJoin = "round";
          mc.beginPath();
          track.forEach((p, i) => {
            const x = (p.x / WORLD_W) * mw;
            const y = (p.y / WORLD_H) * mh;
            if (i === 0) mc.moveTo(x, y);
            else mc.lineTo(x, y);
          });
          mc.closePath();
          mc.stroke();
          mm.refresh();
        }

        buildGates() {
          gateIdx.forEach((gi) => {
            const p = track[gi];
            const tg = tangent(gi);
            const nx = -tg.y;
            const ny = tg.x;
            const rect = this.add.rectangle(p.x, p.y, TRACK_W, 8, 0xffffff, 0.45).setRotation(Math.atan2(ny, nx) + Math.PI / 2 - Math.PI / 2).setDepth(2);
            rect.setRotation(Math.atan2(tg.y, tg.x) + Math.PI / 2);
            const plates: Phaser.GameObjects.Image[] = [];
            const texts: Phaser.GameObjects.Text[] = [];
            [-86, 0, 86].forEach((off) => {
              const px = p.x + nx * off;
              const py = p.y + ny * off;
              plates.push(this.add.image(px, py, "dplate").setDepth(6));
              texts.push(this.add.text(px, py, "", { fontFamily: FONT, fontSize: "16px", color: "#10172e", fontStyle: "bold" }).setOrigin(0.5).setDepth(7));
            });
            this.gates.push({ idx: gi, rect, plates, texts, nx, ny, correctSlot: 0, res: 0 });
          });
          this.assignLap(0);
        }

        assignLap(lap: number) {
          this.gates.forEach((g, k) => {
            const item = this.qOrder[lap * gatesPerLap + k];
            if (!item) return;
            g.correctSlot = item.choices.indexOf(item.q.answer);
            g.res = 0;
            g.texts.forEach((tx, i) => {
              tx.setText(item.choices[i] ?? "").setScale(1);
              if (tx.width > 88) tx.setScale(88 / tx.width);
            });
            g.rect.setFillStyle(0xffffff, 0.45);
          });
        }

        buildHud() {
          const t = (x: number, y: number, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(x, y, "", { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 4, ...extra }).setScrollFactor(0).setDepth(50);
          this.panel = this.add.rectangle(W / 2, 32, 500, 52, 0x0b1230, 0.78).setScrollFactor(0).setDepth(49).setStrokeStyle(2, 0xffd166, 0.9);
          this.hud = {
            prompt: this.add.text(W / 2, 32, "", { fontFamily: FONT, fontSize: "17px", color: "#ffffff", align: "center", wordWrap: { width: 470 } }).setOrigin(0.5).setScrollFactor(0).setDepth(51),
            gate: t(W / 2, 62, 12, "#ffd166", { strokeThickness: 3 }).setOrigin(0.5, 0),
            score: t(16, 10, 30, "#ffffff"),
            chain: t(16, 48, 20, "#ffb703"),
            info: t(W - 12, 152, 17, "#e2e8f0", { align: "right" }).setOrigin(1, 0),
            center: t(W / 2, 250, 90, "#ffffff").setOrigin(0.5).setDepth(70),
          };
          this.mini = this.add.image(W - 210, 8, "dmini").setOrigin(0).setScrollFactor(0).setDepth(49);
          this.miniDot = this.add.rectangle(0, 0, 9, 9, 0xe63946).setScrollFactor(0).setDepth(51);

          const defs: [typeof this.btns[number]["name"], string, number, number, number, number][] = [
            ["left", "◀", 14, H - 92, 128, 80],
            ["right", "▶", 152, H - 92, 128, 80],
            ["drift", "DRIFT", W - 310, H - 92, 148, 80],
            ["gas", "GAS", W - 154, H - 92, 140, 80],
          ];
          // 폰에서는 ◀ ▶ 대신 조이패드(좌우 기울기 = 핸들)를 쓴다
          this.joy = createJoystick(this, { x: 118, y: H - 112, radius: 58, depth: 90 });
          // (콕핏뷰는 계기판을 가리므로 ◀ ▶ 버튼도 숨긴다: 키보드 ← → 또는 조이패드 사용)
          defs.filter(([name]) => !((this.joy.visible || view === "cockpit") && (name === "left" || name === "right"))).forEach(([name, label, x, y, w, h]) => {
            const r = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0xffffff, 0.14).setScrollFactor(0).setDepth(52).setStrokeStyle(2, 0xffffff, 0.35);
            this.add.text(x + w / 2, y + h / 2, label, { fontFamily: FONT, fontSize: label.length > 2 ? "22px" : "32px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5).setScrollFactor(0).setDepth(53).setAlpha(0.9);
            this.btns.push({ name, r, x, y, w, h });
          });
          this.setHud(false);
        }

        setHud(v: boolean) {
          this.panel.setVisible(v);
          Object.values(this.hud).forEach((o) => o.setVisible(v));
          this.mini.setVisible(v);
          this.miniDot.setVisible(v);
        }

        // ================= 흐름 =================
        showStart() {
          this.state = "start";
          this.setHud(false);
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.62).setScrollFactor(0);
          const title = this.add.text(W / 2, 130, "WORD DRIFT", { fontFamily: FONT, fontSize: "64px", color: "#ffd166", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5).setScrollFactor(0);
          const sub = this.add
            .text(
              W / 2,
              270,
              `${laps}바퀴 · 코너에서 크게 꺾거나 DRIFT를 눌러 미끄러지세요${assist ? "  [어시스트 ON]" : ""}\n미끄러질수록, 길게 이어갈수록 점수 ×배율!\n정답 게이트: 그냥 통과 300 · 드리프트로 통과 600~900\n(미끄러진 각도가 클수록 높음)\n\n◀ ▶ 핸들(폰은 조이패드) · GAS 가속 · DRIFT 핸드브레이크\n키보드: ← → / ↑ / ↓ / Space`,
              { fontFamily: FONT, fontSize: "19px", color: "#fff", align: "center", lineSpacing: 8 },
            )
            .setOrigin(0.5)
            .setScrollFactor(0);
          const go = this.add.text(W / 2, 430, "▶  TAP TO START", { fontFamily: FONT, fontSize: "28px", color: "#0b1230", backgroundColor: "#ffd166", padding: { x: 24, y: 12 }, fontStyle: "bold" }).setOrigin(0.5).setScrollFactor(0);
          this.tweens.add({ targets: go, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
          this.overlay = this.add.container(0, 0, [dim, title, sub, go]).setDepth(100).setScrollFactor(0);
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
              this.hud.center.setText(String(n)).setScale(1.6).setAlpha(1);
              this.tweens.add({ targets: this.hud.center, scale: 1, alpha: 0.4, duration: 800 });
              n--;
              this.time.delayedCall(900, tick);
            } else {
              this.hud.center.setText("GO!").setScale(1.6).setAlpha(1);
              this.tweens.add({ targets: this.hud.center, scale: 1.1, alpha: 0, duration: 800 });
              this.state = "run";
            }
          };
          tick();
        }

        updatePrompt() {
          const total = this.qOrder.length;
          const n = Math.min(this.gateNo, total - 1);
          this.hud.prompt.setText(this.qOrder[n]?.q.prompt ?? "");
          this.hud.gate.setText(`GATE ${Math.min(this.gateNo + 1, total)} / ${total}`);
        }

        // ================= 입력 =================
        readInput() {
          const k = this.keys;
          let left = k.left.isDown || k.a.isDown;
          let right = k.right.isDown || k.d.isDown;
          let gas = k.up.isDown || k.w.isDown;
          let brake = k.down.isDown || k.s.isDown;
          let drift = k.space.isDown || k.shift.isDown;
          const down = { left: false, right: false, gas: false, drift: false } as Record<string, boolean>;
          this.input.manager.pointers.forEach((p) => {
            if (!p.isDown) return;
            this.btns.forEach((b) => {
              if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) down[b.name] = true;
            });
          });
          left = left || down.left;
          right = right || down.right;
          gas = gas || down.gas;
          drift = drift || down.drift;
          this.btns.forEach((b) => b.r.setFillStyle(0xffffff, down[b.name] ? 0.4 : 0.14));
          let steerTarget = (right ? 1 : 0) - (left ? 1 : 0);
          if (this.joy.vec.active) steerTarget = Phaser.Math.Clamp(this.joy.vec.x * 1.25, -1, 1); // 조이패드: 아날로그 핸들
          return { steerTarget, gas, brake, drift };
        }

        // ================= 업데이트 =================
        update(time: number, delta: number) {
          const dt = Math.min(delta, 33) / 1000;
          const inp = this.readInput();
          if (this.state === "run") {
            this.t += dt;
            this.drive(dt, inp);
            this.locate();
            this.scoring(dt);
          } else {
            // 카운트다운 중 차는 정지
            this.vx = this.vy = 0;
          }
          this.car.setPosition(this.x, this.y).setRotation(this.theta + Math.PI / 2);
          this.camTarget.setPosition(this.x + this.vx * 0.3, this.y + this.vy * 0.3);
          if (view === "cockpit") this.drawCockpit(time);
          this.drawHud();
        }

        drive(dt: number, inp: { steerTarget: number; gas: boolean; brake: boolean; drift: boolean }) {
          // 핸들 부드럽게
          this.steer += (inp.steerTarget - this.steer) * Math.min(1, dt * 9);
          const speed = Math.hypot(this.vx, this.vy);
          let c = Math.cos(this.theta);
          let s = Math.sin(this.theta);
          let vf = this.vx * c + this.vy * s;
          let vl = -this.vx * s + this.vy * c;

          // 드리프트 판정
          const slip = speed > 150 ? Math.atan2(vl, Math.abs(vf)) : 0;
          this.slip = slip;
          const hard = Math.abs(this.steer) > (assist ? 0.4 : 0.55) && vf > MAX_V * (assist ? 0.36 : 0.5);
          if (inp.drift || hard) this.sliding = true;
          else if (this.sliding && (Math.abs(slip) < 0.18 || speed < 220)) this.sliding = false;

          // 조향
          const turnBase = 2.6 * Phaser.Math.Clamp(Math.abs(vf) / 170, 0, 1) * (vf >= 0 ? 1 : -1);
          this.theta += this.steer * turnBase * (this.sliding ? (assist ? 0.95 : 1.1) : 1) * dt;
          // 드리프트 보조: 차 머리가 진행 방향으로 돌아오려는 힘(가속 중일수록 강함) → 스핀 방지, 카운터로 각도 조절 가능
          // 어시스트 모드는 이 힘이 더 강하고, 각도가 너무 커지면(>0.75rad) 두 배로 잡아 준다
          if (this.sliding && speed > 200) {
            const va = Math.atan2(this.vy, this.vx);
            const d = Phaser.Math.Angle.Wrap(va - this.theta);
            let k = inp.gas ? 1.9 : 0.9;
            if (assist) {
              k = inp.gas ? 3.0 : 1.7;
              if (Math.abs(d) > 0.75) k *= 2;
            }
            this.theta += d * k * dt;
          }
          c = Math.cos(this.theta);
          s = Math.sin(this.theta);
          // 새 헤딩 기준으로 다시 분해
          vf = this.vx * c + this.vy * s;
          vl = -this.vx * s + this.vy * c;

          // 엔진 / 브레이크 / 저항
          const grass = !this.onTrack;
          if (inp.gas) vf += 560 * (1 - Phaser.Math.Clamp(vf / MAX_V, 0, 1)) * dt + 60 * dt;
          if (inp.brake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 900 * dt);
          vf -= vf * (grass ? (assist ? 0.8 : 1.6) : 0.35) * dt;
          if (inp.drift) vf -= vf * 0.45 * dt;

          // 횡 그립
          const gripK = this.sliding ? (inp.drift ? 1.2 : 2.1) : 8.5;
          vl *= Math.exp(-gripK * dt);
          if (grass) vl *= Math.exp(-2 * dt);

          this.vx = vf * c - vl * s;
          this.vy = vf * s + vl * c;
          this.x += this.vx * dt;
          this.y += this.vy * dt;

          // 월드 경계
          if (this.x < 40 || this.x > WORLD_W - 40) {
            this.x = Phaser.Math.Clamp(this.x, 40, WORLD_W - 40);
            this.vx *= -0.3;
          }
          if (this.y < 40 || this.y > WORLD_H - 40) {
            this.y = Phaser.Math.Clamp(this.y, 40, WORLD_H - 40);
            this.vy *= -0.3;
          }

          // 스키드/연기
          const sp = Math.hypot(this.vx, this.vy);
          if ((this.sliding && Math.abs(slip) > 0.25 && sp > 200) || (!this.onTrack && sp > 250)) {
            const bx = this.x - c * 22;
            const by = this.y - s * 22;
            [-12, 12].forEach((o) => {
              const wx = bx - s * o;
              const wy = by + c * o;
              if (this.onTrack) this.skid.draw("dskid", wx, wy, 0.5);
              (this.onTrack ? this.smoke : this.dust).emitParticleAt(wx, wy, 1);
            });
          }
        }

        locate() {
          // 가까운 트랙 지점 찾기(이전 위치 근처만 검색)
          let best = this.idx;
          let bd = Infinity;
          for (let o = -30; o <= 30; o++) {
            const i = (this.idx + o + N) % N;
            const d = Math.hypot(track[i].x - this.x, track[i].y - this.y);
            if (d < bd) {
              bd = d;
              best = i;
            }
          }
          const delta = ((best - this.lastIdx + N + N / 2) % N) - N / 2;
          this.prog += delta;
          this.lastIdx = best;
          this.idx = best;
          this.onTrack = bd <= TRACK_W / 2 + 8;
        }

        // ================= 점수 =================
        scoring(dt: number) {
          const sp = Math.hypot(this.vx, this.vy);
          const drifting = this.sliding && Math.abs(this.slip) > 0.28 && sp > 220 && this.onTrack;
          const ch = this.chain;
          if (drifting) {
            ch.active = true;
            ch.t += dt;
            ch.none = 0;
            this.offT = 0;
            ch.pts += Math.abs(this.slip) * sp * 0.28 * dt * (assist ? 0.7 : 1);
          } else if (ch.active) {
            ch.none += dt;
            if (!this.onTrack) {
              this.offT += dt;
              if (this.offT > (assist ? 0.7 : 0)) this.loseChain("OFF TRACK"); // 어시스트: 잠깐 벗어나도 봐준다
            } else {
              this.offT = 0;
              if (ch.none > (assist ? 0.8 : 0.45)) this.bankChain();
            }
          }

          // 게이트
          const total = this.qOrder.length;
          if (this.gateNo < total) {
            const lap = Math.floor(this.gateNo / gatesPerLap);
            const k = this.gateNo % gatesPerLap;
            const threshold = lap * N + gateIdx[k];
            if (this.prog >= threshold) this.crossGate(this.gateNo, k);
          }

          // 완주
          if (this.prog >= PROG0 + laps * N) this.finish();
        }

        mult() {
          return Math.min(5, 1 + Math.floor(this.chain.t / 1.2) * 0.5);
        }

        bankChain() {
          const gain = Math.round(this.chain.pts * this.mult());
          if (gain > 0) {
            this.score += gain;
            this.floatText(this.x, this.y - 60, `+${gain}`, "#ffd166", 30);
            this.burst(this.x, this.y, [0xffd166, 0xffffff]);
          }
          this.chain = { active: false, t: 0, pts: 0, none: 0 };
        }

        loseChain(why: string) {
          if (this.chain.pts > 40) this.floatText(this.x, this.y - 60, why, "#ff6b6b", 26);
          this.chain = { active: false, t: 0, pts: 0, none: 0 };
        }

        crossGate(no: number, k: number) {
          const g = this.gates[k];
          const p = track[g.idx];
          const s = (this.x - p.x) * g.nx + (this.y - p.y) * g.ny;
          const slot = s < -43 ? 0 : s > 43 ? 2 : 1;
          const ok = slot === g.correctSlot;
          g.res = ok ? 1 : 2;
          g.rect.setFillStyle(ok ? 0x4ade80 : 0xef4444, 0.7);
          g.plates[g.correctSlot].setTint(0xaaf0b8);
          if (ok) {
            this.correct++;
            // 점수 차등: 그냥 통과 300 < 드리프트 통과 600~900 (미끄러진 각도가 클수록 가산)
            const a = Math.abs(this.slip);
            const drifting = this.sliding && a > 0.28 && Math.hypot(this.vx, this.vy) > 220;
            let bonus = 300;
            let label = "GATE";
            if (drifting) {
              bonus = 600 + Math.round(Math.min(1, (a - 0.28) / 0.6) * 300);
              label = a > 0.6 ? "PERFECT DRIFT GATE" : "DRIFT GATE";
            }
            this.score += bonus;
            this.floatText(this.x, this.y - 80, `${label} +${bonus}`, drifting ? "#ffd166" : "#4ade80", drifting ? 30 : 26);
            this.burst(this.x, this.y, [0x4ade80, 0xffffff, 0xffd166]);
            this.cameras.main.flash(120, 200, 255, 200);
          } else {
            this.score = Math.max(0, this.score - 100);
            this.vx *= 0.6;
            this.vy *= 0.6;
            this.floatText(this.x, this.y - 80, "WRONG -100", "#ff6b6b", 28);
            this.cameras.main.shake(200, 0.01);
            this.loseChain("CHAIN LOST");
          }
          this.gateNo++;
          if (this.gateNo % gatesPerLap === 0 && this.gateNo < this.qOrder.length) this.assignLap(this.gateNo / gatesPerLap);
          this.updatePrompt();
          void no;
        }

        finish() {
          if (this.state !== "run") return;
          if (this.chain.active) this.bankChain();
          this.state = "done";
          const total = this.qOrder.length;
          const timeBonus = Math.max(0, Math.round((laps * 60 - this.t) * 15));
          const finalScore = this.score + timeBonus;
          let best: number | null = null;
          try {
            const bestKey = assist ? "drift-best-assist" : "drift-best";
            const prev = Number(localStorage.getItem(bestKey));
            best = Math.max(prev || 0, finalScore);
            localStorage.setItem(bestKey, String(best));
          } catch {
            best = null;
          }
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.72).setScrollFactor(0);
          const T = (y: number, s: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(W / 2, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6, align: "center", ...extra }).setOrigin(0.5).setScrollFactor(0);
          const items: Phaser.GameObjects.GameObject[] = [
            dim,
            T(100, "FINISH!", 56, "#ffd166"),
            T(185, `${finalScore}`, 76, "#ffffff"),
            T(250, `드리프트 ${this.score}  +  시간 보너스 ${timeBonus}`, 20, "#cbd5e1", { strokeThickness: 0 }),
            T(290, `TIME ${this.t.toFixed(2)}s`, 26, "#ffffff"),
            T(328, `Gates ${this.correct} / ${total}`, 26, "#ffffff"),
          ];
          if (best !== null) items.push(T(372, `BEST ${best}`, 22, "#7dd3fc", { strokeThickness: 0 }));
          items.push(T(440, "↻  TAP TO RETRY", 24, "#0b1230", { backgroundColor: "#ffd166", padding: { x: 20, y: 10 }, strokeThickness: 0 }));
          this.overlay = this.add.container(0, 0, items).setDepth(100).setScrollFactor(0);
          finishRef.current?.({ time: this.t, driftScore: this.score, correct: this.correct, total, score: finalScore });
        }

        // ================= HUD / 이펙트 =================
        drawHud() {
          this.hud.score.setText(`${Math.round(this.score)}`);
          const ch = this.chain;
          this.hud.chain.setText(ch.active ? `DRIFT ${Math.round(ch.pts * this.mult())}  ×${this.mult().toFixed(1)}` : "");
          const lap = Math.min(laps, Math.max(1, Math.floor((this.prog - PROG0) / N) + 1));
          const sp = Math.round((Math.hypot(this.vx, this.vy) / MAX_V) * 220);
          this.hud.info.setText(`LAP ${lap}/${laps}\n${this.t.toFixed(1)}s\n${sp} km/h`);
          this.miniDot.setPosition(W - 210 + (this.x / WORLD_W) * 200, 8 + (this.y / WORLD_H) * (200 * WORLD_H / WORLD_W));
        }

        // ================= 콕핏뷰 (의사 3D) =================
        setupCockpit() {
          // 탑뷰용 월드 오브젝트는 숨긴다
          this.trackImg.setVisible(false);
          this.skid.setVisible(false);
          this.car.setVisible(false);
          this.smoke.setVisible(false);
          this.dust.setVisible(false);
          this.gates.forEach((g) => {
            g.rect.setVisible(false);
            g.plates.forEach((p) => p.setVisible(false));
            g.texts.forEach((t) => t.setVisible(false));
          });

          // 앞유리 화면 (절반 해상도 캔버스를 2배로 확대 → 가볍다)
          if (this.textures.exists("cview")) this.textures.remove("cview");
          this.cTex = this.textures.createCanvas("cview", 480, 270)!;
          this.cctx = this.cTex.getContext();
          this.skyGrad = this.cctx.createLinearGradient(0, 0, 0, 118);
          this.skyGrad.addColorStop(0, "#14275e");
          this.skyGrad.addColorStop(0.6, "#4f8bd6");
          this.skyGrad.addColorStop(1, "#ffd9a0");
          this.cview = this.add.image(W / 2, H / 2, "cview").setScale(2.12).setScrollFactor(0).setDepth(5);

          // 핸들 텍스처
          const wg = this.make.graphics({ x: 0, y: 0 }, false);
          wg.translateCanvas(160, 160);
          wg.lineStyle(26, 0x111827, 1).strokeCircle(0, 0, 138);
          wg.lineStyle(3, 0x475569, 1).strokeCircle(0, 0, 150);
          wg.fillStyle(0x1f2937, 1).fillRect(-138, -14, 276, 28).fillRect(-14, 0, 28, 138);
          wg.fillStyle(0x0b1020, 1).fillCircle(0, 0, 38);
          wg.fillStyle(0xe63946, 1).fillRect(-5, -150, 10, 28); // 12시 표시
          wg.generateTexture("cwheel", 320, 320);
          wg.destroy();

          // 대시보드 + 기둥 + 계기 (한 번만 그려서 이미지로)
          if (this.textures.exists("cdash")) this.textures.remove("cdash");
          const dt = this.textures.createCanvas("cdash", W, H)!;
          const c = dt.getContext();
          c.fillStyle = "#070a14";
          c.beginPath(); c.moveTo(0, 0); c.lineTo(110, 0); c.lineTo(46, 440); c.lineTo(0, 440); c.closePath(); c.fill();
          c.beginPath(); c.moveTo(W, 0); c.lineTo(W - 110, 0); c.lineTo(W - 46, 440); c.lineTo(W, 440); c.closePath(); c.fill();
          c.fillRect(0, 0, W, 16);
          c.fillStyle = "rgba(125,211,252,0.18)";
          c.fillRect(102, 0, 3, 120);
          // 룸미러
          c.fillStyle = "#0b1020";
          c.beginPath(); c.roundRect?.(360, 22, 240, 54, 14); c.fill();
          c.fillStyle = "rgba(125,211,252,0.18)";
          c.beginPath(); c.roundRect?.(368, 28, 224, 42, 10); c.fill();
          // 대시보드
          const dg = c.createLinearGradient(0, 410, 0, H);
          dg.addColorStop(0, "#232c46");
          dg.addColorStop(1, "#05070d");
          c.fillStyle = dg;
          c.beginPath(); c.moveTo(0, H); c.lineTo(0, 478); c.quadraticCurveTo(W / 2, 380, W, 478); c.lineTo(W, H); c.closePath(); c.fill();
          c.strokeStyle = "rgba(125,211,252,0.55)"; c.lineWidth = 2;
          c.beginPath(); c.moveTo(0, 478); c.quadraticCurveTo(W / 2, 380, W, 478); c.stroke();
          // 계기판 두 개
          const dial = (cx: number, cy: number, ticks: number, a0: number, a1: number, label: string) => {
            c.save();
            c.translate(cx, cy);
            c.scale(0.74, 0.74);
            cx = 0;
            cy = 0;
            c.fillStyle = "#04101c"; c.beginPath(); c.arc(cx, cy, 62, 0, Math.PI * 2); c.fill();
            c.strokeStyle = "#38bdf8"; c.lineWidth = 3; c.stroke();
            for (let k = 0; k <= ticks; k++) {
              const a = ((a0 + ((a1 - a0) * k) / ticks) * Math.PI) / 180;
              const r1 = k % 5 === 0 ? 44 : 50;
              c.strokeStyle = k % 5 === 0 ? "#e2e8f0" : "#64748b"; c.lineWidth = k % 5 === 0 ? 2.5 : 1.5;
              c.beginPath(); c.moveTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1); c.lineTo(cx + Math.sin(a) * 56, cy - Math.cos(a) * 56); c.stroke();
            }
            c.fillStyle = "#7dd3fc"; c.font = "bold 12px sans-serif"; c.textAlign = "center"; c.fillText(label, cx, cy + 40);
            c.restore();
          };
          dial(340, 486, 20, -120, 120, "SPEED");
          dial(620, 486, 12, -90, 90, "SLIP");
          dt.refresh();
          this.add.image(0, 0, "cdash").setOrigin(0).setScrollFactor(0).setDepth(20);
          this.cwheel = this.add.image(W / 2, 592, "cwheel").setScrollFactor(0).setDepth(21);
          this.speedNeedle = this.add.rectangle(340, 486, 3, 33, 0xff5252).setOrigin(0.5, 1).setScrollFactor(0).setDepth(23);
          this.slipNeedle = this.add.rectangle(620, 486, 3, 33, 0xfacc15).setOrigin(0.5, 1).setScrollFactor(0).setDepth(23);
          [this.speedNeedle, this.slipNeedle].forEach((n) => this.add.circle(n.x, n.y, 5, 0xe2e8f0).setScrollFactor(0).setDepth(24));
        }

        drawCockpit(time: number) {
          const ctx = this.cctx;
          const CW = 480;
          const CH = 270;
          const HZ = 118;
          const sn = Math.min(1, Math.hypot(this.vx, this.vy) / MAX_V);
          const FOC = 290 - sn * 55;
          const CAMH = 40;
          const cosT = Math.cos(this.theta);
          const sinT = Math.sin(this.theta);
          const proj = (wx: number, wy: number) => {
            const dx = wx - this.x;
            const dy = wy - this.y;
            const f = dx * cosT + dy * sinT;
            const r = -dx * sinT + dy * cosT;
            return { x: CW / 2 + (r * FOC) / f, y: HZ + (CAMH * FOC) / f, f };
          };
          const poly = (pts: { x: number; y: number }[], color: string) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
            ctx.closePath();
            ctx.fill();
          };

          // 하늘 + 산 (진행 방향에 따라 좌우로 흐른다)
          ctx.fillStyle = this.skyGrad;
          ctx.fillRect(0, 0, CW, HZ + 1);
          const off = (((-this.theta * 220) % 720) + 720) % 720;
          ctx.fillStyle = "#4a4a86";
          for (let rep = -1; rep <= 1; rep++) {
            const bx = -off + rep * 720;
            ctx.beginPath();
            ctx.moveTo(bx, HZ);
            [[0, 0], [80, 60], [150, 22], [240, 88], [330, 30], [420, 72], [520, 26], [620, 66], [720, 0]].forEach(([px, py]) => ctx.lineTo(bx + px, HZ - py));
            ctx.lineTo(bx + 720, HZ);
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = "#2f7a3b";
          ctx.fillRect(0, HZ, CW, CH - HZ);

          // 앞쪽 도로 점 수집
          type Pt = { i: number; ok: boolean; sy: number; pl: P; pr: P; plo: P; pro: P; pc1: P; pc2: P };
          const pts: Pt[] = [];
          const i0 = (this.idx - 4 + N) % N;
          const HW = TRACK_W / 2;
          const KW = 20;
          for (let s = 0; s < 120; s++) {
            const i = (i0 + s * 2) % N;
            const p = track[i];
            const t = tangent(i);
            const nx = -t.y;
            const ny = t.x;
            const pl = proj(p.x - nx * HW, p.y - ny * HW);
            const pr = proj(p.x + nx * HW, p.y + ny * HW);
            const plo = proj(p.x - nx * (HW + KW), p.y - ny * (HW + KW));
            const pro = proj(p.x + nx * (HW + KW), p.y + ny * (HW + KW));
            const pc1 = proj(p.x - nx * 2.5, p.y - ny * 2.5);
            const pc2 = proj(p.x + nx * 2.5, p.y + ny * 2.5);
            pts.push({ i, ok: pl.f > 12 && pr.f > 12, sy: pl.y, pl, pr, plo, pro, pc1, pc2 });
          }
          for (let k = pts.length - 2; k >= 0; k--) {
            const a = pts[k];
            const b = pts[k + 1];
            if (!a.ok || !b.ok || a.sy <= b.sy) continue;
            const par = Math.floor(a.i / 6) % 2;
            ctx.fillStyle = par ? "#2f7a3b" : "#3a8a46";
            ctx.fillRect(0, b.sy, CW, a.sy - b.sy + 1);
            const kc = Math.floor(a.i / 2) % 2 ? "#d62839" : "#f1f5f9";
            poly([a.plo, a.pl, b.pl, b.plo], kc);
            poly([a.pr, a.pro, b.pro, b.pr], kc);
            poly([a.pl, a.pr, b.pr, b.pl], Math.floor(a.i / 3) % 2 ? "#3b404c" : "#434855");
            if (Math.floor(a.i / 3) % 2 === 0) poly([a.pc1, a.pc2, b.pc2, b.pc1], "rgba(255,255,255,0.8)");
            if (a.i >= 0 && a.i < 4) poly([a.pl, a.pr, b.pr, b.pl], "#ffffff"); // 출발선
          }

          // 단어 게이트 (먼 것부터)
          const gs = this.gates
            .map((g) => {
              const p = track[g.idx];
              return { g, p, f: proj(p.x, p.y).f };
            })
            .filter((o) => o.f > 28 && o.f < 1700)
            .sort((u, v) => v.f - u.f);
          gs.forEach(({ g, p }) => {
            const t = tangent(g.idx);
            const nx = -t.y;
            const ny = t.x;
            const L = proj(p.x - nx * HW, p.y - ny * HW);
            const R = proj(p.x + nx * HW, p.y + ny * HW);
            const sc0 = FOC / proj(p.x, p.y).f;
            ctx.strokeStyle = g.res === 1 ? "rgba(74,222,128,0.9)" : g.res === 2 ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.6)";
            ctx.lineWidth = Math.max(1, 5 * sc0);
            ctx.beginPath();
            ctx.moveTo(L.x, L.y);
            ctx.lineTo(R.x, R.y);
            ctx.stroke();
            [-86, 0, 86].forEach((o, si) => {
              const q = proj(p.x + nx * o, p.y + ny * o);
              if (q.f < 20) return;
              const sc = FOC / q.f;
              const w = 90 * sc;
              const h = 30 * sc;
              const yTop = q.y - (44 + 30) * sc;
              const good = g.res === 1 && si === g.correctSlot;
              ctx.fillStyle = good ? "#bbf7d0" : "#fff3c4";
              ctx.fillRect(q.x - w / 2, yTop, w, h);
              ctx.strokeStyle = "#3a2410";
              ctx.lineWidth = Math.max(1, 2 * sc);
              ctx.strokeRect(q.x - w / 2, yTop, w, h);
              ctx.fillStyle = "#6b4a2a";
              ctx.fillRect(q.x - 2 * sc, yTop + h, 4 * sc, 44 * sc);
              let px = Math.max(5, 14 * sc);
              ctx.font = `bold ${px}px sans-serif`;
              const label = g.texts[si].text;
              const tw = ctx.measureText(label).width;
              if (tw > w - 4) {
                px = (px * (w - 4)) / tw;
                ctx.font = `bold ${px}px sans-serif`;
              }
              ctx.fillStyle = "#10172e";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(label, q.x, yTop + h / 2);
            });
          });

          // 속도선
          if (sn > 0.55) {
            ctx.strokeStyle = `rgba(255,255,255,${(sn - 0.55) * 0.7})`;
            ctx.lineWidth = 1.2;
            for (let k = 0; k < 14; k++) {
              const ang = (k / 14) * Math.PI * 2 + 0.2;
              const ph = (time / 260 + k * 0.37) % 1;
              const r1 = 60 + ph * 220;
              const r2 = r1 + 18 + sn * 30;
              ctx.beginPath();
              ctx.moveTo(CW / 2 + Math.cos(ang) * r1, HZ + 20 + Math.sin(ang) * r1 * 0.55);
              ctx.lineTo(CW / 2 + Math.cos(ang) * r2, HZ + 20 + Math.sin(ang) * r2 * 0.55);
              ctx.stroke();
            }
          }
          this.cTex.refresh();

          // 차체 흔들림(롤)과 오버레이 갱신
          this.cview.setRotation(Phaser.Math.Clamp(-this.slip * 0.05, -0.07, 0.07)).setY(H / 2 + Math.sin(time / 90) * sn * 3);
          this.cwheel.setRotation(this.steer * 1.25);
          this.speedNeedle.setRotation(((-120 + sn * 240) * Math.PI) / 180);
          this.slipNeedle.setRotation(Phaser.Math.Clamp(this.slip, -1, 1) * 1.5);
        }

        burst(x: number, y: number, tints: number[]) {
          if (view === "cockpit") return;
          const em = this.add.particles(x, y, "dspark", {
            speed: { min: 120, max: 380 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 400, max: 800 },
            scale: { start: 0.6, end: 0 },
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
          this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1000, delay: 250, ease: "Quad.out", onComplete: () => t.destroy() });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: W,
        height: H,
        backgroundColor: "#0b1230",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: DriftScene,
        input: { touch: { capture: true } },
      });
      if (process.env.NODE_ENV !== "production") (window as unknown as { __archeryGame?: Phaser.Game }).__archeryGame = game;
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
      game = null;
    };
    // 문제/설정은 마운트 시 1회만 사용(바꾸려면 key로 재마운트)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="w-full mx-auto rounded-2xl overflow-hidden shadow-2xl touch-none select-none" style={{ maxWidth: 960, aspectRatio: `${W} / ${H}` }} />;
}
