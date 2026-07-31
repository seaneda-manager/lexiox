"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import InterviewRunner from "@/app/protected/speaking-2026/components/InterviewRunner";
import ListenAndRepeatRunner from "@/app/protected/speaking-2026/components/ListenAndRepeatRunner";
import type {
  SpeakingTest2026,
  SpeakingTaskListenRepeat2026,
  SpeakingTaskInterview2026,
} from "@/models/speaking-2026";

type Props = {
  /** 배정을 통해 들어온 경우에만 존재. 없으면(Test Mode 등) 완료 기록을 남기지 않는다. */
  assignmentId?: string;
  test: SpeakingTest2026;
  testLabel: string;
};

type LrRec = { itemId: string; blob: Blob | null; transcript?: string; audioUrl?: string | null };
type IvRec = { questionId: string; blob: Blob | null; transcript?: string; audioUrl?: string | null };

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

/**
 * 응답 하나를 speaking_results_2026에 기록한다.
 *
 * 예전에는 배정 완료 시 test_assignments.results_payload에 녹음만 넣고 끝냈다.
 * 그래서 speaking_results_2026이 계속 비어 있었고, 그 테이블을 읽는 채점 화면
 * (/admin/speaking/grade)과 ai-feedback은 쓸 수 있는 데이터가 없었다.
 *
 * 전사는 브라우저 STT로 받는다. 지원하지 않는 브라우저면 빈 문자열이 되는데,
 * 서버가 script를 필수로 요구하므로 그 경우는 건너뛴다 (녹음은 그대로 남는다).
 */
async function recordSpeakingResult(input: {
  testId: string;
  taskId: string;
  script: string;
  audioUrl?: string | null;  // ← 오디오 URL 추가
  prompt?: string;
  mode: "study" | "test";
  meta?: Record<string, unknown>;
}) {
  const script = input.script?.trim();
  if (!script) return;

  const words = script.split(/\s+/).filter(Boolean).length;
  const sentences = script.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean).length;

  try {
    await fetch("/api/speaking-2026/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testId: input.testId,
        taskId: input.taskId,
        script,
        audioUrl: input.audioUrl,  // ← 오디오 URL 전송
        prompt: input.prompt,
        mode: input.mode,
        approxWords: words,
        approxSentences: sentences,
        meta: input.meta ?? {},
      }),
    });
  } catch (e) {
    // 결과 기록 실패가 시험 완료를 막지는 않는다.
    console.warn("Failed to record speaking result:", e);
  }
}

type Phase =
  | "directions"
  | "audio_check"
  | "about_to_begin"
  | "task1_intro"
  | "listen_repeat"
  | "task2_intro"
  | "interview"
  | "done";

function AudioCheckStep({ onNext }: { onNext: () => void }) {
  const [micLevel, setMicLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [speakerVolume, setSpeakerVolume] = useState(50);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = audioContextRef.current ?? new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      setIsRecording(true);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(100, avg / 2.55));
        rafRef.current = requestAnimationFrame(update);
      };
      update();
    } catch {
      alert("마이크 권한이 필요합니다.");
    }
  };

  const stopMicTest = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setMicLevel(0);
  };

  useEffect(() => () => stopMicTest(), []);

  const playTestSound = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = speakerVolume / 100;
    osc.frequency.value = 440;
    osc.start();
    setTimeout(() => osc.stop(), 500);
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 text-center">Audio & Device Check</h1>

      <div className="rounded-xl border bg-white p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">🎤 Microphone Check</h2>
        <p className="text-xs text-slate-500">마이크 테스트를 시작하고 몇 초 동안 말씀해주세요.</p>
        <button
          onClick={isRecording ? stopMicTest : startMicTest}
          className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${
            isRecording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isRecording ? "마이크 테스트 중지" : "마이크 테스트 시작"}
        </button>
        {isRecording && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500">마이크 레벨: {Math.round(micLevel)}%</p>
            <div className="h-2.5 w-full rounded-full bg-slate-200">
              <div className="h-2.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${micLevel}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">🔊 Speaker & Headphone Check</h2>
        <label className="text-xs font-medium text-slate-600">스피커/헤드폰 볼륨: {speakerVolume}%</label>
        <input
          type="range"
          min={0}
          max={100}
          value={speakerVolume}
          onChange={(e) => setSpeakerVolume(Number(e.target.value))}
          className="w-full"
        />
        <button
          onClick={playTestSound}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          테스트 음성 재생 (440Hz)
        </button>
      </div>

      <button
        onClick={() => { stopMicTest(); onNext(); }}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        계속하기 →
      </button>
    </main>
  );
}

function AboutToBeginStep({ onNext }: { onNext: () => void }) {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-10 text-center">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Ready?</h1>
        <p className="mt-2 text-slate-500">시험을 시작합니다</p>
      </div>

      <div className="rounded-xl border bg-white p-6 text-left shadow-sm space-y-3">
        {["조용한 환경", "마이크 작동", "헤드폰/스피커", "인터넷 연결"].map((label) => (
          <div key={label} className="flex items-start gap-3">
            <span className="text-emerald-600">✓</span>
            <span className="text-sm font-medium text-slate-800">{label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        ⚠️ 시험이 시작되면 이전 문제로 돌아갈 수 없습니다. (Forward-Only)
      </div>

      <button
        onClick={onNext}
        className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-lg hover:bg-indigo-700"
      >
        시험 시작 🎤
      </button>
    </main>
  );
}

export default function SpeakingAssignmentRunner({ assignmentId, test, testLabel }: Props) {
  const router = useRouter();
  const listenRepeat = test.tasks.find((t) => t.type === "listen_repeat") as SpeakingTaskListenRepeat2026 | undefined;
  const interview = test.tasks.find((t) => t.type === "interview") as SpeakingTaskInterview2026 | undefined;

  // 시험 절차: directions → audio_check → about_to_begin → task1_intro → listen_repeat → task2_intro → interview → done
  const [phase, setPhase] = useState<Phase>("directions");

  // 녹음 데이터 관리
  const [listenRepeatRecordings, setListenRepeatRecordings] = useState<LrRec[]>([]);
  const [interviewRecordings, setInterviewRecordings] = useState<IvRec[]>([]);

  const handleListenRepeatComplete = (recordings: LrRec[]) => {
    setListenRepeatRecordings(recordings);
    if (interview) setPhase("task2_intro");
    // Task 2가 없으면 여기서 끝. state가 아직 갱신되지 않았으므로 값을 직접 넘긴다.
    else void handleAllDone(recordings, []);
  };

  const handleInterviewComplete = async (recordings: IvRec[]) => {
    setInterviewRecordings(recordings);
    // setState는 즉시 반영되지 않는다. 예전에는 handleAllDone이 state를 읽어서
    // 인터뷰 녹음이 항상 빈 배열로 저장됐다.
    await handleAllDone(listenRepeatRecordings, recordings);
  };

  const handleAllDone = async (lrRecs: LrRec[], ivRecs: IvRec[]) => {

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
      lrRecs.map(async (rec) => ({
        itemId: rec.itemId,
        audioDataUrl: await convertBlobToBase64(rec.blob),
      }))
    );

    const interviewBase64 = await Promise.all(
      ivRecs.map(async (rec) => ({
        questionId: rec.questionId,
        audioDataUrl: await convertBlobToBase64(rec.blob),
      }))
    );

    setPhase("done");

    // 채점·분석용 결과 기록. 배정 여부와 무관하게 남긴다.
    await Promise.all([
      ...lrRecs.map((rec) => {
        const sentence = listenRepeat?.sentences.find((x) => x.id === rec.itemId);
        return recordSpeakingResult({
          testId: test.id,
          taskId: "task1",
          script: rec.transcript ?? "",
          audioUrl: rec.audioUrl,  // ← 오디오 URL 추가
          prompt: sentence?.text,
          mode: "test",
          meta: { itemId: rec.itemId, assignmentId: assignmentId ?? null },
        });
      }),
      ...ivRecs.map((rec) => {
        const question = interview?.questions.find((x) => x.id === rec.questionId);
        return recordSpeakingResult({
          testId: test.id,
          taskId: "task2",
          script: rec.transcript ?? "",
          audioUrl: rec.audioUrl,  // ← 오디오 URL 추가
          prompt: question?.text,
          mode: "test",
          meta: { questionId: rec.questionId, assignmentId: assignmentId ?? null },
        });
      }),
    ]);

    // 배정을 통해 들어온 경우에만 완료 기록 (Test Mode 등 배정 없는 경우는 스킵)
    if (assignmentId) {
      await markCompleted(assignmentId, {
        listenRepeat: listenRepeatBase64,
        interview: interviewBase64,
      });
    }
  };

  if (phase === "directions") {
    return (
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900 text-center">SPEAKING SECTION DIRECTIONS</h1>

        <div className="rounded-xl border bg-slate-50 p-8 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Overview</h2>
            <p className="text-sm text-slate-600">{testLabel} — 총 {(listenRepeat?.sentences.length ?? 0) + (interview?.questions.length ?? 0)}문항입니다.</p>
          </section>

          {listenRepeat && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Task 1: Listen and Repeat ({listenRepeat.sentences.length}문항)</h2>
              <ul className="space-y-1.5 text-sm text-slate-600 list-disc list-inside">
                <li>문장을 듣고 <strong>그대로 따라 말합니다.</strong></li>
                <li>준비 시간: <strong>0초</strong> (즉시 응답)</li>
                <li>응답 시간: 문항마다 다름 (보통 8-12초)</li>
                <li>문장 텍스트는 볼 수 없습니다.</li>
              </ul>
            </section>
          )}

          {interview && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Task 2: Interview ({interview.questions.length}문항)</h2>
              <ul className="space-y-1.5 text-sm text-slate-600 list-disc list-inside">
                <li>질문을 듣고 답변합니다.</li>
                <li>준비 시간: <strong>0초</strong> (즉시 응답)</li>
                <li>응답 시간: 최대 45초, [답변 완료]로 조기 종료 가능</li>
                <li>질문 텍스트는 볼 수 없습니다.</li>
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Important Rules</h2>
            <ul className="space-y-1.5 text-sm text-slate-600 list-disc list-inside">
              <li><strong>Forward-Only:</strong> 이전 문제로 돌아갈 수 없습니다.</li>
              <li><strong>메모 금지:</strong> 필기 도구를 사용할 수 없습니다.</li>
              <li><strong>자동 녹음:</strong> 모든 응답은 자동으로 녹음됩니다.</li>
            </ul>
          </section>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            ⚠️ 한 번 시작하면 일시정지하거나 이전 문항으로 돌아갈 수 없습니다. 조용한 환경과 마이크 작동을 미리 확인하세요.
          </div>
        </div>

        <button
          onClick={() => setPhase("audio_check")}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white hover:bg-blue-700"
        >
          Dismiss Directions & Start →
        </button>
      </main>
    );
  }

  if (phase === "audio_check") {
    return <AudioCheckStep onNext={() => setPhase("about_to_begin")} />;
  }

  if (phase === "about_to_begin") {
    return <AboutToBeginStep onNext={() => setPhase(listenRepeat ? "task1_intro" : "task2_intro")} />;
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
        interviewerImageUrl={interview.interviewerImageUrl || interview.interviewerGifUrl}
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
