"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  VARIANT_PRESET_MAP,
  createEmptyPassageAuthoringDocument,
  type ExamType,
  type PassageAuthoringDocument,
  type PassageQuestionStyle,
  type PassageSourceType,
  type PassageStatus,
  type PassageTrack,
  type PassageVariantType,
  type SchoolLevel,
} from "@/components/naesin/authoring/passage_authoring_schema_v1";
import { applyRawPassageToDocument } from "@/components/naesin/authoring/passage_split_utils";
import GrammarTargetsEditor from "@/components/naesin/authoring/GrammarTargetsEditor";
import ReadAloudItemsEditor from "@/components/naesin/authoring/ReadAloudItemsEditor";
import SentenceOrderItemsEditor from "@/components/naesin/authoring/SentenceOrderItemsEditor";
import WorkoutReviewPanel from "@/components/naesin/authoring/WorkoutReviewPanel";
import { saveNaesinPassageAction } from "@/app/protected/admin/naesin/passages/actions";
import type { GrammarUnitLite } from "@/lib/naesin/grammar/ruleScanV1";

const SOURCE_OPTIONS: Array<{ value: PassageSourceType; label: string }> = [
  { value: "textbook", label: "교과서 본문" },
  { value: "naesin_external", label: "내신용 외부지문" },
  { value: "mock_exam", label: "모의고사 지문" },
  { value: "workbook", label: "교재 지문" },
  { value: "teacher_made", label: "자체 제작 지문" },
  { value: "junior_reader", label: "쥬니어 리더" },
  { value: "other", label: "기타" },
];

const TRACK_OPTIONS: Array<{ value: PassageTrack; label: string }> = [
  { value: "naesin", label: "Lingo-X Naesin" },
  { value: "junior", label: "Lingo-X Junior" },
  { value: "toefl", label: "Lingo-X TOEFL" },
  { value: "shared", label: "공용" },
];

const STATUS_OPTIONS: Array<{ value: PassageStatus; label: string }> = [
  { value: "draft", label: "draft" },
  { value: "published", label: "published" },
  { value: "archived", label: "archived" },
];

const SCHOOL_LEVEL_OPTIONS: Array<{ value: SchoolLevel; label: string }> = [
  { value: "elementary", label: "초등" },
  { value: "middle", label: "중등" },
  { value: "high", label: "고등" },
];

const EXAM_TYPE_OPTIONS: Array<{ value: ExamType; label: string }> = [
  { value: "midterm", label: "중간" },
  { value: "final", label: "기말" },
  { value: "monthly_exam", label: "월별" },
  { value: "practice", label: "연습" },
  { value: "mock_exam", label: "모의고사" },
  { value: "other", label: "기타" },
];

const INITIAL_AUTHORING_ID = "passage-new";

type Props = {
  initialDoc?: PassageAuthoringDocument | null;
};

function createAuthoringId() {
  return `passage-${Date.now()}`;
}

function cloneDoc(doc: PassageAuthoringDocument): PassageAuthoringDocument {
  return JSON.parse(JSON.stringify(doc)) as PassageAuthoringDocument;
}

function joinSentenceTexts(sentenceIds: string[], sentenceMap: Map<string, string>) {
  return sentenceIds.map((id) => sentenceMap.get(id) ?? id).join(" ");
}

export default function PassageAuthoringEditor({ initialDoc }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");
  const [doc, setDoc] = useState<PassageAuthoringDocument>(() =>
    initialDoc
      ? cloneDoc(initialDoc)
      : createEmptyPassageAuthoringDocument(INITIAL_AUTHORING_ID),
  );
  const [variantToAdd, setVariantToAdd] = useState<PassageVariantType>(
    "naesin_basic_workout",
  );
  const [isPassageSaved, setIsPassageSaved] = useState<boolean>(!!initialDoc?.core?.id);

  useEffect(() => {
    if (!initialDoc) return;
    setSaveMessage("");
    setSaveError("");
    setDoc(cloneDoc(initialDoc));
    setIsPassageSaved(true);
  }, [initialDoc?.core?.id]);

  const sentenceMap = useMemo(() => {
    return new Map(doc.core.sentences.map((sentence) => [sentence.id, sentence.text]));
  }, [doc.core.sentences]);

  const sentenceCount = doc.core.sentences.length;
  const paragraphCount = doc.core.paragraphs.length;

  const lessonGrammarUnits = useMemo<GrammarUnitLite[]>(() => {
    return [
      { id: "gu_tense_pastperfect_001", authoringMode: "manual_deep" },
      { id: "gu_sva_each_001", authoringMode: "auto_lite" },
      { id: "gu_sva_modifier_prep_001", authoringMode: "manual_deep" },
      { id: "gu_sva_correlative_001", authoringMode: "manual_deep" },
    ];
  }, []);

  function patchCore<K extends keyof PassageAuthoringDocument["core"]>(
    key: K,
    value: PassageAuthoringDocument["core"][K],
  ) {
    setDoc((prev) => ({
      ...prev,
      core: {
        ...prev.core,
        [key]: value,
      },
    }));
  }

  function patchMeta<K extends keyof PassageAuthoringDocument["core"]["meta"]>(
    key: K,
    value: PassageAuthoringDocument["core"]["meta"][K],
  ) {
    setDoc((prev) => ({
      ...prev,
      core: {
        ...prev.core,
        meta: {
          ...prev.core.meta,
          [key]: value,
        },
      },
    }));
  }

  function handleSplit() {
    setDoc((prev) => applyRawPassageToDocument(prev, prev.core.rawPassage));
  }

  function handleReset() {
    setSaveMessage("");
    setSaveError("");
    setIsPassageSaved(false);
    setDoc(createEmptyPassageAuthoringDocument(createAuthoringId()));
  }

  function handleAddVariant() {
    const preset = VARIANT_PRESET_MAP[variantToAdd];

    setDoc((prev) => {
      const nextIndex = prev.variants.length + 1;
      return {
        ...prev,
        variants: [
          ...prev.variants,
          {
            id: `variant-${nextIndex}`,
            title: preset.label,
            variantType: variantToAdd,
            track: preset.track,
            status: "draft",
            recommendedQuestionStyles: [...preset.recommendedQuestionStyles],
            assessmentQuestions: [],
          },
        ],
      };
    });
  }

  function handleSave() {
    setSaveMessage("");
    setSaveError("");

    startTransition(async () => {
      const result = await saveNaesinPassageAction(doc);

      if ("error" in result) {
        setSaveError(result.error);
        return;
      }

      setDoc((prev) => ({
        ...prev,
        core: {
          ...prev.core,
          id: result.id,
        },
      }));
      setIsPassageSaved(true);

      setSaveMessage(`저장 완료 · ${result.title} · ${result.updatedAt}`);

      const savedId = result.id;
      const isCreatePage =
        pathname === "/admin/naesin/passages/new" ||
        pathname?.endsWith("/admin/naesin/passages/new");

      if (isCreatePage && savedId) {
        router.replace(`/admin/naesin/passages/${savedId}/edit`);
        return;
      }

      router.refresh();
    });
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
          Admin / Naesin / Passage Authoring
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Passage Authoring Editor
        </h1>
        <p className="text-sm text-neutral-500">
          원문을 붙여넣고 문단/문장 단위 JSON으로 변환한 뒤, variant pack authoring의
          출발점으로 사용합니다.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <div className="text-sm font-medium text-neutral-800">제목</div>
              <input
                value={doc.core.title}
                onChange={(e) => patchCore("title", e.target.value)}
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none ring-0"
                placeholder="예: 송도고 1-1 중간 대비 지문 A"
              />
            </label>

            <label className="space-y-2">
              <div className="text-sm font-medium text-neutral-800">Source Label</div>
              <input
                value={doc.core.meta.sourceLabel ?? ""}
                onChange={(e) => patchMeta("sourceLabel", e.target.value)}
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none ring-0"
                placeholder="예: 2024 3월 고1 모의고사 21번"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <div className="text-sm font-medium text-neutral-800">Source Type</div>
              <select
                value={doc.core.meta.sourceType}
                onChange={(e) => patchMeta("sourceType", e.target.value as PassageSourceType)}
                className="w-full rounded-2xl border px-3 py-2 text-sm"
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <div className="text-sm font-medium text-neutral-800">Track</div>
              <select
                value={doc.core.track}
                onChange={(e) => patchCore("track", e.target.value as PassageTrack)}
                className="w-full rounded-2xl border px-3 py-2 text-sm"
              >
                {TRACK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <div className="text-sm font-medium text-neutral-800">School Level</div>
              <select
                value={doc.core.meta.schoolLevel ?? ""}
                onChange={(e) =>
                  patchMeta(
                    "schoolLevel",
                    (e.target.value || undefined) as SchoolLevel | undefined,
                  )
                }
                className="w-full rounded-2xl border px-3 py-2 text-sm"
              >
                <option value="">선택 안 함</option>
                {SCHOOL_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <div className="text-sm font-medium text-neutral-800">Status</div>
              <select
                value={doc.core.status}
                onChange={(e) => patchCore("status", e.target.value as PassageStatus)}
                className="w-full rounded-2xl border px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2">
              <div className="text-sm font-medium text-neutral-800">Exam Type</div>
              <select
                value={doc.core.meta.examType ?? ""}
                onChange={(e) =>
                  patchMeta(
                    "examType",
                    (e.target.value || undefined) as ExamType | undefined,
                  )
                }
                className="w-full rounded-2xl border px-3 py-2 text-sm"
              >
                <option value="">선택 안 함</option>
                {EXAM_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <div className="text-sm font-medium text-neutral-800">Original Question Style</div>
              <input
                value={doc.core.meta.originalQuestionStyle ?? ""}
                onChange={(e) =>
                  patchMeta(
                    "originalQuestionStyle",
                    (e.target.value || undefined) as PassageQuestionStyle | undefined,
                  )
                }
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none ring-0"
                placeholder="예: blank_inference"
              />
            </label>

            <label className="space-y-2">
              <div className="text-sm font-medium text-neutral-800">Grade Label</div>
              <input
                value={doc.core.meta.gradeLabel ?? ""}
                onChange={(e) => patchMeta("gradeLabel", e.target.value)}
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none ring-0"
                placeholder="예: 고1 / 중3"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <div className="text-sm font-medium text-neutral-800">Raw Passage</div>
            <textarea
              value={doc.core.rawPassage}
              onChange={(e) => patchCore("rawPassage", e.target.value)}
              className="min-h-[280px] w-full rounded-3xl border px-4 py-3 font-mono text-sm leading-7 outline-none ring-0"
              placeholder={[
                "문단을 빈 줄로 구분해서 원문을 붙여넣으세요.",
                "",
                "The boy who is wearing a blue cap ran quickly to the store.",
                "The nearby classroom was quiet during the science project.",
                "",
                "Working together, the team finished the task before lunch.",
              ].join("\n")}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSplit}
              className="rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white"
            >
              문단/문장 자동 분리
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/naesin/passages")}
              className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700"
            >
              목록 보기
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700"
            >
              새 문서로 초기화
            </button>
          </div>

          {saveMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {saveMessage}
            </div>
          ) : null}

          {saveError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {saveError}
            </div>
          ) : null}
        </div>

        <div className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
          <div>
            <div className="text-sm font-semibold text-neutral-900">현재 상태</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-neutral-50 p-3">
                <div className="text-neutral-500">문단 수</div>
                <div className="mt-1 text-lg font-semibold text-neutral-900">
                  {paragraphCount}
                </div>
              </div>
              <div className="rounded-2xl bg-neutral-50 p-3">
                <div className="text-neutral-500">문장 수</div>
                <div className="mt-1 text-lg font-semibold text-neutral-900">
                  {sentenceCount}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-neutral-900">Variant Pack 추가</div>
            <select
              value={variantToAdd}
              onChange={(e) => setVariantToAdd(e.target.value as PassageVariantType)}
              className="w-full rounded-2xl border px-3 py-2 text-sm"
            >
              {Object.entries(VARIANT_PRESET_MAP).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddVariant}
              className="w-full rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700"
            >
              Pack 추가
            </button>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-neutral-900">현재 Pack 목록</div>
            <div className="space-y-2">
              {doc.variants.length === 0 ? (
                <div className="rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-500">
                  아직 추가된 variant pack이 없습니다.
                </div>
              ) : (
                doc.variants.map((variant) => (
                  <div key={variant.id} className="rounded-2xl border p-3 text-sm">
                    <div className="font-medium text-neutral-900">{variant.title}</div>
                    <div className="mt-1 text-neutral-500">
                      {variant.variantType} / {variant.track}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 1~5단계 워크아웃 (AI 생성 + 수동 검수) ── */}
      <WorkoutReviewPanel
        passageId={doc.core.id}
        doc={doc}
        onDocChange={setDoc}
      />

      {isPassageSaved && doc.core.id ? (
        <GrammarTargetsEditor
          passageId={doc.core.id}
          sentences={doc.core.sentences}
          lessonGrammarUnits={lessonGrammarUnits}
        />
      ) : (
        <section className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-neutral-900">
            Grammar Targets Editor
          </div>
          <div className="text-sm text-neutral-500">
            먼저 지문을 저장하면 문법 타깃 편집 패널이 활성화됩니다.
          </div>
        </section>
      )}

      <ReadAloudItemsEditor
        sentences={doc.core.sentences}
        readAloudItems={doc.workout.readAloudItems ?? []}
        onChange={(next) =>
          setDoc((prev) => ({
            ...prev,
            workout: {
              ...prev.workout,
              readAloudItems: next,
            },
          }))
        }
      />

      <SentenceOrderItemsEditor
        sentences={doc.core.sentences}
        sentenceOrderItems={doc.workout.sentenceOrderItems ?? []}
        onChange={(next) =>
          setDoc((prev) => ({
            ...prev,
            workout: {
              ...prev.workout,
              sentenceOrderItems: next,
            },
          }))
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-neutral-900">문단 / 문장 Preview</div>
          <div className="space-y-4">
            {doc.core.paragraphs.length === 0 ? (
              <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                아직 split 결과가 없습니다. 원문을 넣고 자동 분리 버튼을 눌러주세요.
              </div>
            ) : (
              doc.core.paragraphs.map((paragraph) => (
                <section key={paragraph.id} className="rounded-2xl border p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    {paragraph.id}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-neutral-700">
                    {paragraph.rawText}
                  </div>
                  <div className="mt-3 space-y-2">
                    {paragraph.sentenceIds.map((sentenceId) => (
                      <div key={sentenceId} className="rounded-2xl bg-neutral-50 px-3 py-2 text-sm">
                        <span className="mr-2 font-semibold text-neutral-500">{sentenceId}</span>
                        <span className="text-neutral-800">{sentenceMap.get(sentenceId)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>


      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-neutral-900">다음 단계 추천</div>
          <div className="mt-3 space-y-3 text-sm leading-6 text-neutral-600">
            <p>1. Passage Core 입력과 split 결과를 먼저 검증합니다.</p>
            <p>2. Grammar Targets / Read Aloud / Sentence Order를 채웁니다.</p>
            <p>3. 저장 후 목록 페이지에서 열고 variant 기준으로 과제로 배정합니다.</p>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-neutral-900">문장 연결 미리보기</div>
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            {doc.core.paragraphs.map((paragraph) => (
              <div key={`${paragraph.id}-joined`} className="rounded-2xl bg-neutral-50 p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {paragraph.id}
                </div>
                <div>{joinSentenceTexts(paragraph.sentenceIds, sentenceMap)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
