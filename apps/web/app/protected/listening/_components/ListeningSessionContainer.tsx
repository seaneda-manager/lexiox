"use client";

import { useState, useMemo } from "react";
import VolumeAdjustmentScreen from "./VolumeAdjustmentScreen";
import ListeningDirectionsScreen from "./ListeningDirectionsScreen";
import ModuleStartScreen from "./ModuleStartScreen";
import Task1QuestionScreen from "./Task1QuestionScreen";
import ListeningScreen from "./ListeningScreen";
import Task2345QuestionScreen from "./Task2345QuestionScreen";
import ModuleEndScreen from "./ModuleEndScreen";
import type { LListeningTest2026Linear, LListeningTrack2026, LQuestion2026 } from "@/models/listening";

type ScreenType = "volume" | "directions" | "moduleStart" | "step" | "moduleEnd" | "final";

interface AnswerRecord {
  questionId: string;
  choiceIndex: number;
  isCorrect: boolean;
}

// choose_response 트랙은 질문마다 독립된 오디오라서 별도 "듣기 화면" 없이 바로 문제 화면에서 재생.
// 그 외 트랙은 먼저 트랙 전체를 듣는 화면을 거친 뒤, 딸린 문제들을 순서대로 푼다.
type Step =
  | { kind: "listening"; track: LListeningTrack2026 }
  | { kind: "question"; track: LListeningTrack2026; question: LQuestion2026; qIndex: number };

function buildSteps(tracks: LListeningTrack2026[]): Step[] {
  const steps: Step[] = [];
  for (const track of tracks) {
    if (track.taskKind !== "choose_response") {
      steps.push({ kind: "listening", track });
    }
    (track.questions ?? []).forEach((question, qIndex) => {
      steps.push({ kind: "question", track, question, qIndex });
    });
  }
  return steps;
}

interface ListeningSessionContainerProps {
  testData: LListeningTest2026Linear;
  testId: string;
}

export default function ListeningSessionContainer({
  testData,
  testId,
}: ListeningSessionContainerProps) {
  const [screen, setScreen] = useState<ScreenType>("volume");
  const [module, setModule] = useState<1 | 2>(1);
  const [difficulty, setDifficulty] = useState<"hard" | "easy">("hard");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  const module1Tracks = testData.modules?.[0]?.items ?? [];
  const module2Tracks =
    difficulty === "hard"
      ? testData.stage2Pool?.hard?.items ?? []
      : testData.stage2Pool?.easy?.items ?? [];

  const currentTracks = module === 1 ? module1Tracks : module2Tracks;
  const steps = useMemo(() => buildSteps(currentTracks), [currentTracks]);
  const currentStep = steps[stepIndex];

  const recordAnswer = (question: LQuestion2026, choiceIndex: number) => {
    const isCorrect = choiceIndex >= 0 && !!question.choices?.[choiceIndex]?.isCorrect;
    setAnswers((prev) => [...prev, { questionId: question.id, choiceIndex, isCorrect }]);
  };

  const advanceStep = () => {
    setStepIndex((prev) => {
      if (prev + 1 < steps.length) return prev + 1;
      setScreen("moduleEnd");
      return prev;
    });
  };

  const handleVolumeNext = () => setScreen("directions");
  const handleDirectionsNext = () => setScreen("moduleStart");

  const handleModuleStartNext = () => {
    setStepIndex(0);
    setAnswers([]);
    setScreen("step");
  };

  const handleListeningEnd = () => advanceStep();

  const handleQuestionNext = (question: LQuestion2026, choiceIndex: number) => {
    recordAnswer(question, choiceIndex);
    advanceStep();
  };

  const saveModuleResult = async (correctCount: number, totalQuestions: number) => {
    try {
      await fetch("/api/student/listening/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          module,
          difficulty,
          answers,
          correctCount,
          totalQuestions,
        }),
      });
    } catch (err) {
      console.error("Failed to save listening session:", err);
    }
  };

  const handleModuleEndNext = async () => {
    const totalQuestions = answers.length;
    const correctCount = answers.filter((a) => a.isCorrect).length;
    await saveModuleResult(correctCount, totalQuestions);

    if (module === 1) {
      const cutScore = testData.stage2Pool?.cutScore ?? 0.7;
      const percentage = totalQuestions > 0 ? correctCount / totalQuestions : 0;
      const nextDifficulty = percentage >= cutScore ? "hard" : "easy";

      setModule(2);
      setDifficulty(nextDifficulty);
      setScreen("moduleStart");
    } else {
      setScreen("final");
    }
  };

  if (!module1Tracks.length) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <p className="text-red-600">시험 데이터를 불러올 수 없습니다 (Module 1 트랙 없음).</p>
      </div>
    );
  }

  switch (screen) {
    case "volume":
      return <VolumeAdjustmentScreen onNext={handleVolumeNext} />;

    case "directions":
      return <ListeningDirectionsScreen onNext={handleDirectionsNext} />;

    case "moduleStart":
      return (
        <ModuleStartScreen
          module={module}
          difficulty={module === 2 ? difficulty : undefined}
          onNext={handleModuleStartNext}
        />
      );

    case "step": {
      if (!currentStep) return null;

      if (currentStep.kind === "listening") {
        return (
          <ListeningScreen
            key={currentStep.track.id}
            taskNumber={stepIndex + 1}
            taskKind={currentStep.track.taskKind as "conversation" | "announcement" | "academic_talk"}
            audioUrl={currentStep.track.audioUrl}
            illustrationUrl={currentStep.track.illustrationUrl}
            title={currentStep.track.title ?? ""}
            onAudioEnd={handleListeningEnd}
          />
        );
      }

      const { track, question, qIndex } = currentStep;
      const totalQuestionsInTrack = track.questions.length;

      if (track.taskKind === "choose_response") {
        return (
          <Task1QuestionScreen
            key={question.id}
            currentQuestion={qIndex + 1}
            totalQuestions={totalQuestionsInTrack}
            audioUrl={question.audioUrl ?? ""}
            choices={question.choices}
            maxTime={question.testingSeconds ?? 20}
            onNext={(choiceIndex) => handleQuestionNext(question, choiceIndex)}
          />
        );
      }

      return (
        <Task2345QuestionScreen
          key={question.id}
          taskNumber={stepIndex + 1}
          taskKind={track.taskKind as "conversation" | "announcement" | "academic_talk"}
          currentQuestion={qIndex + 1}
          totalQuestions={totalQuestionsInTrack}
          question={question.stem}
          choices={question.choices}
          maxTime={question.testingSeconds ?? 40}
          onNext={(choiceIndex) => handleQuestionNext(question, choiceIndex)}
        />
      );
    }

    case "moduleEnd": {
      const totalQuestions = answers.length;
      const correctCount = answers.filter((a) => a.isCorrect).length;
      return (
        <ModuleEndScreen
          module={module}
          correctCount={correctCount}
          totalQuestions={totalQuestions}
          onNext={handleModuleEndNext}
        />
      );
    }

    case "final":
      return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
          <div className="text-center space-y-6 max-w-2xl">
            <div className="text-6xl">🎉</div>
            <h1 className="text-4xl font-bold text-gray-900">Test Complete!</h1>
            <p className="text-gray-600 text-lg">
              Your Listening section is complete. Your results are being calculated.
            </p>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      );

    default:
      return null;
  }
}
