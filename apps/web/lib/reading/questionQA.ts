/**
 * 새로 생성한 Reading 문항의 자동 검증 + 정답 근거 문장 초안.
 *
 * 1) 정답이 가려진 상태에서 AI가 문제를 "다시 푼다"(블라인드 풀이).
 * 2) 정답 키와 같으면 verified, 다르면 한 번 더 풀어 본 뒤에도 다르면 "정답 의심(key_mismatch)".
 * 3) 검증 통과 문항에만 근거 문장(지문 원문 인용)을 draft로 붙인다.
 *    (정답이 의심되는 문항의 근거는 잘못된 보기를 뒷받침하므로 붙이지 않고 solverEvidence로만 보관)
 * 4) 모든 결과는 문항의 meta.qa 에 남겨 선생님 검수 화면에서 불일치 문항을 먼저 볼 수 있게 한다.
 *
 * 생성 실패로 이어지지 않도록 호출부에서 try/catch로 감싼다. 이 모듈은 payload를 직접 수정(mutate)한다.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { htmlToPlain, quoteExistsInPassage } from "@/lib/reading/evidence";
import type { REvidence } from "@/models/reading/types";

type QRef = { q: any; passagePlain: string };

export type QAStats = {
  checked: number;
  verified: number;
  mismatched: number;
  skipped: number;
  errors: number;
};

const SKIP_TYPES = new Set(["insertion", "summary"]);
const isCorrect = (c: any) => c?.isCorrect === true || c?.is_correct === true;

function collect(node: any, out: QRef[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, out));
    return;
  }
  if ((node.taskKind === "academic_passage" || node.taskKind === "daily_life") && Array.isArray(node.questions)) {
    const html = node.taskKind === "academic_passage" ? node.passageHtml : node.contentHtml;
    const passagePlain = htmlToPlain(html ?? "");
    for (const q of node.questions) out.push({ q, passagePlain });
  }
  if (Array.isArray(node.items)) collect(node.items, out);
  if (Array.isArray(node.modules)) collect(node.modules, out);
  if (node.stage2Pool) {
    collect(node.stage2Pool.hard, out);
    collect(node.stage2Pool.easy, out);
  }
}

function parseJson(text: string): any | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

async function solveBlind(client: Anthropic, ref: QRef): Promise<{ idx: number; quotes: string[] } | null> {
  const { q, passagePlain } = ref;
  const choices = (q.choices ?? []) as any[];
  const prompt = `You are taking a TOEFL reading test. Answer using ONLY the passage.

PASSAGE:
${passagePlain}

QUESTION: ${q.stem}

CHOICES:
${choices.map((c, i) => `${String.fromCharCode(65 + i)}. ${c.text}`).join("\n")}

Reply with JSON only:
{"answer":"A|B|C|D","evidence":[{"quote":"<1-2 sentences copied EXACTLY, word for word, from the passage that prove your answer>"}]}`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const parsed = parseJson(text);
  const letter = String(parsed?.answer ?? "").trim().toUpperCase().charAt(0);
  const idx = letter.charCodeAt(0) - 65;
  if (!(idx >= 0 && idx < choices.length)) return null;
  const quotes: string[] = (parsed?.evidence ?? [])
    .map((e: any) => String(e?.quote ?? "").trim())
    .filter((qt: string) => qt && quoteExistsInPassage(passagePlain, qt))
    .slice(0, 2);
  return { idx, quotes };
}

async function runPool<T>(items: T[], limit: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    })
  );
}

/** payload(모듈 1/2 어느 형태든) 안의 지문형 문항을 검증하고 근거 초안을 붙인다. */
export async function verifyQuestionsAndAttachEvidence(payload: unknown, client: Anthropic): Promise<QAStats> {
  const refs: QRef[] = [];
  collect(payload, refs);
  const stats: QAStats = { checked: 0, verified: 0, mismatched: 0, skipped: 0, errors: 0 };

  await runPool(refs, 4, async (ref) => {
    const { q } = ref;
    const choices = (q.choices ?? []) as any[];
    const keyIdx = choices.findIndex(isCorrect);
    if (SKIP_TYPES.has(q.type) || choices.length < 2 || keyIdx < 0 || choices.filter(isCorrect).length !== 1) {
      stats.skipped++;
      return;
    }
    try {
      let attempts = 1;
      let res = await solveBlind(client, ref);
      if (res && res.idx !== keyIdx) {
        attempts = 2; // 오탐 줄이기: 한 번 더 독립적으로 풀어 본다
        const second = await solveBlind(client, ref);
        if (second && second.idx === keyIdx) res = second;
      }
      if (!res) {
        stats.errors++;
        return;
      }
      stats.checked++;
      const verified = res.idx === keyIdx;
      q.meta = {
        ...(q.meta ?? {}),
        qa: { keyVerified: verified, solverChoice: res.idx, attempts, checkedAt: new Date().toISOString() },
      };
      if (verified) {
        stats.verified++;
        if (res.quotes.length > 0) {
          q.explanation = {
            ...(q.explanation ?? {}),
            evidence: res.quotes.map((quote) => ({ quote, status: "draft", source: "ai" } as REvidence)),
          };
        }
      } else {
        stats.mismatched++;
        q.meta.qa.solverEvidence = res.quotes; // 참고용(학생에게 노출 안 됨)
      }
    } catch {
      stats.errors++;
    }
  });
  return stats;
}
