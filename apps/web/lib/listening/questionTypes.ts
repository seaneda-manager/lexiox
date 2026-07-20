// lib/listening/questionTypes.ts
// 프로그램별 리스닝 문제 유형 정의

export type ListeningProgram = 'toefl' | 'toefl_jr' | 'toeic' | 'general';

export type LQTypeConfig = {
  value: string;
  label: string;
  color: string;
  hint: string; // basic 레벨 힌트
};

// ── TOEFL iBT ────────────────────────────────────────────────
const TOEFL: LQTypeConfig[] = [
  {
    value: 'main_topic',
    label: '주제/목적',
    color: 'bg-emerald-100 text-emerald-700',
    hint: '강의나 대화 전체의 핵심 주제나 목적을 묻는 문제',
  },
  {
    value: 'detail',
    label: '세부사항',
    color: 'bg-sky-100 text-sky-700',
    hint: '화자가 직접 언급한 구체적인 사실을 묻는 문제',
  },
  {
    value: 'function',
    label: '화자의 의도',
    color: 'bg-violet-100 text-violet-700',
    hint: '"Why does the professor say X?" — 특정 발언의 숨은 의도',
  },
  {
    value: 'attitude',
    label: '화자의 태도',
    color: 'bg-rose-100 text-rose-700',
    hint: '화자의 감정, 입장, 확신 정도를 파악하는 문제',
  },
  {
    value: 'organization',
    label: '강의 구성',
    color: 'bg-amber-100 text-amber-700',
    hint: '강의의 논리적 흐름이나 정보 제시 방식을 묻는 문제',
  },
  {
    value: 'inference',
    label: '추론',
    color: 'bg-orange-100 text-orange-700',
    hint: '직접 언급되지 않았지만 맥락상 유추할 수 있는 내용',
  },
  {
    value: 'connecting',
    label: '개념 연결',
    color: 'bg-teal-100 text-teal-700',
    hint: '두 개념이나 사례 사이의 관계를 파악하는 문제',
  },
];

// ── TOEFL Junior (단순화) ─────────────────────────────────────
const TOEFL_JR: LQTypeConfig[] = [
  { value: 'main_idea',  label: '중심 내용',   color: 'bg-emerald-100 text-emerald-700', hint: '전체 대화/방송의 핵심 내용' },
  { value: 'detail',     label: '세부사항',     color: 'bg-sky-100 text-sky-700',         hint: '직접 언급된 사실 확인' },
  { value: 'inference',  label: '추론',         color: 'bg-orange-100 text-orange-700',   hint: '맥락에서 유추할 수 있는 내용' },
  { value: 'vocabulary', label: '어휘/표현',    color: 'bg-violet-100 text-violet-700',   hint: '특정 표현의 의미를 문맥으로 파악' },
];

// ── TOEIC Listening ───────────────────────────────────────────
const TOEIC: LQTypeConfig[] = [
  { value: 'main_topic',       label: '주제/목적',     color: 'bg-emerald-100 text-emerald-700', hint: '담화 전체의 목적이나 주제' },
  { value: 'detail',           label: '세부사항',       color: 'bg-sky-100 text-sky-700',         hint: '직접 언급된 정보 확인' },
  { value: 'speaker_intent',   label: '화자의 의도',    color: 'bg-violet-100 text-violet-700',   hint: '특정 발언의 목적이나 의미' },
  { value: 'next_action',      label: '다음 행동',      color: 'bg-amber-100 text-amber-700',     hint: '화자가 다음에 할 일 또는 권유 사항' },
  { value: 'problem_solution', label: '문제와 해결책',  color: 'bg-rose-100 text-rose-700',       hint: '제기된 문제와 제안된 해결 방법' },
];

// ── 일반 (기본값) ─────────────────────────────────────────────
const GENERAL: LQTypeConfig[] = [
  { value: 'main_idea', label: '주제',     color: 'bg-emerald-100 text-emerald-700', hint: '전체 내용의 핵심 주제' },
  { value: 'detail',    label: '세부사항', color: 'bg-sky-100 text-sky-700',         hint: '직접 언급된 사실' },
  { value: 'inference', label: '추론',     color: 'bg-orange-100 text-orange-700',   hint: '맥락상 유추할 수 있는 내용' },
];

export const LISTENING_Q_TYPES: Record<ListeningProgram, LQTypeConfig[]> = {
  toefl:    TOEFL,
  toefl_jr: TOEFL_JR,
  toeic:    TOEIC,
  general:  GENERAL,
};

export function getListeningQTypes(program: ListeningProgram): LQTypeConfig[] {
  return LISTENING_Q_TYPES[program] ?? GENERAL;
}

export function getListeningQType(program: ListeningProgram, value: string): LQTypeConfig | undefined {
  return getListeningQTypes(program).find((t) => t.value === value);
}
