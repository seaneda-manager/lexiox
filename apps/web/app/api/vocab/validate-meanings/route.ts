import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

type ValidationIssue = {
  index: number;
  word: string;
  meaning: string;
  issues: string[];
  severity: "error" | "warning";
};

type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  summary: {
    total: number;
    valid: number;
    hasErrors: boolean;
    hasWarnings: boolean;
  };
};

const client = new Anthropic();

/**
 * POST /api/vocab/validate-meanings
 * Validate word meanings using AI
 * Body: { words: Array<{ word: string; meaning: string }> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { words } = body;

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid words array" },
        { status: 400 }
      );
    }

    // Prepare validation prompt
    const wordsJson = words
      .map((w, idx) => `${idx}: "${w.word}" → "${w.meaning}"`)
      .join("\n");

    const prompt = `You are a Korean-English vocabulary validator. Analyze these word-meaning pairs and identify issues.

VALIDATION RULES:
1. Comma (,) separates multiple meanings
2. Parentheses (...) are modifiers/examples, NOT separate meanings
   - "(시간, 돈 등을) 소비하다" = 1 valid meaning
   - "(명사)" alone without other meaning = ERROR
3. Ellipsis (...) is a placeholder, part of the meaning
   - "...를 명시하다" = 1 valid meaning
   - "...를" alone without verb/adjective = ERROR
4. Check for broken Korean characters (mojibake)
5. Each meaning should be complete after removing parentheses
6. No leading/trailing commas, no double commas, no trailing ellipsis

WORD-MEANING PAIRS TO VALIDATE:
${wordsJson}

For EACH pair, identify issues (if any). Return ONLY valid JSON (no markdown):
[
  {
    "index": 0,
    "word": "word",
    "meaning": "meaning",
    "issues": ["issue1", "issue2"],
    "severity": "error|warning"
  },
  ...
]

Severity levels:
- "error": Meaning is incomplete/invalid and must be fixed
- "warning": Minor formatting issues but meaning is understandable

Examples of issues to detect:
- "Broken Korean characters detected"
- "Incomplete meaning: parentheses only without core meaning"
- "Incomplete meaning: ellipsis only without verb/adjective"
- "Trailing comma indicates incomplete meaning"
- "Multiple commas without proper spacing"
- "Leading comma detected"
- "Double comma detected"

Return ONLY the JSON array, no explanation.`;

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not find JSON in response");
    }

    const issues: ValidationIssue[] = JSON.parse(jsonMatch[0]);

    // Calculate summary
    const hasErrors = issues.some((i) => i.severity === "error");
    const hasWarnings = issues.some((i) => i.severity === "warning");
    const validCount = words.length - issues.length;

    const result: ValidationResult = {
      ok: true,
      issues,
      summary: {
        total: words.length,
        valid: validCount,
        hasErrors,
        hasWarnings,
      },
    };

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("[/api/vocab/validate-meanings] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
