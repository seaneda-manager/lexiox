import type { ArcheryQuestion } from "@/components/workout/ArcheryPhaser";

export type ArcheryMode = "en-en" | "ko-en" | "en-ko" | "spelling";

export type ArcheryVocab = {
  word: string;
  ko: string;
  def: string;
  // 실제 단어장에서 올 때만 채워지는 부가 정보(암기 모드·동의어 게임 등에서 사용)
  id?: string;
  pos?: string;
  pron?: string;
  synonyms?: string[];
};

export const ARCHERY_MODE_LABEL: Record<ArcheryMode, { label: string; sub: string }> = {
  "en-en": { label: "영영", sub: "영어 뜻을 보고 단어 쏘기" },
  "ko-en": { label: "한영", sub: "한글 뜻을 보고 영어 단어 쏘기" },
  "en-ko": { label: "영한", sub: "영어 단어를 보고 한글 뜻 쏘기" },
  spelling: { label: "스펠링", sub: "빠진 글자를 쏘세요" },
};

function pick<T>(arr: T[], n: number, exclude: T): T[] {
  const pool = arr.filter((x) => x !== exclude);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/** 단어 목록으로 모드별 문제를 만든다. */
export function buildArcheryQuestions(vocab: ArcheryVocab[], mode: ArcheryMode, extraPool: ArcheryVocab[] = []): ArcheryQuestion[] {
  // 오답 보기는 이번 단어 + (부족할 때) 추가 풀에서 뽑는다. 문제로 나오는 건 vocab 뿐.
  const pool = [...vocab, ...extraPool.filter((e) => !vocab.some((v) => v.word === e.word))];
  const words = pool.map((v) => v.word);
  const kos = pool.map((v) => v.ko).filter(Boolean);

  return vocab.map((v, i) => {
    const id = `${mode}-${i}`;
    if (mode === "en-en") {
      return { id, prompt: v.def, answer: v.word, choices: [v.word, ...pick(words, 3, v.word)] };
    }
    if (mode === "ko-en") {
      return { id, prompt: v.ko, answer: v.word, choices: [v.word, ...pick(words, 3, v.word)] };
    }
    if (mode === "en-ko") {
      return { id, prompt: v.word, answer: v.ko, choices: [v.ko, ...pick(kos, 3, v.ko)] };
    }
    // spelling: 글자 하나를 가리고 빠진 글자를 고르게 한다
    const letters = v.word.split("");
    const idxs = letters.map((_, k) => k).filter((k) => k > 0 && k < letters.length - 1);
    const hide = idxs[Math.floor(Math.random() * idxs.length)] ?? 1;
    const answer = letters[hide];
    const masked = letters.map((c, k) => (k === hide ? "_" : c)).join(" ");
    const alphabet = "abcdefghijklmnopqrstuvwxyz".split("").filter((c) => c !== answer);
    const wrong = pick(alphabet, 3, "");
    return { id, prompt: `${v.ko}\n${masked}`, answer, choices: [answer, ...wrong] };
  });
}

export const DEMO_VOCAB: ArcheryVocab[] = [
  { word: "reluctant", ko: "꺼리는", def: "unwilling and hesitant; not eager to do something" },
  { word: "alleviate", ko: "완화하다", def: "to make something less severe, serious, or painful" },
  { word: "abundant", ko: "풍부한", def: "existing in large amounts; more than enough" },
  { word: "prevent", ko: "막다, 예방하다", def: "to stop something from happening; to hinder" },
  { word: "obvious", ko: "분명한", def: "clearly noticeable; easily seen or understood" },
  { word: "examine", ko: "조사하다", def: "to look at something carefully in order to understand it" },
  { word: "brief", ko: "짧은", def: "lasting for only a very short time" },
  { word: "authorize", ko: "승인하다", def: "to officially allow or approve something" },
  { word: "fragile", ko: "깨지기 쉬운", def: "easily broken or damaged" },
  { word: "reveal", ko: "드러내다", def: "to make something known that was hidden" },
  { word: "ancient", ko: "고대의", def: "belonging to a time very long ago" },
  { word: "benefit", ko: "이익, 혜택", def: "an advantage or good result from something" },
  { word: "consume", ko: "소비하다", def: "to use up or eat or drink something" },
  { word: "decline", ko: "감소하다", def: "to become smaller, weaker, or less" },
  { word: "efficient", ko: "효율적인", def: "working well without wasting time or energy" },
  { word: "flourish", ko: "번창하다", def: "to grow or develop in a healthy way" },
  { word: "genuine", ko: "진짜의", def: "real and not fake; sincere" },
  { word: "hazard", ko: "위험 요소", def: "something that may cause danger or harm" },
  { word: "inevitable", ko: "불가피한", def: "certain to happen; unable to be avoided" },
  { word: "justify", ko: "정당화하다", def: "to show that something is reasonable or right" },
  { word: "keen", ko: "열렬한", def: "very interested or eager" },
  { word: "maintain", ko: "유지하다", def: "to keep something in good condition or at the same level" },
  { word: "neglect", ko: "방치하다", def: "to fail to give enough care or attention" },
  { word: "obstacle", ko: "장애물", def: "something that blocks the way or makes progress difficult" },
  { word: "persuade", ko: "설득하다", def: "to make someone agree by giving good reasons" },
  { word: "reliable", ko: "믿을 만한", def: "able to be trusted to do what is expected" },
  { word: "significant", ko: "중요한", def: "important or large enough to be noticed" },
  { word: "tolerate", ko: "참다, 견디다", def: "to accept something unpleasant without complaining" },
  { word: "urgent", ko: "긴급한", def: "needing immediate attention" },
  { word: "vast", ko: "광대한", def: "extremely large in size or amount" },
];
