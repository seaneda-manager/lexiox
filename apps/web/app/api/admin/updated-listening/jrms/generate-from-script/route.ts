export const dynamic = "force-dynamic";

// apps/web/app/api/admin/updated-listening/jrms/generate-from-script/route.ts
//
// 중학(중1~중3) 전국연합 영어듣기능력평가 수준의 오리지널 20문항 세트를 생성한다.
// generate-mst-from-scripts/route.ts와 같은 계열이지만, 사람이 쓴 대본을 그대로 문제화하는
// 대신 "참고 대본 1개(문항 유형·개수·난이도 기준)"만 주고 완전히 새로운 오리지널 대화를
// grade/level에 맞춰 창작하게 한다. 원본은 시도교육청/평가원 저작권이 있으므로 절대 복제하지 않는다.

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { shuffleAllChoicesInPayload } from "@/lib/utils/validateAnswerDistribution";

export const runtime = "nodejs";
export const maxDuration = 180;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "placeholder" });

type Grade = "ms1" | "ms2" | "ms3";
type Level = "low" | "mid" | "high";

const GRADE_LABEL: Record<Grade, string> = { ms1: "중학교 1학년", ms2: "중학교 2학년", ms3: "중학교 3학년" };

// 학년 기본 난이도 + 학년 내 3단계 보정. ms1/mid를 원본 전국연합 대본과 동급으로 잡고
// 그 위/아래로 학년·레벨을 조정한다.
const LEVEL_GUIDANCE: Record<Grade, Record<Level, string>> = {
  ms1: {
    low: "어휘 600~900단어 수준(교육부 기초 어휘 위주), 문장 6~10단어의 단문 위주, 단서가 명시적으로 드러남(추론 최소화), 발화 속도가 느낀다는 인상을 주도록 짧고 명확한 문장만 사용.",
    mid: "제공된 원본 대본과 동급 난이도. 어휘 900~1200단어, 문장 8~14단어, 단문+가벼운 복문 혼합, 함축 의미가 있는 문항(4번, 19-20번 등)은 원본 수준의 완곡함 유지.",
    high: "어휘 1200~1500단어, 문장 10~16단어로 원본보다 살짝 김, 복문 비중 증가, 세부정보를 문맥 안에 더 은근하게 배치(추론 요구 증가), 그래도 중1이 감당 가능한 수준을 넘지 않음.",
  },
  ms2: {
    low: "어휘 1000~1300단어, 문장 10~14단어, 시제/조동사 다양화 시작(현재완료 등 가볍게), 단서는 여전히 비교적 명시적.",
    mid: "어휘 1300~1600단어, 문장 12~16단어, 복문 비중 절반 이상, 오답 매력도를 원본보다 한 단계 높임(부분정보/시간혼동 트랩 활용).",
    high: "어휘 1600~1900단어, 문장 14~18단어, 함축의미·화자태도 문항 비중 증가, 추론이 필요한 세부정보 배치.",
  },
  ms3: {
    low: "어휘 1500~1800단어, 문장 13~17단어, 복문 다수, 고1 전국연합 하위권과 맞닿는 수준.",
    mid: "어휘 1800~2100단어, 문장 15~19단어, 관계사/분사구문 등 중3 교육과정 문법 자연스럽게 포함, 추론형 문항(4,8,13,18) 비중을 원본보다 높임.",
    high: "어휘 2100~2400단어, 문장 16~20단어, 고1 전국연합 진입 수준. 트랩 선택지를 정교하게(핵심어 재사용하되 맥락 왜곡) 설계.",
  },
};

// 사용자가 정리한 20문항 유형/패턴 스펙 — 이 순서·유형·문항수를 그대로 재현한다.
const QUESTION_SPEC = `1. 사물/동물 묘사 추론 — 특징을 5개 안팎 나열(서식지→외형→행동) 후 "What am I?"로 마무리. 선택지 4개는 서로 다른 대상을 가리키는 짧은 명사구.
2. 그림 선택형(속성 조합, 텍스트로 변형) — 2단계로 정보가 좁혀지는 대화(예: 컵/콘 선택 → 토핑 선택). 선택지 4개는 각각 완결된 조합 묘사 문장.
3. 그림 선택형(시간대별 정보, 텍스트로 변형) — 오전/오후/내일 날씨(또는 유사한 시간대별 정보)가 다르게 제시됨. 질문은 특정 시간대 하나를 정확히 짚어야 함. 선택지 4개는 각각 완결된 상태 묘사 문장.
4. 마지막 말의 의도 파악 — 표면적 문장의 진짜 의도(거절/수락/비꼼/걱정 등)를 고르는 문제. 선택지는 "거절/칭찬/사과/비난/응원"류의 2단어 한글 명사형 4개(주최 질문은 한국어로 감정/의도 단어).
5. 언급되지 않은 것(NOT) — 제목/장소/날짜/가격 등 4~5개 요소를 나열하는 안내방송형. 그중 언급 안 된 요소 1개가 정답.
6. 숫자(시각) 정보 + 정정 함정 — 화자 한쪽이 틀린 숫자를 먼저 말하고 다른 쪽이 정정, 최종 확정값이 정답. 선택지는 15~30분 간격의 숫자 5개.
7. 장래희망/직업 직접 언급 — "I want to be a ~" 류로 명확히 언급. 비교적 쉬운 난이도.
8. 심정 추론 — 감정 단어 없이 상황(계획 무산, 기대했던 일 등)만으로 감정을 추론. 선택지는 감정 한글 명사 4개.
9. 대화 직후 할 일(do next) — 문제 상황 발생 후 마지막 대사에 결정적 단서. 선택지는 짧은 행동 한글 명사구 4개.
10. 주제/목적 파악 — 세부사항이 아니라 대화 전체의 화제를 묻는 상위 레벨 문제. 선택지는 주제를 요약하는 한글 명사구 4개.
11. 이동수단/방법 결정 — 처음 계획 → 돌발상황 → 최종 결정으로 흐름이 바뀜. 선택지는 방법/수단 한글 단어 4개.
12. 이유(Why) 파악 — 직접 "because"가 아니라 상황 서술로 이유 제시. 선택지는 이유를 요약한 한글 문장 4개.
13. 장소 추론 — 장소 단어 자체가 대화에 등장하지 않음, 증상/처치/시설 등 간접 단서로 추론. 선택지는 장소 한글 명사 4개.
14. 표(도표) 불일치 찾기 — 안내방송형 5개 정보(장소/기간/시간/가격/특전 등)를 말하되, 그중 1개를 표에 제시된 값과 다르게 말함. tableData로 표를 구성하고, 선택지는 표의 각 행(장소/기간/시간/가격/특전)을 가리키는 5개(마지막 요소가 표에 없으면 4개) 한글 라벨.
15. 부탁받은 일 파악 — 한쪽이 먼저 다른 일을 제안했다가 거절당하고, 진짜 부탁은 뒤에 나옴(순서 함정). 선택지는 행동 한글 명사구 4개.
16. 제안 파악 — "Why don't we~"류의 명확한 제안 표현. 선택지는 행동 한글 명사구 4개.
17. 주말/향후 계획 파악 — 오늘은 다른 일정 때문에 거절하고 대안(주말 등)으로 합의. 선택지는 활동 한글 명사구 4개.
18. 직업 추론(간접) — 직업명 단어 자체는 등장하지 않고 업무 관련 어휘로 추론. 선택지는 직업 한글 명사 4개.
19. 이어질 응답 고르기(공감/위로) — 여자의 고민 토로에 이어질 남자의 대답. taskKind는 choose_response, 문항 자체가 대화의 연속이므로 스크립트는 짧은 대화 전체, 질문에 대한 응답 선택지 4개는 영어 문장.
20. 이어질 응답 고르기(요청 수락) — 여자의 부탁/요청에 이어질 남자의 대답. taskKind는 choose_response, 선택지 4개는 영어 문장.`;

function buildPrompt(referenceScript: string, grade: Grade, level: Level): string {
  return `당신은 한국 중학교 영어듣기능력평가 콘텐츠를 만드는 전문 출제자입니다.

아래는 참고용 원본 대본입니다(전국 시도교육청·한국교육과정평가원 저작권 소유 — 절대 그대로 복제하거나 등장인물/상황만 살짝 바꿔 재사용하지 마세요):
"""
${referenceScript}
"""

이 원본에서 **오직 문항 유형·순서·개수(20개)만** 기준으로 삼아, 완전히 새로운 등장인물·상황·소재로 100% 오리지널 대화 20개를 창작하세요.

목표 난이도: ${GRADE_LABEL[grade]} / ${level} 레벨 — ${LEVEL_GUIDANCE[grade][level]}

문항별 유형 스펙(반드시 이 순서와 유형을 그대로 따르세요):
${QUESTION_SPEC}

각 문항의 taskKind는 1~18번은 "conversation", 19~20번은 "choose_response"로 지정하세요.
14번 문항에만 tableData(headers 1개 + rows 4~5개, 각 row는 [라벨, 값])를 채우고, 나머지 문항은 tableData를 넣지 마세요.
모든 선택지는 정확히 4개(14번의 표 관련 선택지도 4개로 맞추되 표의 행 개수와 자연스럽게 대응), 그중 정답은 정확히 1개.

반드시 이 JSON 형식으로만 응답하세요(마크다운 코드블록·설명 문장 없이):
{
  "tracks": [
    {
      "number": 1,
      "taskKind": "conversation",
      "title": "짧은 제목",
      "transcript": "대화 또는 독백 전문 (화자 표시 포함, 원본처럼 M:/W: 형식)",
      "stem": "질문 문장(한국어)",
      "choices": [{"text": "...", "correct": true}, {"text": "...", "correct": false}, ...정확히 4개],
      "tableData": null
    }
    // ... 총 20개, number 1~20 순서대로
  ]
}`;
}

interface GeneratedTrack {
  number: number;
  taskKind: "conversation" | "choose_response";
  title?: string;
  transcript: string;
  stem: string;
  choices: { text: string; correct: boolean }[];
  tableData?: { headers: string[]; rows: string[][] } | null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      referenceScript?: string;
      grade?: Grade;
      level?: Level;
      title?: string;
    };

    const referenceScript = body.referenceScript?.trim();
    const grade = body.grade;
    const level = body.level;

    if (!referenceScript) {
      return NextResponse.json({ ok: false, error: "referenceScript가 필요합니다" }, { status: 400 });
    }
    if (!grade || !GRADE_LABEL[grade]) {
      return NextResponse.json({ ok: false, error: "grade must be ms1 | ms2 | ms3" }, { status: 400 });
    }
    if (!level || !LEVEL_GUIDANCE[grade][level]) {
      return NextResponse.json({ ok: false, error: "level must be low | mid | high" }, { status: 400 });
    }

    const prompt = buildPrompt(referenceScript, grade, level);

    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    });
    const message = await stream.finalMessage();

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as { tracks: GeneratedTrack[] };

    if (!Array.isArray(parsed.tracks) || parsed.tracks.length !== 20) {
      return NextResponse.json(
        { ok: false, error: `모델이 20개가 아닌 ${parsed.tracks?.length ?? 0}개의 트랙을 반환했습니다.` },
        { status: 500 }
      );
    }

    const tracks = parsed.tracks
      .sort((a, b) => a.number - b.number)
      .map((t) => {
        const choices = (t.choices ?? []).map((c) => ({
          id: randomUUID(),
          text: c.text ?? "",
          correct: c.correct === true,
        }));
        return {
          id: randomUUID(),
          taskKind: t.taskKind,
          title: t.title ?? `문항 ${t.number}`,
          audioUrl: "",
          transcript: t.transcript ?? "",
          questions: [
            {
              id: randomUUID(),
              number: t.number,
              type: "detail" as const,
              stem: t.stem ?? "",
              choices,
              correctIndices: [] as number[], // 셔플 후 채움 (아래)
              ...(t.tableData ? { tableData: t.tableData } : {}),
            },
          ],
        };
      });

    // 정답 위치 무작위화 — 특정 선택지로 쏠리는 것 방지 (기존 관례 그대로).
    // 단, Fisher-Yates 한 번만으로는 20문항 규모에서 우연히 B가 0개거나 C/D로 쏠리는
    // 경우가 실제로 나온다(순수 랜덤이라도 ~1%대로 발생) — 정답 분포 쏠림은 과거 실제로
    // 학생 채점 버그였던 이력이 있어(f898818) 재발행 전에 분포까지 강제로 고르게 맞춘다.
    let bucketCounts = [0, 0, 0, 0];
    for (let attempt = 0; attempt < 30; attempt++) {
      shuffleAllChoicesInPayload(tracks.map((tr) => ({ questions: tr.questions })));
      for (const tr of tracks) {
        for (const q of tr.questions) {
          q.correctIndices = q.choices
            .map((c, i) => (c.correct ? i : -1))
            .filter((i) => i >= 0);
        }
      }
      bucketCounts = [0, 0, 0, 0];
      for (const tr of tracks) {
        const idx = tr.questions[0]?.correctIndices?.[0];
        if (idx !== undefined && idx >= 0) bucketCounts[idx]++;
      }
      const spread = Math.max(...bucketCounts) - Math.min(...bucketCounts);
      if (spread <= 3) break; // 20문항/4지선다 기준 이상적 분포(5,5,5,5)에서 충분히 가까움
    }

    return NextResponse.json({
      ok: true,
      grade,
      level,
      title: body.title ?? `${GRADE_LABEL[grade]} 듣기 (${level})`,
      tracks,
    });
  } catch (err: any) {
    console.error("LISTENING-JRMS-GENERATE ERROR", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
