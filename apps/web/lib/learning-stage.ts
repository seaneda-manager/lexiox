/**
 * Learning Stage 데이터 정제 유틸 함수
 * 모지바케 감지, 검증, 자동 복구 로직
 */

// 1. 모지바케 감지

export interface MojibakeCheckResult {
  isMojibake: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
  brokenChars: string[];
  confidence: number;
}

const KOREAN_HANGUL_REGEX = /[가-힯]/g; // 완성된 한글
const KOREAN_COMPONENTS = /[ᄀ-ᇿ㄰-㆏]/g; // 초성, 중성, 종성

export function detectMojibake(text: string): MojibakeCheckResult {
  if (!text) {
    return { isMojibake: false, severity: 'none', brokenChars: [], confidence: 0 };
  }

  const brokenChars: string[] = [];
  let brokenCount = 0;
  let totalKorean = 0;

  // 각 문자 검사
  for (const char of text) {
    const code = char.charCodeAt(0);

    // 완성된 한글 (가~힣)
    if (KOREAN_HANGUL_REGEX.test(char)) {
      totalKorean++;
      continue;
    }

    // 한글 자모 (초성, 중성, 종성만)
    if (KOREAN_COMPONENTS.test(char)) {
      brokenCount++;
      brokenChars.push(char);
      continue;
    }

    // 한글 영역 내 이상한 문자
    if (code >= 0xac00 && code <= 0xd7ff) {
      brokenCount++;
      brokenChars.push(char);
    }

    // 기타 이상한 문자
    if (code > 0xffff || (code > 127 && code < 256 && !isASCII(char))) {
      brokenCount++;
      brokenChars.push(char);
    }
  }

  const totalChars = text.length;
  const brokenRatio = brokenCount / totalChars;

  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (brokenRatio > 0.5) severity = 'high'; // 50% 이상 깨짐
  else if (brokenRatio > 0.2) severity = 'medium'; // 20~50%
  else if (brokenRatio > 0) severity = 'low'; // 1~20%

  return {
    isMojibake: brokenRatio > 0,
    severity,
    brokenChars: [...new Set(brokenChars)],
    confidence: Math.min(brokenRatio * 1.2, 1), // 0~1
  };
}

function isASCII(char: string): boolean {
  return /^[\x00-\x7F]$/.test(char);
}

// 2. 한글 뜻 파싱

export interface ParsedMeaning {
  meanings: Array<{
    text: string;
    context?: string;
  }>;
  hasError: boolean;
  errorType?: 'EMPTY_MEANING' | 'EMPTY_CONTEXT' | 'MALFORMED_BRACKET';
}

export function parseKoreanMeaning(text: string): ParsedMeaning {
  if (!text || text.trim().length === 0) {
    return {
      meanings: [],
      hasError: true,
      errorType: 'EMPTY_MEANING',
    };
  }

  const meanings: Array<{ text: string; context?: string }> = [];

  // Step 1: 괄호 패턴 분리
  // 패턴: "의미 (context)" 또는 "의미"
  const bracketRegex = /^(.+?)\s*(\(.+?\))$/;
  const bracketMatch = text.match(bracketRegex);

  if (bracketMatch) {
    const meaning = bracketMatch[1].trim();
    const context = bracketMatch[2];

    if (!meaning || meaning.length < 1) {
      return {
        meanings: [],
        hasError: true,
        errorType: 'EMPTY_MEANING',
      };
    }

    meanings.push({ text: meaning, context });
    return { meanings, hasError: false };
  }

  // Step 2: 쉼표 분리 (여러 뜻)
  // 패턴: "뜻1, 뜻2, 뜻3"
  if (text.includes(',')) {
    const parts = text.split(',').map(p => p.trim());

    // 검증: 쉼표 후 빈 부분 제거
    const validParts = parts.filter(p => p.length > 0);

    if (validParts.length === 0) {
      return {
        meanings: [],
        hasError: true,
        errorType: 'EMPTY_MEANING',
      };
    }

    validParts.forEach(part => {
      meanings.push({ text: part });
    });

    return { meanings, hasError: false };
  }

  // Step 3: 단순 뜻
  meanings.push({ text });

  return { meanings, hasError: false };
}

// 3. 뜻 유효성 검증

export interface MeaningValidation {
  valid: boolean;
  errors: Array<{
    type: 'MOJIBAKE' | 'EMPTY' | 'TOO_LONG' | 'DUPLICATE';
    meaning: string;
    message: string;
  }>;
}

export function validateMeanings(meanings: string[]): MeaningValidation {
  const errors: MeaningValidation['errors'] = [];
  const seen = new Set<string>();

  meanings.forEach((meaning, idx) => {
    // 빈 뜻
    if (!meaning || meaning.trim().length === 0) {
      errors.push({
        type: 'EMPTY',
        meaning,
        message: `뜻 ${idx + 1}: 빈 뜻`,
      });
      return;
    }

    // 모지바케
    const mojibakeCheck = detectMojibake(meaning);
    if (mojibakeCheck.isMojibake && mojibakeCheck.severity !== 'low') {
      errors.push({
        type: 'MOJIBAKE',
        meaning,
        message: `뜻 ${idx + 1}: 모지바케 감지 (${mojibakeCheck.severity})`,
      });
      return;
    }

    // 길이 체크
    if (meaning.length > 200) {
      errors.push({
        type: 'TOO_LONG',
        meaning,
        message: `뜻 ${idx + 1}: 너무 깁니다 (${meaning.length}/200)`,
      });
      return;
    }

    // 중복 체크
    if (seen.has(meaning)) {
      errors.push({
        type: 'DUPLICATE',
        meaning,
        message: `뜻 ${idx + 1}: 중복된 뜻`,
      });
      return;
    }

    seen.add(meaning);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// 4. 동의어/관련어 검증

export const KNOWN_BAD_PAIRS = [
  { word: 'investment', wrongSynonym: 'isolation' },
  { word: 'adapt', wrongSynonym: 'adopt' },
  // ... 더 추가 가능
];

export interface SynonymValidation {
  valid: boolean;
  errors: Array<{
    synonym: string;
    type: 'KNOWN_ERROR' | 'EMPTY' | 'SELF_REFERENCE' | 'MOJIBAKE';
    message: string;
  }>;
  duplicates: string[];
}

export function validateSynonyms(
  word: string,
  synonyms: string[]
): SynonymValidation {
  const errors: SynonymValidation['synonymValidation'] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];

  synonyms.forEach(synonym => {
    // 빈 동의어
    if (!synonym || synonym.trim().length === 0) {
      errors.push({
        synonym,
        type: 'EMPTY',
        message: '빈 동의어',
      });
      return;
    }

    // 자기 참조
    if (synonym.toLowerCase() === word.toLowerCase()) {
      errors.push({
        synonym,
        type: 'SELF_REFERENCE',
        message: '단어와 동일한 동의어',
      });
      return;
    }

    // 모지바케
    const mojibakeCheck = detectMojibake(synonym);
    if (mojibakeCheck.isMojibake && mojibakeCheck.severity !== 'low') {
      errors.push({
        synonym,
        type: 'MOJIBAKE',
        message: `모지바케 감지 (${mojibakeCheck.severity})`,
      });
      return;
    }

    // 알려진 오류 쌍
    const badPair = KNOWN_BAD_PAIRS.find(
      pair => pair.word === word && pair.wrongSynonym === synonym
    );
    if (badPair) {
      errors.push({
        synonym,
        type: 'KNOWN_ERROR',
        message: '알려진 오류 쌍',
      });
      return;
    }

    // 중복 감지
    if (seen.has(synonym)) {
      duplicates.push(synonym);
    } else {
      seen.add(synonym);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    duplicates,
  };
}

// 5. 예문 검증

export interface ExampleValidation {
  valid: boolean;
  errors: Array<{
    field: 'en' | 'ko';
    type: 'EMPTY' | 'TOO_SHORT' | 'TOO_LONG' | 'MOJIBAKE' | 'WORD_NOT_FOUND';
    message: string;
  }>;
}

export function validateExample(
  word: string,
  exampleEn: string,
  exampleKo: string
): ExampleValidation {
  const errors: ExampleValidation['errors'] = [];

  // 영문 예문
  if (!exampleEn || exampleEn.trim().length === 0) {
    errors.push({
      field: 'en',
      type: 'EMPTY',
      message: '영문 예문이 없습니다',
    });
  } else if (exampleEn.length < 20) {
    errors.push({
      field: 'en',
      type: 'TOO_SHORT',
      message: '영문 예문이 너무 짧습니다 (최소 20자)',
    });
  } else if (exampleEn.length > 200) {
    errors.push({
      field: 'en',
      type: 'TOO_LONG',
      message: '영문 예문이 너무 깁니다 (최대 200자)',
    });
  } else if (!exampleEn.toLowerCase().includes(word.toLowerCase())) {
    errors.push({
      field: 'en',
      type: 'WORD_NOT_FOUND',
      message: '예문에 해당 단어가 포함되지 않았습니다',
    });
  }

  // 한글 예문
  if (!exampleKo || exampleKo.trim().length === 0) {
    errors.push({
      field: 'ko',
      type: 'EMPTY',
      message: '한글 예문이 없습니다',
    });
  } else if (exampleKo.length < 20) {
    errors.push({
      field: 'ko',
      type: 'TOO_SHORT',
      message: '한글 예문이 너무 짧습니다 (최소 20자)',
    });
  } else if (exampleKo.length > 200) {
    errors.push({
      field: 'ko',
      type: 'TOO_LONG',
      message: '한글 예문이 너무 깁니다 (최대 200자)',
    });
  } else {
    const mojibakeCheck = detectMojibake(exampleKo);
    if (mojibakeCheck.isMojibake && mojibakeCheck.severity !== 'low') {
      errors.push({
        field: 'ko',
        type: 'MOJIBAKE',
        message: `한글 모지바케 감지 (${mojibakeCheck.severity})`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// 6. 통합 Learning Stage 데이터 검증

export interface LearningStageValidation {
  valid: boolean;
  flags: Array<{
    type: 'MOJIBAKE' | 'EMPTY_MEANING' | 'BAD_PAIR' | 'LENGTH_MISMATCH' | 'BAD_TRANSLATION';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    details?: Record<string, any>;
  }>;
}

export function validateLearningStageItem(item: {
  word: string;
  meanings_ko: string[];
  meanings_en: string[];
  synonyms?: string[];
  example_en?: string;
  example_ko?: string;
}): LearningStageValidation {
  const flags: LearningStageValidation['flags'] = [];

  // 1. 뜻 개수 검증
  if (item.meanings_ko.length !== item.meanings_en.length) {
    flags.push({
      type: 'LENGTH_MISMATCH',
      severity: 'MEDIUM',
      message: '영한 뜻의 개수가 일치하지 않습니다',
      details: {
        ko_count: item.meanings_ko.length,
        en_count: item.meanings_en.length,
      },
    });
  }

  // 2. 뜻 유효성 검증
  const meaningValidation = validateMeanings(item.meanings_ko);
  if (!meaningValidation.valid) {
    meaningValidation.errors.forEach(err => {
      flags.push({
        type:
          err.type === 'MOJIBAKE' ? 'MOJIBAKE' : err.type === 'EMPTY' ? 'EMPTY_MEANING' : 'BAD_TRANSLATION',
        severity: err.type === 'MOJIBAKE' ? 'HIGH' : 'MEDIUM',
        message: err.message,
      });
    });
  }

  // 3. 동의어 검증
  if (item.synonyms && item.synonyms.length > 0) {
    const synonymValidation = validateSynonyms(item.word, item.synonyms);
    if (!synonymValidation.valid) {
      synonymValidation.errors.forEach(err => {
        flags.push({
          type: err.type === 'KNOWN_ERROR' ? 'BAD_PAIR' : 'BAD_TRANSLATION',
          severity: 'HIGH',
          message: err.message,
        });
      });
    }
    if (synonymValidation.duplicates.length > 0) {
      flags.push({
        type: 'BAD_TRANSLATION',
        severity: 'LOW',
        message: '중복된 동의어가 있습니다',
        details: { duplicates: synonymValidation.duplicates },
      });
    }
  }

  // 4. 예문 검증
  if (item.example_en && item.example_ko) {
    const exampleValidation = validateExample(
      item.word,
      item.example_en,
      item.example_ko
    );
    if (!exampleValidation.valid) {
      exampleValidation.errors.forEach(err => {
        flags.push({
          type: err.type === 'MOJIBAKE' ? 'MOJIBAKE' : 'BAD_TRANSLATION',
          severity: err.type === 'MOJIBAKE' ? 'HIGH' : 'MEDIUM',
          message: err.message,
        });
      });
    }
  }

  return {
    valid: flags.length === 0,
    flags,
  };
}

// 7. 플래그 생성 헬퍼

export function createFlagFromValidation(
  wordId: string,
  validation: LearningStageValidation,
  originalData: Record<string, any>
) {
  return validation.flags.map(flag => ({
    word_id: wordId,
    flag_type: flag.type,
    severity: flag.severity,
    original_data: originalData,
    detected_issue: flag.message,
    suggested_fix: null,
    confidence: flag.severity === 'HIGH' ? 0.9 : flag.severity === 'MEDIUM' ? 0.7 : 0.5,
  }));
}
