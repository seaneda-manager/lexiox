"use client";

import {
  DRILL_STAGE_LABEL,
  type DrillStage,
  type SentenceCompositionLog,
  type SentenceStructureLog,
  type SentenceTranslationLog,
  type UnknownWordMark,
} from "@/components/naesin/drill/types";

type StructurePart =
  | "subject"
  | "verb"
  | "object"
  | "complement"
  | "modifier";

type StructureMistakeViewItem = {
  id: string;
  sentenceIndex: number;
  part: StructurePart;
  studentAnswer: string;
  message: string;
};

type StructureWeaknessSummaryItem = {
  part: StructurePart;
  label: string;
  count: number;
  sentenceCount: number;
  severity: "low" | "medium" | "high";
  lastMessage: string;
};

type TranslationStatusSummary = {
  completedSentences: number;
  failSentences: number;
  revealedChunks: number;
  totalChunks: number;
};

type TranslationCurrentSnapshot = {
  checklistDone: number;
  checklistTotal: number;
  resolvedChunks: number;
  totalChunks: number;
  revealedChunks: number;
  sentenceResolved: boolean;
  statusLabel: string;
  nextAction: string;
};

type CompositionStatusSummary = {
  completedSentences: number;
  revealedSentences: number;
};

type CompositionCurrentSnapshot = {
  arrangementSelected: number;
  arrangementTotal: number;
  arrangementPassed: boolean;
  typingAttempts: number;
  completed: boolean;
  revealedReference: boolean;
  statusLabel: string;
  nextAction: string;
};

type Props = {
  currentStage: DrillStage;
  totalSentences: number;
  currentSentenceIndex: number;
  unknownWords: UnknownWordMark[];
  structureLogs: SentenceStructureLog[];
  translationLogs: SentenceTranslationLog[];
  compositionLogs: SentenceCompositionLog[];
  currentSentenceMistakes?: StructureMistakeViewItem[];
  structureWeaknessSummary?: StructureWeaknessSummaryItem[];
  translationStatusSummary?: TranslationStatusSummary;
  translationCurrentSnapshot?: TranslationCurrentSnapshot;
  compositionStatusSummary?: CompositionStatusSummary;
  compositionCurrentSnapshot?: CompositionCurrentSnapshot;
  // 상세 카드 섹션 노출 여부 (false면 상단 요약 바만 표시)
  expanded?: boolean;
};

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-neutral-50 px-3 py-1 text-xs text-neutral-600 whitespace-nowrap">
      <span className="text-neutral-400">{label}</span>
      <span className="font-semibold text-neutral-900">{value}</span>
    </span>
  );
}

const PART_LABEL: Record<StructurePart, string> = {
  subject: "주어",
  verb: "동사",
  object: "목적어",
  complement: "보어",
  modifier: "수식어",
};

function stageGuide(stage: DrillStage) {
  switch (stage) {
    case "word_analysis":
      return [
        "뜻이 불확실한 단어만 체크",
        "너무 많은 단어를 체크하지 않기",
        "체크 후 품사와 뜻을 확인",
      ];
    case "structure_analysis":
      return [
        "동사를 먼저 찾기",
        "그 다음 주어를 찾기",
        "수식어와 핵심 뼈대를 구분하기",
      ];
    case "translation":
      return [
        "체크 4개를 먼저 완료하기",
        "현재 청크 하나만 입력하기",
        "2회 실패 시 공개 정답을 확인하고 다음 청크로 진행하기",
      ];
    case "composition":
      return [
        "영어 청크를 올바른 순서로 배열하기",
        "배열이 맞으면 전체 영어 문장을 직접 쓰기",
        "관사, 전치사, 동사 형태까지 점검하기",
      ];
    default:
      return ["이 단계는 다음 버전에서 연결"];
  }
}

function severityBadgeClass(severity: "low" | "medium" | "high") {
  switch (severity) {
    case "high":
      return "bg-rose-100 text-rose-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function severityLabel(severity: "low" | "medium" | "high") {
  switch (severity) {
    case "high":
      return "강함";
    case "medium":
      return "주의";
    default:
      return "가벼움";
  }
}

function statusBadgeClass(statusLabel: string) {
  if (statusLabel.includes("완료") || statusLabel.includes("이동 가능")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (statusLabel.includes("실패") || statusLabel.includes("공개")) {
    return "bg-rose-100 text-rose-700";
  }
  if (statusLabel.includes("진행")) {
    return "bg-violet-100 text-violet-700";
  }
  return "bg-amber-100 text-amber-700";
}

export default function RightGuidePanel({
  currentStage,
  totalSentences,
  currentSentenceIndex,
  unknownWords,
  structureLogs,
  translationLogs,
  compositionLogs,
  currentSentenceMistakes = [],
  structureWeaknessSummary = [],
  translationStatusSummary,
  translationCurrentSnapshot,
  compositionStatusSummary,
  compositionCurrentSnapshot,
  expanded = true,
}: Props) {
  const completedStructureCount = structureLogs.filter(
    (log) =>
      log.subjectText?.trim() ||
      log.verbText?.trim() ||
      log.objectText?.trim() ||
      log.complementText?.trim() ||
      log.modifierText?.trim(),
  ).length;

  const completedTranslationCount = translationStatusSummary
    ? translationStatusSummary.completedSentences
    : translationLogs.filter((log) => log.completed || log.translationKo.trim())
        .length;

  const completedCompositionCount = compositionStatusSummary
    ? compositionStatusSummary.completedSentences
    : compositionLogs.filter((log) => log.completed || log.revealedReference)
        .length;

  const tips = stageGuide(currentStage);

  return (
    <div className="space-y-3">
      {/* 상단 요약 바 — 항상 표시, 길고 얇게 */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white px-4 py-2.5">
        <span className="shrink-0 rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
          {DRILL_STAGE_LABEL[currentStage]}
        </span>

        <span className="min-w-0 flex-1 truncate text-xs text-neutral-500">
          {tips.join(" · ")}
        </span>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <StatChip label="체크 단어" value={String(unknownWords.length)} />
          <StatChip label="구조" value={`${completedStructureCount}/${totalSentences}`} />
          <StatChip label="해석" value={`${completedTranslationCount}/${totalSentences}`} />
          <StatChip label="작문" value={`${completedCompositionCount}/${totalSentences}`} />
        </div>
      </div>

      {!expanded ? null : (
      <div className="grid gap-3 sm:grid-cols-2">
      {currentStage === "structure_analysis" ? (
        <>
          <div className="rounded-xl border bg-neutral-50 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-700">
                현재 문장 오답
              </div>
              <div className="text-[11px] text-neutral-400">
                {currentSentenceMistakes.length}개
              </div>
            </div>

            {currentSentenceMistakes.length === 0 ? (
              <div className="mt-3 text-sm text-neutral-500">
                현재 문장에는 기록된 구조 오답이 없습니다.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {currentSentenceMistakes.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-amber-800">
                        {PART_LABEL[item.part]}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        문장 {item.sentenceIndex + 1}
                      </div>
                    </div>

                    {item.studentAnswer.trim() ? (
                      <div className="mt-1 text-xs text-neutral-600">
                        입력:{" "}
                        <span className="font-medium text-neutral-800">
                          {item.studentAnswer}
                        </span>
                      </div>
                    ) : null}

                    <div className="mt-1 text-sm text-neutral-700">
                      {item.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-neutral-50 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-700">
                누적 구조 약점 요약
              </div>
              <div className="text-[11px] text-neutral-400">
                {structureWeaknessSummary.length}개 항목
              </div>
            </div>

            {structureWeaknessSummary.length === 0 ? (
              <div className="mt-3 text-sm text-neutral-500">
                아직 누적된 구조 약점이 없습니다.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {structureWeaknessSummary.map((item) => (
                  <div
                    key={item.part}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-900">
                          {item.label}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${severityBadgeClass(
                            item.severity,
                          )}`}
                        >
                          {severityLabel(item.severity)}
                        </span>
                      </div>

                      <div className="text-[11px] text-neutral-500">
                        {item.count}회 · {item.sentenceCount}문장
                      </div>
                    </div>

                    <div className="mt-1 text-xs text-neutral-600">
                      최근 피드백: {item.lastMessage}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {currentStage === "translation" ? (
        <>
          <div className="rounded-xl border bg-neutral-50 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-700">
                현재 문장 진행
              </div>
              <div className="text-[11px] text-neutral-400">
                문장 {currentSentenceIndex + 1}/{totalSentences}
              </div>
            </div>

            {translationCurrentSnapshot ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusBadgeClass(
                      translationCurrentSnapshot.statusLabel,
                    )}`}
                  >
                    {translationCurrentSnapshot.statusLabel}
                  </span>

                  <span className="text-[11px] text-neutral-500">
                    공개 청크 {translationCurrentSnapshot.revealedChunks}개
                  </span>
                </div>

                <div className="space-y-2 text-sm text-neutral-600">
                  <div className="flex items-center justify-between">
                    <span>체크 완료</span>
                    <span className="font-medium text-neutral-900">
                      {translationCurrentSnapshot.checklistDone}/
                      {translationCurrentSnapshot.checklistTotal}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>해결 청크</span>
                    <span className="font-medium text-neutral-900">
                      {translationCurrentSnapshot.resolvedChunks}/
                      {translationCurrentSnapshot.totalChunks}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>문장 상태</span>
                    <span className="font-medium text-neutral-900">
                      {translationCurrentSnapshot.sentenceResolved
                        ? "문장 종료"
                        : "진행 중"}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border bg-white px-3 py-2 text-xs text-neutral-700">
                  다음 액션: {translationCurrentSnapshot.nextAction}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-neutral-500">
                아직 현재 문장 진행 데이터가 없습니다.
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-neutral-50 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-700">
                해석 전체 현황
              </div>
              <div className="text-[11px] text-neutral-400">Stage 3</div>
            </div>

            <div className="mt-3 space-y-2 text-sm text-neutral-600">
              <div className="flex items-center justify-between">
                <span>완료 문장</span>
                <span className="font-medium text-neutral-900">
                  {translationStatusSummary?.completedSentences ?? 0}/{totalSentences}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>FAIL 포함 문장</span>
                <span className="font-medium text-neutral-900">
                  {translationStatusSummary?.failSentences ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>정답 공개 청크</span>
                <span className="font-medium text-neutral-900">
                  {translationStatusSummary?.revealedChunks ?? 0}/
                  {translationStatusSummary?.totalChunks ?? 0}
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-lg border bg-white px-3 py-2 text-xs text-neutral-600">
              FAIL 청크가 있어도 문장은 끝까지 진행합니다. 문장 종료 후
              비마지막 문장은 <strong>다음 문장</strong>, 마지막 문장은
              <strong> 완료</strong>로 마감합니다.
            </div>
          </div>
        </>
      ) : null}

      {currentStage === "composition" ? (
        <>
          <div className="rounded-xl border bg-neutral-50 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-700">
                현재 문장 진행
              </div>
              <div className="text-[11px] text-neutral-400">
                문장 {currentSentenceIndex + 1}/{totalSentences}
              </div>
            </div>

            {compositionCurrentSnapshot ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusBadgeClass(
                      compositionCurrentSnapshot.statusLabel,
                    )}`}
                  >
                    {compositionCurrentSnapshot.statusLabel}
                  </span>

                  <span className="text-[11px] text-neutral-500">
                    타이핑 시도 {compositionCurrentSnapshot.typingAttempts}회
                  </span>
                </div>

                <div className="space-y-2 text-sm text-neutral-600">
                  <div className="flex items-center justify-between">
                    <span>배열 선택</span>
                    <span className="font-medium text-neutral-900">
                      {compositionCurrentSnapshot.arrangementSelected}/
                      {compositionCurrentSnapshot.arrangementTotal}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>어순 통과</span>
                    <span className="font-medium text-neutral-900">
                      {compositionCurrentSnapshot.arrangementPassed ? "통과" : "미통과"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>문장 상태</span>
                    <span className="font-medium text-neutral-900">
                      {compositionCurrentSnapshot.completed
                        ? "완료"
                        : compositionCurrentSnapshot.revealedReference
                          ? "모범문장 공개"
                          : "진행 중"}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border bg-white px-3 py-2 text-xs text-neutral-700">
                  다음 액션: {compositionCurrentSnapshot.nextAction}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-neutral-500">
                아직 현재 문장 진행 데이터가 없습니다.
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-neutral-50 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-700">
                작문 전체 현황
              </div>
              <div className="text-[11px] text-neutral-400">Stage 4</div>
            </div>

            <div className="mt-3 space-y-2 text-sm text-neutral-600">
              <div className="flex items-center justify-between">
                <span>완료 문장</span>
                <span className="font-medium text-neutral-900">
                  {compositionStatusSummary?.completedSentences ?? 0}/{totalSentences}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>모범문장 공개 문장</span>
                <span className="font-medium text-neutral-900">
                  {compositionStatusSummary?.revealedSentences ?? 0}
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-lg border bg-white px-3 py-2 text-xs text-neutral-600">
              어순을 먼저 맞춘 뒤 전체 영문을 직접 씁니다. 2회 내에 맞추지 못하면
              모범 문장을 확인하고 다음으로 진행합니다.
            </div>
          </div>
        </>
      ) : null}
      </div>
      )}
    </div>
  );
}
