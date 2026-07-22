import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

type WritingTask = {
  id: string;
  korean: string;
  english: string;
  grammar: string;
  hints: string[];
  missingWord: string;
};

const client = new Anthropic();

/**
 * POST /api/vocab/generate-writing-tasks
 * Generate diverse writing tasks with various grammatical structures
 * Body: { word: string; meaning: string; count?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, meaning, count = 5 } = body;

    if (!word || !meaning) {
      return NextResponse.json(
        { ok: false, error: "Missing word or meaning" },
        { status: 400 }
      );
    }

    const prompt = `Generate ${count} diverse English sentences with varied grammatical structures using the word "${word}" (meaning: ${meaning}).

For EACH sentence, you MUST:
1. NOT include the target word in the scrambled hints table
2. Create hints from OTHER words in the sentence (avoid the target word)
3. Include diverse structures: simple, passive, conditional, complex, with long subjects, etc.

Return ONLY valid JSON array (no markdown, no extra text):
[
  {
    "korean": "Korean interpretation of the sentence",
    "english": "Full English sentence with the target word",
    "grammar": "Grammatical structure (e.g., '3형식', 'Passive voice', 'Conditional clause', 'Complex sentence with relative clause')",
    "hints": ["word1", "word2", "word3", "word4"],
    "missingWord": "the_target_word"
  },
  ...
]

IMPORTANT RULES:
- Hints must be 4 different words from the sentence (NOT the target word)
- Hints should be meaningful/important words that help understand the sentence
- missingWord must be the target word "${word}"
- korean must be natural, fluent Korean
- Include varied structures: simple sentences, passive voice, relative clauses, conditionals, complex sentences, sentences with long subjects, etc.
- Each hint word should be in its base form (if possible)

Generate now:`;

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

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not find JSON in response");
    }

    const tasks: WritingTask[] = JSON.parse(jsonMatch[0]);

    // Assign IDs
    const tasksWithIds = tasks.map((t, idx) => ({
      ...t,
      id: `w${idx + 1}`,
    }));

    return NextResponse.json({
      ok: true,
      tasks: tasksWithIds,
    });
  } catch (e: any) {
    console.error("[/api/vocab/generate-writing-tasks] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
