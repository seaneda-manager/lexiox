// components/naesin/authoring/WorkoutReviewPanel.tsx
"use client";

import { useState, useTransition } from "react";
import { generatePassageWorkoutAction } from "@/app/protected/admin/naesin/passages/[id]/generate-workout/actions";
import { saveNaesinPassageAction } from "@/app/protected/admin/naesin/passages/actions";
import type { PassageAuthoringDocument } from "@/components/naesin/authoring/passage_authoring_schema_v1";
import { SENTENCE_FUNCTION_LABEL, SENTENCE_FUNCTION_TYPES } from "@/components/naesin/drill/types";

type Props = {
  passageId: string;
  doc: PassageAuthoringDocument;
  onDocChange: (doc: PassageAuthoringDocument) => void;
};

const STAGE_LABELS: Record<string, string> = {
  word_analysis: "1단계 단어 분석",
  structure_analysis: "2단계 구조 분석",
  translation: "3단계 해석",
  composition: "4단계 작문",
  sentence_function: "5단계 문장 기능",
};

export default function WorkoutReviewPanel({ passageId, doc, onDocChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string>("");
  const [overwrite, setOverwrite] = useState(false);
  const [activeTab, setActiveTab] = useState<"translation" | "structure" | "composition" | "function" | "word">("translation");

  const sentences = doc.core.sentences ?? [];
  const workout = doc.workout ?? { enabledStages: [] };

  const translationMap = new Map(
    (workout.translation ?? []).map((t) => [t.sentenceId, t]),
  );
  const structureMap = new Map(
    (workout.structureAnalysis ?? []).map((s) => [s.sentenceId, s]),
  );
  const compositionMap = new Map(
    (workout.composition ?? []).map((c) => [c.sentenceId, c]),
  );
  const functionMap = new Map(
    (workout.sentenceFunctions ?? []).map((f) => [f.sentenceId, f]),
  );
  const wordMap = new Map(
    (workout.wordAnalysis ?? []).map((w) => [w.sentenceId, w]),
  );

  const hasData =
    (workout.translation?.length ?? 0) > 0 ||
    (workout.structureAnalysis?.length ?? 0) > 0;

  function patchWorkout(key: keyof typeof workout, value: any) {
    onDocChange({
      ...doc,
      workout: { ...doc.workout, [key]: value },
    });
  }

  function handleGenerate() {
    setMsg("");
    startTransition(async () => {
      const res = await generatePassageWorkoutAction({ passageId, overwrite });
      if ("error" in res) { setMsg(`❌ ${res.error}`); return; }

      const w = doc.workout ?? { enabledStages: [] };
      const updated: PassageAuthoringDocument = {
        ...doc,
        workout: {
          ...w,
          wordAnalysis: res.generated.wordAnalysis ?? [],
          structureAnalysis: res.generated.structureAnalysis ?? [],
          translation: res.generated.translation ?? [],
          composition: res.generated.composition ?? [],
          sentenceFunctions: res.generated.sentenceFunctions ?? [],
          enabledStages: [
            "word_analysis", "structure_analysis", "translation",
            "composition", "sentence_function",
            ...(w.enabledStages ?? []).filter(
              (s) => !["word_analysis","structure_analysis","translation","composition","sentence_function"].includes(s as string)
            ),
          ],
        },
      };
      onDocChange(updated);

      const saved = await saveNaesinPassageAction(updated);
      setMsg(
        "error" in saved
          ? `❌ 저장 실패: ${saved.error}`
          : `✅ AI 초안 생성 완료 · ${res.generated.translation.length}문장 처리됨. 저장 완료.`,
      );
    });
  }

  function handleSaveOnly() {
    setMsg("");
    startTransition(async () => {
      const res = await saveNaesinPassageAction(doc);
      setMsg("error" in res ? `❌ ${res.error}` : `✅ 저장 완료`);
    });
  }

  function updateTranslationField(sentenceId: string, field: string, value: string) {
    const list = [...(workout.translation ?? [])];
    const idx = list.findIndex((t) => t.sentenceId === sentenceId);
    if (idx === -1) {
      list.push({ sentenceId, referenceKo: "", acceptableKeywords: [], chunks: [], [field]: value } as any);
    } else {
      list[idx] = { ...list[idx], [field]: value };
    }
    patchWorkout("translation", list);
  }

  function updateFunctionField(sentenceId: string, field: string, value: any) {
    const list = [...(workout.sentenceFunctions ?? [])];
    const idx = list.findIndex((f) => f.sentenceId === sentenceId);
    if (idx === -1) {
      list.push({ sentenceId, correct: value, accepted: [], [field]: value } as any);
    } else {
      list[idx] = { ...list[idx], [field]: value };
    }
    patchWorkout("sentenceFunctions", list);
  }

  function updateWordAnalysis(sentenceId: string, value: string) {
    const list = [...(workout.wordAnalysis ?? [])];
    const idx = list.findIndex((w) => w.sentenceId === sentenceId);
    const words = value.split(",").map((w) => w.trim()).filter(Boolean);
    if (idx === -1) {
      list.push({ sentenceId, recommendedUnknownWords: words });
    } else {
      list[idx] = { ...list[idx], recommendedUnknownWords: words };
    }
    patchWorkout("wordAnalysis", list);
  }

  const TABS = [
    { key: "translation", label: "3. 해석" },
    { key: "structure", label: "2. 구조 분석" },
    { key: "composition", label: "4. 작문" },
    { key: "function", label: "5. 문장 기능" },
    { key: "word", label: "1. 단어" },
  ] as const;

  return (
    <section className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
      {/* 헤더 + AI 생성 버튼 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-slate-900">워크아웃 데이터 (1~5단계)</div>
          <div className="mt-0.5 text-xs text-slate-500">
            AI가 초안을 생성합니다. 생성 후 각 탭에서 수정·저장하세요.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasData && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
              />
              덮어쓰기
            </label>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending || sentences.length === 0}
            className="rounded-2xl bg-violet-700 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-40"
          >
            {isPending ? "AI 생성 중..." : "✨ AI 초안 생성"}
          </button>
          {hasData && (
            <button
              type="button"
              onClick={handleSaveOnly}
              disabled={isPending}
              className="rounded-2xl border px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              저장
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-2 text-sm font-semibold ${msg.startsWith("✅") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {msg}
        </div>
      )}

      {sentences.length === 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          먼저 원문을 입력하고 '문단/문장 자동 분리'를 실행한 뒤 저장하세요.
        </div>
      )}

      {hasData && sentences.length > 0 && (
        <>
          {/* 탭 */}
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-extrabold transition-colors",
                  activeTab === t.key
                    ? "bg-white shadow text-slate-900"
                    : "text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {sentences.map((sentence, idx) => {
              const sid = sentence.id;
              const translation = translationMap.get(sid);
              const structure = structureMap.get(sid);
              const composition = compositionMap.get(sid);
              const func = functionMap.get(sid);
              const word = wordMap.get(sid);

              return (
                <div key={sid} className="rounded-2xl border p-4 space-y-3">
                  {/* 문장 헤더 */}
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
                      {idx + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-slate-800">{sentence.text}</span>
                  </div>

                  {/* 3. 해석 탭 */}
                  {activeTab === "translation" && (
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs font-bold text-slate-500 mb-1">한글 해석</div>
                        <textarea
                          className="w-full rounded-xl border px-3 py-2 text-sm"
                          rows={2}
                          value={translation?.referenceKo ?? ""}
                          onChange={(e) => updateTranslationField(sid, "referenceKo", e.target.value)}
                          placeholder="한글 해석"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500 mb-1">핵심 키워드 (쉼표 구분)</div>
                        <input
                          className="w-full rounded-xl border px-3 py-2 text-sm"
                          value={(translation?.acceptableKeywords ?? []).join(", ")}
                          onChange={(e) =>
                            patchWorkout(
                              "translation",
                              (workout.translation ?? []).map((t) =>
                                t.sentenceId === sid
                                  ? { ...t, acceptableKeywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) }
                                  : t,
                              ),
                            )
                          }
                          placeholder="판단, 근거, 글쓴이"
                        />
                      </div>
                      {translation?.chunks && translation.chunks.length > 0 && (
                        <div>
                          <div className="text-xs font-bold text-slate-500 mb-1">청크 분석</div>
                          <div className="space-y-1">
                            {translation.chunks.map((chunk, ci) => (
                              <div key={chunk.id} className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                                <span className="text-slate-600 font-mono">{chunk.sourceSpan}</span>
                                <span className="text-slate-800">{chunk.hintKo}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. 구조 분석 탭 */}
                  {activeTab === "structure" && structure && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { key: "subjectAccepted", label: "S (주어)" },
                        { key: "verbAccepted", label: "V (동사)" },
                        { key: "objectAccepted", label: "O (목적어)" },
                        { key: "complementAccepted", label: "C (보어)" },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <div className="font-bold text-slate-500 mb-0.5">{label}</div>
                          <input
                            className="w-full rounded-lg border px-2 py-1 text-xs"
                            value={((structure as any)[key] ?? []).join(" / ")}
                            onChange={(e) =>
                              patchWorkout(
                                "structureAnalysis",
                                (workout.structureAnalysis ?? []).map((s) =>
                                  s.sentenceId === sid
                                    ? { ...s, [key]: e.target.value.split("/").map((v) => v.trim()).filter(Boolean) }
                                    : s,
                                ),
                              )
                            }
                            placeholder="허용 표현 / 변형"
                          />
                        </div>
                      ))}
                      {structure.modifiers && structure.modifiers.length > 0 && (
                        <div className="col-span-2">
                          <div className="font-bold text-slate-500 mb-1">M (수식어)</div>
                          {structure.modifiers.map((m, mi) => (
                            <div key={mi} className="rounded-lg bg-slate-50 px-2 py-1 mb-1 text-xs text-slate-700">
                              <span className="font-mono">{m.span}</span>
                              <span className="mx-1 text-slate-400">→</span>
                              <span>{m.type}</span>
                              {m.target && <span className="ml-1 text-slate-400">({m.target} 수식)</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. 작문 탭 */}
                  {activeTab === "composition" && (
                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="font-bold text-slate-500 mb-1">청크 (한→영 작문용, 영어 어순)</div>
                        <div className="space-y-1">
                          {(composition?.chunks ?? []).map((chunk, ci) => (
                            <div key={chunk.id ?? ci} className="flex items-center gap-2">
                              <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 font-medium">
                                {chunk.ko}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-medium font-mono">
                                {chunk.en}
                              </span>
                            </div>
                          ))}
                          {!composition?.chunks?.length && (
                            <span className="text-slate-400">AI 생성 후 표시됩니다</span>
                          )}
                        </div>
                      </div>
                      {composition?.targetSkeleton && (
                        <div>
                          <div className="font-bold text-slate-500 mb-1">스켈레톤 힌트</div>
                          <div className="font-mono text-slate-700 bg-slate-50 rounded-lg px-3 py-1.5">
                            {composition.targetSkeleton}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. 문장 기능 탭 */}
                  {activeTab === "function" && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="rounded-xl border px-3 py-1.5 text-sm"
                          value={func?.correct ?? ""}
                          onChange={(e) => updateFunctionField(sid, "correct", e.target.value)}
                        >
                          <option value="">선택</option>
                          {SENTENCE_FUNCTION_TYPES.map((t) => (
                            <option key={t} value={t}>{SENTENCE_FUNCTION_LABEL[t]}</option>
                          ))}
                        </select>
                        {func?.correct && (
                          <span className="text-xs text-slate-500">{func.clue}</span>
                        )}
                      </div>
                      {func?.explanation && (
                        <div className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                          {func.explanation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 1. 단어 분석 탭 */}
                  {activeTab === "word" && (
                    <div>
                      <div className="text-xs font-bold text-slate-500 mb-1">
                        추천 미지 단어 (쉼표 구분)
                      </div>
                      <input
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        value={(word?.recommendedUnknownWords ?? []).join(", ")}
                        onChange={(e) => updateWordAnalysis(sid, e.target.value)}
                        placeholder="acquire, premise, infer"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSaveOnly}
            disabled={isPending}
            className="w-full rounded-2xl bg-emerald-700 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
          >
            수정 내용 저장
          </button>
        </>
      )}
    </section>
  );
}
