import type { ThumbKey } from "@/lib/workout/gameCatalog";

/** 게임 카드 썸네일 (코드로 그린 SVG, 16:9). 실제 게임 화면의 분위기를 그대로 옮겼다. */
const F = "system-ui, -apple-system, 'Segoe UI', sans-serif";

function Plate({ x, y, w = 62, text }: { x: number; y: number; w?: number; text: string }) {
  return (
    <g>
      <rect x={x - w / 2} y={y - 9} width={w} height={18} rx={6} fill="#fff3c4" stroke="#3a2410" strokeWidth={1.5} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#10172e" fontFamily={F}>
        {text}
      </text>
    </g>
  );
}

function Board({ x, y, r = 22, rope = false }: { x: number; y: number; r?: number; rope?: boolean }) {
  return (
    <g>
      {rope && <line x1={x} y1={-10} x2={x} y2={y - r} stroke="#6b4a2a" strokeWidth={2} />}
      <circle cx={x + 2} cy={y + 3} r={r + 2} fill="#000" opacity={0.25} />
      <circle cx={x} cy={y} r={r + 2} fill="#3a2410" />
      <circle cx={x} cy={y} r={r} fill="#e63946" />
      <circle cx={x} cy={y} r={r * 0.74} fill="#fff" />
      <circle cx={x} cy={y} r={r * 0.48} fill="#e63946" />
      <circle cx={x} cy={y} r={r * 0.22} fill="#fff" />
    </g>
  );
}

function Archery() {
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full" role="img" aria-label="WORD ARCHERY">
      <defs>
        <linearGradient id="ta-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14275e" />
          <stop offset="0.5" stopColor="#4f8bd6" />
          <stop offset="1" stopColor="#ffb37a" />
        </linearGradient>
        <radialGradient id="ta-sun">
          <stop offset="0" stopColor="#fff7d6" />
          <stop offset="1" stopColor="#fff0b0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill="url(#ta-sky)" />
      <circle cx="248" cy="118" r="46" fill="url(#ta-sun)" />
      <circle cx="248" cy="118" r="16" fill="#fff7d6" />
      {[[30, 20], [90, 12], [150, 30], [210, 10], [280, 26], [60, 44]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.2} fill="#fff" opacity={0.8} />
      ))}
      <path d="M0 150 L50 98 L92 134 L142 82 L205 140 L262 92 L320 138 L320 180 L0 180Z" fill="#5a4a8a" opacity={0.8} />
      <path d="M0 160 L60 128 L110 154 L170 120 L240 156 L320 130 L320 180 L0 180Z" fill="#2f3b66" />
      <rect y="154" width="320" height="26" fill="#2a5d34" />
      <rect y="154" width="320" height="5" fill="#3f8a4b" />
      <Board x={196} y={58} rope />
      <Board x={262} y={92} r={20} rope />
      <Board x={140} y={100} r={18} rope />
      <Plate x={196} y={92} text="reluctant" w={66} />
      <Plate x={262} y={124} text="brief" w={44} />
      <Plate x={140} y={130} text="vivid" w={42} />
      {/* 궁수 플랫폼 + 활 */}
      <rect x="18" y="150" width="46" height="8" rx="3" fill="#8a5a2b" />
      <rect x="28" y="156" width="26" height="24" fill="#5b3a1e" />
      <path d="M44 112 A30 30 0 0 1 44 152" fill="none" stroke="#8a4b1f" strokeWidth={5} />
      <path d="M44 112 A30 30 0 0 1 44 152" fill="none" stroke="#ffd166" strokeWidth={2} />
      <line x1="44" y1="112" x2="36" y2="132" stroke="#fff" strokeWidth={1.2} />
      <line x1="44" y1="152" x2="36" y2="132" stroke="#fff" strokeWidth={1.2} />
      {/* 날아가는 화살 + 궤적 */}
      <path d="M46 132 Q 110 70 168 80" fill="none" stroke="#fff" strokeWidth={1.5} strokeDasharray="2 5" opacity={0.7} />
      <g transform="translate(120 88) rotate(-14)">
        <line x1="-34" y1="0" x2="0" y2="0" stroke="#d9b382" strokeWidth={3} />
        <polygon points="0,0 -9,-4.5 -9,4.5" fill="#cfd8dc" />
        <polygon points="-34,0 -42,-5 -30,0" fill="#e63946" />
        <polygon points="-34,0 -42,5 -30,0" fill="#e63946" />
      </g>
    </svg>
  );
}

function Rain() {
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full" role="img" aria-label="WORD RAIN">
      <defs>
        <linearGradient id="tr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14275e" />
          <stop offset="0.55" stopColor="#3b6fc4" />
          <stop offset="1" stopColor="#ffd9a0" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#tr-sky)" />
      {[[20, 14], [70, 30], [130, 10], [190, 26], [250, 12], [300, 34], [110, 52]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.3} fill="#fff" opacity={0.8} />
      ))}
      <path d="M0 152 L50 118 L95 146 L150 108 L210 148 L270 116 L320 144 L320 180 L0 180Z" fill="#2f3b66" />
      <rect y="156" width="320" height="24" fill="#2a5d34" />
      {/* 떨어지는 글자 */}
      {[
        { x: 48, y: 34, c: "S" },
        { x: 112, y: 74, c: "P" },
        { x: 214, y: 46, c: "E" },
        { x: 270, y: 92, c: "L" },
      ].map((l) => (
        <g key={l.c}>
          <circle cx={l.x} cy={l.y} r={15} fill="#1e3a8a" stroke="#ffd166" strokeWidth={2.5} />
          <text x={l.x} y={l.y + 6} textAnchor="middle" fontSize={17} fontWeight={800} fill="#fff" fontFamily={F}>
            {l.c}
          </text>
        </g>
      ))}
      {/* 낙하산 과녁 */}
      <g>
        <ellipse cx="164" cy="30" rx="28" ry="13" fill="#fff3c4" />
        <ellipse cx="164" cy="30" rx="9" ry="13" fill="#e63946" />
        <line x1="142" y1="36" x2="158" y2="56" stroke="#fff" strokeWidth={1.2} />
        <line x1="186" y1="36" x2="170" y2="56" stroke="#fff" strokeWidth={1.2} />
        <Board x={164} y={66} r={13} />
        <Plate x={164} y={92} text="abundant" w={56} />
      </g>
      {/* 활 + 위로 쏘는 화살 */}
      <line x1="160" y1="132" x2="148" y2="104" stroke="#fff" strokeWidth={1.4} strokeDasharray="2 5" opacity={0.7} />
      <rect x="140" y="156" width="40" height="7" rx="3" fill="#8a5a2b" />
      <path d="M134 138 A28 28 0 0 1 186 138" fill="none" stroke="#8a4b1f" strokeWidth={5} />
      <path d="M134 138 A28 28 0 0 1 186 138" fill="none" stroke="#ffd166" strokeWidth={2} />
      <g transform="translate(158 118) rotate(-12)">
        <line x1="0" y1="26" x2="0" y2="0" stroke="#d9b382" strokeWidth={3} />
        <polygon points="0,-8 -4.5,2 4.5,2" fill="#cfd8dc" />
      </g>
      {/* 하트 */}
      <text x="306" y="18" textAnchor="end" fontSize={13} fill="#ff5d6c" fontFamily={F} fontWeight={800}>
        ♥♥♥
      </text>
    </svg>
  );
}

function Race() {
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full" role="img" aria-label="WORD RACE">
      <rect width="320" height="180" fill="#2f7a3b" />
      {[0, 60, 120].map((y) => (
        <rect key={y} y={y} width="320" height="30" fill="#3a8a46" />
      ))}
      <rect x="70" width="180" height="180" fill="#3b3f4a" />
      {[0, 60, 120].map((y) => (
        <rect key={y} x="70" y={y} width="180" height="30" fill="#434855" />
      ))}
      <rect x="74" width="3" height="180" fill="#f1f5f9" />
      <rect x="243" width="3" height="180" fill="#f1f5f9" />
      {[115, 160, 205].map((x) => (
        <g key={x}>
          {[8, 58, 108, 158].map((y) => (
            <rect key={y} x={x - 1} y={y} width="2.4" height="22" fill="#e2e8f0" opacity={0.85} />
          ))}
        </g>
      ))}
      {/* 게이트 */}
      <rect x="70" y="30" width="180" height="3" fill="#fff" opacity={0.6} />
      {[
        { x: 92, t: "brief" },
        { x: 137, t: "vivid" },
        { x: 183, t: "prevent" },
        { x: 228, t: "obvious" },
      ].map((g) => (
        <Plate key={g.t} x={g.x} y={26} w={42} text={g.t} />
      ))}
      <rect x="161" y="22" width="44" height="40" fill="#4ade80" opacity={0.25} />
      {/* 차 */}
      {[
        { x: 227, y: 96, c: "#3b82f6", r: 6 },
        { x: 138, y: 142, c: "#e63946", r: -4 },
      ].map((car) => (
        <g key={car.c} transform={`translate(${car.x} ${car.y}) rotate(${car.r})`}>
          <rect x="-11" y="-20" width="22" height="40" rx="7" fill={car.c} />
          <rect x="-7" y="-9" width="14" height="9" rx="3" fill="#0f172a" opacity={0.9} />
          <rect x="-7" y="5" width="14" height="6" rx="2" fill="#0f172a" opacity={0.8} />
          <rect x="-14" y="-14" width="4" height="10" rx="1" fill="#111" />
          <rect x="10" y="-14" width="4" height="10" rx="1" fill="#111" />
          <rect x="-14" y="8" width="4" height="10" rx="1" fill="#111" />
          <rect x="10" y="8" width="4" height="10" rx="1" fill="#111" />
        </g>
      ))}
      {[[58, 40], [24, 90], [276, 60], [300, 120], [40, 150]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 2} y={y + 6} width="4" height="8" fill="#5b3a1e" />
          <circle cx={x} cy={y} r="10" fill="#1f6b34" />
          <circle cx={x - 3} cy={y - 3} r="6" fill="#2c8a46" />
        </g>
      ))}
      <rect x="10" y="150" width="70" height="8" rx="4" fill="#000" opacity={0.45} />
      <rect x="12" y="152" width="46" height="4" rx="2" fill="#facc15" />
    </svg>
  );
}

function Drift() {
  const track = "M-20 150 C 70 150, 80 52, 170 62 S 300 150, 345 96";
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full" role="img" aria-label="WORD DRIFT">
      <defs>
        <linearGradient id="td-grass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f7a3b" />
          <stop offset="1" stopColor="#1f5a2d" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#td-grass)" />
      {[[40, 30, 26], [260, 150, 30], [300, 30, 18], [30, 120, 22]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#1c5a2c" opacity={0.8} />
      ))}
      <path d={track} fill="none" stroke="#f1f5f9" strokeWidth={64} strokeLinecap="round" />
      <path d={track} fill="none" stroke="#d62839" strokeWidth={64} strokeDasharray="12 12" />
      <path d={track} fill="none" stroke="#3b404c" strokeWidth={54} />
      <path d={track} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="10 12" />
      {/* 타이어 자국 */}
      <path d="M96 118 C 108 92, 126 74, 150 66" fill="none" stroke="#0a0a0a" strokeOpacity={0.55} strokeWidth={4} strokeDasharray="3 3" />
      <path d="M104 126 C 118 98, 138 80, 160 72" fill="none" stroke="#0a0a0a" strokeOpacity={0.45} strokeWidth={4} strokeDasharray="3 3" />
      {/* 게이트 */}
      <g transform="translate(236 118) rotate(30)">
        <rect x="-27" y="-2" width="54" height="3" fill="#fff" opacity={0.6} />
      </g>
      <Plate x={214} y={104} text="brief" w={36} />
      <Plate x={248} y={128} text="vivid" w={34} />
      {/* 차 (미끄러지는 각도) */}
      <g transform="translate(172 62) rotate(58)">
        <ellipse cx="0" cy="4" rx="16" ry="26" fill="#000" opacity={0.22} />
        <rect x="-11" y="-20" width="22" height="40" rx="7" fill="#e63946" />
        <rect x="-2" y="-20" width="4" height="40" fill="#fff" />
        <rect x="-7" y="-9" width="14" height="9" rx="3" fill="#0f172a" opacity={0.9} />
      </g>
      {/* 연기 */}
      {[[146, 76, 9], [134, 86, 7], [124, 98, 5]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#eee" opacity={0.35 - i * 0.07} />
      ))}
      {/* 미니맵 + 점수 */}
      <rect x="244" y="8" width="68" height="40" rx="6" fill="#0b1230" opacity={0.7} />
      <path d="M252 38 C 262 38, 262 20, 276 22 S 296 38, 304 24" fill="none" stroke="#cbd5e1" strokeWidth={3} />
      <circle cx="276" cy="22" r="3" fill="#e63946" />
      <text x="10" y="24" fontSize={16} fontWeight={800} fill="#fff" fontFamily={F}>
        1240
      </text>
      <text x="10" y="40" fontSize={10} fontWeight={800} fill="#ffb703" fontFamily={F}>
        DRIFT ×2.5
      </text>
    </svg>
  );
}

function Cockpit() {
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full" role="img" aria-label="COCKPIT">
      <defs>
        <radialGradient id="tc-n1" cx="0.25" cy="0.3" r="0.5">
          <stop offset="0" stopColor="#4c1d95" stopOpacity="0.55" />
          <stop offset="1" stopColor="#4c1d95" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="tc-n2" cx="0.8" cy="0.55" r="0.5">
          <stop offset="0" stopColor="#0e7490" stopOpacity="0.45" />
          <stop offset="1" stopColor="#0e7490" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tc-dash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f2a44" />
          <stop offset="1" stopColor="#080c18" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="#050816" />
      <rect width="320" height="180" fill="url(#tc-n1)" />
      <rect width="320" height="180" fill="url(#tc-n2)" />
      {Array.from({ length: 36 }).map((_, i) => (
        <circle key={i} cx={(i * 53) % 320} cy={(i * 37) % 130} r={i % 5 === 0 ? 1.4 : 0.8} fill="#fff" opacity={0.4 + ((i * 7) % 5) / 10} />
      ))}
      {/* 타깃 함선 */}
      {[
        { x: 104, y: 36, t: "obstacle", s: 1 },
        { x: 226, y: 54, t: "prevent", s: 0.9 },
      ].map((s) => (
        <g key={s.t} transform={`translate(${s.x} ${s.y}) scale(${s.s})`}>
          <ellipse cx="0" cy="4" rx="40" ry="14" fill="#64748b" />
          <ellipse cx="0" cy="0" rx="36" ry="10" fill="#94a3b8" />
          <ellipse cx="0" cy="-8" rx="15" ry="8" fill="#7dd3fc" opacity={0.9} />
          <rect x="-28" y="-2" width="56" height="14" rx="5" fill="#fff3c4" stroke="#3a2410" strokeWidth={1.2} />
          <text x="0" y="8.5" textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#10172e" fontFamily={F}>
            {s.t}
          </text>
          <rect x="-26" y="18" width="52" height="3" rx="1.5" fill="#4ade80" />
        </g>
      ))}
      {/* 드론 */}
      <polygon points="168,92 156,70 180,70" fill="#ef4444" />
      <circle cx="168" cy="76" r="3" fill="#fde68a" />
      <circle cx="168" cy="102" r="3" fill="#fb7185" />
      {/* 레이저 */}
      <rect x="150" y="82" width="2.5" height="10" rx="1" fill="#67e8f9" />
      <rect x="164" y="104" width="2.5" height="10" rx="1" fill="#67e8f9" />
      <rect x="164" y="124" width="2.5" height="10" rx="1" fill="#67e8f9" />
      {/* 내 기체 */}
      <g transform="translate(160 140)">
        <polygon points="0,-20 -17,16 17,16" fill="#1e293b" />
        <polygon points="0,-20 -17,16 -11,16" fill="#38bdf8" />
        <polygon points="0,-20 17,16 11,16" fill="#38bdf8" />
        <ellipse cx="0" cy="-3" rx="4" ry="8" fill="#7dd3fc" />
        <ellipse cx="0" cy="22" rx="4" ry="8" fill="#7dd3fc" opacity={0.7} />
      </g>
      {/* 캐노피 + 계기판 */}
      <polygon points="-4,0 26,0 44,152 22,152" fill="#0b1020" />
      <polygon points="324,0 294,0 276,152 298,152" fill="#0b1020" />
      <path d="M0 180 L0 158 Q160 138 320 158 L320 180Z" fill="url(#tc-dash)" stroke="#7dd3fc" strokeOpacity={0.6} />
      <circle cx="160" cy="168" r="17" fill="#04101c" stroke="#38bdf8" strokeWidth={1.6} />
      <circle cx="160" cy="168" r="8" fill="none" stroke="#38bdf8" strokeOpacity={0.4} />
      <circle cx="166" cy="162" r="1.8" fill="#fff" />
      <circle cx="153" cy="172" r="1.8" fill="#ef4444" />
      <text x="14" y="172" fontSize={12} fontWeight={800} fill="#fff" fontFamily={F}>
        0110
      </text>
      <text x="14" y="166" fontSize={0} />
      <text x="262" y="172" fontSize={11} fontWeight={800} fill="#fb7185" fontFamily={F}>
        ♥♥♥
      </text>
      <rect x="78" y="40" width="0" height="0" />
    </svg>
  );
}

function Omok() {
  const O = 22; // 격자 간격
  const X0 = 90;
  const Y0 = 14;
  const stones: [number, number, "b" | "w"][] = [
    [3, 3, "b"], [4, 3, "w"], [4, 4, "b"], [5, 4, "w"], [5, 5, "b"], [6, 5, "w"], [6, 6, "b"], [3, 4, "w"], [7, 7, "b"], [2, 2, "b"],
  ];
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full" role="img" aria-label="WORD OMOK">
      <defs>
        <linearGradient id="to-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6b86a" />
          <stop offset="1" stopColor="#c98f3c" />
        </linearGradient>
        <radialGradient id="to-b" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#6b7280" />
          <stop offset="0.6" stopColor="#111827" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <radialGradient id="to-w" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.7" stopColor="#e5e7eb" />
          <stop offset="1" stopColor="#9ca3af" />
        </radialGradient>
      </defs>
      <rect width="320" height="180" fill="#1e293b" />
      <rect x="60" y="2" width="200" height="176" rx="8" fill="url(#to-wood)" stroke="#5b3a14" strokeWidth={3} />
      {Array.from({ length: 8 }).map((_, k) => (
        <g key={k}>
          <line x1={X0} y1={Y0 + k * O} x2={X0 + O * 7} y2={Y0 + k * O} stroke="#3a2410" strokeWidth={1} />
          <line x1={X0 + k * O} y1={Y0} x2={X0 + k * O} y2={Y0 + O * 7} stroke="#3a2410" strokeWidth={1} />
        </g>
      ))}
      {stones.map(([i, j, c], k) => (
        <g key={k}>
          <circle cx={X0 + (i - 1) * O + 1.5} cy={Y0 + (j - 1) * O + 2} r={9} fill="#000" opacity={0.3} />
          <circle cx={X0 + (i - 1) * O} cy={Y0 + (j - 1) * O} r={9} fill={c === "b" ? "url(#to-b)" : "url(#to-w)"} />
        </g>
      ))}
      {/* 질문 말풍선 */}
      <g>
        <rect x="14" y="28" width="86" height="52" rx="10" fill="#0b1230" stroke="#ffd166" strokeWidth={1.8} />
        <text x="57" y="44" textAnchor="middle" fontSize={8} fontWeight={800} fill="#ffd166" fontFamily={F}>
          QUESTION
        </text>
        <text x="57" y="57" textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#fff" fontFamily={F}>
          very interested
        </text>
        <text x="57" y="68" textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#fff" fontFamily={F}>
          or eager
        </text>
      </g>
      {["keen", "brief", "vast"].map((w, i) => (
        <g key={w}>
          <rect x="266" y={30 + i * 26} width="46" height="20" rx="6" fill={i === 0 ? "#15803d" : "#1e293b"} stroke="#475569" strokeWidth={1.5} />
          <text x="289" y={44 + i * 26} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="#f8fafc" fontFamily={F}>
            {w}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Memory() {
  const cards = [
    { x: 56, y: 40, up: true, t: "brief" },
    { x: 126, y: 40, up: false, t: "" },
    { x: 196, y: 40, up: false, t: "" },
    { x: 266, y: 40, up: true, t: "vast" },
    { x: 56, y: 100, up: false, t: "" },
    { x: 126, y: 100, up: true, t: "keen" },
    { x: 196, y: 100, up: false, t: "" },
    { x: 266, y: 100, up: false, t: "" },
    { x: 56, y: 160, up: false, t: "" },
    { x: 126, y: 160, up: false, t: "" },
    { x: 196, y: 160, up: true, t: "urgent" },
    { x: 266, y: 160, up: false, t: "" },
  ];
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="w-full h-full" role="img" aria-label="WORD MEMORY">
      <defs>
        <linearGradient id="tm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f172a" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#tm-bg)" />
      {Array.from({ length: 24 }).map((_, i) => (
        <circle key={i} cx={(i * 47) % 320} cy={(i * 31) % 200} r={1.2} fill="#fff" opacity={0.35} />
      ))}
      {cards.map((c, i) => (
        <g key={i}>
          <rect x={c.x - 30} y={c.y - 22} width={60} height={44} rx={8} fill={c.up ? "#fff3c4" : "#1e3a8a"} stroke={c.up ? "#3a2410" : "#93c5fd"} strokeWidth={2.4} />
          {c.up ? (
            <text x={c.x} y={c.y + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#10172e" fontFamily={F}>
              {c.t}
            </text>
          ) : (
            <text x={c.x} y={c.y + 9} textAnchor="middle" fontSize={26} fontWeight={800} fill="#93c5fd" fontFamily={F}>
              ?
            </text>
          )}
        </g>
      ))}
      <rect x="82" y="2" width="156" height="16" rx="6" fill="#0b1230" opacity={0.85} stroke="#ffd166" strokeWidth={1.2} />
      <text x="160" y="14" textAnchor="middle" fontSize={9} fontWeight={800} fill="#fff" fontFamily={F}>
        very interested or eager?
      </text>
    </svg>
  );
}

function Rescue() {
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full" role="img" aria-label="WORD RESCUE">
      <defs>
        <linearGradient id="trr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="0.6" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#trr-sky)" />
      <path d="M0 140 L50 92 L100 128 L160 76 L225 126 L285 84 L320 118 L320 180 L0 180Z" fill="#64748b" opacity={0.85} />
      <rect y="142" width="320" height="38" fill="#a16207" />
      <rect y="142" width="320" height="5" fill="#ca8a04" />
      {/* 기지 */}
      <rect x="10" y="136" width="70" height="7" fill="#374151" />
      <rect x="64" y="104" width="2" height="34" fill="#e5e7eb" />
      <polygon points="66,104 66,114 82,109" fill="#2563eb" />
      {/* 글자 인원 */}
      {[
        { x: 150, l: "R" },
        { x: 190, l: "E" },
        { x: 240, l: "S" },
      ].map((m) => (
        <g key={m.l}>
          <circle cx={m.x} cy={112} r={10} fill="#1e3a8a" stroke="#ffd166" strokeWidth={2} />
          <text x={m.x} y={117} textAnchor="middle" fontSize={13} fontWeight={800} fill="#fff" fontFamily={F}>
            {m.l}
          </text>
          <circle cx={m.x} cy={128} r={4} fill="#f1c9a0" />
          <rect x={m.x - 4} y={132} width="8" height="10" rx="2" fill="#15803d" />
        </g>
      ))}
      {/* SAM + 미사일 */}
      <g>
        <rect x="262" y="128" width="28" height="14" fill="#57534e" />
        <rect x="272" y="112" width="6" height="20" fill="#78716c" />
        <polygon points="275,106 271,114 279,114" fill="#dc2626" />
        <path d="M276 108 Q 250 80 208 62" fill="none" stroke="#e5e7eb" strokeWidth={2} strokeDasharray="3 4" opacity={0.8} />
        <g transform="translate(216 66) rotate(-24)">
          <rect x="-12" y="-3" width="22" height="6" rx="2" fill="#f8fafc" />
          <polygon points="10,-3 17,0 10,3" fill="#dc2626" />
        </g>
      </g>
      {/* 헬기 */}
      <g transform="translate(150 58)">
        {/* 꼬리: 빔 + 수직날개 + 수평날개 */}
        <polygon points="-12,-4 -12,5 -46,-1 -46,-5" fill="#4d7c0f" />
        <polygon points="-46,-5 -50,-17 -40,-17 -33,-5" fill="#365314" />
        <polygon points="-44,-1 -37,-1 -42,4 -48,4" fill="#4d7c0f" />
        <line x1="-50" y1="-16" x2="-50" y2="-4" stroke="#94a3b8" strokeWidth={1.6} />
        {/* 동체 */}
        <ellipse cx="0" cy="3" rx="26" ry="12" fill="#365314" />
        <ellipse cx="0" cy="0" rx="26" ry="12" fill="#65a30d" />
        {/* 엔진 덮개 + 로터 */}
        <rect x="-12" y="-14" width="22" height="6" rx="3" fill="#3f6212" />
        <rect x="-2" y="-20" width="4" height="7" fill="#1c1917" />
        <rect x="-34" y="-22" width="68" height="2.5" rx="1" fill="#111827" />
        {/* 구조 표시 */}
        <circle cx="-4" cy="2" r="5" fill="#fff" />
        <rect x="-5.2" y="-1" width="2.4" height="6" fill="#dc2626" />
        <rect x="-7" y="1" width="6" height="2.4" fill="#dc2626" />
        {/* 조종석 유리 */}
        <ellipse cx="16" cy="-1" rx="12" ry="8" fill="#7dd3fc" />
        <ellipse cx="19" cy="-5" rx="5" ry="2" fill="#fff" opacity={0.65} />
        <rect x="-10" y="8" width="30" height="2" fill="#fde047" />
        {/* 스키드 */}
        <polyline points="-18,16 26,16 31,11" fill="none" stroke="#1c1917" strokeWidth={2.5} strokeLinecap="round" />
        <line x1="-8" y1="10" x2="-9" y2="16" stroke="#1c1917" strokeWidth={2} />
        <line x1="14" y1="10" x2="15" y2="16" stroke="#1c1917" strokeWidth={2} />
      </g>
      {/* 슬롯 */}
      <rect x="86" y="8" width="148" height="26" rx="8" fill="#0b1230" opacity={0.8} stroke="#ffd166" strokeWidth={1.4} />
      <text x="160" y="27" textAnchor="middle" fontSize={15} fontWeight={800} fill="#fff" fontFamily={F} letterSpacing={3}>
        R E _ _ _ E
      </text>
    </svg>
  );
}

function Sports() {
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full" role="img" aria-label="WORD SPORTS">
      <defs>
        <linearGradient id="ts-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="0.6" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#ts-sky)" />
      {/* 관중석 */}
      <rect y="70" width="320" height="34" fill="#334155" />
      {Array.from({ length: 60 }).map((_, i) => (
        <circle key={i} cx={(i * 37) % 320} cy={76 + ((i * 13) % 24)} r={2.6} fill={["#f87171", "#fbbf24", "#60a5fa", "#fff", "#4ade80"][i % 5]} opacity={0.9} />
      ))}
      {/* 트랙 */}
      <rect y="104" width="320" height="76" fill="#c2410c" />
      {[122, 140, 158].map((y) => (
        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#fff" strokeWidth={1.6} opacity={0.85} />
      ))}
      <rect x="262" y="104" width="6" height="76" fill="#fff" opacity={0.9} />
      <rect x="262" y="104" width="6" height="8" fill="#111" />
      <rect x="262" y="120" width="6" height="8" fill="#111" />
      <rect x="262" y="136" width="6" height="8" fill="#111" />
      {/* 달리는 선수 */}
      {[
        { x: 150, y: 131, c: "#e63946" },
        { x: 120, y: 149, c: "#3b82f6" },
        { x: 92, y: 167, c: "#22c55e" },
      ].map((r, i) => (
        <g key={i} transform={`translate(${r.x} ${r.y})`}>
          <circle cx="0" cy="-17" r="4.2" fill="#f1c9a0" />
          <line x1="0" y1="-12" x2="-2" y2="-2" stroke={r.c} strokeWidth={4.5} strokeLinecap="round" />
          <line x1="-2" y1="-2" x2="-9" y2="6" stroke="#f1c9a0" strokeWidth={3} strokeLinecap="round" />
          <line x1="-2" y1="-2" x2="7" y2="4" stroke="#f1c9a0" strokeWidth={3} strokeLinecap="round" />
          <line x1="0" y1="-10" x2="8" y2="-6" stroke="#f1c9a0" strokeWidth={2.6} strokeLinecap="round" />
          <line x1="0" y1="-10" x2="-8" y2="-5" stroke="#f1c9a0" strokeWidth={2.6} strokeLinecap="round" />
        </g>
      ))}
      {/* 클레이 접시 + 단어 */}
      <g transform="translate(236 40) rotate(-14)">
        <ellipse cx="0" cy="0" rx="26" ry="8" fill="#f97316" />
        <ellipse cx="0" cy="-2" rx="16" ry="4" fill="#fdba74" />
      </g>
      <rect x="208" y="46" width="56" height="16" rx="5" fill="#fff3c4" stroke="#3a2410" strokeWidth={1.4} />
      <text x="236" y="58" textAnchor="middle" fontSize={10} fontWeight={800} fill="#10172e" fontFamily={F}>
        brief
      </text>
      <g transform="translate(88 22) rotate(12)">
        <ellipse cx="0" cy="0" rx="20" ry="6" fill="#f97316" opacity={0.85} />
      </g>
      {/* 조준선 */}
      <g stroke="#fff" strokeWidth={1.6} fill="none" opacity={0.95}>
        <circle cx="232" cy="42" r="16" />
        <line x1="232" y1="20" x2="232" y2="30" />
        <line x1="232" y1="54" x2="232" y2="64" />
        <line x1="210" y1="42" x2="220" y2="42" />
        <line x1="244" y1="42" x2="254" y2="42" />
      </g>
    </svg>
  );
}

function Tetris() {
  const rows: [number, number, string][] = [
    [2, 6, "#22d3ee"], [3, 6, "#22d3ee"], [4, 6, "#22d3ee"], [5, 6, "#22d3ee"],
    [0, 7, "#facc15"], [1, 7, "#facc15"], [0, 8, "#facc15"], [1, 8, "#facc15"], [2, 7, "#a78bfa"], [3, 7, "#a78bfa"], [4, 7, "#a78bfa"], [3, 6.0001, "#22d3ee"],
    [2, 8, "#a78bfa"], [3, 8, "#4ade80"], [4, 8, "#4ade80"], [5, 8, "#f87171"], [6, 8, "#f87171"], [5, 7, "#4ade80"], [6, 7, "#f87171"], [7, 8, "#fb923c"], [7, 7, "#fb923c"], [7, 6, "#fb923c"],
  ];
  return (
    <svg viewBox="0 0 320 180" className="w-full h-full" aria-hidden>
      <rect width="320" height="180" fill="#0f172a" />
      <g transform="translate(100,6)">
        <rect x="0" y="0" width="120" height="168" rx="4" fill="#0b1220" stroke="#334155" />
        {rows.map(([x, y, c], i) => (
          <rect key={i} x={x * 14 + 3} y={y * 14 + 56} width="12" height="12" rx="2" fill={c} />
        ))}
        <g transform="translate(40,4)">
          <rect x="0" y="0" width="14" height="14" fill="#a78bfa" />
          <rect x="14" y="0" width="14" height="14" fill="#a78bfa" />
          <rect x="28" y="0" width="14" height="14" fill="#a78bfa" />
          <rect x="14" y="14" width="14" height="14" fill="#a78bfa" />
        </g>
      </g>
      <text x="232" y="64" fill="#fbbf24" fontSize="22" fontWeight="800">★★★</text>
      <text x="234" y="92" fill="#e2e8f0" fontSize="13" fontWeight="700">reluctant</text>
    </svg>
  );
}

export default function GameThumb({ kind }: { kind: ThumbKey }) {
  switch (kind) {
    case "sports":
      return <Sports />;
    case "rescue":
      return <Rescue />;
    case "memory":
      return <Memory />;
    case "tetris":
      return <Tetris />;
    case "omok":
      return <Omok />;
    case "archery":
      return <Archery />;
    case "rain":
      return <Rain />;
    case "race":
      return <Race />;
    case "drift":
      return <Drift />;
    case "cockpit":
      return <Cockpit />;
  }
}
