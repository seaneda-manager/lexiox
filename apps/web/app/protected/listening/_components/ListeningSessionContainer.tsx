"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import ListeningDirectionsScreen from "./ListeningDirectionsScreen";
import ModuleStartScreen from "./ModuleStartScreen";
import Task1QuestionScreen from "./Task1QuestionScreen";
import ListeningScreen from "./ListeningScreen";
import Task2345QuestionScreen from "./Task2345QuestionScreen";
import ModuleEndScreen from "./ModuleEndScreen";
import type { LListeningTest2026Linear, LListeningTrack2026, LQuestion2026 } from "@/models/listening";

type ScreenType = "directions" | "moduleStart" | "step" | "moduleEnd" | "final";

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
  /** 배정을 통해 들어온 경우, 완료 시 test_assignments 상태를 업데이트하기 위해 필요 */
  assignmentId?: string;
  /**
   * test: 실전과 동일 — 자동재생, 컨트롤 없음, 뒤로가기 불가, 문항별 카운트다운.
   * study: 일시정지·탐색·재청취·스크립트 가능, 뒤로가기 가능, 시간 제한 없음.
   */
  mode?: "test" | "study";
}

export default function ListeningSessionContainer({
  testData,
  testId,
  assignmentId,
  mode = "test",
}: ListeningSessionContainerProps) {
  const isStudy = mode === "study";
  // 실제 ETS는 전용 볼륨 조절 화면이 없다 — 헤더의 Volume 버튼으로 시험 내내 조절한다.
  const [volume, setVolume] = useState(70);
  const [screen, setScreen] = useState<ScreenType>("directions");
  const [module, setModule] = useState<1 | 2>(1);
  const [difficulty, setDifficulty] = useState<"hard" | "easy">("hard");
  const [stepIndex, setStepIndex] = useState(0);
  // study에서는 뒤로 가서 답을 고칠 수 있어야 하므로 questionId 기준으로 덮어쓴다.
  // (배열에 append하면 같은 문항이 중복 기록된다.)
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({});
  const [nextSection, setNextSection] = useState<{ href: string; section: string } | null>(null);
  const [groupCompleted, setGroupCompleted] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  const module1Tracks = testData.modules?.[0]?.items ?? [];
  const module2Tracks =
    difficulty === "hard"
      ? testData.stage2Pool?.hard?.items ?? []
      : testData.stage2Pool?.easy?.items ?? [];

  const currentTracks = module === 1 ? module1Tracks : module2Tracks;
  const steps = useMemo(() => buildSteps(currentTracks), [currentTracks]);
  const currentStep = steps[stepIndex];

  const answerList = useMemo(() => Object.values(answers), [answers]);

  const recordAnswer = (question: LQuestion2026, choiceIndex: number) => {
    const isCorrect = choiceIndex >= 0 && !!question.choices?.[choiceIndex]?.isCorrect;
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { questionId: question.id, choiceIndex, isCorrect },
    }));
  };

  const advanceStep = () => {
    setStepIndex((prev) => {
      if (prev + 1 < steps.length) return prev + 1;
      setScreen("moduleEnd");
      return prev;
    });
  };

  // study 전용. test에서는 호출되지 않는다.
  const goBackStep = () => setStepIndex((prev) => Math.max(0, prev - 1));

  const handleDirectionsNext = () => setScreen("moduleStart");

  const handleModuleStartNext = () => {
    setStepIndex(0);
    setAnswers({});
    setScreen("step");
  };

  const handleListeningEnd = () => advanceStep();

  const handleQuestionNext = (question: LQuestion2026, choiceIndex: number) => {
    recordAnswer(question, choiceIndex);
    advanceStep();
  };

  const saveModuleResult = async (correctCount: number, totalQuestions: number, isFinalModule: boolean) => {
    // study는 연습이라 결과를 남기지 않는다. 저장하면 실전 성적 통계가 오염된다.
    if (isStudy) return;
    try {
      const res = await fetch("/api/student/listening/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          module,
          difficulty,
          answers: answerList,
          correctCount,
          totalQuestions,
          assignmentId,
          markAssignmentCompleted: isFinalModule && !!assignmentId,
        }),
      });
      const json = await res.json().catch(() => null);
      if (json?.nextSection) {
        setNextSection({ href: json.nextSection.href, section: json.nextSection.section });
      }
      if (json?.groupCompleted) {
        setGroupCompleted(true);
        setGroupId(json.groupId ?? null);
      }
    } catch (err) {
      console.error("Failed to save listening session:", err);
    }
  };

  const handleModuleEndNext = async () => {
    const totalQuestions = answerList.length;
    const correctCount = answerList.filter((a) => a.isCorrect).length;
    await saveModuleResult(correctCount, totalQuestions, module === 2);

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
    case "directions":
      return <ListeningDirectionsScreen onNext={handleDirectionsNext} volume={volume} onVolumeChange={setVolume} />;

    case "moduleStart":
      return (
        <ModuleStartScreen
          module={module}
          difficulty={module === 2 ? difficulty : undefined}
          onNext={handleModuleStartNext}
          volume={volume}
          onVolumeChange={setVolume}
        />
      );

    case "step": {
      if (!currentStep) return null;

      // study에서만 뒤로가기. 첫 단계에서는 돌아갈 곳이 없다.
      const backHandler = isStudy && stepIndex > 0 ? goBackStep : undefined;

      if (currentStep.kind === "listening") {
        return (
          <ListeningScreen
            key={currentStep.track.id}
            module={module}
            taskKind={currentStep.track.taskKind as "conversation" | "announcement" | "academic_talk"}
            audioUrl={currentStep.track.audioUrl}
            illustrationUrl={currentStep.track.illustrationUrl}
            title={currentStep.track.title ?? ""}
            onAudioEnd={handleListeningEnd}
            mode={mode}
            transcript={currentStep.track.transcript}
            scriptSegments={(currentStep.track as any).scriptSegments}
            onBack={backHandler}
            volume={volume}
            onVolumeChange={setVolume}
          />
        );
      }

      const { track, question, qIndex } = currentStep;
      const totalQuestionsInTrack = track.questions.length;
      const previousChoice = answers[question.id]?.choiceIndex ?? null;

      if (track.taskKind === "choose_response") {
        return (
          <Task1QuestionScreen
            key={question.id}
            module={module}
            currentQuestion={qIndex + 1}
            totalQuestions={totalQuestionsInTrack}
            audioUrl={question.audioUrl ?? ""}
            illustrationUrl={track.illustrationUrl}
            choices={question.choices}
            maxTime={question.testingSeconds ?? 20}
            onNext={(choiceIndex) => handleQuestionNext(question, choiceIndex)}
            mode={mode}
            initialChoiceIndex={previousChoice}
            onBack={backHandler}
            transcript={question.transcript}
            volume={volume}
            onVolumeChange={setVolume}
          />
        );
      }

      return (
        <Task2345QuestionScreen
          key={question.id}
          module={module}
          taskKind={track.taskKind as "conversation" | "announcement" | "academic_talk"}
          currentQuestion={qIndex + 1}
          totalQuestions={totalQuestionsInTrack}
          question={question.stem}
          choices={question.choices}
          maxTime={question.testingSeconds ?? 40}
          onNext={(choiceIndex) => handleQuestionNext(question, choiceIndex)}
          mode={mode}
          initialChoiceIndex={previousChoice}
          onBack={backHandler}
          audioUrl={track.audioUrl}
          illustrationUrl={track.illustrationUrl}
          transcript={track.transcript}
          scriptSegments={(track as any).scriptSegments}
          volume={volume}
          onVolumeChange={setVolume}
        />
      );
    }

    case "moduleEnd": {
      const totalQuestions = answerList.length;
      const correctCount = answerList.filter((a) => a.isCorrect).length;
      return (
        <ModuleEndScreen
          module={module}
          correctCount={correctCount}
          totalQuestions={totalQuestions}
          cutScore={testData.stage2Pool?.cutScore ?? 0.7}
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
            {nextSection && (
              <Link
                href={nextSection.href}
                className="block px-8 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
              >
                다음 영역: {nextSection.section === "speaking" ? "Speaking" : nextSection.section} 계속하기 →
              </Link>
            )}
            {groupCompleted && groupId && (
              <Link
                href={`/student/full-tests/${groupId}`}
                className="block px-8 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
              >
                전체 결과 보기 →
              </Link>
            )}
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
