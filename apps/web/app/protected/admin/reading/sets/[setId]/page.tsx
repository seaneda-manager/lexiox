// apps/web/app/(protected)/admin/reading/sets/[setId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { upsertReadingSet, loadReadingSet } from '@/actions/reading';
import { validateSet } from '@/lib/reading/validate';
import type { RSet, RPassage, RQuestion } from '@/models/reading';

/** ✅ validateSet이 기대하는 형태로 RSet을 확장 */
type RSetFull = RSet & {
  label: string;
  version: number;
  passages: RPassage[];
};

/** 🔒 validateSet 입력 전용 “엄격 스키마” 타입(필수 string들 강제) */
type QTypeStrict =
  | 'vocab'
  | 'detail'
  | 'negative_detail'
  | 'paraphrasing'
  | 'insertion'
  | 'inference'
  | 'purpose'
  | 'pronoun_ref'
  | 'summary'
  | 'organization';

type ValidateQuestion = {
  id: string;
  number: number;
  type: QTypeStrict;
  stem: string;
  choices: { id: string; text: string; correct: boolean }[];
  explanation?: string;
  clue_quote?: string;
};

type ValidatePassage = {
  id: string;
  title: string;   // 필수
  content: string; // 필수(검증용), paragraphs를 합쳐 생성
  questions: ValidateQuestion[];
};

type ValidateInput = {
  id: string;
  label: string;
  version: number;
  passages: ValidatePassage[];
};

/** ✅ 느슨한 런타임을 화면 상태로: version/label/passages 기본값 채움 */
function normalizeRSet(
  raw: Partial<RSetFull> | Partial<RSet> | null | undefined,
  setId: string
): RSetFull {
  const r = (raw ?? {}) as Partial<RSetFull>;
  return {
    ...(r as RSet),
    id: r.id ?? setId,
    label: r.label ?? '',
    version: r.version ?? 1,
    passages: Array.isArray(r.passages) ? (r.passages as RPassage[]) : [],
  };
}

/** ✅ choice 배열 보정: 부모의 correct_choice_id/answer_id/answer 우선 사용 */
function coerceChoices(q: any) {
  const raw = Array.isArray(q?.choices) ? q.choices : [];
  const correctId =
    q?.correct_choice_id ?? q?.answer_id ?? q?.answer ?? null;

  return raw.map((c: any, idx: number) => {
    const id = String(c?.id ?? `c${idx + 1}`);
    const baseCorrect =
      typeof c?.is_correct === 'boolean'
        ? c.is_correct
        : typeof c?.correct === 'boolean'
        ? c.correct
        : false;

    return {
      id,
      text: String(c?.text ?? ''),
      // 부모 correct_choice_id가 있으면 그것으로 판정, 없으면 choice의 bool 필드 사용
      correct: correctId != null ? id === String(correctId) : baseCorrect,
    };
  });
}

/** ✅ validateSet에 넣을 “엄격 입력”으로 변환 (타입·누락 보정) */
function toValidateShape(src: RSetFull): ValidateInput {
  // 허용 타입 세트
  const allowed = new Set<QTypeStrict>([
    'vocab',
    'detail',
    'negative_detail',
    'paraphrasing',
    'insertion',
    'inference',
    'purpose',
    'pronoun_ref',
    'summary',
    'organization',
  ]);

  const coerceType = (t: any): QTypeStrict => {
    return allowed.has(t as QTypeStrict) ? (t as QTypeStrict) : 'detail';
  };

  const coerceQuestion = (q: Partial<RQuestion>, idx: number): ValidateQuestion => ({
    id: String(q.id ?? `q${idx + 1}`),
    number: Number.isFinite(q.number as any) ? Number(q.number) : idx + 1,
    type: coerceType((q as any).type),
    stem: String(q.stem ?? ''),
    choices: coerceChoices(q),
    // RQuestion 정식 스키마에는 explanation 없음 → meta.explanation 또는 구형 필드에서 흡수
    explanation: (q as any)?.meta?.explanation
      ? String((q as any).meta.explanation)
      : (q as any)?.explanation
      ? String((q as any).explanation)
      : undefined,
    clue_quote: (q as any)?.clue_quote ? String((q as any).clue_quote) : undefined,
  });

  const coercePassage = (p: Partial<RPassage>, pIdx: number): ValidatePassage => {
    // RPassage에는 paragraphs만 있음 → 검증용 content 문자열로 합성
    const contentFromParagraphs =
      Array.isArray((p as any)?.paragraphs) && (p as any).paragraphs.length
        ? ((p as any).paragraphs as string[]).join('\n\n')
        : typeof (p as any)?.content === 'string'
        ? String((p as any).content) // 구형 호환
        : '';

    return {
      id: String(p.id ?? `p${pIdx + 1}`),
      title: String(p.title ?? ''),     // ⬅️ 필수 문자열 보정
      content: contentFromParagraphs,   // ⬅️ paragraphs → content
      questions: Array.isArray(p.questions)
        ? p.questions.map(coerceQuestion)
        : [],
    };
  };

  return {
    id: String(src.id),
    label: String(src.label ?? ''),
    version: Number.isFinite(src.version as any) ? Number(src.version) : 1,
    passages: Array.isArray(src.passages) ? src.passages.map(coercePassage) : [],
  };
}

export default function Page(props: any) {
  const { params } = props as { params: { setId: string } };

  const [data, setData] = useState<RSetFull>(() =>
    normalizeRSet({ id: params.setId, label: '', version: 1, passages: [] }, params.setId)
  );
  const [errs, setErrs] = useState<string[]>([]);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    (async () => {
      const loaded = await loadReadingSet(params.setId);
      if (loaded != null) {
        setData(normalizeRSet(loaded as Partial<RSetFull>, params.setId));
      }
    })();
  }, [params.setId]);

  const onImport = async (file: File) => {
    const text = await file.text();
    const json = JSON.parse(text) as Partial<RSetFull>;
    setData(normalizeRSet(json, params.setId));
  };

  const onValidate = () => {
    const fixed = normalizeRSet(data, params.setId);
    const strict = toValidateShape(fixed);   // ⬅️ 엄격 스키마 변환
    const e = validateSet(strict as any);    // validateSet 기대 타입과 일치
    setErrs(e);
    setMsg(e.length ? `Errors: ${e.length}` : 'All good ✅');
  };

  const onSave = async () => {
    const fixed = normalizeRSet(data, params.setId);
    const strict = toValidateShape(fixed);   // ⬅️ 동일 변환 후 저장
    const e = validateSet(strict as any);
    if (e.length) {
      setErrs(e);
      setMsg(`Fix errors first (${e.length})`);
      return;
    }
    const res = await upsertReadingSet(strict as any);
    setMsg(res?.ok ? 'Saved ✅' : 'Save failed');
  };

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reading Set: {data.id}</h1>
        <div className="flex gap-2">
          <label className="cursor-pointer rounded border px-3 py-2">
            Import JSON
            <input
              type="file"
              className="hidden"
              accept="application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImport(f);
              }}
            />
          </label>
          <button className="rounded border px-3 py-2" onClick={onValidate}>
            Validate
          </button>
          <button className="rounded border bg-black px-3 py-2 text-white" onClick={onSave}>
            Save
          </button>
        </div>
      </header>

      {!!msg && <div className="text-sm">{msg}</div>}
      {!!errs.length && (
        <ul className="list-disc pl-5 text-sm text-red-600 space-y-1">
          {errs.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {/* TODO: 에디터 UI */}
    </div>
  );
}
