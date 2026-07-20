"use client";

export type Tribe = "kenine" | "fenine" | "lutrine";
export type PaxStage = "cub" | "explorer" | "scholar" | "guardian" | "master" | "shattered";

export function levelToStage(level: number): PaxStage {
  if (level >= 50) return "master";
  if (level >= 30) return "guardian";
  if (level >= 15) return "scholar";
  if (level >= 5)  return "explorer";
  return "cub";
}

const TRIBE_COLOR: Record<Tribe, { primary: string; secondary: string; eye: string }> = {
  kenine:  { primary: "#FF8A00", secondary: "#E67200", eye: "#00C7A5" },
  fenine:  { primary: "#5B4FCF", secondary: "#3D2FA0", eye: "#00C7A5" },
  lutrine: { primary: "#F5A623", secondary: "#C4851A", eye: "#00C7A5" },
};

const STAGE_LABEL: Record<PaxStage, string> = {
  cub:      "Cub",
  explorer: "Explorer",
  scholar:  "Scholar",
  guardian: "Guardian",
  master:   "Master",
  shattered:"Shattered",
};

interface PaxAvatarProps {
  tribe?: Tribe | null;
  stage?: PaxStage;
  size?: number;
  className?: string;
}

export function PaxAvatar({ tribe = "kenine", stage = "cub", size = 120, className }: PaxAvatarProps) {
  const t = tribe ?? "kenine";
  const c = TRIBE_COLOR[t];
  const isShattered = stage === "shattered";
  const eyeColor = isShattered ? "#888" : c.eye;
  const furColor = isShattered ? "#999" : c.primary;
  const darkFur  = isShattered ? "#666" : c.secondary;

  // Emerald accent count per stage
  const showEar    = ["explorer","scholar","guardian","master"].includes(stage);
  const showMantle = ["guardian","master"].includes(stage);
  const showGlow   = stage === "master";
  const showGlasses= ["scholar","guardian","master"].includes(stage);
  const crackLeft  = isShattered;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`Pax ${STAGE_LABEL[stage]}`}
    >
      {/* Glow (master only) */}
      {showGlow && (
        <circle cx="50" cy="55" r="42" fill="#00C7A5" opacity="0.12" />
      )}

      {/* Mantle (guardian+) */}
      {showMantle && (
        <ellipse cx="50" cy="88" rx="28" ry="10"
          fill={t === "fenine" ? "#3D2FA0" : t === "lutrine" ? "#C4851A" : "#005F50"}
          opacity="0.85"
        />
      )}

      {/* Tail */}
      <path
        d="M68 72 Q90 80 85 62 Q80 48 72 58 Q68 63 68 72Z"
        fill={furColor}
      />
      {/* Tail white tip */}
      <ellipse cx="83" cy="63" rx="6" ry="8" fill="white" opacity="0.9"
        transform="rotate(-20 83 63)"
      />
      {/* Tail emerald tip */}
      {showGlow && <ellipse cx="83" cy="63" rx="4" ry="5" fill="#00C7A5" opacity="0.8"
        transform="rotate(-20 83 63)" />}

      {/* Body */}
      <ellipse cx="50" cy="72" rx="20" ry="16" fill={furColor} />
      {/* Belly */}
      <ellipse cx="50" cy="74" rx="13" ry="11" fill="white" opacity="0.6" />

      {/* Left ear */}
      <path d="M28 32 L22 12 L36 26Z" fill={furColor} />
      <path d="M28 30 L24 16 L34 26Z" fill={darkFur} opacity="0.5" />
      {showEar && <path d="M27 26 L24 17 L32 24Z" fill="#00C7A5" opacity="0.7" />}

      {/* Right ear */}
      <path d="M72 32 L78 12 L64 26Z" fill={furColor} />
      <path d="M72 30 L76 16 L66 26Z" fill={darkFur} opacity="0.5" />
      {showEar && <path d="M73 26 L76 17 L68 24Z" fill="#00C7A5" opacity="0.7" />}

      {/* Head */}
      <ellipse cx="50" cy="44" rx="24" ry="22" fill={furColor} />

      {/* Cheek fur — X signature */}
      {/* Left cheek upper */}
      <path d="M30 46 Q34 42 38 46" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* Left cheek lower */}
      <path
        d={crackLeft ? "M30 50 Q33 54 36 50" : "M30 50 Q34 54 38 50"}
        stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
        opacity={crackLeft ? "0.3" : "0.7"}
      />
      {/* Right cheek upper */}
      <path d="M70 46 Q66 42 62 46" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* Right cheek lower */}
      <path d="M70 50 Q66 54 62 50" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />

      {/* Muzzle */}
      <ellipse cx="50" cy="52" rx="10" ry="7" fill="white" opacity="0.7" />
      {/* Nose */}
      <ellipse cx="50" cy="50" rx="3" ry="2" fill={darkFur} />
      {/* Mouth */}
      <path d="M46 54 Q50 57 54 54" stroke={darkFur} strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* Left eye */}
      <ellipse cx="38" cy="41" rx="6" ry="5" fill="white" />
      <ellipse cx="38" cy="41" rx="4.5" ry="4" fill={eyeColor} />
      {/* Hex crystal in eye (simplified) */}
      <ellipse cx="38" cy="41" rx="2" ry="2" fill="white" opacity="0.5" />
      {crackLeft && (
        <path d="M35 38 L37 44" stroke="#555" strokeWidth="1" strokeLinecap="round" />
      )}

      {/* Right eye */}
      <ellipse cx="62" cy="41" rx="6" ry="5" fill="white" />
      <ellipse cx="62" cy="41" rx="4.5" ry="4" fill={eyeColor} />
      <ellipse cx="62" cy="41" rx="2" ry="2" fill="white" opacity="0.5" />

      {/* Glasses (scholar+) */}
      {showGlasses && (
        <>
          <rect x="32" y="37" width="13" height="9" rx="4" stroke={darkFur} strokeWidth="1.2" fill="none" opacity="0.6" />
          <rect x="55" y="37" width="13" height="9" rx="4" stroke={darkFur} strokeWidth="1.2" fill="none" opacity="0.6" />
          <path d="M45 41.5 L55 41.5" stroke={darkFur} strokeWidth="1" fill="none" opacity="0.6" />
        </>
      )}

      {/* Shattered crack overlay */}
      {isShattered && (
        <path d="M38 30 L44 42 L40 50 L46 62" stroke="#555" strokeWidth="1.2"
          strokeLinecap="round" strokeDasharray="3 2" fill="none" opacity="0.5" />
      )}
    </svg>
  );
}

export { STAGE_LABEL };
