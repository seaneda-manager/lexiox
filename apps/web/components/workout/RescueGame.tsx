"use client";

import { useEffect, useRef } from "react";
import type { ArcheryQuestion } from "./ArcheryPhaser";
import { createJoystick, type Joystick } from "@/lib/workout/virtualJoystick";

/**
 * Rescue Raiders (횡스크롤 헬기 구출)
 *  - 위에 뜻이 나오고, 지상의 인원들은 철자 태그를 달고 있다. 목표 단어의 글자를 "순서대로" 태워야 한다.
 *  - 착륙해서 다음 글자의 인원 근처에 내리면 그 인원이 달려와 탑승(좌석 4). 기지에 착륙하면 글자를 내려 단어를 채운다.
 *  - 위협: 지대공 미사일(SAM, 유도탄), 대공포(AA, 예측 사격). 기관총·로켓으로 격추 가능.
 */
type Props = {
  questions: ArcheryQuestion[]; // answer가 영어 단어(3~9글자)인 문제
  rounds?: number;
  level?: "easy" | "normal" | "hard"; // 시작 난이도(스테이지별로 계속 올라간다)
  onFinish?: (r: { score: number; words: number; rounds: number }) => void;
};

const W = 960;
const H = 540;
const WORLD_W = 3400;
const GROUND_Y = 470;
const HELI_SCALE = 0.55; // 헬기 크기(원본 84x52 텍스처 기준)
const JET_SCALE = 0.55; // 적기 크기(원본 76x30)
const SKID = 14; // 헬기 중심에서 스키드 바닥까지
const BASE_X = 150;
const SEATS = 4;
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif";

type StageParams = {
  sams: number; // 가동하는 SAM 수
  aas: number; // 가동하는 대공포 수
  missileSpeed: number;
  missileTurn: number; // 유도 선회율(rad/s)
  samEvery: number; // SAM 발사 간격(ms)
  aaEvery: number; // 대공포 발사 간격(ms)
  aaLead: number; // 예측 사격 정확도(1=정확, 낮을수록 어설픔)
  jetSpeed: [number, number];
  jetShot: number; // 적기 사격 간격 기준(ms)
  jetHp: number;
  decoys: number; // 미끼 글자 인원 수
  jets: number; // 한 편대에 오는 적기 수
  waveGap: number; // 편대 사이 쉬는 시간(ms)
  threatGap: number; // 어떤 시설이든 발사 사이 최소 간격(ms) — 연달아 쏟아지지 않게
  maxMissiles: number; // 동시에 떠 있을 수 있는 미사일 수
  maxFlak: number; // 동시에 떠 있을 수 있는 대공포탄 수
};

// 스테이지 0(가장 쉬움) → 4(가장 어려움). 보통 난이도는 1~3단계로 3스테이지를 진행한다.
const STAGES: StageParams[] = [
  { sams: 1, aas: 1, missileSpeed: 175, missileTurn: 1.1, samEvery: 9000, aaEvery: 6500, aaLead: 0.55, jetSpeed: [65, 90], jetShot: 5600, jetHp: 2, decoys: 2, jets: 1, waveGap: 11000, threatGap: 3500, maxMissiles: 1, maxFlak: 1 },
  { sams: 1, aas: 2, missileSpeed: 195, missileTurn: 1.3, samEvery: 8000, aaEvery: 5800, aaLead: 0.7, jetSpeed: [75, 100], jetShot: 4800, jetHp: 2, decoys: 3, jets: 1, waveGap: 9500, threatGap: 3000, maxMissiles: 1, maxFlak: 1 },
  { sams: 2, aas: 3, missileSpeed: 215, missileTurn: 1.55, samEvery: 7000, aaEvery: 5000, aaLead: 0.85, jetSpeed: [85, 115], jetShot: 4200, jetHp: 3, decoys: 4, jets: 2, waveGap: 8500, threatGap: 2600, maxMissiles: 1, maxFlak: 1 },
  { sams: 3, aas: 4, missileSpeed: 235, missileTurn: 1.8, samEvery: 6000, aaEvery: 4400, aaLead: 1, jetSpeed: [95, 130], jetShot: 3600, jetHp: 3, decoys: 5, jets: 2, waveGap: 7000, threatGap: 2200, maxMissiles: 2, maxFlak: 2 },
  { sams: 3, aas: 4, missileSpeed: 255, missileTurn: 2.1, samEvery: 5000, aaEvery: 3600, aaLead: 1, jetSpeed: [110, 145], jetShot: 3000, jetHp: 4, decoys: 6, jets: 3, waveGap: 5500, threatGap: 1800, maxMissiles: 2, maxFlak: 2 },
];

export default function RescueGame({ questions, rounds = 3, level = "normal", onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (cancelled || !hostRef.current) return;

      type Man = { c: Phaser.GameObjects.Container; letter: string; x: number; state: "wait" | "run" | "gone"; shake: number };
      type Site = { img: Phaser.GameObjects.Image; x: number; hp: number; max: number; next: number; kind: "sam" | "aa"; bar: Phaser.GameObjects.Rectangle; launchAt: number; warn: Phaser.GameObjects.Arc | null };
      type Proj = { img: Phaser.GameObjects.Image; vx: number; vy: number; life: number };
      type Flak = { dot: Phaser.GameObjects.Arc; tx: number; ty: number; t: number; dur: number };
      type Jet = { c: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image; vx: number; hp: number; y0: number; phase: number; nextShot: number };

      class RescueScene extends Phaser.Scene {
        state: "start" | "play" | "between" | "done" = "start";
        round = 0;
        score = 0;
        wordsDone = 0;
        word = "";
        clue = "";
        got = 0; // 기지에 내려놓은 글자 수
        onboard: string[] = [];
        pool: ArcheryQuestion[] = [];
        used = new Set<string>();
        // 헬기
        heli!: Phaser.GameObjects.Container;
        rotor!: Phaser.GameObjects.Rectangle;
        vx = 0;
        vy = 0;
        facing = 1;
        landed = false;
        armor = 3;
        rockets = 3;
        invul = 0;
        lastShot = 0;
        unloadAt = 0;
        men: Man[] = [];
        sites: Site[] = [];
        missiles: Proj[] = [];
        flaks: Flak[] = [];
        bullets: Proj[] = [];
        rocketsOut: Proj[] = [];
        // 적기: 단어 없이 날아와 사격하는 적 전투기. 기관총/로켓으로 격추할 수 있다(+50)
        jets: Jet[] = [];
        ebullets: Proj[] = [];
        waveAt = 0;
        hintAt = 0;
        nextThreatAt = 0; // 이 시간 전에는 새 미사일/대공포탄 발사 경고를 시작하지 않는다
        joy!: Joystick;
        mtn!: Phaser.GameObjects.TileSprite;
        grd!: Phaser.GameObjects.TileSprite;
        panel!: Phaser.GameObjects.Rectangle;
        slotTxt!: Phaser.GameObjects.Text;
        hud!: Record<"clue" | "score" | "armor" | "ammo" | "round" | "warn" | "base" | "seat", Phaser.GameObjects.Text>;
        overlay: Phaser.GameObjects.Container | null = null;
        fireBtn!: Phaser.GameObjects.Rectangle;
        rocketBtn!: Phaser.GameObjects.Rectangle;
        keys!: Record<string, Phaser.Input.Keyboard.Key>;

        constructor() {
          super("rescue");
        }

        create() {
          this.state = "start";
          this.men = [];
          this.sites = [];
          this.missiles = [];
          this.flaks = [];
          this.bullets = [];
          this.rocketsOut = [];
          this.jets = [];
          this.ebullets = [];
          this.onboard = [];
          this.used = new Set();
          this.score = 0;
          this.wordsDone = 0;
          this.round = 0;
          this.armor = 3;
          this.rockets = 3;
          const ok = questions.filter((q) => /^[A-Za-z]{3,9}$/.test(q.answer));
          this.pool = Phaser.Utils.Array.Shuffle(ok.length ? ok : [...questions]);

          this.makeTextures();
          this.buildWorld();
          this.buildHeli();
          this.joy = createJoystick(this, { x: 100, y: H - 110, radius: 56, depth: 90 }); // HUD가 참조하므로 먼저 만든다
          this.buildHud();
          this.cameras.main.setBounds(0, 0, WORLD_W, H);
          this.cameras.main.startFollow(this.heli, true, 0.1, 0.1, 0, 0);

          const kb = this.input.keyboard!;
          this.keys = {
            left: kb.addKey("LEFT"), right: kb.addKey("RIGHT"), up: kb.addKey("UP"), down: kb.addKey("DOWN"),
            a: kb.addKey("A"), d: kb.addKey("D"), w: kb.addKey("W"), s: kb.addKey("S"), space: kb.addKey("SPACE"),
          };
          kb.on("keydown-SPACE", () => this.state !== "play" && this.onAnyStart());
          kb.on("keydown-ENTER", () => this.onAnyStart());
          ["SHIFT", "X", "B"].forEach((k) => kb.on(`keydown-${k}`, () => this.fireRocket()));
          this.input.addPointer(2);
          this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
            if (this.state === "start" || this.state === "done") return this.onAnyStart();
            if (p.wasTouch && p.x > W - 130 && p.y > H - 130) this.fireRocket();
          });
          this.showStart();
        }

        makeTextures() {
          const fresh = (key: string, w: number, h: number) => {
            if (this.textures.exists(key)) this.textures.remove(key);
            return this.textures.createCanvas(key, w, h)!;
          };
          const g = this.make.graphics({ x: 0, y: 0 }, false);
          g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
          g.generateTexture("spark", 16, 16);
          g.clear();
          // 헬기 (오른쪽이 앞)
          g.fillStyle(0x3f6212, 1).fillEllipse(44, 26, 62, 30);
          g.fillStyle(0x4d7c0f, 1).fillEllipse(46, 22, 54, 20);
          g.fillStyle(0x7dd3fc, 0.95).fillEllipse(62, 22, 26, 18);
          g.fillStyle(0xffffff, 0.5).fillEllipse(66, 18, 10, 6);
          g.fillStyle(0x3f6212, 1).fillRect(4, 22, 26, 7).fillRect(0, 10, 8, 20);
          g.fillStyle(0x1c1917, 1).fillRect(34, 2, 6, 10);
          g.lineStyle(3, 0x1c1917, 1).lineBetween(22, 46, 74, 46).lineBetween(32, 38, 30, 46).lineBetween(58, 38, 60, 46);
          g.generateTexture("heli", 84, 52);
          g.clear();
          // 사람
          g.fillStyle(0xf1c9a0, 1).fillCircle(9, 7, 6);
          g.fillStyle(0x15803d, 1).fillRoundedRect(3, 13, 12, 14, 3);
          g.fillStyle(0x1f2937, 1).fillRect(4, 26, 4, 8).fillRect(10, 26, 4, 8);
          g.generateTexture("man", 18, 34);
          g.clear();
          // 글자 태그
          g.fillStyle(0x1e3a8a, 1).fillCircle(15, 15, 14);
          g.lineStyle(3, 0xffd166, 1).strokeCircle(15, 15, 13);
          g.generateTexture("tag", 30, 30);
          g.clear();
          // SAM 발사대
          g.fillStyle(0x44403c, 1).fillRect(4, 30, 52, 14);
          g.fillStyle(0x57534e, 1).fillRect(12, 20, 36, 14);
          g.fillStyle(0x78716c, 1).fillRect(26, 0, 8, 26);
          g.fillStyle(0xdc2626, 1).fillTriangle(30, -4, 25, 6, 35, 6);
          g.generateTexture("sam", 60, 48);
          g.clear();
          // 대공포
          g.fillStyle(0x3f3f46, 1).fillRoundedRect(6, 28, 44, 14, 4);
          g.fillStyle(0x52525b, 1).fillCircle(28, 28, 13);
          g.lineStyle(6, 0x27272a, 1).lineBetween(28, 28, 46, 6);
          g.generateTexture("aa", 56, 44);
          g.clear();
          // 미사일 / 탄
          g.fillStyle(0xf8fafc, 1).fillRoundedRect(0, 0, 26, 8, 3);
          g.fillStyle(0xdc2626, 1).fillTriangle(26, 0, 34, 4, 26, 8);
          g.fillStyle(0xfb923c, 1).fillRect(0, 2, 5, 4);
          g.generateTexture("missile", 34, 8);
          g.clear();
          g.fillStyle(0xfde047, 1).fillRoundedRect(0, 0, 12, 4, 2);
          g.generateTexture("bullet", 12, 4);
          g.clear();
          g.fillStyle(0xfb923c, 1).fillRoundedRect(0, 0, 22, 8, 3);
          g.fillStyle(0xffffff, 1).fillRect(0, 2, 6, 4);
          g.generateTexture("rocket", 22, 8);
          g.clear();
          // 적 전투기 (오른쪽이 앞)
          g.fillStyle(0x7f1d1d, 1).fillTriangle(0, 6, 22, 14, 0, 22);
          g.fillStyle(0xb91c1c, 1).fillEllipse(40, 14, 62, 14);
          g.fillStyle(0xef4444, 1).fillTriangle(20, 14, 52, 0, 56, 14).fillTriangle(20, 14, 52, 28, 56, 14);
          g.fillStyle(0xfde68a, 1).fillEllipse(54, 12, 14, 7);
          g.generateTexture("jet", 76, 30);
          g.clear();
          g.fillStyle(0xfb7185, 1).fillCircle(6, 6, 6);
          g.fillStyle(0xffffff, 0.9).fillCircle(6, 6, 3);
          g.generateTexture("ebul", 12, 12);
          g.clear();
          // 야자수
          g.fillStyle(0x78350f, 1).fillRect(14, 20, 6, 38);
          g.fillStyle(0x16a34a, 1).fillEllipse(8, 18, 26, 8).fillEllipse(30, 18, 26, 8).fillEllipse(18, 10, 24, 8);
          g.generateTexture("palm", 38, 60);
          g.clear();
          // 기지 패드 + 깃발
          g.fillStyle(0x374151, 1).fillRect(0, 10, 170, 12);
          g.fillStyle(0xfacc15, 1).fillRect(10, 14, 150, 4);
          g.fillStyle(0xe5e7eb, 1).fillRect(160, -50, 4, 62);
          g.fillStyle(0x2563eb, 1).fillTriangle(164, -50, 164, -30, 192, -40);
          g.generateTexture("pad", 196, 64);
          g.destroy();

          // 산 (512x256 POT, 가로 반복)
          const mt = fresh("rr-mtn", 512, 256);
          const c = mt.getContext();
          c.fillStyle = "#64748b";
          c.beginPath(); c.moveTo(0, 256);
          [[0, 120], [80, 60], [160, 130], [250, 40], [340, 120], [420, 70], [512, 120]].forEach(([x, y]) => c.lineTo(x, y));
          c.lineTo(512, 256); c.closePath(); c.fill();
          c.fillStyle = "#475569";
          c.beginPath(); c.moveTo(0, 256);
          [[0, 170], [100, 120], [200, 180], [300, 110], [400, 170], [512, 140]].forEach(([x, y]) => c.lineTo(x, y));
          c.lineTo(512, 256); c.closePath(); c.fill();
          mt.refresh();
          // 땅 (256x128)
          const gt = fresh("rr-ground", 256, 128);
          const d = gt.getContext();
          d.fillStyle = "#a16207";
          d.fillRect(0, 0, 256, 128);
          d.fillStyle = "#ca8a04";
          d.fillRect(0, 0, 256, 8);
          for (let i = 0; i < 90; i++) {
            d.fillStyle = i % 2 ? "rgba(120,53,15,0.4)" : "rgba(253,224,71,0.25)";
            d.fillRect(Math.random() * 256, 8 + Math.random() * 120, 3 + Math.random() * 4, 2);
          }
          gt.refresh();
          // 하늘
          const sk = fresh("rr-sky", W, H);
          const s = sk.getContext();
          const gr = s.createLinearGradient(0, 0, 0, H);
          gr.addColorStop(0, "#1d4ed8");
          gr.addColorStop(0.55, "#7dd3fc");
          gr.addColorStop(1, "#fde68a");
          s.fillStyle = gr;
          s.fillRect(0, 0, W, H);
          for (let i = 0; i < 7; i++) {
            s.fillStyle = "rgba(255,255,255,0.6)";
            const x = Math.random() * W;
            const y = 40 + Math.random() * 180;
            for (let k = 0; k < 4; k++) {
              s.beginPath(); s.ellipse(x + k * 24, y + (k % 2) * 6, 34, 15, 0, 0, Math.PI * 2); s.fill();
            }
          }
          sk.refresh();
        }

        buildWorld() {
          this.add.image(0, 0, "rr-sky").setOrigin(0).setScrollFactor(0).setDepth(0);
          this.mtn = this.add.tileSprite(0, GROUND_Y - 250, W, 256, "rr-mtn").setOrigin(0).setScrollFactor(0).setDepth(1).setAlpha(0.9);
          this.grd = this.add.tileSprite(0, GROUND_Y, W, H - GROUND_Y, "rr-ground").setOrigin(0).setScrollFactor(0).setDepth(2);
          for (let i = 0; i < 40; i++) this.add.image(300 + i * 80 + Phaser.Math.Between(-20, 20), GROUND_Y - 26, "palm").setDepth(3).setAlpha(0.9).setScale(Phaser.Math.FloatBetween(0.8, 1.2));
          this.add.image(BASE_X, GROUND_Y - 10, "pad").setDepth(4);
          this.add.text(BASE_X + 20, GROUND_Y + 6, "BASE", { fontFamily: FONT, fontSize: "16px", color: "#fff", fontStyle: "bold" }).setDepth(4);
        }

        /** 스테이지 난이도 파라미터 (쉬움은 한 단계 낮게, 어려움은 한 단계 높게) */
        params(): StageParams {
          const off = level === "easy" ? 0 : level === "hard" ? 2 : 1;
          return STAGES[Phaser.Math.Clamp(this.round + off, 0, STAGES.length - 1)];
        }

        /** 이번 스테이지의 대공 시설을 새로 배치한다 */
        buildSites() {
          this.sites.forEach((s) => {
            s.img.destroy();
            s.bar.destroy();
            s.warn?.destroy();
          });
          this.sites = [];
          const P = this.params();
          const sam = [1050, 1950, 2850].slice(0, P.sams);
          const aa = [720, 1500, 2350, 3150].slice(0, P.aas);
          sam.forEach((x) => this.addSite("sam", x));
          aa.forEach((x) => this.addSite("aa", x));
        }

        addSite(kind: "sam" | "aa", x: number) {
          const img = this.add.image(x, GROUND_Y - 22, kind).setDepth(5);
          const max = kind === "sam" ? 10 : 7;
          const bar = this.add.rectangle(x, GROUND_Y - 58, 44, 5, 0xef4444).setDepth(6);
          this.sites.push({ img, x, hp: max, max, next: this.time.now + 5000 + Math.random() * 3000, kind, bar, launchAt: 0, warn: null });
        }

        buildHeli() {
          const body = this.add.image(0, 0, "heli").setScale(HELI_SCALE);
          this.rotor = this.add.rectangle(0, -26 * HELI_SCALE, 90 * HELI_SCALE, 3, 0x111827).setOrigin(0.5);
          this.heli = this.add.container(BASE_X + 20, GROUND_Y - SKID, [body, this.rotor]).setDepth(10);
          this.vx = this.vy = 0;
          this.landed = true;
          this.facing = 1;
        }

        buildHud() {
          const t = (x: number, y: number, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(x, y, "", { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 4, ...extra }).setScrollFactor(0).setDepth(50);
          this.panel = this.add.rectangle(W / 2, 46, 520, 84, 0x0b1230, 0.8).setScrollFactor(0).setDepth(49).setStrokeStyle(2, 0xffd166, 0.9);
          this.hud = {
            clue: this.add.text(W / 2, 26, "", { fontFamily: FONT, fontSize: "17px", color: "#fff", align: "center", wordWrap: { width: 490 } }).setOrigin(0.5).setScrollFactor(0).setDepth(51),
            score: t(14, 10, 26, "#fff"),
            armor: t(14, 44, 22, "#ff5d6c"),
            ammo: t(W - 14, 10, 20, "#fdba74").setOrigin(1, 0),
            round: t(W - 14, 38, 16, "#ffd166").setOrigin(1, 0),
            seat: t(W - 14, 62, 15, "#7dd3fc").setOrigin(1, 0),
            warn: t(W / 2, 108, 24, "#ff6b6b").setOrigin(0.5),
            base: t(W / 2, 140, 16, "#bfdbfe", { strokeThickness: 3 }).setOrigin(0.5),
          };
          this.slotTxt = this.add.text(W / 2, 66, "", { fontFamily: FONT, fontSize: "26px", color: "#ffffff", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(51);
          // 폰용 버튼
          this.fireBtn = this.add.rectangle(W - 70, H - 60, 100, 70, 0xb91c1c, 0.5).setScrollFactor(0).setDepth(52).setStrokeStyle(2, 0xfca5a5, 0.9);
          this.add.text(W - 70, H - 60, "FIRE", { fontFamily: FONT, fontSize: "20px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5).setScrollFactor(0).setDepth(53);
          this.rocketBtn = this.add.rectangle(W - 70, H - 140, 100, 56, 0xc2410c, 0.5).setScrollFactor(0).setDepth(52).setStrokeStyle(2, 0xfdba74, 0.9);
          this.add.text(W - 70, H - 140, "ROCKET", { fontFamily: FONT, fontSize: "16px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5).setScrollFactor(0).setDepth(53);
          this.setHud(false);
        }

        setHud(v: boolean) {
          this.panel.setVisible(v);
          this.slotTxt.setVisible(v);
          Object.values(this.hud).forEach((o) => o.setVisible(v));
          const touch = !!this.joy?.visible;
          this.fireBtn.setVisible(v && touch);
          this.rocketBtn.setVisible(v && touch);
        }

        // ---------- 흐름 ----------
        showStart() {
          this.state = "start";
          this.setHud(false);
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.62).setScrollFactor(0).setDepth(90);
          const title = this.add.text(W / 2, 110, "RESCUE RAIDERS", { fontFamily: FONT, fontSize: "58px", color: "#bef264", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 }).setOrigin(0.5).setScrollFactor(0).setDepth(91);
          const sub = this.add
            .text(
              W / 2,
              270,
              "위에 나온 뜻의 단어를 만드세요! 단어는 보이지 않고 글자 수만 나와요\n지상의 인원들은 철자 태그를 달고 있어요\n착륙해서 글자를 태우고 기지에 내려놓으면\n순서가 맞는 글자만 단어에 채워져요 (틀리면 -30)\n\n대공 미사일(유도)·대공포·적기의 사격을 피하거나 격추하세요\n위협은 스테이지가 올라갈수록 늘어나요\n\n← → ↑ ↓ / WASD 이동 · 아래로 내려 착륙\nSpace 기관총 · Shift/X 로켓 (폰: 조이패드 + 버튼)",
              { fontFamily: FONT, fontSize: "19px", color: "#fff", align: "center", lineSpacing: 7 },
            )
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(91);
          const go = this.add.text(W / 2, 470, "▶  PRESS SPACE / TAP", { fontFamily: FONT, fontSize: "26px", color: "#0b1230", backgroundColor: "#bef264", padding: { x: 22, y: 10 }, fontStyle: "bold" }).setOrigin(0.5).setScrollFactor(0).setDepth(91);
          this.tweens.add({ targets: go, scale: 1.06, duration: 700, yoyo: true, repeat: -1 });
          this.overlay = this.add.container(0, 0, [dim, title, sub, go]).setScrollFactor(0).setDepth(90);
        }

        onAnyStart() {
          if (this.state === "start") {
            this.overlay?.destroy();
            this.overlay = null;
            this.setHud(true);
            this.startRound();
          } else if (this.state === "done") this.scene.restart();
        }

        pickWord() {
          let q = this.pool.find((p) => !this.used.has(p.answer));
          if (!q) {
            this.used.clear();
            q = this.pool[0];
          }
          this.used.add(q.answer);
          this.word = q.answer.toLowerCase();
          this.clue = q.prompt;
        }

        startRound() {
          this.state = "play";
          this.pickWord();
          this.got = 0;
          this.onboard = [];
          this.clearJets();
          this.waveAt = this.time.now + 7000; // 첫 적기 편대는 여유를 두고 온다
          this.men.forEach((m) => m.c.destroy());
          this.men = [];
          // 인원 배치: 단어 글자 + 미끼 글자 3개, 위협 근처를 피해서 흩어 둔다
          this.buildSites();
          const P = this.params();
          const letters = this.word.split("");
          const abc = "abcdefghijklmnopqrstuvwxyz".split("");
          for (let i = 0; i < P.decoys; i++) letters.push(abc[Math.floor(Math.random() * abc.length)]);
          Phaser.Utils.Array.Shuffle(letters);
          const span = (WORLD_W - 1000) / letters.length;
          letters.forEach((l, i) => this.addMan(l, this.freeX(650 + i * span)));
          this.rockets = Math.min(5, this.rockets + 2);
          this.refreshHud();
          // 스테이지 시작 배너
          const banner = this.add
            .text(W / 2, 230, `STAGE ${this.round + 1}`, { fontFamily: FONT, fontSize: "64px", color: "#bef264", fontStyle: "bold", stroke: "#0b1230", strokeThickness: 8 })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(80);
          this.tweens.add({ targets: banner, alpha: 0, y: 200, duration: 1400, delay: 700, onComplete: () => banner.destroy() });
        }

        /** 인원이 서 있을 자리: 대공 시설에서 90 이상, 다른 인원에서 130 이상 떨어진 곳(옆 사람이 같이 타지 않게) */
        freeX(prefer?: number): number {
          for (let k = 0; k < 80; k++) {
            const x = prefer !== undefined && k < 10 ? prefer + Phaser.Math.Between(-60, 60) : Phaser.Math.Between(560, WORLD_W - 100);
            if (this.sites.some((s) => Math.abs(s.x - x) < 90)) continue;
            if (this.men.some((m) => m.state !== "gone" && Math.abs(m.x - x) < 130)) continue;
            return Phaser.Math.Clamp(x, 500, WORLD_W - 80);
          }
          return Phaser.Math.Between(560, WORLD_W - 100);
        }

        addMan(letter: string, x: number) {
          const body = this.add.image(0, 0, "man");
          const tag = this.add.image(0, -34, "tag");
          const txt = this.add.text(0, -34, letter.toUpperCase(), { fontFamily: FONT, fontSize: "17px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5);
          const c = this.add.container(x, GROUND_Y - 17, [body, tag, txt]).setDepth(7);
          this.tweens.add({ targets: body, y: -2, duration: 400 + Math.random() * 200, yoyo: true, repeat: -1 });
          this.men.push({ c, letter, x, state: "wait", shake: 0 });
        }

        refreshHud() {
          this.hud.clue.setText(this.clue);
          this.hud.score.setText(`${this.score}`);
          this.hud.armor.setText("♥".repeat(this.armor));
          this.hud.ammo.setText(`ROCKET ${"▮".repeat(this.rockets)}`);
          const stars = Phaser.Math.Clamp(this.round + (level === "easy" ? 0 : level === "hard" ? 2 : 1), 0, STAGES.length - 1) + 1; // 위협 단계(★1~5)
          this.hud.round.setText(`STAGE ${this.round + 1} / ${rounds}  ${"★".repeat(stars)}`);
          this.hud.seat.setText(`탑승 ${this.onboard.length}/${SEATS}  ${this.onboard.map((c) => c.toUpperCase()).join(" ")}`);
          // 단어는 공개하지 않는다: 기지에 맞게 내려놓은 글자만 채워지고 나머지는 빈 칸(글자 수만 보인다)
          const slots = this.word
            .split("")
            .map((c, i) => (i < this.got ? c.toUpperCase() : "_"))
            .join(" ");
          this.slotTxt.setText(slots);
          this.slotTxt.setScale(1);
          if (this.slotTxt.width > 480) this.slotTxt.setScale(480 / this.slotTxt.width);
        }

        // ---------- 사격 ----------
        fireGun(time: number) {
          if (time - this.lastShot < 120 || this.landed) return;
          this.lastShot = time;
          const img = this.add.image(this.heli.x + this.facing * 28, this.heli.y + 3, "bullet").setDepth(9);
          img.setFlipX(this.facing < 0);
          this.bullets.push({ img, vx: this.facing * 640 + this.vx * 0.3, vy: 130, life: 0.9 });
        }

        fireRocket() {
          if (this.state !== "play" || this.rockets <= 0 || this.landed) return;
          this.rockets--;
          const img = this.add.image(this.heli.x + this.facing * 26, this.heli.y + 7, "rocket").setDepth(9);
          img.setFlipX(this.facing < 0);
          this.rocketsOut.push({ img, vx: this.facing * 480 + this.vx * 0.4, vy: 90, life: 1.6 });
          this.refreshHud();
        }

        // ---------- 업데이트 ----------
        update(time: number, delta: number) {
          const dt = Math.min(delta, 33) / 1000;
          this.mtn.tilePositionX = this.cameras.main.scrollX * 0.25;
          this.grd.tilePositionX = this.cameras.main.scrollX;
          this.rotor.scaleX = this.state === "start" ? 1 : 0.35 + 0.65 * Math.abs(Math.sin(time / 28));
          if (this.state === "play") {
            this.moveHeli(dt);
            const k = this.keys;
            const fire = k.space.isDown || this.padHeld("fire");
            if (fire) this.fireGun(time);
            this.rescue(dt, time);
            this.threats(dt, time);
            this.projectiles(dt);
            this.drawHints();
          }
        }

        padHeld(which: "fire"): boolean {
          let held = false;
          this.input.manager.pointers.forEach((p) => {
            if (p.isDown && p.wasTouch && which === "fire" && p.x > W - 130 && p.y > H - 100) held = true;
          });
          this.fireBtn.setFillStyle(0xb91c1c, held || this.keys.space.isDown ? 0.9 : 0.5);
          return held;
        }

        moveHeli(dt: number) {
          const k = this.keys;
          let dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
          let dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
          const jv = this.joy.vec;
          if (jv.active) {
            dx = jv.x;
            dy = jv.y;
          }
          if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
          this.vx += dx * 560 * dt - this.vx * 1.5 * dt;
          this.vy += dy * 620 * dt - this.vy * 3.2 * dt;
          this.vx = Phaser.Math.Clamp(this.vx, -300, 300);
          this.vy = Phaser.Math.Clamp(this.vy, -230, 230);
          this.heli.x = Phaser.Math.Clamp(this.heli.x + this.vx * dt, 40, WORLD_W - 40);
          this.heli.y += this.vy * dt;
          if (this.heli.y < 130) {
            this.heli.y = 130;
            this.vy = Math.max(0, this.vy);
          }
          const floor = GROUND_Y - SKID;
          if (this.heli.y >= floor) {
            const hard = this.vy > 170 || Math.abs(this.vx) > 190;
            this.heli.y = floor;
            if (hard && !this.landed) this.hurt(this.time.now, "CRASH LANDING");
            this.vy = 0;
            const soft = Math.abs(this.vx) < 95;
            this.landed = soft;
            if (soft) this.vx *= 1 - Math.min(1, 6 * dt);
          } else {
            this.landed = false;
          }
          this.heli.setScale(this.facing, 1);
          this.heli.rotation = Phaser.Math.Clamp((this.vx / 300) * 0.22 * this.facing, -0.25, 0.25) * (this.facing < 0 ? -1 : 1);
          this.heli.setAlpha(this.time.now < this.invul ? (Math.floor(this.time.now / 90) % 2 ? 0.35 : 1) : 1);
        }

        // ---------- 구출 / 기지 ----------
        rescue(dt: number, time: number) {
          const hx = this.heli.x;
          // 착륙해 있으면 가장 가까운 인원이 달려와 탑승(좌석 4). 어떤 글자를 태울지는 내려앉는 위치로 고른다.
          const running = this.men.some((o) => o.state === "run");
          if (this.landed && !running && this.onboard.length < SEATS) {
            const cand = this.men
              .filter((m) => m.state === "wait" && Math.abs(m.x - hx) < 60) // 바로 옆에 내려앉은 인원만 탄다(실수로 엉뚱한 글자가 타지 않게)
              .sort((a, b) => Math.abs(a.x - hx) - Math.abs(b.x - hx))[0];
            if (cand) cand.state = "run";
          }
          for (const m of this.men) {
            if (m.state === "gone") continue;
            if (m.state === "wait") {
              if (m.shake > 0) {
                m.shake -= dt;
                m.c.x = m.x + Math.sin(m.shake * 60) * 3;
              }
            } else if (m.state === "run") {
              const dir = Math.sign(hx - m.x) || 1;
              m.x += dir * 100 * dt;
              m.c.x = m.x;
              if (!this.landed) m.state = "wait";
              if (Math.abs(m.x - hx) < 18) {
                m.state = "gone";
                m.c.destroy();
                this.onboard.push(m.letter);
                this.floatText(hx, this.heli.y - 50, `+${m.letter.toUpperCase()}`, "#7dd3fc", 26);
                this.refreshHud();
              }
            }
          }
          // 기지에서 내려놓기
          if (this.landed && Math.abs(hx - (BASE_X + 20)) < 120 && this.onboard.length > 0 && time > this.unloadAt) {
            this.unloadAt = time + 420;
            const l = this.onboard.shift()!;
            if (l === this.word[this.got]) {
              // 순서가 맞는 글자만 단어에 채워진다
              this.got++;
              this.score += 100;
              this.floatText(BASE_X + 40, GROUND_Y - 90, `${l.toUpperCase()} +100`, "#ffd166", 26);
              this.refreshHud();
              if (this.got >= this.word.length) this.roundComplete();
            } else {
              // 틀린 글자: 거부되고 감점, 그 인원은 지상으로 돌아간다
              this.score = Math.max(0, this.score - 30);
              this.floatText(BASE_X + 40, GROUND_Y - 90, `${l.toUpperCase()} ✕ 순서가 아니에요 -30`, "#ff6b6b", 20);
              this.addMan(l, this.freeX());
              this.refreshHud();
            }
          }
        }

        roundComplete() {
          this.state = "between";
          this.wordsDone++;
          this.score += 300;
          this.armor = Math.min(5, this.armor + 1);
          this.floatText(this.cameras.main.scrollX + W / 2, 250, `WORD COMPLETE!  ${this.word.toUpperCase()}`, "#4ade80", 36);
          this.cameras.main.flash(180, 190, 255, 190);
          this.refreshHud();
          this.time.delayedCall(1800, () => {
            this.round++;
            if (this.round >= rounds) this.showResult(true);
            else this.startRound();
          });
        }

        // ---------- 위협 ----------
        threats(dt: number, time: number) {
          const hx = this.heli.x;
          const hy = this.heli.y;
          const P = this.params();
          for (const s of this.sites) {
            if (s.hp <= 0) continue;
            const dx = Math.abs(s.x - hx);
            // 발사 직전 경고(붉은 링)가 깜빡인 뒤에 실제로 발사한다 → 갑자기 날아오지 않는다
            if (s.launchAt > 0) {
              if (time < s.launchAt) continue;
              s.launchAt = 0;
              s.warn?.destroy();
              s.warn = null;
              if (s.kind === "sam") {
                const img = this.add.image(s.x, GROUND_Y - 50, "missile").setDepth(8);
                this.missiles.push({ img, vx: 0, vy: -200, life: 4.2 });
                this.puff(s.x, GROUND_Y - 44, 0xe5e7eb, 8);
              } else {
                const dur = 0.95;
                // 예측 사격: aaLead가 1이면 헬기가 가는 방향을 정확히 읽고, 낮을수록 현재 위치 근처를 쏜다
                const tx = hx + this.vx * dur * P.aaLead;
                const ty = Math.min(hy + this.vy * dur * P.aaLead, GROUND_Y - 80);
                const dot = this.add.circle(s.x + 8, GROUND_Y - 58, 5, 0xfde047).setDepth(8);
                this.tweens.add({ targets: dot, x: tx, y: ty, duration: dur * 1000, ease: "Linear" });
                this.flaks.push({ dot, tx, ty, t: 0, dur });
              }
              continue;
            }
            // 발사 조건: 간격이 지났고, 다른 시설의 발사와 최소 간격(threatGap)을 두고, 동시에 떠 있는 수가 한도 안일 때만
            if (time < s.next || time < this.nextThreatAt) continue;
            const canSam = s.kind === "sam" && dx < 650 && this.missiles.length < P.maxMissiles;
            const canAa = s.kind === "aa" && dx < 650 && hy < GROUND_Y - 70 && this.flaks.length < P.maxFlak;
            if (!canSam && !canAa) continue;
            s.next = time + (s.kind === "sam" ? P.samEvery : P.aaEvery) + Math.random() * 1500;
            this.nextThreatAt = time + P.threatGap;
            s.launchAt = time + (s.kind === "sam" ? 800 : 650);
            s.warn = this.add.circle(s.x, GROUND_Y - 58, 14, 0xef4444, 0.35).setStrokeStyle(3, 0xef4444, 1).setDepth(8);
            this.tweens.add({ targets: s.warn, scale: 1.8, alpha: 0.1, duration: 280, yoyo: true, repeat: 2 });
          }
          // 유도 미사일
          for (const m of [...this.missiles]) {
            m.life -= dt;
            const ang = Math.atan2(m.vy, m.vx);
            const want = Math.atan2(hy - m.img.y, hx - m.img.x);
            const turn = Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - ang), -P.missileTurn * dt, P.missileTurn * dt);
            const na = ang + turn;
            const sp = Math.min(P.missileSpeed, Math.hypot(m.vx, m.vy) + 220 * dt);
            m.vx = Math.cos(na) * sp;
            m.vy = Math.sin(na) * sp;
            m.img.x += m.vx * dt;
            m.img.y += m.vy * dt;
            m.img.rotation = na;
            if (Math.random() < 0.6) this.puff(m.img.x - Math.cos(na) * 16, m.img.y - Math.sin(na) * 16, 0xe5e7eb, 1);
            if (Math.hypot(m.img.x - hx, m.img.y - hy) < 24) {
              this.explode(m.img.x, m.img.y, 40);
              this.removeProj(this.missiles, m);
              this.hurt(time, "MISSILE HIT");
            } else if (m.life <= 0 || m.img.y > GROUND_Y) {
              this.explode(m.img.x, Math.min(m.img.y, GROUND_Y), 30);
              this.removeProj(this.missiles, m);
            }
          }
          // 대공포탄
          for (const f of [...this.flaks]) {
            f.t += dt;
            if (f.t >= f.dur) {
              this.explode(f.tx, f.ty, 58);
              f.dot.destroy();
              this.flaks = this.flaks.filter((o) => o !== f);
              if (Math.hypot(f.tx - hx, f.ty - hy) < 50) this.hurt(time, "FLAK HIT");
            }
          }
          const near = this.missiles.some((m) => Math.hypot(m.img.x - hx, m.img.y - hy) < 520);
          const cam = this.cameras.main;
          const incoming = this.jets.some((j) => j.c.x > cam.scrollX + W - 10);
          const launching = this.sites.some((s) => s.launchAt > 0);
          this.hud.warn.setText(near ? "⚠ MISSILE!" : launching ? "⚠ 발사 준비!" : incoming ? "적기 접근 ▶" : "");
          this.runJets(dt, time);
        }

        // ---------- 적기(보기) ----------
        clearJets() {
          this.jets.forEach((j) => j.c.destroy());
          this.jets = [];
          this.ebullets.forEach((b) => b.img.destroy());
          this.ebullets = [];
        }

        runJets(dt: number, time: number) {
          const cam = this.cameras.main;
          const P = this.params();
          // 새 편대: 스테이지가 높을수록 한 번에 더 많이 온다. 편대 사이에는 쉬는 시간이 있다.
          if (this.jets.length === 0 && time >= this.waveAt) {
            const ys = Phaser.Utils.Array.Shuffle([170, 225, 280, 335]);
            for (let i = 0; i < P.jets; i++) {
              const body = this.add.image(0, 0, "jet").setFlipX(true).setScale(JET_SCALE);
              const x = cam.scrollX + W + 140 + i * 300; // 간격을 넓게 두어 한꺼번에 몰려오지 않는다
              const c = this.add.container(x, ys[i], [body]).setDepth(9);
              this.jets.push({ c, body, vx: Phaser.Math.Between(P.jetSpeed[0], P.jetSpeed[1]), hp: P.jetHp, y0: ys[i], phase: Math.random() * 6, nextShot: time + 1500 + Math.random() * P.jetShot * 0.5 });
            }
          }
          for (const j of [...this.jets]) {
            j.c.x -= j.vx * dt;
            j.c.y = j.y0 + Math.sin(time / 700 + j.phase) * 14;
            const onScreen = j.c.x > cam.scrollX + 20 && j.c.x < cam.scrollX + W - 20;
            if (onScreen && time >= j.nextShot) {
              j.nextShot = time + P.jetShot + Math.random() * 1000;
              const ang = Math.atan2(this.heli.y - j.c.y, this.heli.x - j.c.x);
              const img = this.add.image(j.c.x - 24, j.c.y, "ebul").setDepth(8);
              this.ebullets.push({ img, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 3.5 });
            }
            if (j.c.x < cam.scrollX - 160) {
              j.c.destroy();
              this.jets = this.jets.filter((o) => o !== j);
              if (this.jets.length === 0) this.waveAt = time + P.waveGap;
            }
          }
          for (const b of [...this.ebullets]) {
            b.life -= dt;
            b.img.x += b.vx * dt;
            b.img.y += b.vy * dt;
            if (Math.hypot(b.img.x - this.heli.x, b.img.y - this.heli.y) < 24) {
              this.removeProj(this.ebullets, b);
              this.hurt(time, "JET FIRE");
            } else if (b.life <= 0 || b.img.y > GROUND_Y) {
              this.removeProj(this.ebullets, b);
            }
          }
        }

        hitJet(x: number, y: number, dmg: number): boolean {
          for (const j of this.jets) {
            if (Math.abs(j.c.x - x) < 32 && Math.abs(j.c.y - y) < 16) {
              this.damageJet(j, dmg);
              return true;
            }
          }
          return false;
        }

        damageJet(j: Jet, dmg: number) {
          j.hp -= dmg;
          j.body.setTintFill(0xffffff);
          this.time.delayedCall(60, () => j.body.active && j.body.clearTint());
          if (j.hp > 0) return;
          const { x, y } = j.c;
          this.explode(x, y, 60);
          j.c.destroy();
          this.jets = this.jets.filter((o) => o !== j);
          this.score += 50;
          this.floatText(x, y - 24, "JET DOWN +50", "#ffd166", 22);
          if (this.jets.length === 0) this.waveAt = this.time.now + this.params().waveGap;
          this.refreshHud();
        }

        projectiles(dt: number) {
          // 기관총
          for (const b of [...this.bullets]) {
            b.life -= dt;
            b.img.x += b.vx * dt;
            b.img.y += b.vy * dt;
            if (b.life <= 0 || b.img.y > GROUND_Y) {
              this.removeProj(this.bullets, b);
              continue;
            }
            if (this.hitThreat(b.img.x, b.img.y, 1, 0)) this.removeProj(this.bullets, b);
          }
          // 로켓
          for (const r of [...this.rocketsOut]) {
            r.life -= dt;
            r.img.x += r.vx * dt;
            r.img.y += r.vy * dt;
            const touch = this.hitThreat(r.img.x, r.img.y, 6, 70);
            if (touch || r.life <= 0 || r.img.y > GROUND_Y) {
              this.explode(r.img.x, Math.min(r.img.y, GROUND_Y), 60);
              this.blast(r.img.x, Math.min(r.img.y, GROUND_Y), 70);
              this.removeProj(this.rocketsOut, r);
            }
          }
        }

        /** 탄이 위협(미사일/발사대/대공포)에 닿았는지. 닿으면 피해를 주고 true */
        hitThreat(x: number, y: number, dmg: number, blastR: number): boolean {
          if (this.hitJet(x, y, dmg)) return true;
          for (const m of this.missiles) {
            if (Math.abs(m.img.x - x) < 22 && Math.abs(m.img.y - y) < 14) {
              this.explode(m.img.x, m.img.y, 34);
              this.removeProj(this.missiles, m);
              this.score += 25;
              this.refreshHud();
              return true;
            }
          }
          for (const s of this.sites) {
            if (s.hp <= 0) continue;
            if (Math.abs(s.x - x) < 30 && y > GROUND_Y - 62 && y < GROUND_Y) {
              this.damageSite(s, dmg);
              return true;
            }
          }
          void blastR;
          return false;
        }

        blast(x: number, y: number, r: number) {
          [...this.jets].forEach((j) => {
            if (Math.hypot(j.c.x - x, j.c.y - y) < r + 30) this.damageJet(j, 6);
          });
          this.sites.forEach((s) => {
            if (s.hp > 0 && Math.abs(s.x - x) < r) this.damageSite(s, 6);
          });
          [...this.missiles].forEach((m) => {
            if (Math.hypot(m.img.x - x, m.img.y - y) < r) {
              this.explode(m.img.x, m.img.y, 30);
              this.removeProj(this.missiles, m);
              this.score += 25;
            }
          });
          this.refreshHud();
        }

        damageSite(s: Site, dmg: number) {
          s.hp -= dmg;
          s.img.setTintFill(0xffffff);
          this.time.delayedCall(60, () => s.img.active && s.img.clearTint());
          s.bar.width = Math.max(0, (44 * s.hp) / s.max);
          if (s.hp <= 0) {
            this.explode(s.x, GROUND_Y - 30, 70);
            s.img.setTint(0x44403c).setAlpha(0.7);
            s.bar.setVisible(false);
            const pts = s.kind === "sam" ? 200 : 150;
            this.score += pts;
            this.floatText(s.x, GROUND_Y - 90, `${s.kind === "sam" ? "SAM" : "AA"} DOWN +${pts}`, "#ffd166", 22);
            this.refreshHud();
          }
        }

        removeProj(arr: Proj[], p: Proj) {
          p.img.destroy();
          const i = arr.indexOf(p);
          if (i >= 0) arr.splice(i, 1);
        }

        hurt(time: number, why: string) {
          if (time < this.invul || this.state !== "play") return;
          this.invul = time + 1400;
          this.armor--;
          this.floatText(this.heli.x, this.heli.y - 54, why, "#ff6b6b", 24);
          this.cameras.main.shake(260, 0.012);
          this.cameras.main.flash(140, 255, 70, 70);
          this.explode(this.heli.x, this.heli.y, 40);
          // 탑승 중이던 인원은 쓰러진다(글자 손실)
          if (this.onboard.length) {
            this.floatText(this.heli.x, this.heli.y - 80, "탑승 인원이 떨어졌어요! 다시 구출하세요", "#fca5a5", 18);
            // 떨어진 인원은 지상에 다시 나타난다(글자가 사라져 단어를 못 만드는 일이 없도록)
            const lost = this.onboard;
            this.onboard = [];
            lost.forEach((l) => this.addMan(l, this.freeX()));
          }
          this.refreshHud();
          if (this.armor <= 0) this.showResult(false);
        }

        // ---------- 표시 ----------
        drawHints() {
          const cam = this.cameras.main;
          const baseOff = BASE_X + 20 < cam.scrollX + 40 || BASE_X + 20 > cam.scrollX + W - 40;
          if (this.onboard.length > 0 && baseOff) {
            const d = Math.round(Math.abs(BASE_X + 20 - this.heli.x) / 10);
            this.hud.base.setText(`${BASE_X + 20 < this.heli.x ? "◀" : "▶"} 기지로 복귀  ${d}m`);
          } else if (this.onboard.length === 0 && this.got === 0 && this.landed === false) {
            this.hud.base.setText("뜻에 맞는 단어의 글자를 순서대로 태워 기지에 내려놓으세요");
          } else {
            this.hud.base.setText("");
          }
        }

        showResult(win: boolean) {
          this.state = "done";
          this.setHud(false);
          this.missiles.forEach((m) => m.img.destroy());
          this.missiles = [];
          this.clearJets();
          const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x050a1c, 0.7).setScrollFactor(0).setDepth(100);
          const T = (y: number, s: string, size: number, color: string, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
            this.add.text(W / 2, y, s, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 6, align: "center", ...extra }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
          this.overlay = this.add.container(0, 0, [
            dim,
            T(130, win ? "MISSION COMPLETE" : "HELICOPTER DOWN", 48, win ? "#bef264" : "#fb7185"),
            T(240, `${this.score}`, 80, "#ffffff"),
            T(320, `완성한 단어 ${this.wordsDone} / ${rounds}`, 26, "#fff", { strokeThickness: 0 }),
            T(420, "↻  PRESS SPACE / TAP", 24, "#0b1230", { backgroundColor: "#bef264", padding: { x: 20, y: 10 }, strokeThickness: 0 }),
          ]).setScrollFactor(0).setDepth(100);
          finishRef.current?.({ score: this.score, words: this.wordsDone, rounds });
        }

        explode(x: number, y: number, size: number) {
          const em = this.add.particles(x, y, "spark", {
            speed: { min: 60, max: size * 5 },
            angle: { min: 0, max: 360 },
            lifespan: { min: 250, max: 650 },
            scale: { start: size / 70, end: 0 },
            tint: [0xfb923c, 0xfde047, 0xef4444, 0x78716c],
            blendMode: "ADD",
            emitting: false,
          });
          em.setDepth(30);
          em.explode(Math.round(size / 2.2));
          this.time.delayedCall(800, () => em.destroy());
        }

        puff(x: number, y: number, tint: number, qty: number) {
          const em = this.add.particles(x, y, "spark", {
            speed: { min: 10, max: 50 },
            lifespan: 520,
            scale: { start: 0.5, end: 1.4 },
            alpha: { start: 0.5, end: 0 },
            tint,
            emitting: false,
          });
          em.setDepth(7);
          em.explode(qty);
          this.time.delayedCall(700, () => em.destroy());
        }

        floatText(x: number, y: number, text: string, color: string, size: number) {
          const t = this.add
            .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: "bold", stroke: "#0b1230", strokeThickness: 5 })
            .setOrigin(0.5)
            .setDepth(60)
            .setScale(0.5);
          this.tweens.add({ targets: t, scale: 1, duration: 160, ease: "Back.out" });
          this.tweens.add({ targets: t, y: y - 44, alpha: 0, duration: 1000, delay: 350, onComplete: () => t.destroy() });
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: W,
        height: H,
        backgroundColor: "#1d4ed8",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: RescueScene,
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
