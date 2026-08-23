// 레벨 테스트 기준표: 4트랙(Jr./중등/고등/토플). Jr./중등/고등은 초급/중급/고급 3단계,
// 토플만 초급/중급/고급/최고급 4단계(TRACK_LEVELS 참고).
//
// 출처:
// - 토플 트랙: ETS 공식 "Performance Descriptors for the TOEFL iBT Test" (2024)를 그대로 기반.
//   Low-Intermediate(CEFR B1)=하, High-Intermediate(CEFR B2)=중, Advanced(CEFR C1~C2)=상.
//   Grammar는 TOEFL에 별도 섹션이 없어 R/L/S/W 기술서에 언급된 문법 복잡도를 종합해 정리함.
// - Jr./중등/고등 트랙: WIDA(미국 K-12 영어학습자 Academic 언어 기준, 학년 클러스터 구조)를
//   참고하되, 이 학원의 학년 구분(Jr.=초1~6, 중등=중1~3, 고등=고1~3)에 맞춰 재구성함 —
//   WIDA 원문 그대로가 아니라 그 구조와 진행 원리를 바탕으로 직접 작성한 설명임.
//
// 이 표는 AI 문제 생성 프롬프트에 그대로 주입되는 "레벨 정의"로 쓰인다.

export type Track = "jr" | "middle" | "high" | "toefl";
export type SubLevel = "low" | "mid" | "high" | "highest";
export type Section = "grammar" | "vocab" | "listening" | "reading" | "speaking" | "writing";

// 트랙별로 실제 쓰이는 단계 목록. jr/middle/high는 3단계, toefl만 4단계.
// 적응형 엔진(adaptiveEngine.ts)이 이 배열을 기준으로 분기한다.
export const TRACK_LEVELS: Record<Track, SubLevel[]> = {
  jr: ["low", "mid", "high"],
  middle: ["low", "mid", "high"],
  high: ["low", "mid", "high"],
  toefl: ["low", "mid", "high", "highest"],
};

export const TRACK_LABEL: Record<Track, string> = {
  jr: "Jr. (초1~6)",
  middle: "중등 (중1~3)",
  high: "고등 (고1~3)",
  toefl: "TOEFL",
};

// 모든 트랙이 초급/중급/고급 공통 라벨을 쓰고, toefl만 최고급이 추가된다
// (jr/middle/high는 TRACK_LEVELS상 'highest'를 쓰지 않으므로 노출되지 않음).
const SUB_LEVEL_LABEL_MAP: Record<SubLevel, string> = {
  low: "초급",
  mid: "중급",
  high: "고급",
  highest: "최고급",
};

export function subLevelLabel(_track: Track, subLevel: SubLevel): string {
  return SUB_LEVEL_LABEL_MAP[subLevel];
}

// 기존 호출부 호환용.
export const SUB_LEVEL_LABEL = SUB_LEVEL_LABEL_MAP;

export function levelLabel(track: Track, subLevel: SubLevel): string {
  return `${TRACK_LABEL[track]} - ${subLevelLabel(track, subLevel)}`;
}

type SectionDescriptors = Record<Section, string>;

type LevelEntry = {
  track: Track;
  subLevel: SubLevel;
  cefr: string;
  descriptors: SectionDescriptors;
};

const TOEFL_LOW: SectionDescriptors = {
  reading: "짧고 단순한 문장·기본 문법 위주 지문. 주장+예시처럼 명확한 2문장 연결은 이해하나 밀도 높은 단락은 어려움. 고빈도 학술 어휘 위주, 저빈도 어휘는 취약.",
  listening: "반복·강조되는 핵심 아이디어와 명시적 세부사항은 이해. 여러 화자에 걸쳐 전달되거나 강조 없는 정보는 놓치기 쉬움.",
  speaking: "일반적/친숙한 주제는 비교적 편하게 말하나, 학술 주제에서는 긴 pause 발생. and/because/so로 연결된 기본 문형 위주. 설명이 불완전하거나 세부사항 부족.",
  writing: "일반적/친숙한 주제로 단순한 글 작성 가능. 근거·설명 부족으로 아이디어 전개가 제한적. 문법 오류가 핵심 연결부의 의미를 흐릴 수 있음.",
  grammar: "기본 문형(단문, and/because/so 연결)은 안정적이나 복잡한 종속절·분사구문 등에서 오류 빈번.",
  vocab: "고빈도 학술 어휘는 파악하나 저빈도 어휘·다의어에서 어려움을 겪음.",
};

const TOEFL_MID: SectionDescriptors = {
  reading: "학술 지문의 주제와 주요 세부사항은 이해하나, 개념적으로 밀도 높거나 수사적으로 복잡한 부분에서 오독 가능. 일반 학술 어휘는 익숙, 저빈도 어휘는 간헐적 어려움.",
  listening: "학술 강의·대화의 주제와 주요 세부사항 이해. 정보가 여러 발화에 걸쳐 조밀하게 제시되면 보강 없이는 놓칠 수 있음.",
  speaking: "일반 주제는 주저 없이 말하고, 복잡한 학술 주제도 이해 가능하게 전달. 일부 복잡한 문형 구사하나 정확성에서 이따금 흔들림.",
  writing: "여러 출처를 요약할 때 주요 아이디어 대부분 포함하나 일부 누락·부정확 가능. 의견을 명확히 제시하나 전개가 완전하지 않을 수 있음.",
  grammar: "복잡한 문형(관계절, 분사구문, 가정법 등)을 어느 정도 구사하나 정확성이 일관되지 않음.",
  vocab: "일반 학술 어휘를 폭넓게 구사, 저빈도·비유적 표현에서 가끔 부정확.",
};

const TOEFL_HIGH: SectionDescriptors = {
  reading: "밀도 높고 복잡한 학술 지문에서도 명시적 연결·적절한 추론 가능. 저빈도 어휘, 다의어, 단락 단위의 사변적 논증까지 따라감.",
  listening: "복잡한 문형·저빈도 어휘·다량의 정보가 조밀하게 구성된 강의·대화도 이해. 억양을 통한 태도·강조까지 포착.",
  speaking: "폭넓은 주제를 유창하고 효과적으로 소통. 적절한 문법·어휘 범위를 통제하며 구체·추상 정보를 아우르는 요약·설명·의견 전달.",
  writing: "학술/비학술 주제 모두 명확하고 자신 있게 서술. 여러 출처 정보를 통합해 정합성 있게 제시, 논쟁적 주제에 대한 근거 있는 의견 개진.",
  grammar: "복잡한 문법 구조(비교급, 가정법, 도치, 다중 종속절)를 정확하고 유연하게 구사.",
  vocab: "저빈도 학술 어휘, 뉘앙스 있는 다의어까지 폭넓고 정확하게 구사.",
};

// TOEFL 최고급 — ETS 공식 기술서(Advanced/C1~C2)에는 없는 자체 확장 구간.
// 상위권 학생 변별을 위해 학원 자체적으로 TOEFL_HIGH(Advanced) 위에 얹은 단계이며,
// ETS 출처가 아니라 TOEFL_HIGH 대비 "만점권 변별"을 목표로 직접 작성함.
const TOEFL_HIGHEST: SectionDescriptors = {
  reading: "TOEFL 만점권 지문(밀도 높은 학술 논증, 반어·함축, 저자의 숨은 의도)까지 빠르고 정확하게 처리. 어휘·구문이 전혀 장애가 되지 않음.",
  listening: "빠른 속도·비격식 표현이 섞인 강의·대화에서도 뉘앙스, 화자 간 미묘한 입장 차이까지 놓치지 않음.",
  speaking: "원어민에 준하는 유창성과 자연스러운 억양으로 추상적·논쟁적 주제를 즉흥적으로도 정교하게 논증.",
  writing: "대학원 수준의 논증적 글쓰기 — 정교한 문장 다양성, 세밀한 근거 통합, 어색함 없는 자연스러운 학술 문체.",
  grammar: "복잡한 문법을 실수 없이 자유자재로 구사, 문체적 선택(강조, 도치 등)까지 의도적으로 활용.",
  vocab: "전문·저빈도 어휘와 관용표현까지 정확하고 자연스럽게 구사.",
};

// Jr.(초1~6) — 단어/짧은 문장 → 간단한 단락 수준. 시각 자료·반복에 의존.
const JR_LOW: SectionDescriptors = {
  reading: "짧은 단어·구 단위 인식. 그림/맥락의 도움을 받아 아주 짧은 문장의 뜻을 짐작.",
  listening: "천천히 또박또박 말하면 익숙한 단어·짧은 지시문 이해.",
  speaking: "단어나 2~3단어 구로 답변. 완성된 문장 생성은 아직 어려움.",
  writing: "알파벳·기초 단어 쓰기, 아주 짧은 문장 베껴쓰기 수준.",
  grammar: "be동사, 기본 인칭대명사, 단수/복수 명사 정도의 초보적 규칙.",
  vocab: "생활 속 구체명사·기초 동사 위주의 고빈도 단어.",
};

const JR_MID: SectionDescriptors = {
  reading: "짧은 문장 여러 개로 구성된 간단한 글의 주제를 파악. 익숙한 소재의 그림책·짧은 이야기 이해.",
  listening: "일상적인 질문·짧은 이야기를 듣고 핵심 내용 파악, 반복되면 세부사항도 인식.",
  speaking: "짧은 문장으로 자기소개, 좋아하는 것 말하기 등 간단한 의사소통 가능.",
  writing: "3~5문장 정도의 짧은 글(일기, 소개글) 작성. 기본 문장부호 사용.",
  grammar: "현재/과거 시제 기본형, 간단한 접속사(and, but) 사용.",
  vocab: "학교·가족·취미 등 익숙한 주제의 일상 어휘.",
};

const JR_HIGH: SectionDescriptors = {
  reading: "여러 단락의 짧은 이야기·설명문을 읽고 줄거리·주제 파악, 간단한 추론 가능.",
  listening: "짧은 이야기나 안내문을 듣고 순서·인과관계 등 세부 정보 파악.",
  speaking: "여러 문장을 이어 자신의 경험·의견을 간단히 설명.",
  writing: "한 단락 분량의 글(경험, 의견)을 구조를 갖춰 작성.",
  grammar: "미래시제, 비교급, 기본 의문사절 등으로 표현 범위 확장.",
  vocab: "교과 기초 어휘(사회/과학 초급 용어 포함)로 확장.",
};

// 중등(중1~3) — 문단 단위 독해/작문, 학교 교과 언어 초입.
const MIDDLE_LOW: SectionDescriptors = {
  reading: "한 단락 분량의 쉬운 설명문·이야기에서 주제문과 주요 정보를 찾음. 복문 이해는 아직 불안정.",
  listening: "짧은 대화·안내방송에서 핵심 정보 파악. 여러 정보가 겹치면 혼동.",
  speaking: "익숙한 주제로 몇 문장을 연결해 말하나 문법 오류 잦음.",
  writing: "한 단락 글을 문법적 오류를 포함해 작성. 근거 제시는 단순한 수준.",
  grammar: "현재완료, 수동태 등 중급 문형을 배우는 단계로 오류 많음.",
  vocab: "교과서 수준의 학교 어휘, 다의어 구분은 미숙.",
};

const MIDDLE_MID: SectionDescriptors = {
  reading: "여러 단락 지문에서 주제와 세부 정보를 구분하고, 명시적인 원인-결과 관계를 파악.",
  listening: "학교 수업 안내나 짧은 발표를 듣고 주요 내용과 일부 세부사항 파악.",
  speaking: "익숙한 주제에 대해 이유를 들어 설명 가능. 복문 시도하나 정확성은 불안정.",
  writing: "두세 단락 글에서 주장-근거 구조를 시도. 연결어 사용 시작.",
  grammar: "관계대명사, to부정사/동명사 구분 등 중급 문법을 적용하려 시도.",
  vocab: "학교 교과(사회/과학/역사) 기본 용어를 포함한 중급 어휘.",
};

const MIDDLE_HIGH: SectionDescriptors = {
  reading: "설명문·논설문에서 필자의 주장과 근거를 구분하고 간단한 추론을 함.",
  listening: "짧은 강연·토론을 듣고 화자의 태도나 의견 차이를 어느 정도 구분.",
  speaking: "찬반이 있는 주제에 대해 근거를 들어 몇 문장 이상 논리적으로 설명.",
  writing: "서론-본론-결론 구조를 갖춘 글을 작성, 예시로 근거를 뒷받침.",
  grammar: "가정법 기초, 분사구문 등 고급 문형에 처음 노출, 정확도는 점진적으로 향상.",
  vocab: "학술적 어휘로의 전환기 — 교과서 밖 지문의 어휘도 문맥으로 유추 시도.",
};

// 고등(고1~3) — 내신/수능 수준의 본격적 학술 독해·논증적 글쓰기.
const HIGH_LOW: SectionDescriptors = {
  reading: "수능/내신 수준의 지문에서 주제문과 요지는 파악하나 함축적 표현이나 복잡한 문장구조에서 어려움.",
  listening: "학술적 주제의 대화·강의에서 주요 내용은 이해하나 세부정보 파악은 불완전.",
  speaking: "사회적/학술적 주제에 대해 의견을 말하되 논리 전개가 단순함.",
  writing: "주제에 맞는 에세이를 쓰되 근거의 깊이나 문장 다양성이 제한적.",
  grammar: "복문·가정법·분사구문을 이해하나 실제 사용에서 오류 빈번.",
  vocab: "수능 필수 어휘 수준, 추상적·학술적 어휘는 아직 제한적.",
};

const HIGH_MID: SectionDescriptors = {
  reading: "복잡한 문장 구조와 추상적 개념이 담긴 지문에서 함축적 의미와 필자의 태도를 대체로 파악.",
  listening: "학술 강의의 논리 전개를 따라가며 화자의 주장과 근거를 구분.",
  speaking: "논쟁적 주제에 대해 근거를 갖춰 비교적 유창하게 설명.",
  writing: "논증적 에세이에서 명확한 주장과 다각적 근거를 제시, 문단 간 연결이 매끄러움.",
  grammar: "대부분의 복잡한 문형을 정확하게 구사, 간헐적 오류만 존재.",
  vocab: "수능/학술 어휘를 폭넓게 구사, 문맥에 따른 뉘앙스 구분 가능.",
};

const HIGH_HIGH: SectionDescriptors = {
  reading: "TOEFL 수준에 근접한 밀도 높은 학술 지문에서 함축, 어조, 논증 구조까지 깊이 있게 분석.",
  listening: "복잡한 학술 강의·토론을 정확히 이해하고 화자 간 입장 차이나 뉘앙스까지 포착.",
  speaking: "추상적·학술적 주제에 대해 유창하고 정교하게 논증.",
  writing: "대학 수준의 논증적 글쓰기에 근접 — 명확한 구조, 정교한 어휘, 다각적 근거.",
  grammar: "TOEFL 수준의 복잡한 문법을 정확하고 유연하게 구사.",
  vocab: "학술 어휘를 폭넓고 정밀하게 구사, 저빈도·전문 어휘까지 확장 중.",
};

export const LEVEL_TABLE: LevelEntry[] = [
  { track: "jr", subLevel: "low", cefr: "-", descriptors: JR_LOW },
  { track: "jr", subLevel: "mid", cefr: "-", descriptors: JR_MID },
  { track: "jr", subLevel: "high", cefr: "-", descriptors: JR_HIGH },
  { track: "middle", subLevel: "low", cefr: "~A1", descriptors: MIDDLE_LOW },
  { track: "middle", subLevel: "mid", cefr: "A1~A2", descriptors: MIDDLE_MID },
  { track: "middle", subLevel: "high", cefr: "A2", descriptors: MIDDLE_HIGH },
  { track: "high", subLevel: "low", cefr: "A2~B1", descriptors: HIGH_LOW },
  { track: "high", subLevel: "mid", cefr: "B1", descriptors: HIGH_MID },
  { track: "high", subLevel: "high", cefr: "B1~B2", descriptors: HIGH_HIGH },
  { track: "toefl", subLevel: "low", cefr: "B1 (TOEFL Low-Intermediate)", descriptors: TOEFL_LOW },
  { track: "toefl", subLevel: "mid", cefr: "B2 (TOEFL High-Intermediate)", descriptors: TOEFL_MID },
  { track: "toefl", subLevel: "high", cefr: "C1~C2 (TOEFL Advanced)", descriptors: TOEFL_HIGH },
  { track: "toefl", subLevel: "highest", cefr: "C2+ (자체 확장 — 만점권 변별)", descriptors: TOEFL_HIGHEST },
];

export function getLevelEntry(track: Track, subLevel: SubLevel): LevelEntry {
  const entry = LEVEL_TABLE.find((e) => e.track === track && e.subLevel === subLevel);
  if (!entry) throw new Error(`Unknown level: ${track}/${subLevel}`);
  return entry;
}

export function getSectionDescriptor(track: Track, subLevel: SubLevel, section: Section): string {
  return getLevelEntry(track, subLevel).descriptors[section];
}
