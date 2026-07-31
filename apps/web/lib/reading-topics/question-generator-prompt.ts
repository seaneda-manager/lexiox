/**
 * 지문을 받아서 문제만 생성하는 프롬프트 (단순화된 버전)
 */

export interface QuestionGenerationInput {
  passage: string;
  passageType: 'complete_words' | 'daily_life_short' | 'daily_life_long' | 'academic_passage';
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount?: number;
}

export function generateQuestionPrompt(input: QuestionGenerationInput): string {
  const { passage, passageType, topic, difficulty, questionCount = 5 } = input;

  if (passageType === 'complete_words') {
    return `Extract ${questionCount} questions from this passage for Complete the Words task.
Mark each blank with a NUMBER in the passage (e.g., __1__, __2__, __3__).

PASSAGE:
${passage}

REQUIREMENTS:
1. Mark exactly ${questionCount} blanks using __1__, __2__, ... __${questionCount}__
2. CONCENTRATE all ${questionCount} blanks into 2-3 SENTENCES ONLY (dense packing)
3. Each sentence should be long and complex, containing 3-5+ blanks
4. A single WORD can have MULTIPLE blanks (e.g., "ch__1__orop__2__ast" for "chloroplast")
5. Multiple blanks in the SAME WORD count as ONE QUESTION
6. Vary blank POSITIONS in words:
   - Suffix (end): "ap___" for "apple", "psy_______" for "psychology"
   - Prefix (start): "_____onment" for "environment"
   - Infix (middle): "Sci___ist" for "scientist"
7. correctTokens should be array of missing parts
8. blankNumbers should list all blank numbers that belong to this question (e.g., [1, 2])

Return ONLY this JSON structure (exactly):
{"passage":"[full passage with numbered blanks]","questions":[{"id":"1","stem":"text with __1__","correctTokens":["word"],"blankNumbers":[1]},{"id":"2","stem":"text with __2__","correctTokens":["word"],"blankNumbers":[2]}]}

RULES:
- Valid JSON only (no markdown, no extra text)
- No line breaks in JSON output
- No trailing commas
- All strings use double quotes
- Exactly ${questionCount} questions with ${questionCount} total blanks
- Each question has: id (string), stem (string), correctTokens (array), blankNumbers (array)`;
  }

  if (passageType === 'daily_life_short' || passageType === 'daily_life_long') {
    return `Create ${questionCount} comprehension questions for this Daily Life passage.

PASSAGE:
${passage}

REQUIREMENTS:
1. Question type: "detail" or "purpose"
2. Create 4 choices with exactly 1 correct answer (isCorrect: true)
3. Difficulty: ${difficulty}
4. Questions should test comprehension of key information
5. Question ID should be: "1", "2", "3", etc (matching question number)

Return ONLY JSON:
{
  "questions": [
    {
      "id": "1",
      "number": 1,
      "stem": "According to the passage, when...",
      "type": "detail",
      "choices": [
        {"id": "c1", "text": "Option 1", "isCorrect": false},
        {"id": "c2", "text": "Option 2", "isCorrect": true},
        {"id": "c3", "text": "Option 3", "isCorrect": false},
        {"id": "c4", "text": "Option 4", "isCorrect": false}
      ]
    },
    {
      "id": "2",
      "number": 2,
      "stem": "What does the author suggest about...",
      "type": "detail",
      "choices": [...]
    }
  ]
}`;
  }

  if (passageType === 'academic_passage') {
    return `Create ${questionCount} comprehension questions for this Academic Passage.

PASSAGE:
${passage}

DIFFICULTY: ${difficulty}
${difficulty === 'hard' ? 'Include inference, paraphrasing questions' : 'Include detail, vocabulary, basic comprehension'}

REQUIREMENTS:
1. Vary question types based on difficulty
2. Create 4 choices with exactly 1 correct answer (isCorrect: true)
3. Question ID should be: "1", "2", "3", etc (matching question number)

Return ONLY JSON:
{
  "questions": [
    {
      "id": "1",
      "number": 1,
      "stem": "What does the author suggest about...",
      "type": "detail|vocab|inference|purpose",
      "choices": [
        {"id": "c1", "text": "Option 1", "isCorrect": false},
        {"id": "c2", "text": "Option 2", "isCorrect": true},
        {"id": "c3", "text": "Option 3", "isCorrect": false},
        {"id": "c4", "text": "Option 4", "isCorrect": false}
      ]
    },
    {
      "id": "2",
      "number": 2,
      "stem": "According to the passage...",
      "type": "detail|vocab|inference|purpose",
      "choices": [...]
    }
  ]
}`;
  }

  return '';
}
