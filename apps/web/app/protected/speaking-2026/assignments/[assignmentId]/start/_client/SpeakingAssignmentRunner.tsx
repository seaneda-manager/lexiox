"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InterviewRunner from "@/app/protected/speaking-2026/components/InterviewRunner";
import ListenAndRepeatRunner from "@/app/protected/speaking-2026/components/ListenAndRepeatRunner";
import type {
  SpeakingTest2026,
  SpeakingTaskListenRepeat2026,
  SpeakingTaskInterview2026,
} from "@/models/speaking-2026";

type Props = {
  assignmentId: string;
  test: SpeakingTest2026;
  testLabel: string;
};

async function markCompleted(assignmentId: string) {
  await fetch("/api/speaking/assignment-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignmentId }),
  });
}

export default function SpeakingAssignmentRunner({ assignmentId, test, testLabel }: Props) {
  const router = useRouter();
  const listenRepeat = test.tasks.find((t) => t.type === "listen_repeat") as SpeakingTaskListenRepeat2026 | undefined;
  const interview = test.tasks.find((t) => t.type === "interview") as SpeakingTaskInterview2026 | undefined;

  // task 순서: listen_repeat → interview
  const [phase, setPhase] = useState<"intro" | "listen_repeat" | "interview" | "done">(
    "intro"
  );

  const handleListenRepeatComplete = () => {
    if (interview) setPhase("interview");
    else handleAllDone();
  };

  const handleInterviewComplete = async () => {
    await handleAllDone();
  };

  const handleAllDone = async () => {
    setPhase("done");
    await markCompleted(assignmentId);
  };

  if (phase === "intro") {
    return (
      <main className="mx-auto max-w-md space-y-6 px-4 py-10 text-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Speaking Test</p>
          <h1 className="text-2xl font-bold text-slate-900">{testLabel}</h1>
        </div>
        <div className="rounded-xl border bg-white p-6 text-left space-y-3 shadow-sm text-sm text-slate-600">
          {listenRepeat && (
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">1</span>
              <div>
                <p className="font-semibold text-slate-800">듣고 따라말하기</p>
                <p className="text-xs text-slate-400">{listenRepeat.situation} — {listenRepeat.sentences.length}문장</p>
              </div>
            </div>
          )}
          {interview && (
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">2</span>
              <div>
                <p className="font-semibold text-slate-800">인터뷰</p>
                <p className="text-xs text-slate-400">{interview.questions.length}문제 × {interview.questions[0]?.speakingSeconds ?? 45}초</p>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setPhase(listenRepeat ? "listen_repeat" : "interview")}
          className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600"
        >
          시작하기
        </button>
      </main>
    );
  }

  if (phase === "listen_repeat" && listenRepeat) {
    return (
      <ListenAndRepeatRunner
        items={listenRepeat.sentences.map((s) => ({
          id: s.id,
          sentence: s.text,
          audioUrl: s.audioUrl,
          speakingSeconds: s.speakingSeconds,
          region: s.region,
        }))}
        globalImageUrl={listenRepeat.imageUrl}
        mode="test"
        totalQuestionOffset={1}
        totalQuestions={11}
        onComplete={handleListenRepeatComplete}
      />
    );
  }

  if (phase === "interview" && interview) {
    return (
      <InterviewRunner
        questions={interview.questions.map((q) => ({
          id: q.id,
          question: q.text,
          audioUrl: q.audioUrl,
          answerSeconds: q.speakingSeconds,
          topic: q.topic,
        }))}
        interviewerImageUrl={interview.interviewerImageUrl}
        mode="test"
        defaultAnswerSeconds={45}
        totalQuestionOffset={8}
        totalQuestions={11}
        onComplete={handleInterviewComplete}
      />
    );
  }

  // done
  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-16 text-center">
      <div className="text-5xl">🎉</div>
      <h1 className="text-2xl font-bold text-slate-900">시험 완료!</h1>
      <p className="text-sm text-slate-500">{testLabel} 완료되었습니다.</p>
      <button
        onClick={() => router.push("/speaking-2026/assignments")}
        className="rounded-xl border px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        목록으로
      </button>
    </main>
  );
}
