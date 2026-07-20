// apps/web/lib/labels/fallbackLabels.ts

import type { UILabelDomain, UILabelResolved } from "@/models/platform/labels";

export const FALLBACK_LABELS: Partial<
  Record<UILabelDomain, Record<string, UILabelResolved>>
> = {
  weak_tag: {
    evidence_finding_weak: {
      labelKo: "근거 찾기 약함",
      shortDescriptionKo: "정답의 근거 문장을 정확히 찾는 힘이 약함",
    },
    evidence_precision_weak: {
      labelKo: "근거 범위 좁히기 약함",
      shortDescriptionKo: "근거 문장을 너무 넓거나 흐리게 고르는 경향",
    },
    evidence_review_incomplete: {
      labelKo: "근거 리뷰 미완료",
      shortDescriptionKo: "근거 선택 리뷰를 끝까지 하지 않음",
    },
    vocab_gap_basic: {
      labelKo: "기본 어휘 부족",
      shortDescriptionKo: "기본 어휘 뜻 회수가 불안정함",
    },
    vocab_gap_context: {
      labelKo: "문맥 어휘 파악 약함",
      shortDescriptionKo: "문맥 속 단어 의미 파악이 약함",
    },
    vocab_review_incomplete: {
      labelKo: "어휘 리뷰 미완료",
      shortDescriptionKo: "모르는 단어 정리와 확인이 충분하지 않음",
    },
    sentence_structure_weak: {
      labelKo: "문장 구조 파악 약함",
      shortDescriptionKo: "긴 문장의 핵심 구조 파악이 약함",
    },
    modifier_vs_core_weak: {
      labelKo: "수식어와 핵심절 구분 약함",
      shortDescriptionKo: "수식어와 핵심 문장 성분 구분이 약함",
    },
    svoc_marking_weak: {
      labelKo: "SVOC 표시 약함",
      shortDescriptionKo: "S/V/O/C 표시와 구조 분해가 약함",
    },
    sentence_review_incomplete: {
      labelKo: "문장 분석 리뷰 미완료",
      shortDescriptionKo: "해석/SVOC 리뷰를 끝까지 하지 않음",
    },
    detail_trap_weak: {
      labelKo: "세부정보 함정 취약",
      shortDescriptionKo: "부분 일치 선지에 흔들리는 경향",
    },
    inference_weak: {
      labelKo: "추론 문제 취약",
      shortDescriptionKo: "직접 진술과 추론을 구분하는 힘이 약함",
    },
    purpose_mainidea_weak: {
      labelKo: "주제/목적 파악 약함",
      shortDescriptionKo: "글의 핵심 목적과 중심 생각 파악이 약함",
    },
    summary_organization_weak: {
      labelKo: "요약/구조 파악 약함",
      shortDescriptionKo: "글의 구조와 요약 포인트 파악이 약함",
    },
    review_engagement_low: {
      labelKo: "리뷰 참여도 낮음",
      shortDescriptionKo: "리뷰 입력과 점검 참여도가 낮음",
    },
  },

  analytics_metric: {
    accuracyOverall: { labelKo: "전체 정답률" },
    reviewCompletionRate: { labelKo: "리뷰 완료율" },
    submissionRate: { labelKo: "근거 제출률" },
    matchedRateAmongSubmitted: { labelKo: "제출 기준 근거 일치율" },
    unknownWordCount: { labelKo: "모르는 단어 수" },
    vocabAttemptCount: { labelKo: "어휘 시도 수" },
    vocabTestAccuracy: { labelKo: "어휘 정확도" },
    sentenceLogCoverageRate: { labelKo: "문장 분석 기록률" },
    svocCompletionRateAmongLogged: { labelKo: "기록 기준 SVOC 완성률" },
    modifierCompletionRateAmongLogged: { labelKo: "기록 기준 수식어 분석률" },
    avgElapsedSec: { labelKo: "평균 소요 시간(초)" },
    flaggedCount: { labelKo: "표시한 문항 수" },
    omittedCount: { labelKo: "미응답 수" },
    wrongQuestionCount: { labelKo: "오답 수" },
    selectedUnknownWordCount: { labelKo: "선택한 모르는 단어 수" },
    savedEvidenceMatchCount: { labelKo: "근거 일치 수" },

    sessionCount: { labelKo: "세션 수" },
    avgAccuracyOverall: { labelKo: "평균 전체 정답률" },
    avgScorePercent: { labelKo: "평균 점수" },
    avgEvidenceSubmissionRate: { labelKo: "평균 근거 제출률" },
    avgEvidenceMatchedRateAmongSubmitted: { labelKo: "평균 근거 일치율" },
    avgUnknownWordCount: { labelKo: "평균 모르는 단어 수" },
    avgSvocCompletionRateAmongLogged: { labelKo: "평균 SVOC 완성률" },
    avgReviewCompletionRate: { labelKo: "평균 리뷰 완료율" },
    avgSentenceLogCoverageRate: { labelKo: "평균 문장 분석 기록률" },

    total: { labelKo: "문항 수" },
    correct: { labelKo: "정답 수" },
    accuracy: { labelKo: "정답률" },
    
  },

  review_tab: {
    summary: { labelKo: "요약" },
    evidence: { labelKo: "근거 찾기" },
    words: { labelKo: "모르는 단어" },
    analysis: { labelKo: "문장 분석" },
    vocab: { labelKo: "어휘 테스트" },
  },
};
