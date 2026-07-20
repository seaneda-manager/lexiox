// app/(protected)/admin/naesin/passages/[id]/generate-workout/actions.ts
"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getServerSupabase } from "@/lib/supabase/server";
import type {
  PassageAuthoringDocument,
  StructureAuthoring,
  TranslationAuthoring,
  CompositionAuthoring,
  SentenceFunctionAuthoring,
  WordAnalysisAuthoring,
} from "@/components/naesin/authoring/passage_authoring_schema_v1";

type GeneratedWorkout = {
  structureAnalysis: StructureAuthoring[];
  translation: TranslationAuthoring[];
  composition: CompositionAuthoring[];
  sentenceFunctions: SentenceFunctionAuthoring[];
  wordAnalysis: WordAnalysisAuthoring[];
};

export type GenerateWorkoutResult =
  | { ok: true; generated: GeneratedWorkout; skipped: string[] }
  | { ok: false; error: string };

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY 환경변수가 없습니다.");
  return new Anthropic({ apiKey: key });
}

function parseJsonBlock(text: string): unknown {
  // 코드블록 안 JSON 우선 추출
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return JSON.parse(fenced[1]);

  // 코드블록 없으면 첫 { ~ 마지막 } 추출
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error("JSON 블록을 찾을 수 없습니다.");
  return JSON.parse(text.slice(start, end + 1));
}

function buildPrompt(sentences: { id: string; text: string }[]): string {
  const sentenceList = sentences
    .map((s, i) => `[${s.id}] (${i + 1}번) ${s.text}`)
    .join("\n");

  return `당신은 한국 중고등학교 내신 영어 교재 제작 전문가입니다.
아래 영어 문장들에 대해 8단계 드릴용 데이터를 생성해주세요.

## 문장 목록
${sentenceList}

## 중요: sentenceId 규칙
각 항목의 "sentenceId" 값은 반드시 위 문장 목록에서 대괄호 [ ] 안에 주어진 id를 정확히 그대로 사용하세요.
예를 들어 "[s3] (3번) ..." 문장에 대한 데이터라면 sentenceId는 반드시 "s3"입니다 ("s-3"처럼 형식을 바꾸지 마세요).

## 생성 지침

**structureAnalysis**: 각 문장의 S·V·O·C·M 분석
- subjectAccepted: 주어로 인정할 표현 배열 (2~3개 변형 포함)
- verbAccepted: 동사(구)로 인정할 표현 배열
- objectAccepted: 목적어 (없으면 [])
- complementAccepted: 보어 (없으면 [])
- modifiers: [{span, target, type}] — type은 "형용사구"|"형용사절"|"부사구"|"부사절"|"분사구문" 중 하나

**translation**: 청크 단위 한글 해석
- referenceKo: 자연스러운 한글 해석
- acceptableKeywords: 채점 핵심 키워드 3~5개
- chunks: [{id, sourceSpan(영어 청크), hintKo(한글 힌트), acceptableAnswers(허용 답안 배열)}]
  * 1문장을 2~4개 청크로 나누기

**composition**: 한→영 작문용 데이터. 학생은 한글 생각단위 청크를 영어 어순으로 배열한 뒤, 청크 하나하나에 대응하는 영어를 채워 넣습니다.
- chunks: [{id, ko(한글 생각단위), en(그 청크에 정확히 대응하는 영어 표현)}] 배열. 다음 기준을 반드시 지키세요:
  * en들을 순서대로 이어 붙이면 referenceSentence와 정확히 같은 문장이 되어야 합니다 (ko/en은 1:1로 정확히 대응하는 의미 단위).
  * 문장을 이루는 문법 요소(주어 / 본동사 / 목적어·보어) 하나당 청크 하나로 분리합니다. 여러 요소를 한 청크에 뭉치지 마세요.
  * 준동사(to부정사, 동명사, 분사)는 그것이 이끄는 구와 함께 별도 청크로 분리하고, 그 준동사의 목적어·보어가 있다면 그것도 다시 별도 청크로 분리합니다.
  * 수식어(형용사절·관계절, 부사절, 전치사구)도 각각 별도 청크로 분리합니다.
  * 청크 개수는 고정하지 않습니다 — 문장의 문법 요소 수에 따라 자연스럽게 정해집니다 (보통 3~7개 정도).
  * 청크의 배열 순서는 "영어 문장의 어순"을 따릅니다 (한국어 자연 어순이 아님).
  * 예시 — "We all had so much fun watching Max play." (주어 / 본동사 / 목적어 / 준동사(분사) / 준동사의 목적어절 로 분리)
    → [{"ko":"우리 모두는","en":"We all"}, {"ko":"보냈습니다","en":"had"}, {"ko":"정말 즐거운 시간을","en":"so much fun"}, {"ko":"보면서","en":"watching"}, {"ko":"맥스가 노는 것을","en":"Max play"}]
- referenceSentence: 목표 영어 문장 (원문 그대로)
- targetSkeleton: 빈칸 힌트 (핵심 단어 제거, ___ 처리)

**sentenceFunctions**: 문장의 역할
- correct: "scene_setting"|"topic_sentence"|"supporting_detail"|"example"|"transition"|"contrast"|"conclusion" 중 하나
- accepted: 허용 가능한 다른 답 배열 (없으면 [])
- clue: 판단 근거 (한국어, 1문장)
- explanation: 설명 (한국어, 1~2문장)

**wordAnalysis**: 학생이 모를 가능성 높은 단어
- recommendedUnknownWords: 어려운 단어 2~4개 배열 (기본형)

## 출력 형식
반드시 아래 JSON 구조로만 출력하세요:

\`\`\`json
{
  "structureAnalysis": [
    {
      "sentenceId": "s1",
      "subjectAccepted": ["..."],
      "verbAccepted": ["..."],
      "objectAccepted": [],
      "complementAccepted": [],
      "modifiers": [{"span": "...", "target": "...", "type": "부사구"}]
    }
  ],
  "translation": [
    {
      "sentenceId": "s1",
      "referenceKo": "...",
      "acceptableKeywords": ["..."],
      "chunks": [{"id": "c1", "sourceSpan": "...", "hintKo": "...", "acceptableAnswers": ["..."]}]
    }
  ],
  "composition": [
    {
      "sentenceId": "s1",
      "chunks": [{"id": "c1", "ko": "...", "en": "..."}],
      "referenceSentence": "...",
      "targetSkeleton": "..."
    }
  ],
  "sentenceFunctions": [
    {
      "sentenceId": "s1",
      "correct": "topic_sentence",
      "accepted": [],
      "clue": "...",
      "explanation": "..."
    }
  ],
  "wordAnalysis": [
    {
      "sentenceId": "s1",
      "recommendedUnknownWords": ["..."]
    }
  ]
}
\`\`\``;
}

export async function generatePassageWorkoutAction(params: {
  passageId: string;
  overwrite?: boolean;
}): Promise<GenerateWorkoutResult> {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "로그인 필요" };

    const { data: row, error: fetchErr } = await supabase
      .from("naesin_passages")
      .select("id, title, payload")
      .eq("id", params.passageId)
      .maybeSingle();

    if (fetchErr || !row) return { ok: false, error: "지문을 찾을 수 없습니다." };

    const payload = row.payload as any;
    const doc: PassageAuthoringDocument = {
      core: payload?.core,
      workout: payload?.workout ?? { enabledStages: [] },
      variants: payload?.variants ?? [],
    };

    const sentences = doc.core?.sentences ?? [];
    if (sentences.length === 0) {
      return { ok: false, error: "문장 데이터가 없습니다. 에디터에서 '문단/문장 자동 분리'를 먼저 실행하세요." };
    }

    const skipped: string[] = [];

    if (!params.overwrite) {
      const workout = doc.workout ?? { enabledStages: [] };
      const wAny = workout as any;
      if (
        (wAny.translation?.length ?? 0) > 0 ||
        (wAny.structureAnalysis?.length ?? 0) > 0
      ) {
        skipped.push("이미 워크아웃 데이터가 있습니다. overwrite: true로 덮어쓸 수 있습니다.");
      }
    }

    const client = getClient();

    // 문장을 6개씩 배치로 나눠 처리 (응답 토큰 초과 방지)
    const BATCH_SIZE = 6;
    const sentenceList = sentences.map((s: any) => ({ id: s.id, text: s.text }));
    const batches: typeof sentenceList[] = [];
    for (let i = 0; i < sentenceList.length; i += BATCH_SIZE) {
      batches.push(sentenceList.slice(i, i + BATCH_SIZE));
    }

    const merged: GeneratedWorkout = {
      structureAnalysis: [],
      translation: [],
      composition: [],
      sentenceFunctions: [],
      wordAnalysis: [],
    };

    for (const batch of batches) {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 16000,
        messages: [{ role: "user", content: buildPrompt(batch) }],
      });
      const responseText = (message.content[0] as any)?.text ?? "";
      const part = parseJsonBlock(responseText) as GeneratedWorkout;
      merged.structureAnalysis.push(...(part.structureAnalysis ?? []));
      merged.translation.push(...(part.translation ?? []));
      merged.composition.push(...(part.composition ?? []));
      merged.sentenceFunctions.push(...(part.sentenceFunctions ?? []));
      merged.wordAnalysis.push(...(part.wordAnalysis ?? []));
    }

    const generated = merged;

    if (!generated.translation.length || !generated.structureAnalysis.length) {
      return { ok: false, error: "AI 응답 파싱 실패: 필수 필드 누락" };
    }

    const updatedWorkout = {
      ...doc.workout,
      enabledStages: [
        "word_analysis",
        "structure_analysis",
        "translation",
        "composition",
        "sentence_function",
        ...(doc.workout.enabledStages ?? []).filter(
          (s) => !["word_analysis", "structure_analysis", "translation", "composition", "sentence_function"].includes(s),
        ),
      ],
      wordAnalysis: generated.wordAnalysis ?? [],
      structureAnalysis: generated.structureAnalysis ?? [],
      translation: generated.translation ?? [],
      composition: generated.composition ?? [],
      sentenceFunctions: generated.sentenceFunctions ?? [],
    };

    const updatedPayload = {
      ...payload,
      workout: updatedWorkout,
    };

    const { error: saveErr } = await supabase
      .from("naesin_passages")
      .update({ payload: updatedPayload, updated_by: user.id })
      .eq("id", params.passageId);

    if (saveErr) return { ok: false, error: `저장 실패: ${saveErr.message}` };

    return { ok: true, generated, skipped };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "알 수 없는 오류" };
  }
}
