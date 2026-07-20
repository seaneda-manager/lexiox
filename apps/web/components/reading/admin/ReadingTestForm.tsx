// apps/web/components/reading/admin/ReadingTestForm.tsx
"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import type {
  RReadingTest2026,
  RReadingModule,
  RReadingItem,
  RAcademicPassageItem,
  RQuestion,
  RChoice,
} from "@/models/reading";

type ReadingTestFormProps = {
  initial: RReadingTest2026;
  onChange?: (value: RReadingTest2026) => void;
  onSubmit?: (value: RReadingTest2026) => void;
};

export default function ReadingTestForm({
  initial,
  onChange,
  onSubmit,
}: ReadingTestFormProps) {
  // 🔸 Admin 폼은 any로 느슨하게
  const form = useForm<any>({
    defaultValues: initial,
    mode: "onChange",
  });

  const { control, register, handleSubmit, watch } = form;

  const modulesFieldArray = useFieldArray({
    control,
    name: "modules",
  });

  const values = watch();

  useEffect(() => {
    if (onChange) {
      onChange(values as RReadingTest2026);
    }
  }, [values, onChange]);

  function handleInternalSubmit(data: any) {
    onSubmit?.(data as RReadingTest2026);
  }

  return (
    <form
      onSubmit={handleSubmit(handleInternalSubmit)}
      className="flex flex-col gap-6"
    >
      {/* 1) Test Meta */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800">Test Meta</h2>
        <p className="mt-1 text-xs text-gray-500">
          시험 ID와 라벨은 DB에 저장될 때 key로 사용됩니다.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Test ID (meta.id)
            </label>
            <input
              {...register("meta.id" as const)}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="예: updated-reading-placement-v1"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Label (meta.label)
            </label>
            <input
              {...register("meta.label" as const)}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="예: Reading 2026 – Placement Test"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Exam Era (meta.examEra)
            </label>
            <input
              {...register("meta.examEra" as const)}
              className="w-full rounded-md border px-2 py-1.5 text-sm"
              placeholder="예: 2026"
            />
          </div>
        </div>
      </section>

      {/* 2) Modules */}
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Modules</h2>
          <button
            type="button"
            onClick={() =>
              modulesFieldArray.append({
                id: `module-${Date.now()}`,
                label: "New Module",
                stage: 1,
                items: [],
              } as RReadingModule)
            }
            className="rounded-md border bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            + Add Module
          </button>
        </div>

        <div className="mt-3 space-y-4">
          {modulesFieldArray.fields.map((mod, mIdx) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const itemsFieldArray = useFieldArray({
              control,
              name: `modules.${mIdx}.items`,
            });

            const moduleBase = `modules.${mIdx}`;

            return (
              <div
                key={mod.id ?? mIdx}
                className="rounded-lg border bg-gray-50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-gray-700">
                      Module Label
                    </label>
                    <input
                      {...register(`${moduleBase}.label` as const)}
                      className="w-full rounded-md border px-2 py-1 text-xs"
                      placeholder={`Module ${mIdx + 1}`}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-gray-700">
                        Stage
                      </label>
                      <input
                        type="number"
                        {...register(`${moduleBase}.stage` as const, {
                          valueAsNumber: true,
                        })}
                        className="w-20 rounded-md border px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => modulesFieldArray.remove(mIdx)}
                      className="mt-5 rounded-md border px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                    >
                      모듈 삭제
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-700">
                      Items (지문/문항 블록)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        itemsFieldArray.append({
                          id: `item-${Date.now()}`,
                          taskKind: "academic_passage",
                          stage: 1,
                          passageHtml: "<p>새 지문을 입력하세요.</p>",
                          questions: [],
                        } as unknown as RReadingItem)
                      }
                      className="rounded-md border bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-700"
                    >
                      + Add academic_passage item
                    </button>
                  </div>

                  {itemsFieldArray.fields.length === 0 && (
                    <p className="text-[11px] text-gray-500">
                      아직 item이 없습니다. 버튼을 눌러 지문/문항 블록을
                      추가하세요.
                    </p>
                  )}

                  {itemsFieldArray.fields.map((it, iIdx) => {
                    const itemBase = `${moduleBase}.items.${iIdx}`;

                    return (
                      <div
                        key={it.id ?? iIdx}
                        className="space-y-2 rounded-md border bg-white p-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] font-medium text-gray-700">
                              Item ID
                            </label>
                            <input
                              {...register(`${itemBase}.id` as const)}
                              className="w-48 rounded-md border px-2 py-1 text-[11px]"
                              placeholder="예: passage-1"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-gray-700">
                                taskKind
                              </label>
                              <select
                                {...register(`${itemBase}.taskKind` as const)}
                                className="rounded-md border px-2 py-1 text-[11px]"
                              >
                                <option value="academic_passage">
                                  academic_passage
                                </option>
                                {/* 나중에 다른 taskKind 추가 가능 */}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => itemsFieldArray.remove(iIdx)}
                              className="mt-5 rounded-md border px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                            >
                              Item 삭제
                            </button>
                          </div>
                        </div>

                        {/* passageHtml */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-gray-700">
                            passageHtml
                          </label>
                          <textarea
                            {...register(
                              `${itemBase}.passageHtml` as const
                            )}
                            className="h-32 w-full rounded-md border px-2 py-1 text-[11px] font-mono"
                            placeholder="<p>HTML 형식으로 지문을 입력하세요.</p>"
                          />
                          <p className="text-[10px] text-gray-500">
                            ※ 추후 Rich Text / 문단 단위 에디터로 교체 가능.
                          </p>
                        </div>

                        {/* Questions */}
                        <QuestionsEditor
                          control={control}
                          register={register}
                          baseName={itemBase}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Submit */}
      <section className="flex items-center justify-between">
        <p className="text-[11px] text-gray-500">
          이 폼에서 편집한 값은 JSON SSOT (RReadingTest2026)에 그대로 반영됩니다.
        </p>
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
        >
          저장 (onSubmit)
        </button>
      </section>
    </form>
  );
}

/* =========================
 *  Questions Editor
 * =======================*/

type QuestionsEditorProps = {
  control: any;
  register: ReturnType<typeof useForm>["register"];
  baseName: string; // e.g. "modules.0.items.0"
};

function QuestionsEditor({ control, register, baseName }: QuestionsEditorProps) {
  const questionsFieldArray = useFieldArray({
    control,
    name: `${baseName}.questions`,
  });

  return (
    <div className="mt-3 space-y-2 rounded-md border border-dashed bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-700">
          Questions
        </span>
        <button
          type="button"
          onClick={() =>
            questionsFieldArray.append({
              id: `q-${Date.now()}`,
              number: questionsFieldArray.fields.length + 1,
              stem: "",
              choices: [],
            } as RQuestion)
          }
          className="rounded-md border bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-700"
        >
          + Add Question
        </button>
      </div>

      {questionsFieldArray.fields.length === 0 && (
        <p className="text-[11px] text-gray-500">
          아직 문항이 없습니다. "Add Question"을 눌러 문항을 추가하세요.
        </p>
      )}

      <div className="space-y-3">
        {questionsFieldArray.fields.map((q, qIdx) => {
          const qBase = `${baseName}.questions.${qIdx}`;

          // eslint-disable-next-line react-hooks/rules-of-hooks
          const choicesFieldArray = useFieldArray({
            control,
            name: `${qBase}.choices`,
          });

          return (
            <div
              key={q.id ?? qIdx}
              className="rounded-md border bg-white p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                    Q{qIdx + 1}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                    <span>번호:</span>
                    <input
                      type="number"
                      {...register(`${qBase}.number` as const, {
                        valueAsNumber: true,
                      })}
                      className="w-16 rounded-md border px-1 py-0.5 text-[11px]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => questionsFieldArray.remove(qIdx)}
                  className="rounded-md border px-2 py-1 text-[10px] text-red-600 hover:bg-red-50"
                >
                  문항 삭제
                </button>
              </div>

              <div className="mt-2 space-y-1">
                <label className="text-[11px] font-medium text-gray-700">
                  Stem (문항 지문)
                </label>
                <textarea
                  {...register(`${qBase}.stem` as const)}
                  className="h-16 w-full rounded-md border px-2 py-1 text-[11px]"
                  placeholder="문제를 입력하세요."
                />
              </div>

              {/* Choices */}
              <div className="mt-2 space-y-2 rounded-md border border-dashed bg-gray-50 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-700">
                    Choices
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      choicesFieldArray.append({
                        id: `c-${Date.now()}`,
                        text: "",
                      } as RChoice)
                    }
                    className="rounded-md border bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-700"
                  >
                    + Add Choice
                  </button>
                </div>

                {choicesFieldArray.fields.length === 0 && (
                  <p className="text-[11px] text-gray-500">
                    보기(choices)를 추가하세요.
                  </p>
                )}

                <div className="space-y-1">
                  {choicesFieldArray.fields.map((c, cIdx) => (
                    <div
                      key={c.id ?? cIdx}
                      className="flex items-start gap-2 text-[11px]"
                    >
                      <span className="mt-1 w-4 text-right font-semibold">
                        {String.fromCharCode("A".charCodeAt(0) + cIdx)}.
                      </span>
                      <textarea
                        {...register(
                          `${qBase}.choices.${cIdx}.text` as const
                        )}
                        className="h-10 flex-1 rounded-md border px-2 py-1"
                        placeholder="보기 내용을 입력하세요."
                      />
                      <button
                        type="button"
                        onClick={() => choicesFieldArray.remove(cIdx)}
                        className="mt-1 rounded-md border px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
