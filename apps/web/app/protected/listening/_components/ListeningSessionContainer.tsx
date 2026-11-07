"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import ListeningDirectionsScreen from "./ListeningDirectionsScreen";
import ModuleStartScreen from "./ModuleStartScreen";
import Task1QuestionScreen from "./Task1QuestionScreen";
import ListeningScreen from "./ListeningScreen";
import Task2345QuestionScreen from "./Task2345QuestionScreen";
import ModuleEndScreen from "./ModuleEndScreen";
import ListeningTestLayout2026, { ListeningStudyContext, ListeningHeaderLabel, ListeningSubHeaderLabel, useListeningTx } from "@/components/listening/ListeningTestLayout2026";
import VolumeControl from "@/components/listening/VolumeControl";
import { loadStudy, saveStudy, clearStudy } from "@/lib/ui/studyProgress";
import type { LListeningTest2026Linear, LListeningTrack2026, LQuestion2026 } from "@/models/listening";
import { isChoiceCorrect } from "@/lib/utils/listeningChoice";

type ScreenType = "directions" | "moduleStart" | "step" | "moduleEnd" | "final";

interface AnswerRecord {
  questionId: string;
  choiceIndex: number;
  isCorrect: boolean;
}

// choose_response 트랙은 질문마다 독립된 오디오라서 별도 "듣기 화면" 없이 바로 문제 화면에서 재생.
// 그 외 트랙은 먼저 트랙 전체를 듣는 화면을 거친 뒤, 딸린 문제들을 순서대로 푼다.
type Step =
  | { kind: "groupIntro" }
  | { kind: "listening"; track: LListeningTrack2026 }
  | { kind: "question"; track: LListeningTrack2026; question: LQuestion2026; qIndex: number };

function buildSteps(tracks: LListeningTrack2026[]): Step[] {
  const steps: Step[] = [];
  let groupIntroAdded = false;
  for (const track of tracks) {
    if (track.taskKind !== "choose_response") {
      // 실제 화면: Choose a Response 문항이 끝나면 "Conversation, Announcement, and Academic Talk" 안내가 한 번 나온다.
      if (!groupIntroAdded) {
        steps.push({ kind: "groupIntro" });
        groupIntroAdded = true;
      }
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

export default function ListeningSessionContainer(props: ListeningSessionContainerProps) {
  return (
    <ListeningStudyContext.Provider value={props.mode === "study"}>
      <ListeningSessionContainerInner {...props} />
    </ListeningStudyContext.Provider>
  );
}

function ListeningSessionContainerInner({
  testData,
  testId,
  assignmentId,
  mode = "test",
}: ListeningSessionContainerProps) {
  const isStudy = mode === "study";
  // 실제 ETS는 전용 볼륨 조절 화면이 없다 — 헤더의 Volume 버튼으로 시험 내내 조절한다.
  const [volume, setVolume] = useState(70);
  const [playbackRate, setPlaybackRate] = useState(1);
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

  // ── Study 이어 풀기 ──────────────────────────────────────────────
  type ListeningSaved = {
    screen: ScreenType; module: 1 | 2; difficulty: "hard" | "easy"; stepIndex: number;
    answers: Record<string, AnswerRecord>;
  };
  const [resumeOffer, setResumeOffer] = useState<{ data: ListeningSaved; savedAt: string } | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  useEffect(() => {
    if (!isStudy) return;
    setResumeOffer(loadStudy<ListeningSaved>("listening", testId));
    setResumeChecked(true);
  }, [isStudy, testId]);
  useEffect(() => {
    if (!isStudy || !resumeChecked || resumeOffer) return;
    if (screen === "directions" || screen === "final") return;
    saveStudy<ListeningSaved>("listening", testId, { screen, module, difficulty, stepIndex, answers });
  }, [isStudy, resumeChecked, resumeOffer, screen, module, difficulty, stepIndex, answers, testId]);

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
    const isCorrect = choiceIndex >= 0 && isChoiceCorrect(question.choices?.[choiceIndex]);
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

  // 중학(jr) 세트처럼 stage2Pool이 없는 단일 모듈 시험은 Module 1 종료 즉시 최종 화면으로 간다.
  // (stage2Pool이 없는데 Module 2로 넘기면 module2Tracks가 빈 배열이라 화면이 멈춘다.)
  const hasStage2 = !!testData.stage2Pool;

  const handleModuleEndNext = async () => {
    const totalQuestions = answerList.length;
    const correctCount = answerList.filter((a) => a.isCorrect).length;
    const isFinalModule = module === 2 || !hasStage2;
    await saveModuleResult(correctCount, totalQuestions, isFinalModule);

    if (module === 1 && hasStage2) {
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

  if (isStudy && resumeOffer && screen === "directions") {
    return (
      <ListeningResumeScreen
        savedAt={resumeOffer.savedAt}
        answered={Object.keys(resumeOffer.data.answers ?? {}).length}
        onResume={() => {
          const d = resumeOffer.data;
          setModule(d.module);
          setDifficulty(d.difficulty);
          setAnswers(d.answers ?? {});
          setStepIndex(d.stepIndex ?? 0);
          setScreen(d.screen === "moduleStart" || d.screen === "moduleEnd" || d.screen === "step" ? d.screen : "moduleStart");
          setResumeOffer(null);
        }}
        onRestart={() => { clearStudy("listening", testId); setResumeOffer(null); }}
      />
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

      if (currentStep.kind === "groupIntro") {
        return <ListeningGroupIntro onNext={advanceStep} volume={volume} onVolumeChange={setVolume} />;
      }

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
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
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
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
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
          tableData={(question as any).tableData}
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
      if (isStudy) clearStudy("listening", testId);
      return (
        <ListeningFinalScreen
          nextHref={nextSection?.href}
          groupHref={groupCompleted && groupId ? `/student/full-tests/${groupId}` : undefined}
        />
      );

    default:
      return null;
  }
}


// ── 실제 ETS 화면: 그룹 안내 / 섹션 종료 ─────────────────────────────────
const etsNextStyle: React.CSSProperties = {
  height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, border: "none",
  borderRadius: 6, backgroundColor: "#FFFFFF", color: "#1E7B7D", cursor: "pointer",
};
const etsTitleStyle: React.CSSProperties = {
  fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD",
};
const etsParaStyle: React.CSSProperties = { fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 14 };

function ListeningGroupIntro({
  onNext, volume, onVolumeChange,
}: { onNext: () => void; volume: number; onVolumeChange: (v: number) => void }) {
  const tx = useListeningTx();
  return (
    <ListeningTestLayout2026
      headerLeft={<ListeningHeaderLabel />}
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          <button onClick={onNext} style={etsNextStyle}>{tx("Next >", "다음 >")}</button>
        </div>
      }
      subHeaderLeft={<ListeningSubHeaderLabel />}
    >
      <div style={{ maxWidth: 620, margin: "6px auto 0" }}>
        <h2 style={etsTitleStyle}>{tx("Conversation, Announcement, and Academic Talk", "대화, 공지, 학술 강의")}</h2>
        <p style={etsParaStyle}>{tx("You will listen only one time and then answer questions.", "한 번만 듣고 문제에 답합니다. (Study 모드에서는 다시 들을 수 있습니다.)")}</p>
        <p style={etsParaStyle}>{tx("In an actual test, the clock will indicate how much time you have to answer.", "실제 시험에서는 답할 수 있는 남은 시간이 시계로 표시됩니다.")}</p>
      </div>
    </ListeningTestLayout2026>
  );
}

function ListeningFinalScreen({ nextHref, groupHref }: { nextHref?: string; groupHref?: string }) {
  const tx = useListeningTx();
  const goNext = () => {
    window.location.href = groupHref ?? nextHref ?? "/student";
  };
  return (
    <ListeningTestLayout2026
      headerLeft={<ListeningHeaderLabel />}
      headerRight={<button onClick={goNext} style={etsNextStyle}>{tx("Next >", "다음 >")}</button>}
      subHeaderLeft={<ListeningSubHeaderLabel />}
    >
      <div style={{ maxWidth: 620, margin: "6px auto 0" }}>
        <h2 style={etsTitleStyle}>{tx("End of Listening Section", "Listening 섹션 종료")}</h2>
        <p style={etsParaStyle}>{tx("Thank you for completing the listening section.", "Listening 섹션을 마쳤습니다.")}</p>
      </div>
    </ListeningTestLayout2026>
  );
}

function ListeningResumeScreen({
  savedAt, answered, onResume, onRestart,
}: { savedAt: string; answered: number; onResume: () => void; onRestart: () => void }) {
  const tx = useListeningTx();
  return (
    <ListeningTestLayout2026
      headerLeft={<ListeningHeaderLabel />}
      headerRight={<span />}
      subHeaderLeft={<ListeningSubHeaderLabel />}
    >
      <div style={{ maxWidth: 620, margin: "6px auto 0" }}>
        <h2 style={etsTitleStyle}>{tx("Resume your study session?", "이어서 학습할까요?")}</h2>
        <p style={etsParaStyle}>{tx(`You have a saved session (${answered} answers saved).`, `저장된 학습이 있습니다 (답 ${answered}개 저장).`)}</p>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 22 }}>{tx("Last saved: ", "마지막 저장: ")}{new Date(savedAt).toLocaleString()}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onResume} style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 6, backgroundColor: "#1E7B7D", color: "#FFFFFF", cursor: "pointer" }}>
            {tx("Resume", "이어서 하기")}
          </button>
          <button onClick={onRestart} style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, borderRadius: 6, backgroundColor: "#FFFFFF", color: "#1E7B7D", border: "1px solid #1E7B7D", cursor: "pointer" }}>
            {tx("Start over", "처음부터")}
          </button>
        </div>
      </div>
    </ListeningTestLayout2026>
  );
}
