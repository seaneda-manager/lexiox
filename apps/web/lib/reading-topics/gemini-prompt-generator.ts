/**
 * Gemini 의뢰문 자동 생성
 * Claude가 생성한 주제들을 Gemini가 이해할 수 있는 형식으로 변환
 */

export interface Topic {
  topic: string;
  type: 'complete_words' | 'daily_life_short' | 'daily_life_long' | 'academic_passage';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  word_count: number;
  tone: 'academic' | 'casual' | 'formal';
  style: string;
}

export function generateGeminiPrompt(topics: Topic[]): string {
  let prompt = `TOEFL 2026 Reading 지문 작성 요청

다음 주제들로 영어 지문을 작성해주세요.
각 지문은 정확한 단어 수를 맞춰주시고, 완성 후 [지문 유형] 라벨과 함께 반환해주세요.

`;

  topics.forEach((topic, index) => {
    prompt += `\n${'='.repeat(60)}\n`;
    prompt += `[${index + 1}] ${getTypeLabel(topic.type)}\n`;
    prompt += `${'='.repeat(60)}\n\n`;

    prompt += `주제: ${topic.topic}\n`;
    prompt += `길이: ${topic.word_count}단어 (정확히)\n`;
    prompt += `난이도: ${getDifficultyLabel(topic.difficulty)}\n`;
    prompt += `어체: ${getVersionLabel(topic.tone)}\n`;
    prompt += `스타일: ${topic.style}\n`;

    // 유형별 상세 지시사항
    if (topic.type === 'complete_words') {
      prompt += `\n📝 특수 요구사항:\n`;
      prompt += `- 학술적인 학과 내용 (생물, 화학, 물리, 역사 등)\n`;
      prompt += `- 철자 일부가 빠진 단어 정확히 10개 자연스럽게 배치\n`;
      prompt += `- 빈 부분 표시: __ (밑줄 두 개)\n`;
      prompt += `- 예: "The process occurs in the chloro__ of plant cells"\n`;
      prompt += `- 첫 문장은 완전하게, 두 번째부터 빈칸 배치\n`;
    } else if (topic.type === 'daily_life_short') {
      prompt += `\n📝 특수 요구사항:\n`;
      prompt += `- 캠퍼스 공지, 공고, 안내문 형식\n`;
      prompt += `- 제목 + 본문으로 구성\n`;
      prompt += `- 명확한 정보 전달 (시간, 장소, 규칙 등)\n`;
    } else if (topic.type === 'daily_life_long') {
      prompt += `\n📝 특수 요구사항:\n`;
      prompt += `- 이메일, 공지사항, 메뉴판 중 하나\n`;
      prompt += `- 헤더 정보 포함 (From/To/Subject, Date 등)\n`;
      prompt += `- 구조화된 내용 (리스트, 섹션 등)\n`;
    } else if (topic.type === 'academic_passage') {
      prompt += `\n📝 특수 요구사항:\n`;
      prompt += `- 대학 교과서 수준의 학술 지문\n`;
      prompt += `- 정확히 3개 문단 (도입/전개/결론)\n`;
      prompt += `- 전문용어 포함 가능\n`;
      prompt += `- 난이도: ${getDifficultyDescription(topic.difficulty)}\n`;
      if (topic.difficulty === 'hard') {
        prompt += `- 복잡한 구조와 추상적 개념 포함\n`;
      }
    }

    prompt += `\n`;
  });

  prompt += `\n${'='.repeat(60)}\n`;
  prompt += `최종 확인사항:\n`;
  prompt += `- 각 지문은 정확한 단어 수를 맞춰주세요\n`;
  prompt += `- 반환 형식: [지문 유형]\n지문 내용\n\n`;
  prompt += `감사합니다!\n`;

  return prompt;
}

// 헬퍼 함수들
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    complete_words: 'Complete the Words (단어 완성)',
    daily_life_short: 'Daily Life Short (일상 지문 - 짧음)',
    daily_life_long: 'Daily Life Long (일상 지문 - 길음)',
    academic_passage: 'Academic Passage (학술 지문)',
  };
  return labels[type] || type;
}

function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: 'Easy (쉬움)',
    medium: 'Medium (중간)',
    hard: 'Hard (어려움)',
  };
  return labels[difficulty] || difficulty;
}

function getVersionLabel(tone: string): string {
  const labels: Record<string, string> = {
    academic: '학술적, 과학적',
    casual: '캐주얼, 실용적',
    formal: '정식, 공식적',
  };
  return labels[tone] || tone;
}

function getDifficultyDescription(difficulty: string): string {
  const descriptions: Record<string, string> = {
    easy: '직설적, 명확한 구조, 쉬운 단어',
    medium: '적당한 복잡도, 학술 용어 포함',
    hard: '복잡한 구조, 고급 용어, 추상적 개념',
  };
  return descriptions[difficulty] || difficulty;
}
