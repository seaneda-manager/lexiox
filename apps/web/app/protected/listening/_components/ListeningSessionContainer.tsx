"use client";

import { useState, useEffect } from "react";
import VolumeAdjustmentScreen from "./VolumeAdjustmentScreen";
import ListeningDirectionsScreen from "./ListeningDirectionsScreen";
import ModuleStartScreen from "./ModuleStartScreen";
import Task1QuestionScreen from "./Task1QuestionScreen";
import ListeningScreen from "./ListeningScreen";
import Task2345QuestionScreen from "./Task2345QuestionScreen";
import ModuleEndScreen from "./ModuleEndScreen";

type ScreenType = "volume" | "directions" | "moduleStart" | "task1" | "listening" | "task2345" | "moduleEnd" | "final";

interface Answer {
  questionId: string;
  choiceIndex: number;
}

interface MockQuestion {
  id: string;
  type: string;
  stem: string;
  choices: Array<{ id: string; text: string; isCorrect: boolean }>;
}

interface MockTrack {
  id: string;
  taskKind: string;
  title: string;
  audioUrl: string;
  questions: MockQuestion[];
  transcript?: string;
  audioSeconds?: number;
}

interface MockListeningTest {
  meta: { id: string; label: string };
  hard: { tracks: MockTrack[] };
  easy: { tracks: MockTrack[] };
}

interface ListeningSessionContainerProps {
  testData?: MockListeningTest;
  testId?: string;
}

export default function ListeningSessionContainer({
  testData,
  testId,
}: ListeningSessionContainerProps) {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("volume");
  const [module, setModule] = useState<1 | 2>(1);
  const [difficulty, setDifficulty] = useState<"hard" | "easy">("hard");
  const [currentTaskNumber, setCurrentTaskNumber] = useState<1 | 2 | 3 | 4>(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [test, setTest] = useState<MockListeningTest | null>(testData || null);
  const [loading, setLoading] = useState(!testData);

  // Fetch test data if not provided
  useEffect(() => {
    if (!testData && testId) {
      fetchTestData();
    }
  }, [testId, testData]);

  const fetchTestData = async () => {
    // TODO: Implement actual API call
    // For now, use dummy data
    setLoading(false);
  };

  const getCurrentTracks = () => {
    if (!test) return [];
    return difficulty === "hard" ? test.hard.tracks : test.easy.tracks;
  };

  const getCurrentTrack = () => {
    const tracks = getCurrentTracks();
    return tracks[currentTaskNumber - 1];
  };

  const getCurrentQuestion = (): MockQuestion | null => {
    const track = getCurrentTrack();
    if (!track) return null;
    return track.questions[currentQuestionIndex] || null;
  };

  const handleVolumeNext = () => {
    setCurrentScreen("directions");
  };

  const handleDirectionsNext = () => {
    setCurrentScreen("moduleStart");
  };

  const handleModuleStartNext = () => {
    setCurrentScreen("task1");
    setCurrentTaskNumber(1);
    setCurrentQuestionIndex(0);
  };

  const handleTask1Next = (choiceIndex: number) => {
    const track = getCurrentTrack();
    if (!track) return;

    const question = getCurrentQuestion();
    if (question) {
      setAnswers([
        ...answers,
        { questionId: question.id, choiceIndex },
      ]);
    }

    // Move to Task 2 (Listening screen)
    if (currentTaskNumber === 1) {
      setCurrentTaskNumber(2);
      setCurrentQuestionIndex(0);
      setCurrentScreen("listening");
    }
  };

  const handleListeningEnd = () => {
    // Audio finished, move to questions
    setCurrentScreen("task2345");
  };

  const handleTask2345Next = (choiceIndex: number) => {
    const track = getCurrentTrack();
    if (!track) return;

    const question = getCurrentQuestion();
    if (question) {
      setAnswers([
        ...answers,
        { questionId: question.id, choiceIndex },
      ]);
    }

    // Check if there are more questions in this task
    const tracks = getCurrentTracks();
    const currentTrack = tracks[currentTaskNumber - 1];
    const nextQuestionIndex = currentQuestionIndex + 1;

    if (nextQuestionIndex < currentTrack.questions.length) {
      // More questions in this task
      setCurrentQuestionIndex(nextQuestionIndex);
      setCurrentScreen("task2345");
    } else if (currentTaskNumber < 4) {
      // Move to next task
      setCurrentTaskNumber((currentTaskNumber + 1) as any);
      setCurrentQuestionIndex(0);
      setCurrentScreen("listening");
    } else {
      // Module complete
      setCurrentScreen("moduleEnd");
    }
  };

  const handleModuleEndNext = () => {
    if (module === 1) {
      // Calculate score and determine difficulty
      const correctCount = answers.filter((answer) => {
        const track = test?.hard.tracks[0]; // Simple calculation
        const question = track?.questions.find((q) => q.id === answer.questionId);
        return (
          question?.choices[answer.choiceIndex]?.isCorrect || false
        );
      }).length;

      const percentage = (correctCount / answers.length) * 100;
      const nextDifficulty = percentage >= 80 ? "hard" : "easy";

      setModule(2);
      setDifficulty(nextDifficulty);
      setCurrentTaskNumber(1);
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setCurrentScreen("moduleStart");
    } else {
      // Test complete
      setCurrentScreen("final");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-pulse">🎧</div>
          <p className="text-xl text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl text-red-600">Failed to load test data</p>
        </div>
      </div>
    );
  }

  const track = getCurrentTrack();
  const question = getCurrentQuestion();

  // Render screens
  switch (currentScreen) {
    case "volume":
      return <VolumeAdjustmentScreen onNext={handleVolumeNext} />;

    case "directions":
      return <ListeningDirectionsScreen onNext={handleDirectionsNext} />;

    case "moduleStart":
      return (
        <ModuleStartScreen
          module={module}
          difficulty={difficulty}
          onNext={handleModuleStartNext}
        />
      );

    case "task1":
      if (!track || !question) return null;
      return (
        <Task1QuestionScreen
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={track.questions.length}
          audioUrl={track.audioUrl}
          question={question.stem}
          choices={question.choices}
          onNext={handleTask1Next}
        />
      );

    case "listening":
      if (!track) return null;
      return (
        <ListeningScreen
          taskNumber={currentTaskNumber as any}
          taskKind={track.taskKind as any}
          audioUrl={track.audioUrl}
          title={track.title}
          onAudioEnd={handleListeningEnd}
        />
      );

    case "task2345":
      if (!track || !question) return null;
      return (
        <Task2345QuestionScreen
          taskNumber={currentTaskNumber as any}
          taskKind={track.taskKind as any}
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={track.questions.length}
          question={question.stem}
          choices={question.choices}
          onNext={handleTask2345Next}
        />
      );

    case "moduleEnd":
      if (!test) return null;
      const correctCount = answers.filter((answer) => {
        for (const track of getCurrentTracks()) {
          const question = track.questions.find((q) => q.id === answer.questionId);
          if (question) {
            return question.choices[answer.choiceIndex]?.isCorrect;
          }
        }
        return false;
      }).length;

      return (
        <ModuleEndScreen
          module={module}
          correctCount={correctCount}
          totalQuestions={answers.length}
          onNext={handleModuleEndNext}
        />
      );

    case "final":
      return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
          <div className="text-center space-y-6 max-w-2xl">
            <div className="text-6xl">🎉</div>
            <h1 className="text-4xl font-bold text-gray-900">
              Test Complete!
            </h1>
            <p className="text-gray-600 text-lg">
              Your Listening section is complete. Your results are being calculated.
            </p>
            <button
              onClick={() => window.location.href = "/"}
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
