// apps/web/components/reading/adaptiveMachine.ts
import type {
  RReadingTest2026,
  RReadingModule,
  RReadingItem,
} from "@/models/reading";

/** 화면 단계 */
export type AdaptivePhase =
  | "stage_intro"    // Stage 시작 안내
  | "item"           // 문제 푸는 화면
  | "stage_summary"  // Stage 끝 요약
  | "final_summary"; // 시험 전체 요약

export type StageIndex = 0 | 1;

export type RunnerStageInfo = {
  index: StageIndex;      // modules[0] or modules[1]
  stage: 1 | 2;           // meta용
  module: RReadingModule; // 실제 모듈
};

/** Item별 답안 형태 (유형별로 분기) */
export type ItemAnswerPayload =
  | {
      kind: "complete_words";
      // blankId -> 채운 토큰
      blanks: Record<string, string>;
    }
  | {
      kind: "mcq"; // daily_life, academic_passage 공통
      // questionId -> choiceId (없으면 null)
      choices: Record<string, string | null>;
    };

/** Runner 전체 상태 */
export interface AdaptiveRunnerState {
  phase: AdaptivePhase;

  currentStage: RunnerStageInfo;
  currentItemIndex: number; // module.items[currentItemIndex]

  testId: string;

  // item.id -> answer
  answers: Record<string, ItemAnswerPayload>;

  // Stage별 통계 (필요시 확장)
  stageScores: {
    [stageIndex in StageIndex]?: {
      answeredItemCount: number;
    };
  };

  isFinished: boolean;
}

/** 외부 컨텍스트 (시험 전체 정보 + Stage2 선택 로직 등) */
export interface AdaptiveContext {
  test: RReadingTest2026;

  /**
   * Stage1 결과를 바탕으로 Stage2 모듈 선택
   * - MVP: test.modules[1] 그대로 사용
   * - 추후: easy/hard 모듈 중 선택 가능
   */
  selectStage2Module: (args: {
    test: RReadingTest2026;
    state: AdaptiveRunnerState;
  }) => RReadingModule;
}

/** 기본 컨텍스트 팩토리 */
export function createAdaptiveContext(test: RReadingTest2026): AdaptiveContext {
  return {
    test,
    selectStage2Module: ({ test }) => test.modules[1], // 당장은 고정
  };
}

/** 초기 상태 생성 */
export function createInitialState(test: RReadingTest2026): AdaptiveRunnerState {
  const stage0: RunnerStageInfo = {
    index: 0,
    stage: test.modules[0].stage,
    module: test.modules[0],
  };

  return {
    phase: "stage_intro", // 바로 Stage1 인트로에서 시작
    currentStage: stage0,
    currentItemIndex: 0,
    testId: test.meta.id,
    answers: {},
    stageScores: {},
    isFinished: false,
  };
}

/** UI에서 발생하는 이벤트들 */
export type AdaptiveEvent =
  | { type: "START_STAGE" } // Stage 인트로 → 첫 문제
  | { type: "ANSWER_ITEM"; answer: ItemAnswerPayload } // 현재 item 답안 저장
  | { type: "NEXT_ITEM" } // 다음 item으로 이동
  | { type: "FINISH_STAGE" } // Stage 끝 처리 (Stage1→Stage2 / Stage2→시험 종료)
  | { type: "FINISH_TEST" }; // 최종 요약 화면에서 종료

/** 헬퍼: 현재 item 가져오기 */
export function getCurrentItem(state: AdaptiveRunnerState): RReadingItem | null {
  const { module } = state.currentStage;
  const item = module.items[state.currentItemIndex];
  return item ?? null;
}

/** 상태머신 리듀서 */
export function reduceAdaptiveState(
  state: AdaptiveRunnerState,
  event: AdaptiveEvent,
  ctx: AdaptiveContext
): AdaptiveRunnerState {
  switch (event.type) {
    case "START_STAGE": {
      return {
        ...state,
        phase: "item",
        currentItemIndex: 0,
      };
    }

    case "ANSWER_ITEM": {
      const item = getCurrentItem(state);
      if (!item) return state;

      const key = item.id;

      // Stage별 answeredItemCount 갱신
      const prevStageScore = state.stageScores[state.currentStage.index] ?? {
        answeredItemCount: 0,
      };
      const alreadyAnswered = state.answers[key] != null;

      return {
        ...state,
        answers: {
          ...state.answers,
          [key]: event.answer,
        },
        stageScores: {
          ...state.stageScores,
          [state.currentStage.index]: {
            answeredItemCount:
              prevStageScore.answeredItemCount + (alreadyAnswered ? 0 : 1),
          },
        },
      };
    }

    case "NEXT_ITEM": {
      // 🔧 여기만 이름 변경 (module → currentModule)
      const currentModule = state.currentStage.module;
      const nextIndex = state.currentItemIndex + 1;

      if (nextIndex >= currentModule.items.length) {
        // 이 Stage 끝 → Stage summary로
        return {
          ...state,
          phase: "stage_summary",
        };
      }

      return {
        ...state,
        currentItemIndex: nextIndex,
      };
    }

    case "FINISH_STAGE": {
      const isStage1 = state.currentStage.index === 0;

      if (isStage1) {
        // Stage1 → Stage2 모듈 선택
        const stage2Module = ctx.selectStage2Module({ test: ctx.test, state });

        const stage2: RunnerStageInfo = {
          index: 1,
          stage: stage2Module.stage,
          module: stage2Module,
        };

        return {
          ...state,
          currentStage: stage2,
          currentItemIndex: 0,
          phase: "stage_intro",
        };
      }

      // Stage2도 끝났으면 시험 종료 요약으로
      return {
        ...state,
        phase: "final_summary",
        isFinished: true,
      };
    }

    case "FINISH_TEST": {
      return {
        ...state,
        phase: "final_summary",
        isFinished: true,
      };
    }

    default:
      return state;
  }
}
