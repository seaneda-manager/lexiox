"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  rebuildNaesinSessionAnalysisAction,
  saveNaesinReviewEvidenceLogAction,
  saveNaesinReviewSentenceAnalysisLogAction,
  saveNaesinReviewUnknownWordsLogAction,
  saveNaesinReviewVocabLogAction,
} from "@/actions/naesinReadingReview";
import type { UILabelCatalogMap } from "@/models/platform/labels";
import { resolveLabel } from "@/lib/labels/resolveLabel";

export type NaesinReviewQuestion = {
  id: string;
  passageId: string;
  numberLabel: string;
  type: string;
  stem: string;
  isCorrect: boolean;
  selectedChoiceTexts: string[];
  correctChoiceTexts: string[];
  explanation?: string;
  officialEvidence: string[];
};

export type NaesinReviewPassage = {
  id: string;
  title: string;
  text: string;
  questions: NaesinReviewQuestion[];
};

export type NaesinReviewData = {
  sessionId: string;
  setId: string;
  setTitle: string;
  scoreRaw?: number | null;
  scorePercent?: number | null;
  submittedAt?: string | null;
  analyticsSnapshot?: Record<string, unknown> | null;
  labelCatalog?: UILabelCatalogMap | null;
  passages: NaesinReviewPassage[];
};

export type SentenceAnalysisState = {
  translation?: string;
  subject?: string;
  verb?: string;
  object?: string;
  complement?: string;
  modifier?: string;
};

export type NaesinReviewInitialState = {
  evidenceByQuestion: Record<string, string[]>;
  unknownWordsByPassage: Record<string, string[]>;
  analysisByQuestion: Record<string, SentenceAnalysisState>;
  vocabByKey: Record<
    string,
    { userAnswer?: string; isCorrect: boolean; attemptNo: number }
  >;
};

type Props = {
  data: NaesinReviewData;
  initialState?: NaesinReviewInitialState;
};

type TabKey = "summary" | "evidence" | "words" | "analysis" | "vocab";

type AccuracyBucketRow = {
  key: string;
  total: number;
  correct: number;
  accuracy: number;
  unknownWordCount?: number;
};

export default function NaesinReviewClient({ data, initialState }: Props) {
  const [tab, setTab] = useState<TabKey>("summary");
  const [busyKey, setBusyKey] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const catalogMap = data.labelCatalog ?? null;
  const metricLabel = (key: string, fallback: string) =>
  resolveLabel({ domain: "analytics_metric", key, catalogMap }).labelKo || fallback;
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState<
    Record<string, unknown> | null
  >(data.analyticsSnapshot ?? null);

  useEffect(() => {
    setAnalyticsSnapshot(data.analyticsSnapshot ?? null);
  }, [data.analyticsSnapshot]);

  const allQuestions = useMemo(
    () =>
      data.passages.flatMap((passage) =>
        passage.questions.map((question) => ({
          ...question,
          passageTitle: passage.title,
          passageText: passage.text,
        })),
      ),
    [data.passages],
  );

  const [activeQuestionId, setActiveQuestionId] = useState<string>(
    allQuestions[0]?.id ?? "",
  );

  const activeQuestion =
    allQuestions.find((question) => question.id === activeQuestionId) ??
    allQuestions[0];

  const activePassage =
    data.passages.find((passage) => passage.id === activeQuestion?.passageId) ??
    data.passages[0];

  const [unknownWordsByPassage, setUnknownWordsByPassage] = useState<
    Record<string, string[]>
  >(initialState?.unknownWordsByPassage ?? {});

  const [pickedEvidenceByQuestion, setPickedEvidenceByQuestion] = useState<
    Record<string, string[]>
  >(initialState?.evidenceByQuestion ?? {});

  const [analysisByQuestion, setAnalysisByQuestion] = useState<
    Record<string, SentenceAnalysisState>
  >(initialState?.analysisByQuestion ?? {});

  const [savedVocabByKey, setSavedVocabByKey] = useState<
    Record<
      string,
      { userAnswer?: string; isCorrect: boolean; attemptNo: number }
    >
  >(initialState?.vocabByKey ?? {});

  const activePassageSentences = useMemo(
    () => splitIntoSentences(activePassage?.text ?? ""),
    [activePassage?.text],
  );

  const activePassageWords = useMemo(
    () => extractUniqueWords(activePassage?.text ?? ""),
    [activePassage?.text],
  );

  const pickedEvidence =
    pickedEvidenceByQuestion[activeQuestion?.id ?? ""] ?? [];
  const unknownWords = unknownWordsByPassage[activePassage?.id ?? ""] ?? [];

  const vocabItems = useMemo(() => {
    return data.passages.flatMap((passage) => {
      const selectedWords = unknownWordsByPassage[passage.id] ?? [];
      return selectedWords.map((word) => {
        const sentence = findSentenceForWord(passage.text, word);
        return {
          passageId: passage.id,
          word,
          sentence,
          cloze: sentence
            ? sentence.replace(
                new RegExp(`\\b${escapeRegExp(word)}\\b`, "i"),
                "_____",
              )
            : "_____",
        };
      });
    });
  }, [data.passages, unknownWordsByPassage]);

  const [vocabIndex, setVocabIndex] = useState(0);
  const [vocabInput, setVocabInput] = useState("");
  const [vocabResult, setVocabResult] = useState<"idle" | "correct" | "wrong">(
    "idle",
  );

  const activeVocab = vocabItems[vocabIndex];
  const activeVocabKey = activeVocab
    ? makeVocabKey(activeVocab.passageId, activeVocab.word)
    : "";

  useEffect(() => {
    if (!activeVocabKey) {
      setVocabInput("");
      setVocabResult("idle");
      return;
    }
    const saved = savedVocabByKey[activeVocabKey];
    if (saved) {
      setVocabInput(saved.userAnswer ?? "");
      setVocabResult(saved.isCorrect ? "correct" : "wrong");
      return;
    }
    setVocabInput("");
    setVocabResult("idle");
  }, [activeVocabKey, savedVocabByKey]);

  const activeAnalysis = analysisByQuestion[activeQuestion?.id ?? ""] ?? {};
  const officialEvidence = activeQuestion?.officialEvidence ?? [];

  const evidenceMatched =
    officialEvidence.length > 0 &&
    pickedEvidence.some((picked) =>
      officialEvidence.some((official) => evidenceMatches(official, picked)),
    );

  const savedEvidenceMatchCount = allQuestions.filter((question) => {
    const picked = pickedEvidenceByQuestion[question.id] ?? [];
    return picked.some((pickedSentence) =>
      question.officialEvidence.some((official) =>
        evidenceMatches(official, pickedSentence),
      ),
    );
  }).length;

  const wrongCount = allQuestions.filter((q) => !q.isCorrect).length;
  const selectedUnknownWordCount = countSelectedWords(unknownWordsByPassage);

  const analytics = asRecord(analyticsSnapshot);
  const weakTags =
    getStringArrayField(analytics, "weakTags") ??
    getStringArrayField(analytics, "weak_tags") ??
    [];
  const prescriptions = getStringArrayField(analytics, "prescriptions") ?? [];

  const evidenceMetrics = getRecordField(analytics, "evidenceMetrics");
  const vocabMetrics = getRecordField(analytics, "vocabMetrics");
  const sentenceMetrics = getRecordField(analytics, "sentenceMetrics");
  const behaviorMetrics = getRecordField(analytics, "behaviorMetrics");

  const byQuestionType = getRecordField(analytics, "byQuestionType");
  const byPassage = getRecordField(analytics, "byPassage");

  const tendency5 = getRecordField(analytics, "tendency5");
  const tendency10 = getRecordField(analytics, "tendency10");

  const tendency5WeakTags =
    getStringArrayField(tendency5, "weak_tags") ??
    getStringArrayField(tendency5, "weakTags") ??
    [];
  const tendency10WeakTags =
    getStringArrayField(tendency10, "weak_tags") ??
    getStringArrayField(tendency10, "weakTags") ??
    [];

  const tendency5Patterns =
    getRecordField(tendency5, "top_patterns") ??
    getRecordField(tendency5, "topPatterns");
  const tendency10Patterns =
    getRecordField(tendency10, "top_patterns") ??
    getRecordField(tendency10, "topPatterns");

  const typeRows = useMemo(() => bucketRecordToRows(byQuestionType), [byQuestionType]);
  const passageRows = useMemo(() => bucketRecordToRows(byPassage), [byPassage]);

  function toggleUnknownWord(word: string) {
    if (!activePassage) return;
    setUnknownWordsByPassage((prev) => {
      const current = prev[activePassage.id] ?? [];
      const exists = current.includes(word);
      return {
        ...prev,
        [activePassage.id]: exists
          ? current.filter((item) => item !== word)
          : [...current, word],
      };
    });
  }

  function toggleEvidence(sentence: string) {
    if (!activeQuestion) return;
    setPickedEvidenceByQuestion((prev) => {
      const current = prev[activeQuestion.id] ?? [];
      const exists = current.includes(sentence);
      return {
        ...prev,
        [activeQuestion.id]: exists
          ? current.filter((item) => item !== sentence)
          : [...current, sentence],
      };
    });
  }

  function updateAnalysisField(
    field: keyof SentenceAnalysisState,
    value: string,
  ) {
    if (!activeQuestion) return;
    setAnalysisByQuestion((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        ...(prev[activeQuestion.id] ?? {}),
        [field]: value,
      },
    }));
  }

  async function handleSaveEvidence() {
    if (!activeQuestion || !activePassage) return;
    setBusyKey("evidence");
    setStatusMessage("");

    const result = await saveNaesinReviewEvidenceLogAction({
      sessionId: data.sessionId,
      questionId: activeQuestion.id,
      passageId: activePassage.id,
      selectedEvidence: pickedEvidence,
    });

    if (result.ok === false) {
      setStatusMessage(result.error);
      setBusyKey("");
      return;
    }

    await rebuildAnalysis("Evidence saved");
  }

  async function handleSaveUnknownWords() {
    if (!activePassage) return;
    setBusyKey("words");
    setStatusMessage("");

    const result = await saveNaesinReviewUnknownWordsLogAction({
      sessionId: data.sessionId,
      passageId: activePassage.id,
      words: unknownWords,
    });

    if (result.ok === false) {
      setStatusMessage(result.error);
      setBusyKey("");
      return;
    }

    await rebuildAnalysis("Unknown words saved");
  }

  async function handleSaveAnalysis() {
    if (!activeQuestion || !activePassage) return;

    const targetSentence =
      activeQuestion.officialEvidence[0] ??
      pickDifficultSentence(activePassage.text) ??
      "";

    if (!targetSentence) {
      setStatusMessage("No target sentence found.");
      return;
    }

    const analysis = analysisByQuestion[activeQuestion.id] ?? {};

    setBusyKey("analysis");
    setStatusMessage("");

    const result = await saveNaesinReviewSentenceAnalysisLogAction({
      sessionId: data.sessionId,
      questionId: activeQuestion.id,
      passageId: activePassage.id,
      targetSentence,
      translationKo: analysis.translation,
      subjectText: analysis.subject,
      verbText: analysis.verb,
      objectText: analysis.object,
      complementText: analysis.complement,
      modifierText: analysis.modifier,
    });

    if (result.ok === false) {
      setStatusMessage(result.error);
      setBusyKey("");
      return;
    }

    await rebuildAnalysis("Sentence analysis saved");
  }

  async function checkVocab() {
    if (!activeVocab) return;

    const isCorrect =
      normalizeWord(vocabInput) === normalizeWord(activeVocab.word);

    setVocabResult(isCorrect ? "correct" : "wrong");

    const key = makeVocabKey(activeVocab.passageId, activeVocab.word);
    const nextAttemptNo = (savedVocabByKey[key]?.attemptNo ?? 0) + 1;

    setBusyKey("vocab");
    setStatusMessage("");

    const result = await saveNaesinReviewVocabLogAction({
      sessionId: data.sessionId,
      passageId: activeVocab.passageId,
      word: activeVocab.word,
      promptSentence: activeVocab.sentence,
      clozeText: activeVocab.cloze,
      userAnswer: vocabInput,
      isCorrect,
      attemptNo: nextAttemptNo,
    });

    if (result.ok === false) {
      setStatusMessage(result.error);
      setBusyKey("");
      return;
    }

    setSavedVocabByKey((prev) => ({
      ...prev,
      [key]: { userAnswer: vocabInput, isCorrect, attemptNo: nextAttemptNo },
    }));

    await rebuildAnalysis(isCorrect ? "Vocab correct" : "Vocab logged");
  }

  async function handleRebuildOnly() {
    setBusyKey("rebuild");
    setStatusMessage("");
    await rebuildAnalysis("Analysis rebuilt");
  }

  async function rebuildAnalysis(prefix: string) {
    const analysis = await rebuildNaesinSessionAnalysisAction(data.sessionId);

    if (analysis.ok === false) {
      setStatusMessage(`${prefix}. Analysis rebuild failed: ${analysis.error}`);
      setBusyKey("");
      return;
    }

    setAnalyticsSnapshot((prev) => ({
      ...(prev ?? {}),
      weakTags: analysis.weakTags,
      prescriptions: analysis.prescriptions,
    }));

    setStatusMessage(
      analysis.weakTags.length > 0
        ? `${prefix}. Weak tags: ${analysis.weakTags.join(", ")}`
        : `${prefix}. No weak tags detected.`,
    );
    setBusyKey("");
  }

  function goNextVocab() {
    setVocabIndex((prev) =>
      Math.min(prev + 1, Math.max(0, vocabItems.length - 1)),
    );
  }

  function goPrevVocab() {
    setVocabIndex((prev) => Math.max(prev - 1, 0));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Lingo-X Naesin Review
            </div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              {data.setTitle}
            </h1>
            <div className="mt-1 text-sm text-neutral-500">
              sessionId: {data.sessionId}
            </div>
          </div>

          <div className="grid min-w-[260px] grid-cols-3 gap-3">
            <SummaryCard
              label="Score"
              value={
                typeof data.scorePercent === "number"
                  ? `${data.scorePercent}%`
                  : "-"
              }
            />
            <SummaryCard
              label="Raw"
              value={
                typeof data.scoreRaw === "number" ? String(data.scoreRaw) : "-"
              }
            />
            <SummaryCard label="Submitted" value={fmtDate(data.submittedAt)} />
          </div>
        </div>

        {statusMessage ? (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {statusMessage}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton tab={tab} value="summary" onClick={setTab}>
  {resolveLabel({ domain: "review_tab", key: "summary", catalogMap }).labelKo}
</TabButton>
<TabButton tab={tab} value="evidence" onClick={setTab}>
  {resolveLabel({ domain: "review_tab", key: "evidence", catalogMap }).labelKo}
</TabButton>
<TabButton tab={tab} value="words" onClick={setTab}>
  {resolveLabel({ domain: "review_tab", key: "words", catalogMap }).labelKo}
</TabButton>
<TabButton tab={tab} value="analysis" onClick={setTab}>
  {resolveLabel({ domain: "review_tab", key: "analysis", catalogMap }).labelKo}
</TabButton>
<TabButton tab={tab} value="vocab" onClick={setTab}>
  {resolveLabel({ domain: "review_tab", key: "vocab", catalogMap }).labelKo}
</TabButton>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-2xl border bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-neutral-900">
            Questions
          </div>

          <div className="space-y-2">
            {allQuestions.map((question) => (
              <button
                key={question.id}
                type="button"
                onClick={() => setActiveQuestionId(question.id)}
                className={[
                  "w-full rounded-xl border px-3 py-3 text-left text-sm",
                  activeQuestion?.id === question.id
                    ? "border-black bg-black text-white"
                    : "hover:bg-neutral-50",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span>
                    {question.numberLabel}. {question.type}
                  </span>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs",
                      question.isCorrect
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-red-500/15 text-red-700",
                    ].join(" ")}
                  >
                    {question.isCorrect ? "Correct" : "Wrong"}
                  </span>
                </div>

                <div className="mt-1 line-clamp-2 text-xs opacity-80">
                  {question.stem}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-4">
          {tab === "summary" && (
            <div className="space-y-4">
              <Panel
                title="Overall"
                right={
                  <button
                    type="button"
                    onClick={handleRebuildOnly}
                    disabled={busyKey === "rebuild"}
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {busyKey === "rebuild" ? "Rebuilding..." : "Rebuild Snapshot"}
                  </button>
                }
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoRow label="세트" value={data.setTitle} />
                  <InfoRow label="세션" value={data.sessionId} />
                  <InfoRow label="점수" value={typeof data.scorePercent === "number" ? `${data.scorePercent}%` : "-"} />
                  <InfoRow label="원점수" value={typeof data.scoreRaw === "number" ? String(data.scoreRaw) : "-"} />
                  <InfoRow
                    label={metricLabel("accuracyOverall", "전체 정답률")}
                    value={fmtPct(getNumberField(analytics, "accuracyOverall"))}
                  />
                  <InfoRow
                  label={metricLabel("reviewCompletionRate", "리뷰 완료율")}
                  value={fmtPct(getNumberField(behaviorMetrics, "reviewCompletionRate"))}
                  />
                </div>
              </Panel>

              <Panel title="Weak Tags / Prescriptions">
                {weakTags.length > 0 || prescriptions.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Weak Tags
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {weakTags.length > 0 ? (
                        weakTags.map((tag) => (
                        <TagChip key={tag}>
                        {resolveLabel({ domain: "weak_tag", key: tag, catalogMap }).labelKo}
                        </TagChip>
                        ))
                        ) : (
                        <EmptyText>약점 태그 없음</EmptyText>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Prescriptions
                      </div>
                      <div className="space-y-2">
                        {prescriptions.length > 0 ? (
                          prescriptions.map((item, index) => (
                            <div
                              key={`${item}-${index}`}
                              className="rounded-xl border bg-neutral-50 px-3 py-2 text-sm text-neutral-800"
                            >
                              {item}
                            </div>
                          ))
                        ) : (
                          <EmptyText>No prescriptions</EmptyText>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyText>
                    아직 analytics snapshot이 없거나, rebuild 전 상태다.
                  </EmptyText>
                )}
              </Panel>

              <Panel title="Analytics Snapshot">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <InfoRow
                    label={metricLabel("wrongQuestionCount", "오답 수")}
                    value={String(wrongCount)}
                />
                  <InfoRow
                    label={metricLabel("selectedUnknownWordCount", "선택한 모르는 단어 수")}
                    value={String(selectedUnknownWordCount)}
                />
                  <InfoRow
                    label={metricLabel("savedEvidenceMatchCount", "근거 일치 수")}
                    value={String(savedEvidenceMatchCount)}
                />

                  <InfoRow
                    label={metricLabel("submissionRate", "근거 제출률")}
                    value={fmtPct(getNumberField(evidenceMetrics, "submissionRate"))}
                />
                  <InfoRow
                    label={metricLabel("matchedRateAmongSubmitted", "제출 기준 근거 일치율")}
                    value={fmtPct(getNumberField(evidenceMetrics, "matchedRateAmongSubmitted"))}
                  />
                  <InfoRow
                    label={metricLabel("overSelectCount", "과다 선택 수")}
                    value={fmtNum(getNumberField(evidenceMetrics, "overSelectCount"))}
                  />
                  
                  <InfoRow
                    label={metricLabel("unknownWordCount", "모르는 단어 수")}
                    value={fmtNum(getNumberField(vocabMetrics, "unknownWordCount"))}
                  />
                  <InfoRow
                    label={metricLabel("vocabAttemptCount", "어휘 시도 수")}
                    value={fmtNum(getNumberField(vocabMetrics, "vocabAttemptCount"))}
                  />
                  <InfoRow
                    label={metricLabel("vocabTestAccuracy", "어휘 정확도")}
                    value={fmtPct(getNumberField(vocabMetrics, "vocabTestAccuracy"))}
                  />

                  <InfoRow
                    label={metricLabel("sentenceLogCoverageRate", "문장 분석 기록률")}
                    value={fmtPct(getNumberField(sentenceMetrics, "sentenceLogCoverageRate"))}
                  />
                  <InfoRow
                    label={metricLabel("svocCompletionRateAmongLogged", "기록 기준 SVOC 완성률")}
                    value={fmtPct(getNumberField(sentenceMetrics, "svocCompletionRateAmongLogged"))}
                  />
                  <InfoRow
                    label={metricLabel("modifierCompletionRateAmongLogged", "기록 기준 수식어 분석률")}
                    value={fmtPct(getNumberField(sentenceMetrics, "modifierCompletionRateAmongLogged"))}
                  />


                  <InfoRow
                    label={metricLabel("avgElapsedSec", "평균 소요 시간(초)")}
                    value={fmtNum(getNumberField(behaviorMetrics, "avgElapsedSec"))}
                    />
                  <InfoRow
                    label={metricLabel("flaggedCount", "표시한 문항 수")}
                    value={fmtNum(getNumberField(behaviorMetrics, "flaggedCount"))}
                    />
                  <InfoRow
                    label={metricLabel("omittedCount", "미응답 수")}
                    value={fmtNum(getNumberField(behaviorMetrics, "omittedCount"))}
                    />
                </div>
              </Panel>

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Recent Tendency · Last 5">
                  {tendency5 ? (
                    <TendencyBlock
                    weakTags={tendency5WeakTags}
                    patterns={tendency5Patterns}
                    catalogMap={catalogMap}
                    />

                  ) : (
                    <EmptyText>No tendency snapshot (5)</EmptyText>
                  )}
                </Panel>

                <Panel title="Recent Tendency · Last 10">
                  {tendency10 ? (
                    <TendencyBlock
                    weakTags={tendency10WeakTags}
                    patterns={tendency10Patterns}
                    catalogMap={catalogMap}
                  />
                  ) : (
                    <EmptyText>No tendency snapshot (10)</EmptyText>
                  )}
                </Panel>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Panel title="Question Type Performance">
                  {typeRows.length > 0 ? (
                    <BucketTable rows={typeRows} />
                  ) : (
                    <EmptyText>No type snapshot</EmptyText>
                  )}
                </Panel>

                <Panel title="Passage Performance">
                  {passageRows.length > 0 ? (
                    <BucketTable rows={passageRows} />
                  ) : (
                    <EmptyText>No passage snapshot</EmptyText>
                  )}
                </Panel>
              </div>

              <Panel title="Question Snapshot">
                {activeQuestion ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs font-semibold text-neutral-500">
                        Question
                      </div>
                      <div className="mt-1">{activeQuestion.stem}</div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-neutral-500">
                        Your Answer
                      </div>
                      <div className="mt-1">
                        {activeQuestion.selectedChoiceTexts.join(", ") || "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-neutral-500">
                        Correct Answer
                      </div>
                      <div className="mt-1">
                        {activeQuestion.correctChoiceTexts.join(", ") || "-"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyText>No question loaded.</EmptyText>
                )}
              </Panel>
            </div>
          )}

          {tab === "evidence" && activeQuestion && activePassage && (
            <div className="space-y-4">
              <Panel title="Question / Official Evidence">
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">
                      Question
                    </div>
                    <div className="mt-1">{activeQuestion.stem}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-neutral-500">
                      Official Evidence
                    </div>

                    <div className="mt-2 space-y-2">
                      {officialEvidence.length > 0 ? (
                        officialEvidence.map((sentence, index) => (
                          <div
                            key={`${sentence}_${index}`}
                            className="rounded-lg border bg-emerald-50 px-3 py-2"
                          >
                            {sentence}
                          </div>
                        ))
                      ) : (
                        <EmptyText>No official evidence stored yet.</EmptyText>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Pick the Evidence"
                right={
                  <div
                    className={[
                      "rounded-full px-2 py-1 text-xs",
                      evidenceMatched
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-amber-500/15 text-amber-700",
                    ].join(" ")}
                  >
                    {evidenceMatched ? "Matched" : "Not matched yet"}
                  </div>
                }
              >
                <div className="space-y-2">
                  {activePassageSentences.map((sentence, index) => {
                    const selected = pickedEvidence.includes(sentence);
                    const official = officialEvidence.some((item) =>
                      evidenceMatches(item, sentence),
                    );

                    return (
                      <button
                        key={`${index}_${sentence.slice(0, 18)}`}
                        type="button"
                        onClick={() => toggleEvidence(sentence)}
                        className={[
                          "block w-full rounded-xl border px-3 py-3 text-left text-sm",
                          selected ? "border-black bg-black text-white" : "",
                          official && !selected
                            ? "border-emerald-300 bg-emerald-50"
                            : "",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{sentence}</span>
                          {official ? (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700">
                              official
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveEvidence}
                    disabled={busyKey === "evidence"}
                    className="rounded-xl border px-4 py-2 disabled:opacity-50"
                  >
                    {busyKey === "evidence" ? "Saving..." : "Save Evidence"}
                  </button>
                </div>
              </Panel>
            </div>
          )}

          {tab === "words" && activePassage && (
            <div className="space-y-4">
              <Panel title="Highlight Unknown Words">
                <div className="mb-3 text-sm text-neutral-600">
                  Passage: <b>{activePassage.title || "Untitled Passage"}</b>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {unknownWords.length > 0 ? (
                    unknownWords.map((word) => (
                      <span
                        key={word}
                        className="rounded-full border bg-amber-50 px-3 py-1 text-sm"
                      >
                        {word}
                      </span>
                    ))
                  ) : (
                    <EmptyText>No unknown words selected yet.</EmptyText>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {activePassageWords.map((word) => {
                    const selected = unknownWords.includes(word);

                    return (
                      <button
                        key={word}
                        type="button"
                        onClick={() => toggleUnknownWord(word)}
                        className={[
                          "rounded-full border px-3 py-1 text-sm",
                          selected
                            ? "border-amber-400 bg-amber-400/20"
                            : "hover:bg-neutral-50",
                        ].join(" ")}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveUnknownWords}
                    disabled={busyKey === "words"}
                    className="rounded-xl border px-4 py-2 disabled:opacity-50"
                  >
                    {busyKey === "words" ? "Saving..." : "Save Unknown Words"}
                  </button>
                </div>
              </Panel>
            </div>
          )}

          {tab === "analysis" && activeQuestion && activePassage && (
            <div className="space-y-4">
              <Panel title="Evidence / Difficult Sentence">
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">
                      Target Sentence
                    </div>
                    <div className="mt-1 rounded-lg border bg-neutral-50 px-3 py-2">
                      {officialEvidence[0] ??
                        pickDifficultSentence(activePassage.text) ??
                        "No target sentence found."}
                    </div>
                  </div>

                  {activeQuestion.explanation ? (
                    <div>
                      <div className="text-xs font-semibold text-neutral-500">
                        Explanation
                      </div>
                      <div className="mt-1 rounded-lg border bg-neutral-50 px-3 py-2">
                        {activeQuestion.explanation}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Panel>

              <Panel title="Translation / S-V-O-C Analysis">
                <div className="grid gap-4">
                  <FieldBlock
                    label="Translation"
                    value={activeAnalysis.translation ?? ""}
                    onChange={(value) => updateAnalysisField("translation", value)}
                    textarea
                  />

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <FieldBlock
                      label="S"
                      value={activeAnalysis.subject ?? ""}
                      onChange={(value) => updateAnalysisField("subject", value)}
                    />
                    <FieldBlock
                      label="V"
                      value={activeAnalysis.verb ?? ""}
                      onChange={(value) => updateAnalysisField("verb", value)}
                    />
                    <FieldBlock
                      label="O"
                      value={activeAnalysis.object ?? ""}
                      onChange={(value) => updateAnalysisField("object", value)}
                    />
                    <FieldBlock
                      label="C"
                      value={activeAnalysis.complement ?? ""}
                      onChange={(value) => updateAnalysisField("complement", value)}
                    />
                    <FieldBlock
                      label="M / Modifier"
                      value={activeAnalysis.modifier ?? ""}
                      onChange={(value) => updateAnalysisField("modifier", value)}
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAnalysis}
                    disabled={busyKey === "analysis"}
                    className="rounded-xl border px-4 py-2 disabled:opacity-50"
                  >
                    {busyKey === "analysis" ? "Saving..." : "Save Analysis"}
                  </button>
                </div>
              </Panel>
            </div>
          )}

          {tab === "vocab" && (
            <div className="space-y-4">
              <Panel title="Vocab Testing">
                {activeVocab ? (
                  <div className="space-y-4">
                    <div className="text-sm text-neutral-600">
                      {vocabIndex + 1} / {vocabItems.length}
                    </div>

                    <div className="rounded-xl border bg-neutral-50 px-4 py-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Fill the blank
                      </div>
                      <div className="mt-2 text-lg font-medium text-neutral-900">
                        {activeVocab.cloze}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={vocabInput}
                        onChange={(e) => setVocabInput(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2 outline-none"
                        placeholder="Type the missing word"
                      />
                      <button
                        type="button"
                        onClick={checkVocab}
                        disabled={busyKey === "vocab"}
                        className="rounded-xl border px-4 py-2 hover:bg-neutral-50 disabled:opacity-50"
                      >
                        {busyKey === "vocab" ? "Saving..." : "Check"}
                      </button>
                    </div>

                    {vocabResult !== "idle" && (
                      <div
                        className={[
                          "rounded-lg px-3 py-2 text-sm",
                          vocabResult === "correct"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-red-200 bg-red-50 text-red-700",
                        ].join(" ")}
                      >
                        {vocabResult === "correct"
                          ? "Correct"
                          : `Wrong. Answer: ${activeVocab.word}`}
                      </div>
                    )}

                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={goPrevVocab}
                        disabled={vocabIndex <= 0}
                        className="rounded-xl border px-4 py-2 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={goNextVocab}
                        disabled={vocabIndex >= vocabItems.length - 1}
                        className="rounded-xl border px-4 py-2 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : (
                  <EmptyText>
                    먼저 Unknown Words 탭에서 모르는 단어를 선택해.
                  </EmptyText>
                )}
              </Panel>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-neutral-50 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-neutral-50 px-3 py-2 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-neutral-900">{value}</div>
    </div>
  );
}

function TabButton({
  tab,
  value,
  onClick,
  children,
}: {
  tab: TabKey;
  value: TabKey;
  onClick: (value: TabKey) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={[
        "rounded-full border px-4 py-2 text-sm",
        tab === value
          ? "border-black bg-black text-white"
          : "hover:bg-neutral-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Panel({
  title,
  children,
  right,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function FieldBlock({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[110px] w-full rounded-xl border px-3 py-2 outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 outline-none"
        />
      )}
    </div>
  );
}

function TagChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border bg-neutral-50 px-3 py-1 text-sm text-neutral-800">
      {children}
    </span>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <div className="text-sm text-neutral-500">{children}</div>;
}

function TendencyBlock({
  weakTags,
  patterns,
  catalogMap,
}: {
  weakTags: string[];
  patterns: Record<string, unknown> | null;
  catalogMap?: UILabelCatalogMap | null;
}) {
  const metricLabel = (key: string, fallback: string) =>
    resolveLabel({ domain: "analytics_metric", key, catalogMap }).labelKo || fallback;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Frequent Weak Tags
        </div>
        <div className="flex flex-wrap gap-2">
          {weakTags.length > 0 ? (
            weakTags.map((tag) => (
              <TagChip key={tag}>
                {resolveLabel({ domain: "weak_tag", key: tag, catalogMap }).labelKo}
              </TagChip>
            ))
          ) : (
            <EmptyText>반복 약점 없음</EmptyText>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <InfoRow
          label={metricLabel("sessionCount", "세션 수")}
          value={fmtNum(getNumberField(patterns, "sessionCount"))}
        />
        <InfoRow
          label={metricLabel("avgAccuracyOverall", "평균 전체 정답률")}
          value={fmtPct(getNumberField(patterns, "avgAccuracyOverall"))}
        />
        <InfoRow
          label={metricLabel("avgScorePercent", "평균 점수")}
          value={fmtPct(getNumberField(patterns, "avgScorePercent"))}
        />
        <InfoRow
          label={metricLabel("avgEvidenceMatchedRateAmongSubmitted", "평균 근거 일치율")}
          value={fmtPct(getNumberField(patterns, "avgEvidenceMatchedRateAmongSubmitted"))}
        />
        <InfoRow
          label={metricLabel("avgUnknownWordCount", "평균 모르는 단어 수")}
          value={fmtNum(getNumberField(patterns, "avgUnknownWordCount"))}
        />
        <InfoRow
          label={metricLabel("avgSvocCompletionRateAmongLogged", "평균 SVOC 완성률")}
          value={fmtPct(getNumberField(patterns, "avgSvocCompletionRateAmongLogged"))}
        />
        <InfoRow
          label={metricLabel("avgReviewCompletionRate", "평균 리뷰 완료율")}
          value={fmtPct(getNumberField(patterns, "avgReviewCompletionRate"))}
        />
        <InfoRow
          label={metricLabel("avgSentenceLogCoverageRate", "평균 문장 분석 기록률")}
          value={fmtPct(getNumberField(patterns, "avgSentenceLogCoverageRate"))}
        />
      </div>
    </div>
  );
}

function BucketTable({ rows }: { rows: AccuracyBucketRow[] }) {
  const sorted = [...rows].sort((a, b) => a.accuracy - b.accuracy).slice(0, 8);

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50 text-left">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>항목</th>
            <th>문항 수</th>
            <th>정답 수</th>
            <th>정답률</th>
            <th>모르는 단어 수</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.key} className="border-t [&>td]:px-3 [&>td]:py-2">
              <td className="font-medium">{row.key}</td>
              <td>{fmtNum(row.total)}</td>
              <td>{fmtNum(row.correct)}</td>
              <td>{fmtPct(row.accuracy)}</td>
              <td>
                {row.unknownWordCount == null ? "-" : fmtNum(row.unknownWordCount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function splitIntoSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractUniqueWords(text: string): string[] {
  const matches = text.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  const map = new Map<string, string>();

  for (const word of matches) {
    const normalized = normalizeWord(word);
    if (!map.has(normalized)) {
      map.set(normalized, word);
    }
  }

  return [...map.values()];
}

function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

function normalizeSentence(sentence: string): string {
  return sentence.replace(/\s+/g, " ").trim().toLowerCase();
}

function evidenceMatches(official: string, picked: string): boolean {
  const a = normalizeSentence(official);
  const b = normalizeSentence(picked);
  return a === b || a.includes(b) || b.includes(a);
}

function countSelectedWords(map: Record<string, string[]>) {
  return Object.values(map).reduce((sum, list) => sum + list.length, 0);
}

function findSentenceForWord(text: string, word: string): string | undefined {
  const sentences = splitIntoSentences(text);
  return sentences.find((sentence) =>
    new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(sentence),
  );
}

function pickDifficultSentence(text: string): string | undefined {
  const sentences = splitIntoSentences(text);
  return (
    sentences.find((sentence) => sentence.length >= 90) ??
    sentences.find((sentence) => /,|;|:/.test(sentence)) ??
    sentences[0]
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fmtDate(value?: string | null): string {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function makeVocabKey(passageId: string, word: string) {
  return `${passageId}::${normalizeWord(word)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getRecordField(
  source: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  return asRecord(source?.[key]);
}

function getStringArrayField(
  source: Record<string, unknown> | null,
  key: string,
): string[] | null {
  const value = source?.[key];
  if (!Array.isArray(value)) return null;
  return value.map(String);
}

function getNumberField(
  source: Record<string, unknown> | null,
  key: string,
): number | null {
  const value = source?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function fmtPct(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${round2(value)}%`
    : "-";
}

function fmtNum(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? String(round2(value))
    : "-";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function bucketRecordToRows(
  record: Record<string, unknown> | null,
): AccuracyBucketRow[] {
  if (!record) return [];

  const rows: AccuracyBucketRow[] = [];

  for (const [key, value] of Object.entries(record)) {
    const row = asRecord(value);
    if (!row) continue;

    const unknownWordCount = getNumberField(row, "unknownWordCount");

    rows.push({
      key,
      total: getNumberField(row, "total") ?? 0,
      correct: getNumberField(row, "correct") ?? 0,
      accuracy: getNumberField(row, "accuracy") ?? 0,
      ...(unknownWordCount != null ? { unknownWordCount } : {}),
    });
  }

  return rows;
}
