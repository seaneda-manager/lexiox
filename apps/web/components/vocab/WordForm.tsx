// apps/web/components/vocab/WordForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { createWordAction } from "@/app/protected/admin/vocab/words/new/actions";

// ✅ SSOT는 무조건 index.ts (DB enum 기반)만 사용
import {
  GRADE_BANDS,
  WORD_SOURCE_TYPES,
  GRAMMAR_CATEGORIES,
  type WordCreatePayload,
  type GradeBand,
  type WordSourceType,
  type GrammarCategory,
} from "@/models/vocab/index";

/** ✅ PATCH: comparative/superlative fields (optional) */
type WordCreatePayloadPlus = WordCreatePayload & {
  adj_comp?: string | null;
  adj_sup?: string | null;
  adv_comp?: string | null;
  adv_sup?: string | null;
};

type Props = {
  // ✅ Server Action 가능 (이름에 onXXX 금지)
  submitAction?: (payload: WordCreatePayload) => Promise<void> | void;

  initialPayload?: Partial<WordCreatePayloadPlus>;
  submitLabel?: string;

  // ✅ 저장 성공 후 이동
  afterSubmitHref?: string; // e.g. "/admin/vocab/words"
};

type StringArrayField =
  | "meanings_ko"
  | "meanings_en_simple"
  | "examples_easy"
  | "examples_normal"
  | "derived_terms";

/* ================= helpers ================= */

function cleanStr(s: unknown): string {
  return String(s ?? "").trim();
}

function cleanStrOrNull(s: unknown): string | null {
  const v = cleanStr(s);
  return v.length ? v : null;
}

function cleanNumOrNull(n: unknown): number | null {
  if (n === null || n === undefined || n === "") return null;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

function cleanStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(cleanStr).filter(Boolean);
}

function cleanString2dArray(arr: unknown): string[][] {
  if (!Array.isArray(arr)) return [];
  return arr.map((row) => cleanStringArray(row));
}

function ensure2dSize(src: string[][], size: number, cols = 2): string[][] {
  const out = Array.isArray(src) ? src.map((r) => (Array.isArray(r) ? r : [])) : [];
  if (out.length > size) return out.slice(0, size);

  while (out.length < size) out.push(Array(cols).fill(""));

  return out.map((r) => {
    const rr = [...r];
    if (rr.length > cols) return rr.slice(0, cols);
    while (rr.length < cols) rr.push("");
    return rr;
  });
}

export default function WordForm({
  submitAction,
  initialPayload,
  submitLabel,
  afterSubmitHref,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const defaultValues: WordCreatePayloadPlus = useMemo(
    () => ({
      text: "",
      lemma: null,
      pos: "other",
      is_function_word: false,

      meanings_ko: [""],
      meanings_en_simple: [],

      examples_easy: [],
      examples_normal: [],
      derived_terms: [],

      difficulty: null,
      frequency_score: null,
      notes: null,

      gradeBands: ["K7_9"],
      sources: [],
      grammarHints: [],
      semanticTagIds: [],

      phonetic: null,
      audioUrl: null,
      synonyms_ko: [["", ""]],
      antonyms_ko: [["", ""]],
      example_en: null,
      example_ko: null,

      // ✅ NEW (comparative/superlative)
      adj_comp: null,
      adj_sup: null,
      adv_comp: null,
      adv_sup: null,
    }),
    [],
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<WordCreatePayloadPlus>({
    defaultValues: { ...defaultValues, ...(initialPayload ?? {}) } as WordCreatePayloadPlus,
  });

  // ✅ semanticTagIds는 DOM input 없이도 form state에 포함되도록 등록
  useEffect(() => {
    register("semanticTagIds");
  }, [register]);

  useEffect(() => {
    if (!initialPayload) return;
    reset({ ...defaultValues, ...initialPayload } as WordCreatePayloadPlus);
  }, [initialPayload, reset, defaultValues]);

  const meaningsKo = useWatch({ control, name: "meanings_ko" }) ?? [];
  const meaningsEn = useWatch({ control, name: "meanings_en_simple" }) ?? [];
  const examplesEasy = useWatch({ control, name: "examples_easy" }) ?? [];
  const examplesNormal = useWatch({ control, name: "examples_normal" }) ?? [];
  const derivedTerms = useWatch({ control, name: "derived_terms" }) ?? [];

  const synonymsKo = useWatch({ control, name: "synonyms_ko" }) ?? [];
  const antonymsKo = useWatch({ control, name: "antonyms_ko" }) ?? [];

  const sources = useFieldArray({ control, name: "sources" });
  const grammarHints = useFieldArray({ control, name: "grammarHints" });

  const semanticTagIds = useWatch({ control, name: "semanticTagIds" }) ?? [];
  const semanticTagText = useMemo(() => semanticTagIds.join(", "), [semanticTagIds]);

  // meanings 개수에 맞춰 synonyms/antonyms 길이 자동 보정
  useEffect(() => {
    const size = Math.max(1, meaningsKo.length);
    const nextSyn = ensure2dSize(synonymsKo as any, size, 2);
    const nextAnt = ensure2dSize(antonymsKo as any, size, 2);

    if (JSON.stringify(nextSyn) !== JSON.stringify(synonymsKo)) setValue("synonyms_ko", nextSyn);
    if (JSON.stringify(nextAnt) !== JSON.stringify(antonymsKo)) setValue("antonyms_ko", nextAnt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meaningsKo.length]);

  /**
   * ✅ Fix: optional string arrays should be allowed to become empty (length 0)
   * - meanings_ko stays minItems=1
   * - meanings_en_simple/examples/derived_terms can be 0
   */
  const renderStringArray = (
    label: string,
    field: StringArrayField,
    values: string[],
    opts?: { minItems?: number; placeholder?: string },
  ) => {
    const minItems = opts?.minItems ?? 0;
    const placeholder = opts?.placeholder ?? "";

    const safeValues = Array.isArray(values) ? values : [];
    const canDelete = safeValues.length > minItems;

    return (
      <section className="space-y-2 rounded-lg border p-4">
        <h3 className="font-semibold">
          {label}
          {minItems > 0 ? <span className="ml-2 text-xs text-gray-500">(min {minItems})</span> : null}
        </h3>

        <div className="space-y-2">
          {safeValues.map((_, i) => (
            <div key={i} className="flex gap-2">
              <input
                {...register(`${field}.${i}` as const)}
                placeholder={placeholder}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const next = safeValues.filter((_, idx) => idx !== i);
                  // keep minItems shape
                  if (next.length < minItems) {
                    if (minItems === 1) setValue(field as any, [""]);
                    else setValue(field as any, []);
                    return;
                  }
                  setValue(field as any, next);
                }}
                disabled={!canDelete}
                className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
              >
                삭제
              </button>
            </div>
          ))}

          {/* when empty (optional arrays), show a gentle empty-state row */}
          {safeValues.length === 0 ? (
            <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-500">
              (비어 있음) + 추가를 눌러 입력하세요.
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setValue(field as any, [...safeValues, ""])}
          className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
        >
          + 추가
        </button>
      </section>
    );
  };

  const internalSubmit = async (data: WordCreatePayloadPlus) => {
    setSubmitting(true);
    try {
      const cleanedMeaningsKo = cleanStringArray(data.meanings_ko);
      const cleanedMeaningsEn = cleanStringArray(data.meanings_en_simple);

      const meaningCount = Math.max(1, cleanedMeaningsKo.length);

      // ✅ meanings 개수 기준으로 2D shape 최종 보정 (2 cols)
      const fixedSyn2d = ensure2dSize(cleanString2dArray(data.synonyms_ko), meaningCount, 2);
      const fixedAnt2d = ensure2dSize(cleanString2dArray(data.antonyms_ko), meaningCount, 2);

      const cleanedGradeBands =
        Array.isArray(data.gradeBands) && data.gradeBands.length
          ? (data.gradeBands as GradeBand[])
          : (["K7_9"] as GradeBand[]);

      // ✅ sources: SSOT(index)에서 sourceLabel은 "실제로 쓸 거면" 필수(min1)라서
      // 빈 label은 저장 대상에서 제외
      const cleanedSources =
        Array.isArray(data.sources)
          ? data.sources
              .map((s) => {
                const sourceLabel = cleanStrOrNull((s as any).sourceLabel);
                if (!sourceLabel) return null;

                return {
                  sourceType: (s as any).sourceType as WordSourceType,
                  sourceLabel,
                  examYear: cleanNumOrNull((s as any).examYear),
                  examMonth: cleanNumOrNull((s as any).examMonth),
                  examRound: cleanStrOrNull((s as any).examRound), // ✅ index.ts는 string
                  grade: ((s as any).grade ?? null) as GradeBand | null,
                };
              })
              .filter(Boolean)
          : [];

      // ✅ grammarHints: shortTipKo는 SSOT에서 필수(min1)라서
      // 비어있으면 제외. sortOrder는 number로 고정.
      const cleanedGrammarHints =
        Array.isArray(data.grammarHints)
          ? data.grammarHints
              .map((g, idx) => {
                const shortTipKo = cleanStr((g as any).shortTipKo);
                if (!shortTipKo) return null;

                const sortOrderRaw = (g as any).sortOrder;
                const sortOrder = Number.isFinite(Number(sortOrderRaw)) ? Number(sortOrderRaw) : idx;

                return {
                  grammarCategory: (g as any).grammarCategory as GrammarCategory,
                  shortTipKo,
                  shortTipEn: cleanStrOrNull((g as any).shortTipEn),
                  wrongExample: cleanStrOrNull((g as any).wrongExample),
                  rightExample: cleanStrOrNull((g as any).rightExample),
                  showUntilGrade: ((g as any).showUntilGrade ?? null) as GradeBand | null,
                  sortOrder,
                };
              })
              .filter(Boolean)
          : [];

      const cleaned: WordCreatePayloadPlus = {
        text: cleanStr(data.text),
        lemma: cleanStrOrNull(data.lemma),
        pos: cleanStr(data.pos) || "other",
        is_function_word: Boolean(data.is_function_word),

        meanings_ko: cleanedMeaningsKo,
        meanings_en_simple: cleanedMeaningsEn,

        examples_easy: cleanStringArray(data.examples_easy),
        examples_normal: cleanStringArray(data.examples_normal),
        derived_terms: cleanStringArray(data.derived_terms),

        difficulty: cleanNumOrNull(data.difficulty),
        frequency_score: cleanNumOrNull(data.frequency_score),
        notes: cleanStrOrNull(data.notes),

        gradeBands: cleanedGradeBands,

        sources: cleanedSources as any,
        grammarHints: cleanedGrammarHints as any,

        // semanticTagIds는 uuid가 이상하면 서버에서 터질 수 있음. (v1이면 너가 넣는 값이 uuid일 때만 넣자)
        semanticTagIds: cleanStringArray(data.semanticTagIds),

        phonetic: cleanStrOrNull(data.phonetic),
        audioUrl: cleanStrOrNull(data.audioUrl),

        // ✅ 최종 보정된 2D 저장
        synonyms_ko: fixedSyn2d,
        antonyms_ko: fixedAnt2d,

        example_en: cleanStrOrNull(data.example_en),
        example_ko: cleanStrOrNull(data.example_ko),

        // ✅ NEW degrees
        adj_comp: cleanStrOrNull((data as any).adj_comp),
        adj_sup: cleanStrOrNull((data as any).adj_sup),
        adv_comp: cleanStrOrNull((data as any).adv_comp),
        adv_sup: cleanStrOrNull((data as any).adv_sup),
      };

      if (!cleaned.text) throw new Error("단어(text)는 필수입니다.");
      if (!cleaned.pos) throw new Error("품사(pos)는 필수입니다.");
      if (!cleaned.meanings_ko.length) throw new Error("meanings_ko는 최소 1개 필요합니다.");
      if (!cleaned.gradeBands?.length) throw new Error("gradeBands는 최소 1개 필요합니다.");

      if (submitAction) {
        // payload 타입은 WordCreatePayload이지만 extra fields는 구조적으로 허용
        await submitAction(cleaned as WordCreatePayload);
      } else {
        await createWordAction(cleaned as any);
      }

      // ✅ 성공 후 이동
      if (afterSubmitHref) {
        router.push(afterSubmitHref);
        router.refresh();
        return;
      }

      alert("저장 완료");
      if (!initialPayload) reset(defaultValues);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error(e);
      alert(`저장 실패: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(internalSubmit)} className="space-y-6" noValidate>
      {/* ================= CORE ================= */}
      <section className="space-y-3 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Core</h2>
          <div className="text-xs text-gray-500">* 필수: text, pos, gradeBands</div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-600">단어 (text) *</label>
            <input
              {...register("text", { required: true })}
              placeholder="responsibility"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            {errors.text && <div className="text-xs text-red-500">단어는 필수입니다.</div>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600">표제어 (lemma)</label>
            <input
              {...register("lemma")}
              placeholder="responsibility"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600">품사 (pos) *</label>
            <select
              {...register("pos", { required: true })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">품사 선택</option>
              <option value="noun">noun</option>
              <option value="verb">verb</option>
              <option value="adj">adj</option>
              <option value="adv">adv</option>
              <option value="prep">prep</option>
              <option value="conj">conj</option>
              <option value="other">other</option>
            </select>
            {errors.pos && <div className="text-xs text-red-500">품사는 필수입니다.</div>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600">난이도 / 빈도</label>
            <div className="flex gap-2">
              <input
                type="number"
                {...register("difficulty")}
                placeholder="difficulty"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <input
                type="number"
                {...register("frequency_score")}
                placeholder="frequency"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("is_function_word")} />
          기능어 (function word)
        </label>

        {/* ✅ NEW: Degrees (Comparative/Superlative) */}
        <section className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Degrees (비교급/최상급)</div>
            <div className="text-[11px] text-gray-500">adj_comp/adj_sup/adv_comp/adv_sup</div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-600">adj_comp (comparative)</label>
              <input
                {...register("adj_comp" as any)}
                placeholder="bigger"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">adj_sup (superlative)</label>
              <input
                {...register("adj_sup" as any)}
                placeholder="biggest"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">adv_comp (comparative)</label>
              <input
                {...register("adv_comp" as any)}
                placeholder="more quickly"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-600">adv_sup (superlative)</label>
              <input
                {...register("adv_sup" as any)}
                placeholder="most quickly"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="text-[11px] text-gray-500">
            팁: pos가 adj/adv가 아니어도 저장은 가능(옵션). Drill에서 kind 선택 시 값이 있는 경우만 사용하면 됨.
          </div>
        </section>

        <div className="space-y-2">
          <h3 className="font-semibold">Grade Bands *</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GRADE_BANDS.map((b) => (
              <label key={b} className="flex items-center gap-2 text-sm">
                <input type="checkbox" value={b} {...register("gradeBands")} />
                {b}
              </label>
            ))}
          </div>
        </div>
      </section>

      {renderStringArray("한글 뜻 (meanings_ko)", "meanings_ko", meaningsKo, {
        minItems: 1,
        placeholder: "뜻을 입력하세요",
      })}
      {renderStringArray("영어 간단 뜻 (meanings_en_simple)", "meanings_en_simple", meaningsEn, {
        minItems: 0,
        placeholder: "simple meaning (optional)",
      })}

      <section className="space-y-4 rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Learning Helpers (발음/동의어/예문)</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-600">발음 기호(phonetic)</label>
            <input
              {...register("phonetic")}
              placeholder="rɪˌspɒnsəˈbɪləti"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-600">오디오 URL(audioUrl)</label>
            <input
              {...register("audioUrl")}
              placeholder="/audio/vocab/w4.mp3"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <div className="text-[11px] text-gray-500">로컬이면 /public 아래 경로로 두고 “/audio/..” 형태 추천</div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <div className="text-sm font-semibold">뜻별 동의어 / 반의어 (각 2개)</div>

          {meaningsKo.map((m, i) => (
            <div key={`mean-${i}`} className="rounded-md border p-3">
              <div className="mb-2 text-xs text-gray-600">
                Meaning #{i + 1}: <span className="font-medium text-gray-900">{m || "(빈 뜻)"}</span>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-700">동의어</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      {...register(`synonyms_ko.${i}.0` as const)}
                      placeholder="syn 1"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      {...register(`synonyms_ko.${i}.1` as const)}
                      placeholder="syn 2"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-700">반의어</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      {...register(`antonyms_ko.${i}.0` as const)}
                      placeholder="ant 1"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      {...register(`antonyms_ko.${i}.1` as const)}
                      placeholder="ant 2"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <div className="text-sm font-semibold">대표 예문(1개)</div>
          <textarea
            {...register("example_en")}
            placeholder="(EN) A strong example sentence."
            className="min-h-[70px] w-full rounded-md border px-3 py-2 text-sm"
          />
          <textarea
            {...register("example_ko")}
            placeholder="(KO) 위 예문의 자연스러운 번역."
            className="min-h-[70px] w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </section>

      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer select-none font-semibold">
          Advanced (예문/파생어/태그/출처/문법힌트/노트)
        </summary>

        <div className="mt-4 space-y-6">
          {renderStringArray("예문 (Easy)", "examples_easy", examplesEasy, {
            minItems: 0,
            placeholder: "easy example (optional)",
          })}
          {renderStringArray("예문 (Normal)", "examples_normal", examplesNormal, {
            minItems: 0,
            placeholder: "normal example (optional)",
          })}
          {renderStringArray("파생어 (derived_terms)", "derived_terms", derivedTerms, {
            minItems: 0,
            placeholder: "derived term (optional)",
          })}

          <section className="space-y-2 rounded-lg border p-4">
            <h3 className="font-semibold">Semantic Tags (IDs)</h3>
            <p className="text-xs text-gray-500">v1: 콤마로 입력 (예: tag_abc, tag_def)</p>
            <input
              value={semanticTagText}
              onChange={(e) => {
                const ids = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                setValue("semanticTagIds", ids);
              }}
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="tag_abc, tag_def"
            />
          </section>

          <section className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">출처 (sources)</h3>

            <button
              type="button"
              onClick={() =>
                sources.append({
                  sourceType: "TEXTBOOK",
                  sourceLabel: "",
                  examYear: null,
                  examMonth: null,
                  examRound: null,
                  grade: null,
                } as any)
              }
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            >
              + 출처 추가
            </button>

            <div className="space-y-3">
              {sources.fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-6">
                  <select
                    {...register(`sources.${i}.sourceType` as const)}
                    className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
                  >
                    {WORD_SOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  <input
                    {...register(`sources.${i}.sourceLabel` as const)}
                    placeholder="label (required if used)"
                    className="rounded-md border px-3 py-2 text-sm sm:col-span-3"
                  />

                  <button
                    type="button"
                    onClick={() => sources.remove(i)}
                    className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50 sm:col-span-1"
                  >
                    삭제
                  </button>

                  <input
                    type="number"
                    {...register(`sources.${i}.examYear` as const)}
                    placeholder="year"
                    className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
                  />
                  <input
                    type="number"
                    {...register(`sources.${i}.examMonth` as const)}
                    placeholder="month"
                    className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
                  />
                  {/* ✅ index.ts는 examRound가 string이라 text로 */}
                  <input
                    type="text"
                    {...register(`sources.${i}.examRound` as const)}
                    placeholder="round"
                    className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
                  />
                </div>
              ))}
            </div>

            <div className="text-[11px] text-gray-500">sourceLabel이 비어 있으면 저장 시 자동으로 제외됩니다.</div>
          </section>

          <section className="space-y-3 rounded-lg border p-4">
            <h3 className="font-semibold">문법 힌트 (grammarHints)</h3>

            <button
              type="button"
              onClick={() =>
                grammarHints.append({
                  grammarCategory: "NONE",
                  shortTipKo: "",
                  shortTipEn: null,
                  wrongExample: null,
                  rightExample: null,
                  showUntilGrade: null,
                  sortOrder: grammarHints.fields.length,
                } as any)
              }
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            >
              + 힌트 추가
            </button>

            <div className="space-y-3">
              {grammarHints.fields.map((f, i) => (
                <div key={f.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      {...register(`grammarHints.${i}.grammarCategory` as const)}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      {GRAMMAR_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      {...register(`grammarHints.${i}.sortOrder` as const)}
                      className="w-24 rounded-md border px-3 py-2 text-sm"
                      placeholder="order"
                    />

                    <button
                      type="button"
                      onClick={() => grammarHints.remove(i)}
                      className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      삭제
                    </button>
                  </div>

                  <input
                    {...register(`grammarHints.${i}.shortTipKo` as const)}
                    placeholder="짧은 문법 힌트 (KO) *"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />

                  <input
                    {...register(`grammarHints.${i}.shortTipEn` as const)}
                    placeholder="짧은 문법 힌트 (EN)"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      {...register(`grammarHints.${i}.wrongExample` as const)}
                      placeholder="Wrong example"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                    <input
                      {...register(`grammarHints.${i}.rightExample` as const)}
                      placeholder="Right example"
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="text-[11px] text-gray-500">shortTipKo가 비어 있으면 저장 시 자동으로 제외됩니다.</div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2 rounded-lg border p-4">
            <h3 className="font-semibold">노트 (notes)</h3>
            <textarea
              {...register("notes")}
              className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
              placeholder="(옵션) 주의점/사용처/메모"
            />
          </section>
        </div>
      </details>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting ? "저장 중..." : submitLabel ?? (initialPayload ? "수정 저장" : "단어 저장")}
        </button>
      </div>
    </form>
  );
}
