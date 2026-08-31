import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";

export const GRAMMAR_MODEL = "claude-sonnet-5";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "placeholder" });

/** 코드펜스·프롤로그 제거 후 가장 바깥 {...} 를 잘라낸다 */
function extractJsonBlock(raw: string): string {
  let t = raw.trim();
  // ```json ... ``` 펜스 제거
  const fence = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(t);
  if (fence) t = fence[1].trim();
  const s = t.indexOf("{");
  if (s === -1) throw new Error("LLM 응답에서 JSON을 찾을 수 없습니다.");
  // 문자열/이스케이프를 감안해 괄호 균형점을 찾는다
  let depth = 0, inStr = false, esc = false;
  for (let i = s; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return t.slice(s, i + 1); }
  }
  return t.slice(s); // 불균형(잘림) — 아래 repair 시도
}

function looseParse(block: string): any {
  try {
    return JSON.parse(block);
  } catch {
    // 흔한 손상 복구: 트레일링 콤마, 객체/배열 사이 콤마 누락
    let fixed = block
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/}\s*{/g, "},{")
      .replace(/]\s*\[/g, "],[")
      .replace(/"\s*\n\s*"/g, '","'); // 줄바꿈으로 끊긴 배열 요소
    return JSON.parse(fixed);
  }
}

/**
 * Claude 호출 → 응답에서 JSON만 파싱해 반환.
 * claude-sonnet-5는 content 배열에 thinking 블록을 먼저 넣을 수 있으므로 text 블록을 명시적으로 찾는다.
 * max_tokens로 잘리면(stop_reason=max_tokens) 명확히 에러.
 */
export async function callClaudeJson(
  route: string,
  prompt: string,
  maxTokens = 16000,
): Promise<any> {
  const message = await client.messages.create({
    model: GRAMMAR_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  void logAnthropicUsage(route, GRAMMAR_MODEL, message.usage);

  const textBlock = (message.content as any[]).find((b) => b?.type === "text");
  const raw = (textBlock?.text as string) ?? "";

  if (message.stop_reason === "max_tokens") {
    throw new Error("AI 응답이 너무 길어 잘렸습니다. 세그먼트/드릴 수를 줄이거나 다시 시도하세요.");
  }
  try {
    return looseParse(extractJsonBlock(raw));
  } catch (e: any) {
    console.error(`[${route}] JSON parse 실패:`, e?.message, "\n--- raw tail ---\n", raw.slice(-400));
    throw new Error("AI 응답을 JSON으로 읽지 못했습니다. 다시 시도해 주세요.");
  }
}

// ── 설명 세그먼트 ────────────────────────────────────────────

export type LectureSegment =
  | { type: "text"; narration?: string; content: { text: string } }
  | {
      type: "board";
      narration?: string;
      content: {
        title?: string;
        lines: Array<{
          text: string;
          emphasis?: Array<{ from: number; to: number; kind: "highlight" | "circle" | "underline" }>;
        }>;
      };
    }
  | {
      type: "blank";
      narration?: string;
      content: { prompt: string; answer: string; hint_ko?: string };
    };

export function sanitizeSegments(parsed: any): LectureSegment[] {
  const arr = Array.isArray(parsed?.segments) ? parsed.segments : [];
  const out: LectureSegment[] = [];
  for (const seg of arr) {
    const narration = seg?.narration ? String(seg.narration).trim() : undefined;
    if (seg?.type === "text" && seg?.content?.text) {
      out.push({ type: "text", narration, content: { text: String(seg.content.text) } });
    } else if (seg?.type === "board" && Array.isArray(seg?.content?.lines)) {
      const lines = seg.content.lines
        .filter((l: any) => l && typeof l.text === "string")
        .map((l: any) => ({
          text: String(l.text),
          emphasis: Array.isArray(l.emphasis)
            ? l.emphasis
                .filter(
                  (m: any) =>
                    Number.isFinite(m?.from) &&
                    Number.isFinite(m?.to) &&
                    m.to > m.from &&
                    ["highlight", "circle", "underline"].includes(m?.kind),
                )
                .map((m: any) => ({ from: m.from | 0, to: m.to | 0, kind: m.kind }))
            : undefined,
        }));
      if (lines.length > 0) {
        out.push({
          type: "board",
          narration,
          content: { title: seg.content.title ? String(seg.content.title) : undefined, lines },
        });
      }
    } else if (seg?.type === "blank" && seg?.content?.prompt && seg?.content?.answer) {
      out.push({
        type: "blank",
        narration,
        content: {
          prompt: String(seg.content.prompt),
          answer: String(seg.content.answer),
          hint_ko: seg.content.hint_ko ? String(seg.content.hint_ko) : undefined,
        },
      });
    }
  }
  return out;
}

/**
 * 마이그레이션 미적용 컬럼(source, narration 등)이 rows에 있어도 insert가 깨지지 않도록,
 * 컬럼 없음 에러가 나면 그 키를 모든 row에서 빼고 재시도한다.
 */
export async function insertDroppingMissing(
  db: any,
  table: string,
  rows: Record<string, any>[],
  maxDrops = 4,
): Promise<{ error: { message: string } | null; dropped: string[] }> {
  let current = rows;
  const dropped: string[] = [];
  for (let i = 0; i <= maxDrops; i++) {
    const { error } = await db.from(table).insert(current);
    if (!error) return { error: null, dropped };
    const msg = error.message || "";
    // Postgres: column "x" ... does not exist  |  PostgREST: Could not find the 'x' column ... in the schema cache
    const m =
      /column ["']?([a-z_]+)["']? .*does not exist/i.exec(msg) ||
      /could not find the ["']([a-z_]+)["'] column/i.exec(msg);
    const col = m?.[1];
    if (!col || dropped.includes(col)) return { error, dropped };
    dropped.push(col);
    current = current.map((r) => {
      const { [col]: _omit, ...rest } = r;
      return rest;
    });
  }
  return { error: { message: `insert failed after dropping ${dropped.join(",")}` }, dropped };
}

export function existingSegmentsBlock(segments: any[]): string {
  if (!segments || segments.length === 0) return "(없음)";
  return segments.map((s) => `- [${s.type}] ${JSON.stringify(s.content)}`).join("\n");
}

// ── 드릴 ────────────────────────────────────────────────────

const DRILL_TYPES = ["judgment", "fill", "reorder", "correction", "listen_judge"] as const;

export type GenDrill = {
  type: string;
  sentence: string;
  answer: string;
  distractors: string[];
  grammar_labels: Array<{ label_ko: string; label_en: string; is_correct: boolean }>;
};

export function sanitizeDrills(parsed: any): GenDrill[] {
  const arr = Array.isArray(parsed?.drills) ? parsed.drills : [];
  const out: GenDrill[] = [];
  for (const d of arr) {
    const type = DRILL_TYPES.includes(d?.type) ? d.type : "fill";
    const sentence = String(d?.sentence ?? "").trim();
    const answer = String(d?.answer ?? "").trim();
    if (!sentence || !answer) continue;

    const ansNorm = answer.toLowerCase();
    let distractors = (Array.isArray(d?.distractors) ? d.distractors : [])
      .map((x: any) => String(x ?? "").trim())
      .filter(Boolean)
      .filter((x: string) => x.toLowerCase() !== ansNorm) // 정답과 겹치는 오답 제거
      .filter((x: string, i: number, a: string[]) => a.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i)
      .slice(0, 3);
    while (distractors.length < 3) distractors.push("");

    let labels = (Array.isArray(d?.grammar_labels) ? d.grammar_labels : [])
      .map((l: any) => ({
        label_ko: String(l?.label_ko ?? "").trim(),
        label_en: String(l?.label_en ?? "").trim(),
        is_correct: !!l?.is_correct,
      }))
      .filter((l: any) => l.label_ko || l.label_en);
    // 정답 레이블 정확히 1개 보장
    const correctCount = labels.filter((l: any) => l.is_correct).length;
    if (correctCount === 0 && labels.length > 0) labels[0].is_correct = true;
    else if (correctCount > 1) labels.forEach((l: any, i: number) => (l.is_correct = i === labels.findIndex((x: any) => x.is_correct)));
    while (labels.length < 4) labels.push({ label_ko: "", label_en: "", is_correct: false });
    labels = labels.slice(0, 4);

    out.push({ type, sentence, answer, distractors, grammar_labels: labels });
  }
  return out;
}
