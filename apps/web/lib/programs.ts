// apps/web/lib/programs.ts

export type ProgramKey = "naesin" | "junior" | "toefl" | "voca";

export type ProgramMeta = {
  key: ProgramKey;
  label: string;
  shortLabel: string;
  homeHref: string;
  defaultSection:
    | "reading"
    | "listening"
    | "speaking"
    | "writing"
    | "grammar"
    | "vocab";
  badgeClass: string;
  textClass: string;
  desc: string;
};

export const PROGRAM_META: Record<ProgramKey, ProgramMeta> = {
  naesin: {
    key: "naesin",
    label: "Lingo-X 내신",
    shortLabel: "내신",
    homeHref: "/student",
    defaultSection: "reading",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    textClass: "text-emerald-700",
    desc: "내신 과제와 학습 흐름을 먼저 보여줍니다.",
  },
  junior: {
    key: "junior",
    label: "Lingo-X Junior",
    shortLabel: "Junior",
    homeHref: "/student",
    defaultSection: "reading",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    textClass: "text-amber-700",
    desc: "주니어용 과제와 학습 흐름을 보여줍니다.",
  },
  toefl: {
    key: "toefl",
    label: "Lingo-X TOEFL",
    shortLabel: "TOEFL",
    homeHref: "/toefl/home",
    defaultSection: "reading",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
    textClass: "text-sky-700",
    desc: "TOEFL 학습 과제 중심 화면입니다.",
  },
  voca: {
    key: "voca",
    label: "Lingo-X Voca",
    shortLabel: "VOCA",
    homeHref: "/voca/study",
    defaultSection: "vocab",
    badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
    textClass: "text-violet-700",
    desc: "보캡 플랜과 단어 과제를 우선 보여줍니다.",
  },
};

export const PROGRAM_PRIORITY: ProgramKey[] = [
  "naesin",
  "junior",
  "toefl",
  "voca",
];

const PROGRAM_ALIASES: Record<string, ProgramKey> = {
  naesin: "naesin",
  lingo_naesin: "naesin",
  lingox_naesin: "naesin",

  junior: "junior",
  lingo_junior: "junior",
  lingox_junior: "junior",

  toefl: "toefl",
  updated_toefl: "toefl",
  ibt: "toefl",

  voca: "voca",
  vocab: "voca",
  lingo_vocab: "voca",
  lingo_voca: "voca",
  lingox_vocab: "voca",
  lingox_voca: "voca",
};

export function normalizeProgram(input: unknown): ProgramKey | null {
  if (typeof input !== "string") return null;
  const key = input.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return PROGRAM_ALIASES[key] ?? null;
}

export function isProgramKey(value: unknown): value is ProgramKey {
  return (
    value === "naesin" ||
    value === "junior" ||
    value === "toefl" ||
    value === "voca"
  );
}

export function pickPreferredProgram(
  values: Array<unknown>,
): ProgramKey | null {
  const normalized = values
    .map((v) => normalizeProgram(v))
    .filter((v): v is ProgramKey => !!v);

  for (const key of PROGRAM_PRIORITY) {
    if (normalized.includes(key)) return key;
  }

  return normalized[0] ?? null;
}

export function getProgramMeta(input: unknown): ProgramMeta | null {
  const key = normalizeProgram(input);
  return key ? PROGRAM_META[key] : null;
}
