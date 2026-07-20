"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Region = { x: number; y: number; w: number; h: number };

type StageSentence = {
  id: string;
  text: string;
  audioUrl: string | null;
  speakingSeconds: number;
  region: Region | null;
};

type StageSummary = { id: string; label: string };

type StageDetail = {
  id: string;
  label: string;
  situation: string;
  imageUrl: string | null;
  sentences: StageSentence[];
};

type Tier = "perfect" | "good" | "pass" | "retry";
type WordDiffEntry = { word: string; matched: boolean };
type ScoreResult = { accuracy: number; tier: Tier; diff: WordDiffEntry[]; pointsEarned: number };

type LeaderboardEntry = { rank: number; name: string; points: number };
type Leaderboard = { top: LeaderboardEntry[]; me: { rank: number | null; points: number } };

type Phase = "speaking" | "prepare" | "recording" | "scoring" | "result" | "review";
type Screen = "stageList" | "loadingStage" | "play" | "cleared" | "error";

const TIER_LABEL: Record<Tier, string> = {
  perfect: "완벽! 🌟",
  good: "좋아요 👍",
  pass: "통과 ✅",
  retry: "다시 도전 🔁",
};

const TIER_STYLE: Record<Tier, string> = {
  perfect: "border-amber-300 bg-amber-50 text-amber-700",
  good: "border-emerald-300 bg-emerald-50 text-emerald-700",
  pass: "border-sky-300 bg-sky-50 text-sky-700",
  retry: "border-neutral-300 bg-neutral-100 text-neutral-600",
};

function playBeep(ctx: AudioContext, freq = 880, duration = 0.15) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

// 프롬프트 재생 — audioUrl이 있으면 재생, 없으면 브라우저 TTS로 대체
function playPrompt(sentence: StageSentence): Promise<void> {
  return new Promise((resolve) => {
    if (sentence.audioUrl) {
      const audio = new Audio(sentence.audioUrl);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentence.text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

function getSpeechRecognitionClass(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export default function ShadowingGame() {
  const [screen, setScreen] = useState<Screen>("stageList");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stages, setStages] = useState<StageSummary[]>([]);
  const [stage, setStage] = useState<StageDetail | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("speaking");
  const [timeLeft, setTimeLeft] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const sttSupportedRef = useRef(false);
  if (typeof window !== "undefined" && !sttSupportedRef.current) {
    sttSupportedRef.current = !!getSpeechRecognitionClass();
  }

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recordingUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

  const current = stage?.sentences[index];

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopMic = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    clearTimer();
  }, []);

  const scoreAttempt = useCallback(async (sentence: StageSentence, stageId: string) => {
    setPhase("scoring");
    try {
      const res = await fetch("/api/speaking-2026/shadowing/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId,
          sentenceId: sentence.id,
          transcript: transcriptRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setPhase("review");
        return;
      }
      setScoreResult({
        accuracy: data.accuracy,
        tier: data.tier,
        diff: data.diff ?? [],
        pointsEarned: data.pointsEarned ?? 0,
      });
      setPhase("result");
    } catch {
      setPhase("review");
    }
  }, []);

  const startRecording = useCallback(async (sentence: StageSentence) => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    playBeep(audioCtxRef.current, 880, 0.15);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: "audio/webm" })
          : null;
        const url = blob ? URL.createObjectURL(blob) : null;
        recordingUrlRef.current = url;
        setRecordingUrl(url);

        if (sttSupportedRef.current && stage) {
          void scoreAttempt(sentence, stage.id);
        } else {
          setPhase("review");
        }
      };

      recorder.start();

      transcriptRef.current = "";
      const SpeechRecognitionClass = getSpeechRecognitionClass();
      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (e: any) => {
          let final = "";
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
          }
          if (final) transcriptRef.current = final;
        };
        recognition.onerror = () => {};
        recognitionRef.current = recognition;
        recognition.start();
      }

      setPhase("recording");
      setTimeLeft(sentence.speakingSeconds);

      clearTimer();
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopMic();
            if (audioCtxRef.current) playBeep(audioCtxRef.current, 440, 0.2);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setErrorMessage("마이크 권한을 확인해 주세요.");
      setScreen("error");
    }
  }, [stopMic, stage, scoreAttempt]);

  const runRound = useCallback(async (sentence: StageSentence) => {
    setScoreResult(null);
    setPhase("speaking");
    await playPrompt(sentence);
    setPhase("prepare");
    setTimeout(() => void startRecording(sentence), 400);
  }, [startRecording]);

  useEffect(() => {
    if (current) void runRound(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/speaking-2026/shadowing/stages", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          setErrorMessage("스테이지를 불러오지 못했습니다.");
          setScreen("error");
          return;
        }
        setStages(data.stages ?? []);
      } catch {
        if (!cancelled) {
          setErrorMessage("스테이지를 불러오지 못했습니다.");
          setScreen("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopMic();
      window.speechSynthesis?.cancel();
      audioCtxRef.current?.close();
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    };
  }, [stopMic]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/speaking-2026/shadowing/leaderboard", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setLeaderboard({ top: data.top ?? [], me: data.me ?? { rank: null, points: 0 } });
      }
    } catch {
      // 랭킹 실패는 게임 진행에 영향 없음 — 조용히 무시
    }
  }, []);

  useEffect(() => {
    if (screen === "cleared") void fetchLeaderboard();
  }, [screen, fetchLeaderboard]);

  const enterStage = async (stageId: string) => {
    setScreen("loadingStage");
    try {
      const res = await fetch(`/api/speaking-2026/shadowing/stages/${stageId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data.stage?.sentences?.length) {
        setErrorMessage("스테이지를 불러오지 못했습니다.");
        setScreen("error");
        return;
      }
      setStage(data.stage);
      setIndex(0);
      setStreak(0);
      setCompletedCount(0);
      setScreen("play");
      void runRound(data.stage.sentences[0]);
    } catch {
      setErrorMessage("스테이지를 불러오지 못했습니다.");
      setScreen("error");
    }
  };

  const goNext = (success: boolean) => {
    const nextStreak = success ? streak + 1 : 0;
    setStreak(nextStreak);
    setBestStreak((prev) => Math.max(prev, nextStreak));
    if (success) setCompletedCount((prev) => prev + 1);

    if (stage && index < stage.sentences.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setScreen("cleared");
    }
  };

  const retry = () => {
    if (current) void runRound(current);
  };

  const backToStageList = () => {
    stopMic();
    window.speechSynthesis?.cancel();
    setStage(null);
    setShowLeaderboard(false);
    setScreen("stageList");
  };

  const replayStage = () => {
    if (!stage) return;
    setIndex(0);
    setStreak(0);
    setCompletedCount(0);
    setScreen("play");
    void runRound(stage.sentences[0]);
  };

  if (screen === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-neutral-600">
        <div>{errorMessage ?? "오류가 발생했습니다."}</div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (screen === "loadingStage") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-neutral-500">
        스테이지를 불러오는 중...
      </div>
    );
  }

  if (screen === "stageList") {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold text-neutral-900">쉐도잉 게임</div>
          <div className="mt-1 text-sm text-neutral-500">
            장소를 선택하고, 그림 속 장면에 맞춰 문장을 따라 말해보세요.
          </div>
          <button
            type="button"
            onClick={() => {
              setShowLeaderboard((v) => !v);
              if (!leaderboard) void fetchLeaderboard();
            }}
            className="mt-3 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
          >
            🏆 전체 랭킹 {showLeaderboard ? "숨기기" : "보기"}
          </button>
        </div>

        {showLeaderboard ? (
          <div className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
            {!leaderboard ? (
              <div className="text-center text-sm text-neutral-400">불러오는 중...</div>
            ) : leaderboard.top.length === 0 ? (
              <div className="text-center text-sm text-neutral-400">
                아직 기록이 없습니다. 첫 랭커가 되어보세요!
              </div>
            ) : (
              <div className="space-y-1.5">
                {leaderboard.top.map((row) => (
                  <div
                    key={row.rank}
                    className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm even:bg-neutral-50"
                  >
                    <span className="font-medium text-neutral-700">
                      {row.rank}. {row.name}
                    </span>
                    <span className="text-neutral-500">{row.points} pt</span>
                  </div>
                ))}
                {leaderboard.me.rank && leaderboard.me.rank > leaderboard.top.length ? (
                  <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-1.5 text-sm">
                    <span className="font-medium text-sky-700">내 순위: {leaderboard.me.rank}위</span>
                    <span className="text-sky-600">{leaderboard.me.points} pt</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {stages.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-neutral-50 p-8 text-center text-sm text-neutral-500">
            아직 등록된 스테이지가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {stages.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => void enterStage(s.id)}
                className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-neutral-400 hover:shadow"
              >
                <div className="text-base font-semibold text-neutral-900">{s.label}</div>
                <div className="mt-1 text-xs text-neutral-400">스테이지 시작 →</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (screen === "cleared") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center">
        <div className="text-2xl font-bold text-neutral-900">{stage?.label} 클리어! 🎉</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border bg-neutral-50 p-4">
            <div className="text-2xl font-bold text-neutral-900">{completedCount}</div>
            <div className="text-neutral-500">성공한 문장</div>
          </div>
          <div className="rounded-xl border bg-neutral-50 p-4">
            <div className="text-2xl font-bold text-neutral-900">{bestStreak}</div>
            <div className="text-neutral-500">최고 스트릭</div>
          </div>
        </div>

        {leaderboard ? (
          <div className="w-full rounded-2xl border bg-white p-4 text-left shadow-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
              🏆 쉐도잉 랭킹 TOP 5
            </div>
            <div className="space-y-1">
              {leaderboard.top.slice(0, 5).map((row) => (
                <div key={row.rank} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700">{row.rank}. {row.name}</span>
                  <span className="text-neutral-500">{row.points} pt</span>
                </div>
              ))}
            </div>
            {leaderboard.me.rank ? (
              <div className="mt-2 border-t pt-2 text-sm font-medium text-sky-700">
                내 순위: {leaderboard.me.rank}위 ({leaderboard.me.points} pt)
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={backToStageList}
            className="rounded-lg border px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            다른 스테이지
          </button>
          <button
            type="button"
            onClick={replayStage}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            다시 플레이
          </button>
        </div>
      </div>
    );
  }

  // screen === "play"
  const progressPct = stage ? ((index + 1) / stage.sentences.length) * 100 : 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 py-10">
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-center justify-between text-sm text-neutral-500">
          <button type="button" onClick={backToStageList} className="hover:text-neutral-700">
            ← 스테이지 목록
          </button>
          <span>
            {index + 1} / {stage?.sentences.length ?? 0}
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
            🔥 스트릭 {streak}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-neutral-900 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {!sttSupportedRef.current ? (
        <div className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-500">
          이 브라우저는 자동 채점을 지원하지 않아요 — Chrome을 권장합니다.
        </div>
      ) : null}

      <div className="relative w-full overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ aspectRatio: "4 / 3" }}>
        {stage?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stage.imageUrl} alt={stage.situation} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            이미지 없음
          </div>
        )}

        {current?.region ? (
          <div
            className="pointer-events-none absolute rounded-md border-4 border-red-500 bg-red-500/15 transition-all duration-300"
            style={{
              left: `${current.region.x}%`,
              top: `${current.region.y}%`,
              width: `${current.region.w}%`,
              height: `${current.region.h}%`,
            }}
          />
        ) : null}
      </div>

      <div className="w-full rounded-2xl border bg-neutral-50 p-5 text-center">
        <div className="text-lg font-semibold text-neutral-900">{current?.text}</div>
      </div>

      <div className="flex flex-col items-center gap-3">
        {phase === "speaking" ? (
          <div className="text-sm font-medium text-neutral-600">🔊 문장을 듣는 중...</div>
        ) : null}
        {phase === "prepare" ? (
          <div className="text-sm font-medium text-neutral-600">따라 말할 준비...</div>
        ) : null}
        {phase === "recording" ? (
          <div className="text-sm font-semibold text-red-600">● 녹음 중 ({timeLeft}s)</div>
        ) : null}
        {phase === "scoring" ? (
          <div className="text-sm font-medium text-neutral-600">채점 중...</div>
        ) : null}
      </div>

      {phase === "result" && scoreResult ? (
        <div className="flex w-full flex-col items-center gap-4 rounded-2xl border bg-neutral-50 p-6">
          <div
            className={`rounded-full border px-4 py-1.5 text-sm font-bold ${TIER_STYLE[scoreResult.tier]}`}
          >
            {TIER_LABEL[scoreResult.tier]} · 인식률 {scoreResult.accuracy}%
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {scoreResult.diff.map((entry, i) => (
              <span
                key={i}
                className={
                  entry.matched
                    ? "rounded bg-emerald-100 px-2 py-0.5 text-sm text-emerald-800"
                    : "rounded bg-neutral-200 px-2 py-0.5 text-sm text-neutral-500"
                }
              >
                {entry.word}
              </span>
            ))}
          </div>

          {scoreResult.pointsEarned > 0 ? (
            <div className="text-sm font-semibold text-amber-600">+{scoreResult.pointsEarned} pt 획득!</div>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => current && void playPrompt(current)}
              className="rounded-lg border bg-white px-3 py-2 text-xs hover:bg-neutral-100"
            >
              🔊 원음 다시 듣기
            </button>
            {recordingUrl ? (
              <button
                type="button"
                onClick={() => new Audio(recordingUrl).play()}
                className="rounded-lg border bg-white px-3 py-2 text-xs hover:bg-neutral-100"
              >
                🎙 내 녹음 듣기
              </button>
            ) : null}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={retry}
              className="rounded-lg border px-4 py-2 text-sm text-neutral-700 hover:bg-white"
            >
              다시 도전
            </button>
            <button
              type="button"
              onClick={() => goNext(scoreResult.tier !== "retry")}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              다음 문장
            </button>
          </div>
        </div>
      ) : null}

      {phase === "review" ? (
        <div className="flex w-full flex-col items-center gap-4 rounded-2xl border bg-neutral-50 p-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => current && void playPrompt(current)}
              className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-neutral-100"
            >
              🔊 원음 다시 듣기
            </button>
            {recordingUrl ? (
              <button
                type="button"
                onClick={() => new Audio(recordingUrl).play()}
                className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-neutral-100"
              >
                🎙 내 녹음 듣기
              </button>
            ) : null}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={retry}
              className="rounded-lg border px-4 py-2 text-sm text-neutral-700 hover:bg-white"
            >
              다시 도전
            </button>
            <button
              type="button"
              onClick={() => goNext(true)}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              성공! 다음 문장
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
