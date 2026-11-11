// 문장 분석 v2 (drill_type = 'structure_svo', payload.version === 2)
// 순수 함수 모듈 — 서버 액션·클라이언트·AI 생성기가 함께 쓴다.
// 위치는 모두 "단어 토큰 인덱스 [start, end]" (양끝 포함).

import type {
  SentenceAnalysisPayload,
  SaItemId,
  SaItemResult,
  SaReason,
  SaSpan,
} from '@/models/hi-naesin/drill';

// ── 토큰화 ───────────────────────────────────────────────
// 단어 = 영문/숫자 덩어리(어포스트로피·하이픈 연결 포함). 구두점은 토큰에서 제외.
const WORD_RE = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

export type SaToken = { text: string; index: number; start: number; end: number };

export function tokenizeSentence(sentence: string): SaToken[] {
  const out: SaToken[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(WORD_RE.source, 'g');
  while ((m = re.exec(sentence)) !== null) {
    out.push({ text: m[0], index: out.length, start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export function spanText(tokens: SaToken[], span: SaSpan): string {
  return tokens.slice(span[0], span[1] + 1).map((t) => t.text).join(' ');
}

export function isValidSpan(span: unknown, tokenCount: number): span is SaSpan {
  return Array.isArray(span)
    && span.length === 2
    && Number.isInteger(span[0]) && Number.isInteger(span[1])
    && span[0] >= 0 && span[1] >= span[0] && span[1] < tokenCount;
}

const eq = (a: SaSpan, b: SaSpan) => a[0] === b[0] && a[1] === b[1];
const within = (inner: SaSpan, outer: SaSpan) => inner[0] >= outer[0] && inner[1] <= outer[1];

// ── 레벨별 지시(step) ────────────────────────────────────
export const SA_STEP_LABEL: Record<SaItemId, string> = {
  fullS: '완전 주어 (수식어 포함)',
  coreS: '핵심 주어 (수식어 제외)',
  V: '동사',
};

export const SA_STEP_PROMPT: Record<SaItemId, string> = {
  fullS: '주어를 수식어까지 포함해서 전체를 드래그하세요.',
  coreS: '그 주어에서 수식어를 뺀 핵심 주어만 드래그하세요.',
  V: '동사(조동사 포함)를 드래그하세요.',
};

export function stepsForLevel(level: SentenceAnalysisPayload['level']): SaItemId[] {
  // 중급·고급 단계(형식, O/C, 절, 수식, 병치)는 이후 단계에서 추가
  void level;
  return ['fullS', 'coreS', 'V'];
}

// ── 정답키 해석 ──────────────────────────────────────────
// 각 항목의 허용 구간 목록. 첫 번째가 대표 정답.
export function acceptedFor(p: SentenceAnalysisPayload, id: SaItemId): SaSpan[] {
  const main = p.key.clauses[0];
  if (!main) return [];
  const extra = p.accepted?.[id] ?? [];
  switch (id) {
    case 'fullS': return [...main.fullS, ...extra];
    case 'coreS': return [...main.coreS, ...extra];
    case 'V':     return [main.V, ...extra];
  }
}

// fullS/coreS 는 병치 주어일 수 있어 "구간 집합" 전체를 정답으로 본다(단일 선택 UI에서는 대표 1개).
const WEIGHT: Record<SaItemId, number> = { fullS: 2, coreS: 2, V: 2 };

function reasonFor(student: SaSpan | null, accepted: SaSpan[]): SaReason {
  if (!student) return 'missing';
  if (accepted.some((a) => within(student, a))) return 'too_short';
  if (accepted.some((a) => within(a, student))) return 'too_long';
  return 'wrong_span';
}

export type SaStudentStep = { id: SaItemId; span: SaSpan | null };

export function gradeSentenceAnalysis(
  p: SentenceAnalysisPayload,
  steps: SaStudentStep[],
): { items: SaItemResult[]; scorePct: number; isCorrect: boolean } {
  const ids = stepsForLevel(p.level);
  const items: SaItemResult[] = ids.map((id) => {
    const student = steps.find((s) => s.id === id)?.span ?? null;
    const accepted = acceptedFor(p, id);
    const ok = !!student && accepted.some((a) => eq(a, student));
    return {
      id,
      ok,
      weight: WEIGHT[id],
      reason: ok ? undefined : reasonFor(student, accepted),
      student,
    };
  });
  const total = items.reduce((s, i) => s + i.weight, 0) || 1;
  const got = items.reduce((s, i) => s + (i.ok ? i.weight : 0), 0);
  const scorePct = Math.round((got / total) * 100);
  const vOk = items.find((i) => i.id === 'V')?.ok ?? false;
  return { items, scorePct, isCorrect: scorePct >= 80 && vOk };
}

// ── 정답키 검증 (AI 생성 결과 / 교사 입력용) ─────────────
export function validateSentenceAnalysis(p: SentenceAnalysisPayload): string | null {
  const tokens = tokenizeSentence(p.sentence);
  const n = tokens.length;
  const main = p.key?.clauses?.[0];
  if (!main) return 'no main clause';
  if (!main.fullS?.length || !main.coreS?.length) return 'subject missing';
  if (!main.fullS.every((s) => isValidSpan(s, n))) return 'fullS out of range';
  if (!main.coreS.every((s) => isValidSpan(s, n))) return 'coreS out of range';
  if (!isValidSpan(main.V, n)) return 'V out of range';
  if (!main.coreS.every((c) => main.fullS.some((f) => within(c, f)))) return 'coreS not inside fullS';
  if (main.fullS.some((f) => within(main.V, f) && !eq(f, main.V))) return 'V inside subject';
  return null;
}
