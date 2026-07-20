"use client";

import { useMemo } from "react";
import type { SentenceTranslationLog } from "@/components/naesin/drill/types";

type TranslationChecklistKey =
  | "subjectChecked"
  | "verbChecked"
  | "logicChecked"
  | "modifierChecked";

type TranslationChecklistState = Record<TranslationChecklistKey, boolean>;

type TranslationChunkAnswer = {
  id: string;
  sourceSpan?: string;
  leadKo: string;
  acceptableAnswers: string[];
};

type TranslationChunkLog = {
  chunkId: string;
  inputSuffix: string;
  attempts: number;
  isCorrect: boolean;
  revealedAnswer: boolean;
};

type TranslationAnswerLike = {
  referenceKo?: string;
  acceptableKeywords?: string[];
  notes?: string[];
  chunks?: TranslationChunkAnswer[];
};

type Stage3Log = SentenceTranslationLog & {
  checklist?: TranslationChecklistState;
  chunkLogs?: TranslationChunkLog[];
  completed?: boolean;
};

type Props = {
  sentenceText: string;
  answer?: TranslationAnswerLike | null;
  currentSentenceIndex: number;
  totalSentences: number;
  log: Stage3Log;
  onPrevSentence: () => void;
  onNextSentence: () => void;
  onPatchLog: (patch: Partial<Stage3Log>) => void;
};

const DEFAULT_CHECKLIST: TranslationChecklistState = {
  subjectChecked: false,
  verbChecked: false,
  logicChecked: false,
  modifierChecked: false,
};

const CHECKLIST_ITEMS: Array<{
  key: TranslationChecklistKey;
  label: string;
}> = [
  { key: "subjectChecked", label: "주어를 확인했다" },
  { key: "verbChecked", label: "핵심 동사를 확인했다" },
  { key: "logicChecked", label: "이유/시간/조건 표현을 확인했다" },
  { key: "modifierChecked", label: "수식어를 빼먹지 않기로 했다" },
];

export default function Stage3Translation({
  sentenceText,
  answer = null,
  currentSentenceIndex,
  totalSentences,
  log,
  onPrevSentence,
  onNextSentence,
  onPatchLog,
}: Props) {
  const checklist = useMemo(
    () => ({ ...DEFAULT_CHECKLIST, ...(log.checklist ?? {}) }),
    [log.checklist],
  );

  const chunks = useMemo(() => buildChunks(answer), [answer]);

  const chunkLogs = useMemo(
    () => normalizeChunkLogs(chunks, log.chunkLogs ?? []),
    [chunks, log.chunkLogs],
  );

  const checklistReady = Object.values(checklist).every(Boolean);

  const currentChunkIndex = chunkLogs.findIndex(
    (item) => !item.isCorrect && !item.revealedAnswer,
  );

  const sentenceDone = currentChunkIndex === -1 && chunks.length > 0;
  const isLastSentence = currentSentenceIndex === totalSentences - 1;

  const assembledKo = useMemo(
    () => buildAssembledKo(chunks, chunkLogs),
    [chunks, chunkLogs],
  );

  function patchChecklist(key: TranslationChecklistKey, checked: boolean) {
    onPatchLog({
      checklist: {
        ...checklist,
        [key]: checked,
      },
    });
  }

  function patchChunkLogs(nextChunkLogs: TranslationChunkLog[]) {
    onPatchLog({
      chunkLogs: nextChunkLogs,
      translationKo: buildAssembledKo(chunks, nextChunkLogs),
    });
  }

  function updateChunkInput(chunkId: string, value: string) {
    const next = chunkLogs.map((item) =>
      item.chunkId === chunkId ? { ...item, inputSuffix: value } : item,
    );
    patchChunkLogs(next);
  }

  function submitCurrentChunk() {
    if (!checklistReady) return;
    if (currentChunkIndex < 0) return;

    const chunk = chunks[currentChunkIndex];
    const currentLog = chunkLogs[currentChunkIndex];
    const fullInput = `${chunk.leadKo}${currentLog.inputSuffix}`.trim();

    const isMatch = matchesChunkAnswer(chunk, fullInput);

    if (isMatch) {
      const next = chunkLogs.map((item, index) =>
        index === currentChunkIndex
          ? {
              ...item,
              attempts: item.attempts + 1,
              isCorrect: true,
              revealedAnswer: false,
            }
          : item,
      );

      patchChunkLogs(next);
      return;
    }

    const nextAttempts = currentLog.attempts + 1;

    if (nextAttempts >= 2) {
      const next = chunkLogs.map((item, index) =>
        index === currentChunkIndex
          ? {
              ...item,
              attempts: nextAttempts,
              isCorrect: false,
              revealedAnswer: true,
            }
          : item,
      );

      patchChunkLogs(next);
      return;
    }

    const next = chunkLogs.map((item, index) =>
      index === currentChunkIndex
        ? {
            ...item,
            attempts: nextAttempts,
            isCorrect: false,
            revealedAnswer: false,
          }
        : item,
    );

    patchChunkLogs(next);
  }

  function moveNextSentence() {
    if (!sentenceDone || isLastSentence) return;

    onPatchLog({
      completed: true,
      translationKo: assembledKo,
    });

    onNextSentence();
  }

  function completeSentence() {
    if (!sentenceDone) return;

    onPatchLog({
      completed: true,
      translationKo: assembledKo,
    });
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Stage 3
          </div>
          <div className="text-lg font-semibold text-neutral-900">해석</div>
          <div className="mt-1 text-sm text-neutral-500">
            체크 후 시작하고, 청크를 하나씩 풀어 갑니다.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevSentence}
            disabled={currentSentenceIndex <= 0}
            className="rounded-lg border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전 문장
          </button>

          {!isLastSentence ? (
            <button
              type="button"
              onClick={moveNextSentence}
              disabled={!sentenceDone}
              className="rounded-lg border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음 문장
            </button>
          ) : (
            <button
              type="button"
              onClick={completeSentence}
              disabled={!sentenceDone || !!log.completed}
              className="rounded-lg border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              {log.completed ? "완료됨" : "완료"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border bg-neutral-50 p-4">
        <div className="text-xs font-semibold text-neutral-700">
          해석 전 체크
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {CHECKLIST_ITEMS.map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-neutral-800"
            >
              <input
                type="checkbox"
                checked={checklist[item.key]}
                onChange={(e) => patchChecklist(item.key, e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              {item.label}
            </label>
          ))}
        </div>

        {!checklistReady ? (
          <div className="mt-3 text-xs text-amber-700">
            체크를 모두 해야 해석 청크 입력이 활성화됩니다.
          </div>
        ) : (
          <div className="mt-3 text-xs text-emerald-700">
            좋아. 이제 청크별로 해석을 입력하세요.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border bg-emerald-50 p-4">
        <div className="text-xs font-semibold text-emerald-700">
          문장 {currentSentenceIndex + 1} / {totalSentences}
        </div>
        <div className="mt-2 text-sm leading-7 text-neutral-900">
          {sentenceText}
        </div>
      </div>

      {chunks.length === 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          이 문장은 translation chunk 데이터가 없어서 Stage 3 입력을 진행할 수 없습니다.
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {chunks.map((chunk, index) => {
          const chunkLog = chunkLogs[index];
          const isCurrent = index === currentChunkIndex;
          const isDone = chunkLog.isCorrect || chunkLog.revealedAnswer;
          const isLocked = !checklistReady || (!isCurrent && !isDone);

          return (
            <div
              key={chunk.id}
              className={`rounded-xl border p-4 ${
                chunkLog.isCorrect
                  ? "border-emerald-200 bg-emerald-50"
                  : chunkLog.revealedAnswer
                    ? "border-rose-200 bg-rose-50"
                    : isCurrent && checklistReady
                      ? "border-violet-200 bg-violet-50"
                      : "bg-neutral-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-neutral-500">
                    청크 {index + 1}
                  </div>
                  <div className="mt-1 text-sm font-medium text-neutral-900">
                    {chunk.sourceSpan || `생각단위 ${index + 1}`}
                  </div>
                </div>

                <div className="rounded-full bg-white px-2 py-0.5 text-[11px] text-neutral-600">
                  {chunkLog.isCorrect
                    ? "정답"
                    : chunkLog.revealedAnswer
                      ? "오답 공개"
                      : isCurrent && checklistReady
                        ? "현재 입력"
                        : "대기"}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-violet-700">
                  {chunk.leadKo}
                </span>

                <input
                  value={chunkLog.inputSuffix}
                  onChange={(e) => updateChunkInput(chunk.id, e.target.value)}
                  disabled={isLocked || isDone}
                  placeholder={
                    isLocked
                      ? "이전 청크를 먼저 완료하세요."
                      : "첫 글자 뒤를 입력하세요."
                  }
                  className="min-w-[260px] flex-1 rounded-lg border px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:bg-neutral-100"
                />

                {isCurrent ? (
                  <button
                    type="button"
                    onClick={submitCurrentChunk}
                    disabled={!checklistReady}
                    className="rounded-lg border bg-white px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    입력
                  </button>
                ) : null}
              </div>

              <div className="mt-2 text-xs text-neutral-500">
                시도 횟수: {chunkLog.attempts}/2
              </div>

              {isCurrent && chunkLog.attempts === 1 && !isDone ? (
                <div className="mt-2 text-sm text-rose-700">
                  오답입니다. 한 번 더 시도하세요.
                </div>
              ) : null}

              {chunkLog.isCorrect ? (
                <div className="mt-2 text-sm text-emerald-700">
                  정답: {chunk.leadKo}
                  {chunkLog.inputSuffix}
                </div>
              ) : null}

              {chunkLog.revealedAnswer ? (
                <div className="mt-2 text-sm text-rose-700">
                  정답: {chunk.acceptableAnswers[0]}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border bg-neutral-50 p-4">
        <div className="text-xs font-semibold text-neutral-700">현재 조립 해석</div>
        <div className="mt-2 text-sm leading-6 text-neutral-900">
          {assembledKo || "아직 조립된 해석이 없습니다."}
        </div>
      </div>

      {sentenceDone ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-900">
            문장 완료
          </div>
          <div className="mt-2 text-xs font-semibold text-neutral-700">
            모범 해석
          </div>
          <div className="mt-1 text-sm leading-6 text-neutral-900">
            {answer?.referenceKo ?? "모범 해석이 아직 없습니다."}
          </div>

          {answer?.notes?.length ? (
            <ul className="mt-3 space-y-1 text-sm text-neutral-700">
              {answer.notes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          ) : null}

          {!isLastSentence ? (
            <div className="mt-3 text-xs text-neutral-600">
              다음 문장으로 가려면 상단의 <strong>다음 문장</strong> 버튼을 누르세요.
            </div>
          ) : (
            <div className="mt-3 text-xs text-neutral-600">
              마지막 문장입니다. 상단의 <strong>완료</strong> 버튼을 눌러 마무리하세요.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function buildChunks(answer: TranslationAnswerLike | null): TranslationChunkAnswer[] {
  const manualChunks = answer?.chunks ?? [];
  if (manualChunks.length > 0) return manualChunks;

  const reference = answer?.referenceKo?.trim() ?? "";
  if (!reference) return [];

  const lead = reference.slice(0, 1);
  const rest = reference.slice(1);

  return [
    {
      id: "fallback-1",
      sourceSpan: "전체 문장",
      leadKo: lead,
      acceptableAnswers: [reference, `${lead}${rest}`],
    },
  ];
}

function normalizeChunkLogs(
  chunks: TranslationChunkAnswer[],
  logs: TranslationChunkLog[],
): TranslationChunkLog[] {
  return chunks.map((chunk) => {
    const existing = logs.find((item) => item.chunkId === chunk.id);

    return (
      existing ?? {
        chunkId: chunk.id,
        inputSuffix: "",
        attempts: 0,
        isCorrect: false,
        revealedAnswer: false,
      }
    );
  });
}

function buildAssembledKo(
  chunks: TranslationChunkAnswer[],
  logs: TranslationChunkLog[],
) {
  return chunks
    .map((chunk) => {
      const log = logs.find((item) => item.chunkId === chunk.id);
      if (!log) return "";

      if (log.isCorrect) {
        return `${chunk.leadKo}${log.inputSuffix}`.trim();
      }

      if (log.revealedAnswer) {
        return chunk.acceptableAnswers[0] ?? "";
      }

      return "";
    })
    .filter(Boolean)
    .join(" / ");
}

function matchesChunkAnswer(chunk: TranslationChunkAnswer, fullInput: string) {
  const input = normalizeKo(fullInput);
  if (!input) return false;

  const candidates = chunk.acceptableAnswers
    .map((item) => item.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeKo(candidate);

    if (normalizedCandidate === input) {
      return true;
    }

    const simplifiedCandidate = simplifyKo(candidate);
    const simplifiedInput = simplifyKo(fullInput);

    if (simplifiedCandidate === simplifiedInput) {
      return true;
    }

    if (
      simplifiedCandidate.length >= 2 &&
      simplifiedInput.length >= 2 &&
      (simplifiedCandidate.endsWith(simplifiedInput) ||
        simplifiedInput.endsWith(simplifiedCandidate))
    ) {
      return true;
    }
  }

  return false;
}

function normalizeKo(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function simplifyKo(value: string) {
  return normalizeKo(value)
    .replace(/[.,!?~"'“”‘’()\[\]{}]/g, "")
    .replace(/^(그|이|저)/, "")
    .replace(/(은|는|이|가|을|를|에|에서|에게|께|의|와|과|로|으로|도|만|까지|부터|보다|처럼|마저)+$/g, "");
}
