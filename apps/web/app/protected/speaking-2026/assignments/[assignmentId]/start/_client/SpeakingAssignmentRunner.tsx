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

async function markCompleted(assignmentId: string, recordings?: {
  listenRepeat: Array<{ itemId: string; audioDataUrl: string | null }>;
  interview: Array<{ questionId: string; audioDataUrl: string | null }>;
}) {
  await fetch("/api/speaking/assignment-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignmentId, recordings }),
  });
}

export default function SpeakingAssignmentRunner({ assignmentId, test, testLabel }: Props) {
  const router = useRouter();
  const listenRepeat = test.tasks.find((t) => t.type === "listen_repeat") as SpeakingTaskListenRepeat2026 | undefined;
  const interview = test.tasks.find((t) => t.type === "interview") as SpeakingTaskInterview2026 | undefined;

  // task 순서: intro → task1_intro → listen_repeat → task2_intro → interview → done
  const [phase, setPhase] = useState<"intro" | "task1_intro" | "listen_repeat" | "task2_intro" | "interview" | "done">(
    "intro"
  );

  // 녹음 데이터 관리
  const [listenRepeatRecordings, setListenRepeatRecordings] = useState<Array<{ itemId: string; blob: Blob | null }>>([]);
  const [interviewRecordings, setInterviewRecordings] = useState<Array<{ questionId: string; blob: Blob | null }>>([]);

  const handleListenRepeatComplete = (recordings: Array<{ itemId: string; blob: Blob | null }>) => {
    console.log('✅ Listen & Repeat complete:', recordings.length, 'recordings');
    setListenRepeatRecordings(recordings);
    if (interview) setPhase("task2_intro");
    else handleAllDone();
  };

  const handleInterviewComplete = async (recordings: Array<{ questionId: string; blob: Blob | null }>) => {
    console.log('✅ Interview complete:', recordings.length, 'recordings');
    setInterviewRecordings(recordings);
    await handleAllDone();
  };

  const handleAllDone = async () => {
    console.log('✅ All done, saving results...');

    // Blob을 Base64로 변환
    const convertBlobToBase64 = (blob: Blob | null): Promise<string | null> => {
      if (!blob) return Promise.resolve(null);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    };

    // 모든 녹음을 Base64로 변환
    const listenRepeatBase64 = await Promise.all(
      listenRepeatRecordings.map(async (rec) => ({
        itemId: rec.itemId,
        audioDataUrl: await convertBlobToBase64(rec.blob),
      }))
    );

    const interviewBase64 = await Promise.all(
      interviewRecordings.map(async (rec) => ({
        questionId: rec.questionId,
        audioDataUrl: await convertBlobToBase64(rec.blob),
      }))
    );

    setPhase("done");

    // recordings 포함해서 저장
    await markCompleted(assignmentId, {
      listenRepeat: listenRepeatBase64,
      interview: interviewBase64,
    });
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
          onClick={() => setPhase(listenRepeat ? "task1_intro" : "task2_intro")}
          className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600"
        >
          시작하기
        </button>
      </main>
    );
  }

  if (phase === "task1_intro" && listenRepeat) {
    return (
      <main className="mx-auto max-w-md space-y-6 px-4 py-10">
        <div className="space-y-4">
          <div className="rounded-full bg-sky-100 w-16 h-16 flex items-center justify-center mx-auto">
            <span className="text-2xl">🎤</span>
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Task 1: 듣고 따라말하기</h1>
            <p className="text-sm text-slate-500">{listenRepeat.situation}</p>
          </div>
        </div>
        <div className="rounded-xl border bg-blue-50 p-6 space-y-3">
          <p className="text-sm font-semibold text-slate-800">📋 Instructions</p>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>✓ 음성으로 주어진 문장을 주의깊게 들으세요</li>
            <li>✓ 준비 시간이 주어집니다</li>
            <li>✓ 음성을 따라 반복해서 말해주세요</li>
            <li>✓ 발음, 유창성, 정확성이 평가됩니다</li>
          </ul>
        </div>
        <button
          onClick={() => setPhase("listen_repeat")}
          className="w-full rounded-xl bg-sky-500 py-3 text-sm font-semibold text-white hover:bg-sky-600"
        >
          시작하기
        </button>
      </main>
    );
  }

  if (phase === "task2_intro" && interview) {
    return (
      <main className="mx-auto max-w-md space-y-6 px-4 py-10">
        <div className="space-y-4">
          <div className="rounded-full bg-violet-100 w-16 h-16 flex items-center justify-center mx-auto">
            <span className="text-2xl">💬</span>
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Task 2: 인터뷰</h1>
            <p className="text-sm text-slate-500">{interview.questions.length}개 질문</p>
          </div>
        </div>
        <div className="rounded-xl border bg-violet-50 p-6 space-y-3">
          <p className="text-sm font-semibold text-slate-800">📋 Instructions</p>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>✓ 각 질문을 주의깊게 들으세요</li>
            <li>✓ 준비 시간이 주어집니다</li>
            <li>✓ 자신의 생각과 경험을 바탕으로 답해주세요</li>
            <li>✓ 문법, 발음, 일관성이 평가됩니다</li>
          </ul>
        </div>
        <button
          onClick={() => setPhase("interview")}
          className="w-full rounded-xl bg-violet-500 py-3 text-sm font-semibold text-white hover:bg-violet-600"
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

  // done - 결과 페이지
  if (phase === "done") {
    return (
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <div className="text-center space-y-2 mb-8">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold text-slate-900">시험 완료!</h1>
          <p className="text-sm text-slate-500">{testLabel} 완료되었습니다.</p>
        </div>

        {/* Task 1 결과 */}
        {listenRepeatRecordings.length > 0 && (
          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-semibold text-sky-700">Task 1</span>
              <h2 className="text-sm font-semibold text-slate-900">듣고 따라말하기 - 녹음</h2>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {listenRepeatRecordings.map((rec, idx) => (
                <div key={rec.itemId} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <span className="text-xs font-semibold text-slate-600 shrink-0">문장 {idx + 1}</span>
                  {rec.blob ? (
                    <audio
                      controls
                      src={URL.createObjectURL(rec.blob)}
                      className="flex-1 h-8"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">녹음 없음</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Task 2 결과 */}
        {interviewRecordings.length > 0 && (
          <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-violet-100 px-3 py-0.5 text-xs font-semibold text-violet-700">Task 2</span>
              <h2 className="text-sm font-semibold text-slate-900">인터뷰 - 녹음</h2>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {interviewRecordings.map((rec, idx) => (
                <div key={rec.questionId} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <span className="text-xs font-semibold text-slate-600 shrink-0">질문 {idx + 1}</span>
                  {rec.blob ? (
                    <audio
                      controls
                      src={URL.createObjectURL(rec.blob)}
                      className="flex-1 h-8"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">녹음 없음</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-3 justify-center pt-4">
          <button
            onClick={() => router.push("/speaking-2026/assignments")}
            className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            목록으로
          </button>
        </div>
      </main>
    );
  }
}
