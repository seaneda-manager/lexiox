"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InterviewRunner from "@/app/protected/speaking-2026/components/InterviewRunner";
import ListenAndRepeatRunner from "@/app/protected/speaking-2026/components/ListenAndRepeatRunner";
import SpeakingTestLayout2026, { SpeakingHeaderLabel, SpeakingSubHeaderLabel, SpeakingStudyContext, useSpeakingTx } from "@/components/speaking/SpeakingTestLayout2026";
import VolumeControl from "@/components/speaking/VolumeControl";
import { loadStudy, saveStudy, clearStudy } from "@/lib/ui/studyProgress";
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
  /** "test"(기본): 실전과 동일, 영어 고정. "study": 준비 시간·재청취·텍스트 표시 + 한/영 전환. 결과는 study로 기록하고 배정 완료 처리는 하지 않는다. */
  mode?: "test" | "study";
};

type LrRec = { itemId: string; blob: Blob | null; transcript?: string; audioUrl?: string | null };
type IvRec = { questionId: string; blob: Blob | null; transcript?: string; audioUrl?: string | null };

async function markCompleted(assignmentId: string, recordings?: {
  listenRepeat: Array<{ itemId: string; audioDataUrl: string | null }>;
  interview: Array<{ questionId: string; audioDataUrl: string | null }>;
}) {
  const res = await fetch("/api/speaking/assignment-complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignmentId, recordings }),
  });
  return res.json().catch(() => null);
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

const nextButtonStyle: React.CSSProperties = {
  height: 36,
  padding: "0 18px",
  fontSize: 13,
  fontWeight: 700,
  border: "none",
  borderRadius: 6,
  backgroundColor: "#FFFFFF",
  color: "#1E7B7D",
  cursor: "pointer",
};

function AudioCheckStep({ onNext, volume, onVolumeChange }: { onNext: () => void; volume: number; onVolumeChange: (v: number) => void }) {
  const [micLevel, setMicLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startMicTest = async () => {
    try {
      // 이미 켜져 있던 스트림이 있으면 먼저 닫는다 (마이크가 계속 켜진 채 남지 않게)
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
    // 마이크 트랙을 반드시 끈다. 켜 둔 채 시험을 진행하면 아이패드(iOS)가 오디오를 통화 모드로 바꿔
    // 문제 음성이 매우 작게 들린다.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = volume / 100;
    osc.frequency.value = 440;
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close().catch(() => {}); // 쓰고 난 오디오 컨텍스트는 닫는다
    }, 500);
  };

  return (
    <SpeakingTestLayout2026
      headerLeft={<SpeakingHeaderLabel />}
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          <button onClick={() => { stopMicTest(); onNext(); }} style={nextButtonStyle}>
            Next &gt;
          </button>
        </div>
      }
      subHeaderLeft={<SpeakingSubHeaderLabel />}
    >
      <h2 style={{ fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD" }}>
        Audio &amp; Microphone Check
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>
        <div style={{ border: "1px solid #E0E0E0", borderRadius: 6, padding: "18px 20px" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#222", marginBottom: 8 }}>🎤 Microphone Check</p>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>마이크 테스트를 시작하고 몇 초 동안 말씀해주세요.</p>
          <button
            onClick={isRecording ? stopMicTest : startMicTest}
            style={{
              width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, color: "#FFFFFF",
              backgroundColor: isRecording ? "#DC2626" : "#0073E6", border: "none", borderRadius: 4, cursor: "pointer",
            }}
          >
            {isRecording ? "마이크 테스트 중지" : "마이크 테스트 시작"}
          </button>
          {isRecording && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>마이크 레벨: {Math.round(micLevel)}%</p>
              <div style={{ height: 8, width: "100%", borderRadius: 4, backgroundColor: "#E0E0E0" }}>
                <div style={{ height: "100%", borderRadius: 4, backgroundColor: "#0F9D58", width: `${micLevel}%`, transition: "width 0.1s" }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #E0E0E0", borderRadius: 6, padding: "18px 20px" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#222", marginBottom: 8 }}>🔊 Speaker &amp; Headphone Check</p>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>Volume 버튼(우측 상단)에서 스피커/헤드폰 볼륨을 조절하세요.</p>
          <button
            onClick={playTestSound}
            style={{ width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, color: "#FFFFFF", backgroundColor: "#0073E6", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            테스트 음성 재생 (440Hz)
          </button>
        </div>
      </div>
    </SpeakingTestLayout2026>
  );
}

function AboutToBeginStep({ onNext, volume, onVolumeChange }: { onNext: () => void; volume: number; onVolumeChange: (v: number) => void }) {
  return (
    <SpeakingTestLayout2026
      headerLeft={<SpeakingHeaderLabel />}
      headerRight={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          <button onClick={onNext} style={nextButtonStyle}>
            Begin &gt;
          </button>
        </div>
      }
      subHeaderLeft={<SpeakingSubHeaderLabel />}
    >
      <div style={{ maxWidth: 480, margin: "20px auto 0", textAlign: "center" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 8 }}>Ready?</h2>
        <p style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>시험을 시작합니다</p>

        <div style={{ border: "1px solid #E0E0E0", borderRadius: 6, padding: "18px 22px", textAlign: "left", marginBottom: 20 }}>
          {["조용한 환경", "마이크 작동", "헤드폰/스피커", "인터넷 연결"].map((label) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ color: "#0F9D58", fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: 14, color: "#333" }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: "#FFF8E1", border: "1px solid #F0D98C", borderRadius: 6, padding: "14px 16px", fontSize: 13, color: "#7A5B00" }}>
          ⚠️ 시험이 시작되면 이전 문제로 돌아갈 수 없습니다. (Forward-Only)
        </div>
      </div>
    </SpeakingTestLayout2026>
  );
}

export default function SpeakingAssignmentRunner(props: Props) {
  return (
    <SpeakingStudyContext.Provider value={props.mode === "study"}>
      <SpeakingAssignmentRunnerInner {...props} />
    </SpeakingStudyContext.Provider>
  );
}

function SpeakingAssignmentRunnerInner({ assignmentId, test, testLabel, mode = "test" }: Props) {
  const tx = useSpeakingTx();
  const isStudy = mode === "study";
  const [endAck, setEndAck] = useState(false);

  // ── Study 이어 하기: 진행 위치(과제)만 저장한다. 녹음 파일은 브라우저 메모리에만 있어 저장하지 않는다. ──
  const [resumeOffer, setResumeOffer] = useState<{ phase: Phase; savedAt: string } | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  useEffect(() => {
    if (!isStudy) return;
    const saved = loadStudy<{ phase: Phase }>("speaking", test.id);
    setResumeOffer(saved ? { phase: saved.data.phase, savedAt: saved.savedAt } : null);
    setResumeChecked(true);
  }, [isStudy, test.id]);
  const router = useRouter();
  const listenRepeat = test.tasks.find((t) => t.type === "listen_repeat") as SpeakingTaskListenRepeat2026 | undefined;
  const interview = test.tasks.find((t) => t.type === "interview") as SpeakingTaskInterview2026 | undefined;

  // 시험 절차: directions → audio_check → about_to_begin → task1_intro → listen_repeat → task2_intro → interview → done
  const [phase, setPhase] = useState<Phase>("directions");
  useEffect(() => {
    if (!isStudy || !resumeChecked || resumeOffer) return;
    if (phase === "directions" || phase === "done") return;
    saveStudy("speaking", test.id, { phase });
  }, [isStudy, resumeChecked, resumeOffer, phase, test.id]);
  // 실제 ETS는 전용 볼륨 조절 화면이 없다 — 헤더의 Volume 버튼으로 시험 내내 조절한다.
  const [volume, setVolume] = useState(70);

  // 녹음 데이터 관리
  const [listenRepeatRecordings, setListenRepeatRecordings] = useState<LrRec[]>([]);
  const [interviewRecordings, setInterviewRecordings] = useState<IvRec[]>([]);
  const [nextSection, setNextSection] = useState<{ href: string; section: string } | null>(null);
  const [groupCompleted, setGroupCompleted] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

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
    if (isStudy) clearStudy("speaking", test.id);

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
          mode,
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
          mode,
          meta: { questionId: rec.questionId, assignmentId: assignmentId ?? null },
        });
      }),
    ]);

    // 배정을 통해 들어온 경우에만 완료 기록 (Test Mode 등 배정 없는 경우는 스킵)
    if (assignmentId && !isStudy) {
      const json = await markCompleted(assignmentId, {
        listenRepeat: listenRepeatBase64,
        interview: interviewBase64,
      });
      if (json?.nextSection) {
        setNextSection({ href: json.nextSection.href, section: json.nextSection.section });
      }
      if (json?.groupCompleted) {
        setGroupCompleted(true);
        setGroupId(json.groupId ?? null);
      }
    }
  };

  if (isStudy && resumeOffer && phase === "directions") {
    const target: Phase =
      resumeOffer.phase === "listen_repeat" || resumeOffer.phase === "task1_intro" ? "task1_intro"
      : resumeOffer.phase === "interview" || resumeOffer.phase === "task2_intro" ? "task2_intro"
      : "about_to_begin";
    return (
      <SpeakingTestLayout2026
        headerLeft={<SpeakingHeaderLabel />}
        headerRight={<span />}
        subHeaderLeft={<SpeakingSubHeaderLabel />}
      >
        <div style={{ maxWidth: 620, margin: "6px auto 0" }}>
          <h2 style={{ fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD" }}>
            {tx("Resume your study session?", "이어서 학습할까요?")}
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 6 }}>
            {tx("You can continue from the task you were on. Earlier recordings are not kept.", "하던 과제부터 이어서 할 수 있습니다. 이전 녹음은 보관되지 않습니다.")}
          </p>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 22 }}>{tx("Last saved: ", "마지막 저장: ")}{new Date(resumeOffer.savedAt).toLocaleString()}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setPhase(target); setResumeOffer(null); }} style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 6, backgroundColor: "#1E7B7D", color: "#FFFFFF", cursor: "pointer" }}>
              {tx("Resume", "이어서 하기")}
            </button>
            <button onClick={() => { clearStudy("speaking", test.id); setResumeOffer(null); }} style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, borderRadius: 6, backgroundColor: "#FFFFFF", color: "#1E7B7D", border: "1px solid #1E7B7D", cursor: "pointer" }}>
              {tx("Start over", "처음부터")}
            </button>
          </div>
        </div>
      </SpeakingTestLayout2026>
    );
  }

  if (phase === "directions") {
    const totalQuestions = (listenRepeat?.sentences.length ?? 0) + (interview?.questions.length ?? 0);
    return (
      <SpeakingTestLayout2026
        headerLeft={<SpeakingHeaderLabel />}
        headerRight={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <VolumeControl volume={volume} onVolumeChange={setVolume} />
            <button onClick={() => setPhase("audio_check")} style={nextButtonStyle}>
              {tx("Begin >", "시작 >")}
            </button>
          </div>
        }
        subHeaderLeft={<SpeakingSubHeaderLabel />}
      >
        <h2 style={{ fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD" }}>
          {tx("Speaking Section", "Speaking 섹션")}
        </h2>

        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 14 }}>
          {tx(`In the speaking section, you will answer ${totalQuestions} questions to demonstrate how well you can speak English. There are two types of tasks.`, `Speaking 섹션에서는 ${totalQuestions}개 문항으로 영어 말하기 능력을 평가합니다. 문제 유형은 두 가지입니다.`)}
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ backgroundColor: "#1E7B7D", color: "#FFFFFF", textAlign: "left", padding: "10px 14px", fontWeight: 700 }}>
                {tx("Type of Task", "문제 유형")}
              </th>
              <th style={{ backgroundColor: "#1E7B7D", color: "#FFFFFF", textAlign: "left", padding: "10px 14px", fontWeight: 700 }}>
                {tx("Description", "설명")}
              </th>
            </tr>
          </thead>
          <tbody>
            {listenRepeat && (
              <tr style={{ borderBottom: "1px solid #E0E0E0" }}>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: "#222" }}>Listen and Repeat</td>
                <td style={{ padding: "10px 14px", color: "#333" }}>{tx("Listen and repeat what you heard.", "들은 문장을 그대로 따라 말합니다.")}</td>
              </tr>
            )}
            {interview && (
              <tr style={{ borderBottom: "1px solid #E0E0E0" }}>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: "#222" }}>Take an Interview</td>
                <td style={{ padding: "10px 14px", color: "#333" }}>{tx("Answer questions from the interviewer.", "면접관의 질문에 답합니다.")}</td>
              </tr>
            )}
          </tbody>
        </table>

        <p style={{ fontSize: 14, color: "#444" }}>
          {isStudy
            ? tx("Study mode gives you extra preparation time and lets you replay the audio.", "Study 모드에서는 준비 시간이 주어지고 오디오를 다시 들을 수 있습니다.")
            : <>You <strong>WILL NOT</strong> be able to return to previous questions. No preparation time is provided.</>}
        </p>
      </SpeakingTestLayout2026>
    );
  }

  if (phase === "audio_check") {
    return <AudioCheckStep onNext={() => setPhase("about_to_begin")} volume={volume} onVolumeChange={setVolume} />;
  }

  if (phase === "about_to_begin") {
    return (
      <AboutToBeginStep
        onNext={() => setPhase(listenRepeat ? "task1_intro" : "task2_intro")}
        volume={volume}
        onVolumeChange={setVolume}
      />
    );
  }

  if (phase === "task1_intro" && listenRepeat) {
    return (
      <SpeakingTestLayout2026
        headerLeft={<SpeakingHeaderLabel task={1} />}
        headerRight={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <VolumeControl volume={volume} onVolumeChange={setVolume} />
            <button onClick={() => setPhase("listen_repeat")} style={nextButtonStyle}>
              {tx("Begin >", "시작 >")}
            </button>
          </div>
        }
        subHeaderLeft={<SpeakingSubHeaderLabel />}
      >
        <h2 style={{ fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD" }}>
          Listen and Repeat
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 14 }}>
          {tx("You will listen as someone speaks to you. Listen carefully and then repeat what you have heard. The clock will indicate how much time you have to speak.", "누군가 말하는 것을 듣고, 주의 깊게 들은 뒤 들은 내용을 그대로 따라 말합니다. 말할 수 있는 시간은 시계로 표시됩니다.")}
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444" }}>
          {isStudy ? tx("In Study mode, preparation time is provided.", "Study 모드에서는 준비 시간이 주어집니다.") : "No time for preparation will be provided."}
        </p>
      </SpeakingTestLayout2026>
    );
  }

  if (phase === "task2_intro" && interview) {
    return (
      <SpeakingTestLayout2026
        headerLeft={<SpeakingHeaderLabel task={2} />}
        headerRight={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <VolumeControl volume={volume} onVolumeChange={setVolume} />
            <button onClick={() => setPhase("interview")} style={nextButtonStyle}>
              {tx("Begin >", "시작 >")}
            </button>
          </div>
        }
        subHeaderLeft={<SpeakingSubHeaderLabel />}
      >
        <h2 style={{ fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD" }}>
          Take an Interview
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 14 }}>
          {tx("An interviewer will ask you questions. Answer the questions and be sure to say as much as you can in the time allowed.", "면접관이 질문을 합니다. 주어진 시간 안에 최대한 많이 답하세요.")}
        </p>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444" }}>
          {isStudy ? tx("In Study mode, preparation time is provided.", "Study 모드에서는 준비 시간이 주어집니다.") : "No time for preparation will be provided."}
        </p>
      </SpeakingTestLayout2026>
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
        mode={mode}
        totalQuestionOffset={1}
        totalQuestions={11}
        volume={volume}
        onVolumeChange={setVolume}
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
        mode={mode}
        defaultAnswerSeconds={45}
        totalQuestionOffset={8}
        totalQuestions={11}
        volume={volume}
        onVolumeChange={setVolume}
        onComplete={handleInterviewComplete}
      />
    );
  }

  // done - 결과 페이지
  if (phase === "done") {
    if (!endAck) {
      return (
        <SpeakingTestLayout2026
          headerLeft={<SpeakingHeaderLabel />}
          headerRight={<button onClick={() => setEndAck(true)} style={nextButtonStyle}>{tx("Next >", "다음 >")}</button>}
          subHeaderLeft={<SpeakingSubHeaderLabel />}
        >
          <div style={{ maxWidth: 620, margin: "6px auto 0" }}>
            <h2 style={{ fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD" }}>
              {tx("End of Speaking Section", "Speaking 섹션 종료")}
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444" }}>{tx("Thank you for completing the speaking section.", "Speaking 섹션을 마쳤습니다.")}</p>
          </div>
        </SpeakingTestLayout2026>
      );
    }
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

        {nextSection && (
          <Link
            href={nextSection.href}
            className="block rounded-xl bg-black py-3 text-center text-sm font-bold text-white hover:bg-gray-800"
          >
            다음 영역: {nextSection.section === "writing" ? "Writing" : nextSection.section} 계속하기 →
          </Link>
        )}
        {groupCompleted && groupId && (
          <Link
            href={`/student/full-tests/${groupId}`}
            className="block rounded-xl bg-emerald-600 py-3 text-center text-sm font-bold text-white hover:bg-emerald-700"
          >
            전체 결과 보기 →
          </Link>
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
