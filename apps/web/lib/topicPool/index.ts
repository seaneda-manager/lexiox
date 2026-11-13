/**
 * 주제 씨앗 풀 — 실제 기출(TPO) 718건의 "분야·세부주제·핵심 요약·맥락"만 담은 메타데이터.
 *
 * 본문/지문 제목은 들어 있지 않다. 요약은 모두 재서술이며, 생성 프롬프트에는
 * "영감용 참고"로만 넣는다(그대로 쓰지 말고 같은 결의 새 주제를 만들라고 지시).
 * 데이터 갱신: scripts 로 tpoSeeds.json 만 교체하면 된다.
 */
import seedData from "./tpoSeeds.json";

export type Seed = { f: string; s: string; g: string; k: string; c?: string };
export type PoolKey =
  | "reading"
  | "lecture"
  | "conversation"
  | "writingIntegrated"
  | "speakingQ2"
  | "speakingQ3"
  | "speakingQ4";

const POOLS = seedData as unknown as Record<PoolKey, Seed[]>;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 풀에서 n개를 무작위로 뽑되, 가능한 한 서로 다른 분야가 되게 한다.
 * (분야 비중은 풀 자체의 실제 기출 분포를 따른다: 무작위 순서에서 분야별 첫 항목을 고르므로
 *  항목이 많은 분야가 자주 먼저 걸린다.)
 */
export function sampleSeeds(key: PoolKey, n: number, opts: { fields?: string[] } = {}): Seed[] {
  let pool = (POOLS[key] ?? []).filter((s) => s.s);
  if (opts.fields?.length) {
    const only = pool.filter((s) => opts.fields!.includes(s.f));
    if (only.length >= n) pool = only;
  }
  const shuffled = shuffle(pool);
  const picked: Seed[] = [];
  const seenFields = new Set<string>();
  for (const s of shuffled) {
    if (picked.length >= n) break;
    if (!seenFields.has(s.f)) {
      seenFields.add(s.f);
      picked.push(s);
    }
  }
  for (const s of shuffled) {
    if (picked.length >= n) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked;
}

const clip = (t: string, max: number) => (t.length > max ? t.slice(0, max - 1) + "…" : t);

/**
 * 프롬프트에 붙일 "영감용 참고" 블록. 풀이 비어 있으면 빈 문자열을 돌려주므로 그대로 이어 붙여도 안전하다.
 * lang: 'en' = 영어 요약, 'ko' = 한국어 요약(Speaking/Writing 추천은 한국어 주제를 만든다).
 */
export function buildInspirationBlock(key: PoolKey, n: number, lang: "en" | "ko" = "en"): string {
  const seeds = sampleSeeds(key, n);
  if (!seeds.length) return "";
  const lines = seeds.map((s) => {
    const gist = lang === "ko" ? s.k || s.g : s.g || s.k;
    const ctx = s.c ? ` (${clip(s.c, 140)})` : "";
    return `- [${s.f}] ${s.s}: ${clip(gist, 160)}${ctx}`;
  });
  return `\nInspiration — real past TOEFL items (field, scope and depth only):\n${lines.join("\n")}\nDo NOT reuse these topics or their wording. Propose NEW topics of comparable field, scope and difficulty, each clearly different from every example and from the "already used" list.\n`;
}

/** Listening 말-응답(choose_response)용: 실제 기출 대화 상황을 짧게 줄인 씨앗 문장들. */
export function conversationScenarioSeeds(maxLen = 150): string[] {
  return (POOLS.conversation ?? [])
    .map((s) => (s.c || "").trim())
    .filter(Boolean)
    .map((t) => clip(t.replace(/\s+/g, " "), maxLen));
}
