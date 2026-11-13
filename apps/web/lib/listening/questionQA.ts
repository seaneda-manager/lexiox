/**
 * 새로 생성한 Listening 문항의 정답 블라인드 검증.
 *
 * 스크립트(transcript)만 보고 AI가 문제를 "다시 푼다". 정답 키와 다르면 한 번 더 풀어 본 뒤에도
 * 다르면 q.meta.qa.keyVerified=false 로 표시해 검수 때 먼저 보게 한다.
 * (실제 데이터 감사에서 키가 틀어진 문항이 테스트당 최대 절반까지 나온 적이 있어 추가함 — 2026-11-13)
 * 정답 표시가 하나도 없는 문항은 solver 답으로 임시 키를 세우고 meta.qa.keySource='solver' 로 표시한다.
 * 호출부에서 try/catch로 감싸 생성 자체는 실패하지 않게 한다. payload를 직접 수정한다.
 */
import type Anthropic from "@anthropic-ai/sdk";

export type ListeningQAStats = { checked: number; verified: number; mismatched: number; keyFilled: number; errors: number };

type Ref = { q: any; transcript: string; kind: string };

const isCorrect = (c: any) => c?.correct === true || c?.isCorrect === true;

function collect(items: any[], out: Ref[]): void {
  for (const item of items ?? []) {
    for (const q of item?.questions ?? []) {
      const transcript = item.taskKind === "choose_response" ? q.transcript : item.transcript;
      if (transcript && Array.isArray(q.choices) && q.choices.length >= 2) out.push({ q, transcript, kind: item.taskKind });
    }
  }
}

async function solve(client: Anthropic, ref: Ref): Promise<number | null> {
  const { q, transcript, kind } = ref;
  const stem = q.stem?.trim() || "Choose the most natural and appropriate response to what you heard.";
  const prompt = `You are taking the TOEFL Listening section (${kind}). Answer using ONLY the transcript.

TRANSCRIPT:
${transcript}

QUESTION: ${stem}

CHOICES:
${q.choices.map((c: any, i: number) => `${String.fromCharCode(65 + i)}. ${c.text}`).join("\n")}

Reply with JSON only: {"answer":"A|B|C|D"}`;
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 60,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const idx = String(JSON.parse(m[0]).answer ?? "").trim().toUpperCase().charCodeAt(0) - 65;
    return idx >= 0 && idx < q.choices.length ? idx : null;
  } catch {
    return null;
  }
}

async function pool<T>(items: T[], limit: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    })
  );
}

/** trackGroups: 생성된 트랙 배열들(module1/hard/easy). */
export async function verifyListeningQuestions(trackGroups: any[][], client: Anthropic): Promise<ListeningQAStats> {
  const refs: Ref[] = [];
  trackGroups.forEach((g) => collect(g, refs));
  const stats: ListeningQAStats = { checked: 0, verified: 0, mismatched: 0, keyFilled: 0, errors: 0 };

  await pool(refs, 6, async (ref) => {
    const { q } = ref;
    const keyIdx = q.choices.findIndex(isCorrect);
    try {
      let pick = await solve(client, ref);
      if (pick == null) {
        stats.errors++;
        return;
      }
      if (keyIdx >= 0 && pick !== keyIdx) {
        const second = await solve(client, ref); // 오탐 줄이기: 독립적으로 한 번 더
        if (second === keyIdx) pick = second;
      }
      stats.checked++;
      if (keyIdx < 0) {
        q.choices.forEach((c: any, i: number) => (c.correct = i === pick));
        q.meta = { ...(q.meta ?? {}), qa: { keyVerified: false, keySource: "solver", checkedAt: new Date().toISOString() } };
        stats.keyFilled++;
        return;
      }
      const verified = pick === keyIdx;
      q.meta = { ...(q.meta ?? {}), qa: { keyVerified: verified, solverChoice: pick, checkedAt: new Date().toISOString() } };
      if (verified) stats.verified++;
      else stats.mismatched++;
    } catch {
      stats.errors++;
    }
  });
  return stats;
}
