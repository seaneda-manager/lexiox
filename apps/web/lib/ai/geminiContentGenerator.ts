import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface TextbookInput {
  title: string;
  content: string;
  contentType: 'reading' | 'grammar' | 'listening' | 'speaking-writing';
  difficulty: 'easy' | 'medium' | 'hard';
  level: number;
  source?: {
    textbook: string;
    page?: number;
  };
}

export interface GeneratedContent {
  title: string;
  vocabulary?: Array<{
    word: string;
    meaning: string;
    level: number;
    example: string;
  }>;
  comprehensionQuestions?: Array<{
    question: string;
    options: string[];
    answer: string;
    explanation?: string;
  }>;
  grammarPoints?: Array<{
    structure: string;
    example: string;
    explanation: string;
  }>;
  keytakeaways?: string[];
  difficultyAssessment: {
    level: number;
    confidence: number;
    rationale: string;
  };
  summary?: string;
}

async function generateReadingContent(input: TextbookInput): Promise<GeneratedContent> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an expert English teacher creating educational content from textbook materials.

Transform this reading passage into a comprehensive learning resource.

Textbook: ${input.source?.textbook || 'Unknown'}
Difficulty Level: ${input.difficulty} (Level ${input.level})

Original Passage:
"${input.content}"

Please generate content in JSON format with these fields:

{
  "title": "meaningful title for the passage",
  "vocabulary": [
    {
      "word": "word",
      "meaning": "Korean meaning",
      "level": ${input.level},
      "example": "sentence using the word"
    }
    // 10-15 words total, appropriate for level ${input.level}
  ],
  "comprehensionQuestions": [
    {
      "question": "question text",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "why this is correct"
    }
    // 5 questions total
  ],
  "grammarPoints": [
    {
      "structure": "grammar structure name",
      "example": "example from the passage",
      "explanation": "brief explanation"
    }
    // 3-4 key grammar points
  ],
  "keytakeaways": [
    "main idea 1",
    "main idea 2",
    "main idea 3"
  ],
  "summary": "50-word summary of the passage",
  "difficultyAssessment": {
    "level": ${input.level},
    "confidence": 0.90,
    "rationale": "explanation of why this level is appropriate"
  }
}

Requirements:
- Vocabulary difficulty must match level ${input.level}
- Comprehension questions should test understanding
- Grammar points should be realistic and from the passage
- Summary should be concise and capture main ideas
- All output must be valid JSON

Return ONLY the JSON, no additional text.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const content = JSON.parse(jsonMatch[0]) as GeneratedContent;
    return content;
  } catch (error) {
    console.error('Error generating reading content:', error);
    throw error;
  }
}

async function generateGrammarContent(input: TextbookInput): Promise<GeneratedContent> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an expert English grammar teacher creating educational content.

Transform this grammar rule/explanation into a comprehensive learning resource.

Grammar Topic: ${input.title}
Difficulty Level: ${input.difficulty} (Level ${input.level})

Original Content:
"${input.content}"

Please generate content in JSON format with these fields:

{
  "title": "${input.title}",
  "explanation": "clear, comprehensive explanation in English",
  "koreanExplanation": "Korean explanation of the grammar rule",
  "keyPoints": [
    "key point 1",
    "key point 2",
    "key point 3"
  ],
  "examples": [
    {
      "sentence": "example sentence",
      "translation": "Korean translation",
      "explanation": "why this example illustrates the rule"
    }
    // 5-7 examples
  ],
  "exercises": [
    {
      "type": "fill_blank",
      "text": "She _____ (work) here for 5 years",
      "correct": "has been working",
      "explanation": "explanation of why this is correct"
    }
    // 5-8 exercises
  ],
  "commonMistakes": [
    {
      "mistake": "common mistake",
      "correction": "correct form",
      "explanation": "why it's a mistake"
    }
    // 3-4 common mistakes
  ],
  "comparisons": [
    {
      "rule1": "related grammar rule",
      "rule2": "another rule",
      "difference": "key difference between them",
      "example": "example showing the difference"
    }
  ],
  "difficultyAssessment": {
    "level": ${input.level},
    "confidence": 0.90,
    "rationale": "explanation of difficulty level"
  }
}

Requirements:
- Explanation must be clear and suitable for level ${input.level}
- Examples should be realistic and relatable
- Exercises should progressively increase in difficulty
- Common mistakes section should address typical learner errors
- All output must be valid JSON

Return ONLY the JSON, no additional text.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const content = JSON.parse(jsonMatch[0]) as GeneratedContent;
    return content;
  } catch (error) {
    console.error('Error generating grammar content:', error);
    throw error;
  }
}

async function generateListeningContent(input: TextbookInput): Promise<GeneratedContent> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an expert English listening teacher creating educational content.

Transform this listening script/transcript into a comprehensive learning resource.

Topic: ${input.title}
Difficulty Level: ${input.difficulty} (Level ${input.level})

Original Transcript:
"${input.content}"

Please generate content in JSON format with these fields:

{
  "title": "${input.title}",
  "vocabulary": [
    {
      "word": "word",
      "meaning": "Korean meaning",
      "level": ${input.level},
      "context": "where it appears in the script"
    }
    // 10-15 words
  ],
  "comprehensionQuestions": [
    {
      "question": "question text",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "explanation"
    }
    // 5 questions
  ],
  "keyPhrases": [
    {
      "phrase": "important phrase",
      "meaning": "meaning in context",
      "usage": "how it's used"
    }
    // 5-7 key phrases
  ],
  "listeningStrategies": [
    "strategy 1 for understanding this type of content",
    "strategy 2",
    "strategy 3"
  ],
  "keyTakeaways": [
    "main idea 1",
    "main idea 2",
    "main idea 3"
  ],
  "difficultyAssessment": {
    "level": ${input.level},
    "confidence": 0.90,
    "rationale": "explanation of difficulty"
  }
}

Requirements:
- Vocabulary should be words actually heard in the script
- Questions should test listening comprehension
- Key phrases should help with understanding
- Listening strategies should be practical
- All output must be valid JSON

Return ONLY the JSON, no additional text.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const content = JSON.parse(jsonMatch[0]) as GeneratedContent;
    return content;
  } catch (error) {
    console.error('Error generating listening content:', error);
    throw error;
  }
}

async function generateSpeakingWritingContent(input: TextbookInput): Promise<GeneratedContent> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an expert English speaking and writing teacher creating educational content.

Transform this prompt/task into a comprehensive learning resource.

Task: ${input.title}
Type: ${input.difficulty === 'easy' ? 'Guided' : input.difficulty === 'medium' ? 'Semi-guided' : 'Open-ended'}
Level: ${input.level}

Original Prompt:
"${input.content}"

Please generate content in JSON format with these fields:

{
  "title": "${input.title}",
  "taskDescription": "clear description of what the student should do",
  "grammarFocus": [
    "grammar structure 1 to use",
    "grammar structure 2 to use"
  ],
  "vocabularySuggestions": [
    {
      "word": "useful word",
      "meaning": "Korean meaning",
      "usage": "how to use it in this task"
    }
    // 8-10 words
  ],
  "sampleAnswer": "1-2 paragraph sample response",
  "rubric": {
    "grammar": "expectations for grammar accuracy",
    "vocabulary": "expectations for word choice",
    "content": "expectations for content quality",
    "fluency": "expectations for fluency/clarity"
  },
  "tips": [
    "tip 1 for success",
    "tip 2",
    "tip 3",
    "tip 4"
  ],
  "difficultyAssessment": {
    "level": ${input.level},
    "confidence": 0.90,
    "rationale": "explanation of difficulty"
  }
}

Requirements:
- Task description should be clear and motivating
- Grammar focus should be realistic for the level
- Sample answer should model quality response
- Rubric should guide student evaluation
- Tips should be practical and actionable
- All output must be valid JSON

Return ONLY the JSON, no additional text.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const content = JSON.parse(jsonMatch[0]) as GeneratedContent;
    return content;
  } catch (error) {
    console.error('Error generating speaking-writing content:', error);
    throw error;
  }
}

export async function generateContentFromTextbook(
  input: TextbookInput
): Promise<GeneratedContent> {
  console.log(`Generating ${input.contentType} content: ${input.title}`);

  switch (input.contentType) {
    case 'reading':
      return generateReadingContent(input);
    case 'grammar':
      return generateGrammarContent(input);
    case 'listening':
      return generateListeningContent(input);
    case 'speaking-writing':
      return generateSpeakingWritingContent(input);
    default:
      throw new Error(`Unknown content type: ${input.contentType}`);
  }
}

// AI Review function
export async function reviewGeneratedContent(
  content: GeneratedContent,
  contentType: string
): Promise<{
  score: number;
  status: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';
  issues: string[];
  notes: string[];
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are a quality assurance expert for educational content.

Review this ${contentType} content for quality:

${JSON.stringify(content, null, 2)}

Evaluate on these criteria (score 0-100):
1. Accuracy (20 points)
2. Clarity (20 points)
3. Appropriateness for Level ${content.difficultyAssessment.level} (20 points)
4. Completeness (20 points)
5. Format correctness (20 points)

Respond with JSON:
{
  "score": 85,
  "status": "APPROVED",
  "issues": [],
  "notes": ["note 1", "note 2"]
}

Score guide:
- 85+: APPROVED (ready to publish)
- 70-84: NEEDS_REVIEW (minor fixes needed)
- <70: REJECTED (major issues)

Return ONLY the JSON, no additional text.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in review response');
    }

    const review = JSON.parse(jsonMatch[0]);
    return review;
  } catch (error) {
    console.error('Error reviewing content:', error);
    // Return safe default
    return {
      score: 0,
      status: 'NEEDS_REVIEW',
      issues: ['Review failed - manual check required'],
      notes: []
    };
  }
}
