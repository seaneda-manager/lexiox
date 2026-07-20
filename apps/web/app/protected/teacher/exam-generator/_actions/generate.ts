'use server';

import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
import { getServerSupabase } from '@/lib/supabase/server';

export type ExamQuestion = {
  number: number;
  type: string;
  question: string;        // 발문만 (예: "다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?")
  passageOverride?: string; // 어법/어휘/빈칸/순서/삽입 등 변형이 필요한 경우만
  passageText: string;     // UI 표시용 — DB에서 채워짐
  options?: string[];
  answer: string;
  explanation: string;
};

export async function generateExamQuestions(
  schools: string[],
  grade: string,
  examYear: number,
  examMonth: number,
): Promise<{ questions: ExamQuestion[]; error?: string }> {
  const supabase = await getServerSupabase();

  const schoolFilter = [...new Set([...schools, '공통'])];

  const { data: passages, error } = await supabase
    .from('hi_naesin_passages')
    .select('id, title, passage_text, school_name')
    .in('school_name', schoolFilter)
    .eq('grade', grade)
    .eq('exam_year', examYear)
    .eq('exam_month', examMonth)
    .eq('is_published', true)
    .limit(30);

  if (error || !passages || passages.length === 0) {
    return { questions: [], error: '해당 학교/학년의 지문이 없습니다.' };
  }

  // 공통 지문 전체 + 선택한 학교 지문 전체
  const commonPassages = passages.filter((p) => p.school_name === '공통');
  const schoolPassages = passages.filter((p) => p.school_name !== '공통');

  console.log('[exam-gen] 공통:', commonPassages.length, '학교별:', schoolPassages.length);

  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  // 공통 전체 + 학교별 전체 합쳐서 셔플 후 30개 추리기
  const allPassages = [...shuffle(commonPassages), ...shuffle(schoolPassages)];
  const shuffledPassages = allPassages.slice(0, 30);

  // 유형 풀 셔플 후 지문마다 1개씩 배정
  const allTypes = [
    '글의 목적', '필자 주장', '요지', '주제', '제목',
    '내용 일치', '내용 불일치', '어법', '어휘', '빈칸 추론',
    '문단 순서', '문장 삽입', '서술형',
  ];
  const shuffledTypes = [...allTypes].sort(() => Math.random() - 0.5);
  const assignedTypes = shuffledPassages.map((_, i) => shuffledTypes[i % shuffledTypes.length]);

  const passageList = shuffledPassages
    .map((p, i) => `[${i + 1}] (지정 유형: ${assignedTypes[i]}) ${p.title || '제목없음'}\n${p.passage_text}`)
    .join('\n\n---\n\n');

  console.log('[exam-gen] 지문:', shuffledPassages.length, '유형:', assignedTypes);

  const prompt = `다음은 고등학교 내신 대비 영어 지문 ${shuffledPassages.length}개입니다.
각 지문에 대해 수능 스타일 문제를 1문항씩 생성하세요. 총 ${shuffledPassages.length}문제.

지문:
${passageList}

━━━ 규칙 ━━━
- 지문 1개 → 문제 1개. number는 1~${shuffledPassages.length} 순서대로.
- 각 지문 앞 "(지정 유형: XXX)"를 반드시 따르세요.
- 문제 유형 설명:
  글의 목적 / 필자 주장 / 요지 / 주제 / 제목 / 내용 일치 / 내용 불일치 / 어법 / 어휘 / 빈칸 추론 / 문단 순서 / 문장 삽입 / 서술형
- "question" 필드: 발문(문제 지시문)만 작성. 예: "다음 글의 주제로 가장 적절한 것은?"
- "passageOverride" 필드:
  - 글의 목적/주장/요지/주제/제목/내용일치/불일치/서술형 → null (지문 원문 그대로 사용)
  - 어법/어휘/빈칸 추론/문단 순서/문장 삽입 → 반드시 변형된 지문 전체를 작성
    - 어법: (A)[word1/word2] 형식으로 괄호 삽입
    - 어휘: ①~⑤ 밑줄 표시, 하나는 문맥상 부적절한 단어로 교체
    - 빈칸: ______ 로 빈칸 표시
    - 문단 순서: 도입부만 남기고 (A)(B)(C) 단락으로 분리
    - 문장 삽입: ①②③④⑤ 위치 표시 및 삽입할 문장 발문에 포함
- 5지선다 보기는 ① ② ③ ④ ⑤ 사용
- 서술형: options 빈 배열, answer 모범답안, explanation 채점기준
- 발문은 한국어, 지문·보기는 영어
- explanation: 정답 근거를 지문 인용과 함께 한국어로

━━━ 출력 형식 ━━━
JSON 배열만 응답 (다른 텍스트 없이):
[
  {
    "number": 1,
    "type": "빈칸 추론",
    "question": "다음 글의 빈칸에 들어갈 말로 가장 적절한 것은?",
    "passageOverride": "변형된 지문 전체 (빈칸 포함)",
    "options": ["① ...", "② ...", "③ ...", "④ ...", "⑤ ..."],
    "answer": "③",
    "explanation": "정답 근거..."
  },
  {
    "number": 2,
    "type": "요지",
    "question": "다음 글의 요지로 가장 적절한 것은?",
    "passageOverride": null,
    "options": ["① ...", "② ...", "③ ...", "④ ...", "⑤ ..."],
    "answer": "②",
    "explanation": "정답 근거..."
  }
]`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      temperature: 1,
      messages: [{ role: 'user', content: prompt }],
    });

    const msg = await stream.finalMessage();

    const textBlock = msg.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { questions: [], error: 'AI 응답이 비어있습니다.' };
    }

    const text = textBlock.text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return { questions: [], error: 'JSON 파싱 실패: ' + text.slice(0, 200) };
    }

    let rawQuestions: Omit<ExamQuestion, 'passageText'>[];
    try {
      rawQuestions = JSON.parse(jsonrepair(jsonMatch[0]));
    } catch {
      const raw = jsonMatch[0];
      const recovered: Omit<ExamQuestion, 'passageText'>[] = [];
      const objRe = /\{\s*"number"\s*:[\s\S]*?\}(?=\s*[,\]])/g;
      let m: RegExpExecArray | null;
      while ((m = objRe.exec(raw)) !== null) {
        try { recovered.push(JSON.parse(jsonrepair(m[0]))); } catch { /* skip */ }
      }
      if (recovered.length === 0) {
        return { questions: [], error: 'JSON 파싱 실패: ' + raw.slice(0, 300) };
      }
      rawQuestions = recovered;
    }

    const questions: ExamQuestion[] = rawQuestions.map((q) => ({
      ...q,
      passageText: shuffledPassages[q.number - 1]?.passage_text ?? '',
    }));

    return { questions };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { questions: [], error: 'AI 오류: ' + msg };
  }
}
