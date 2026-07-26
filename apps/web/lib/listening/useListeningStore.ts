import { create } from "zustand";

export interface Answer {
  questionId: string;
  trackId: string;
  choiceIndex: number;
  isCorrect: boolean;
}

export interface ListeningSessionState {
  // Test Info
  testId: string;
  module: 1 | 2;
  difficulty: "hard" | "easy";

  // Current Progress
  currentScreen: "volume" | "directions" | "moduleStart" | "task1" | "listening" | "task2345" | "moduleEnd" | "final";
  currentTaskNumber: 1 | 2 | 3 | 4;
  currentQuestionIndex: number;

  // Answers
  answers: Answer[];

  // Timing
  moduleStartTime: number;
  questionStartTime: number;

  // Navigation Control
  isNavigationLocked: boolean;

  // Actions
  setTestId: (id: string) => void;
  setModule: (module: 1 | 2) => void;
  setDifficulty: (difficulty: "hard" | "easy") => void;
  setCurrentScreen: (screen: ListeningSessionState["currentScreen"]) => void;
  setCurrentTask: (taskNumber: 1 | 2 | 3 | 4) => void;
  setCurrentQuestion: (index: number) => void;
  addAnswer: (answer: Answer) => void;
  resetAnswers: () => void;
  lockNavigation: () => void;
  unlockNavigation: () => void;
  startModule: () => void;
  startQuestion: () => void;

  // Computed
  getCorrectCount: () => number;
  getTotalAnswered: () => number;
  getPercentage: () => number;
}

export const useListeningStore = create<ListeningSessionState>((set, get) => ({
  // Initial State
  testId: "",
  module: 1,
  difficulty: "hard",
  currentScreen: "volume",
  currentTaskNumber: 1,
  currentQuestionIndex: 0,
  answers: [],
  moduleStartTime: 0,
  questionStartTime: 0,
  isNavigationLocked: true,

  // Actions
  setTestId: (id: string) => set({ testId: id }),
  setModule: (module: 1 | 2) => set({ module }),
  setDifficulty: (difficulty: "hard" | "easy") => set({ difficulty }),

  setCurrentScreen: (screen) => set({ currentScreen: screen }),

  setCurrentTask: (taskNumber: 1 | 2 | 3 | 4) => {
    set({
      currentTaskNumber: taskNumber,
      currentQuestionIndex: 0,
    });
  },

  setCurrentQuestion: (index: number) => set({ currentQuestionIndex: index }),

  addAnswer: (answer: Answer) => {
    set((state) => {
      // Replace existing answer for this question if it exists
      const existingIndex = state.answers.findIndex(
        (a) => a.questionId === answer.questionId
      );

      if (existingIndex >= 0) {
        const newAnswers = [...state.answers];
        newAnswers[existingIndex] = answer;
        return { answers: newAnswers };
      } else {
        return { answers: [...state.answers, answer] };
      }
    });
  },

  resetAnswers: () => set({ answers: [] }),

  lockNavigation: () => set({ isNavigationLocked: true }),
  unlockNavigation: () => set({ isNavigationLocked: false }),

  startModule: () => set({ moduleStartTime: Date.now() }),
  startQuestion: () => set({ questionStartTime: Date.now() }),

  // Computed Properties
  getCorrectCount: () => {
    return get().answers.filter((a) => a.isCorrect).length;
  },

  getTotalAnswered: () => {
    return get().answers.length;
  },

  getPercentage: () => {
    const total = get().getTotalAnswered();
    if (total === 0) return 0;
    return Math.round((get().getCorrectCount() / total) * 100);
  },
}));
