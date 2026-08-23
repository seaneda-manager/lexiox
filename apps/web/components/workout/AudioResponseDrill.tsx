"use client";

import { useEffect, useRef, useState } from "react";
import StageScaffold from "@/components/common/stage/StageScaffold";
import { audioTaskLabel, type AudioDrillItem } from "@/lib/workout/audioDrillTypes";

type Phase = "listening" | "responding" | "feedback";

// 브라우저 내장 speechSynthesis는 학생 컴퓨터에 영어 음성팩이 없으면 한국어 음성이 영어를
// 억지로 읽어버리는 문제가 있어서(2026-08-24 실사용 테스트로 확인), 기존에 레벨테스트 듣기
// 생성에서 쓰던 것과 같은 ElevenLabs 파이프라인(/api/speaking/generate-audio)으로 대체한다.
// 한 번 생성된 음성은 Supabase Storage에 저장되어 재사용되므로, 같은 세션에서 다시 듣기를
// 눌러도 재호출하지 않도록 URL을 캐시한다.
async function fetchSpeechUrl(text: string, voiceIndex: number): Promise<string> {
  const res = await fetch("/api/speaking/generate-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceIndex }),
  });
  const data = await res.json();
  if (!res.ok || !data?.data?.url) throw new Error(data?.error ?? "음성 생성에 실패했습니다.");
  return data.data.url as string;
}

export default function AudioResponseDrill({
  items,
  onComplete,
}: {
  items: AudioDrillItem[];
  onComplete?: (result: { correct: number; gradable: number; total: number }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("listening");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gradableCount, setGradableCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  const item = items[index];
  const isLast = index === items.length - 1;

  useEffect(() => {
    setPhase("listening");
    setIsSpeaking(false);
    setIsGenerating(false);
    setAudioError(null);
    setHasPlayedOnce(false);
    setSelectedChoice(null);
    setNotes(item ? new Array(item.notePrompts?.length ?? 0).fill("") : []);
    return () => {
      audioRef.current?.pause();
    };
  }, [index, item]);

  useEffect(() => {
    if (phase !== "responding") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setSecondsLeft(item?.timeLimitSec ?? 30);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("feedback");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!item) return null;

  const handlePlay = async () => {
    setAudioError(null);
    try {
      let url = audioCacheRef.current.get(item.id);
      if (!url) {
        setIsGenerating(true);
        url = await fetchSpeechUrl(item.script, index % 8);
        audioCacheRef.current.set(item.id, url);
        setIsGenerating(false);
      }
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (e: any) {
      setIsGenerating(false);
      setAudioError(e?.message ?? "음성 재생에 실패했습니다.");
    }
  };

  const handleChoice = (i: number) => {
    setSelectedChoice(i);
    setPhase("feedback");
    setGradableCount((c) => c + 1);
    if (item.choices?.[i]?.correct) setCorrectCount((c) => c + 1);
  };

  const handleNext = () => {
    if (isLast) {
      onComplete?.({ correct: correctCount, gradable: gradableCount, total: items.length });
      return;
    }
    setIndex((i) => i + 1);
  };

  const isMcq = item.taskKind !== "notetaking";

  return (
    <div className="h-full w-full">
      <StageScaffold
        stageLabel={audioTaskLabel(item.taskKind)}
        step={{ index: index + 1, total: items.length }}
        title={item.title ?? "오디오를 듣고 응답하세요"}
        subtitle={phase === "listening" ? "먼저 재생 버튼을 눌러 들어보세요" : item.prompt}
        topRight={
          phase === "responding" ? (
            <div
              className={[
                "rounded-full border px-3 py-1 text-xs font-extrabold tabular-nums",
                secondsLeft <= 5 ? "border-rose-300 bg-rose-50 text-rose-600" : "border-black/10 bg-white/70 text-slate-700",
              ].join(" ")}
            >
              ⏱ {secondsLeft}s
            </div>
          ) : isMcq && gradableCount > 0 ? (
            <div className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-700">
              점수 {correctCount}/{gradableCount}
            </div>
          ) : undefined
        }
        primary={
          phase === "listening"
            ? { label: "답하기", onClick: () => setPhase("responding"), disabled: !hasPlayedOnce }
            : phase === "feedback"
              ? { label: isLast ? "결과 보기" : "다음 문제", onClick: handleNext }
              : undefined
        }
        secondary={
          phase === "listening"
            ? {
                label: isGenerating ? "음성 생성 중…" : isSpeaking ? "재생 중…" : hasPlayedOnce ? "다시 듣기" : "▶ 재생",
                onClick: handlePlay,
                disabled: isSpeaking || isGenerating,
              }
            : undefined
        }
      >
        <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6">
          {phase === "listening" && (
            <div className="flex flex-col items-center gap-4">
              <audio
                ref={audioRef}
                onPlay={() => setIsSpeaking(true)}
                onEnded={() => {
                  setIsSpeaking(false);
                  setHasPlayedOnce(true);
                }}
                onError={() => {
                  setIsSpeaking(false);
                  setAudioError("음성 파일을 재생할 수 없습니다.");
                }}
                className="hidden"
              />
              <div
                className={[
                  "flex h-32 w-32 items-center justify-center rounded-full text-5xl transition",
                  isSpeaking ? "bg-emerald-100 motion-safe:animate-pulse" : "bg-slate-100",
                ].join(" ")}
              >
                {isGenerating ? "⏳" : isSpeaking ? "🔊" : "🎧"}
              </div>
              <p className="text-sm text-slate-500">
                {isGenerating
                  ? "AI 음성을 생성하고 있어요 (몇 초 걸려요)…"
                  : hasPlayedOnce
                    ? "다 들으셨으면 답하기를 눌러주세요"
                    : "재생 버튼을 눌러 지문을 들어보세요"}
              </p>
              {audioError && <p className="text-sm font-semibold text-rose-500">{audioError}</p>}
            </div>
          )}

          {phase === "responding" && isMcq && (
            <div className="w-full space-y-2">
              {(item.choices ?? []).map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleChoice(i)}
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-left text-[15px] leading-relaxed transition hover:border-emerald-300 hover:bg-emerald-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {c.text}
                </button>
              ))}
            </div>
          )}

          {phase === "responding" && !isMcq && (
            <div className="w-full space-y-3">
              {(item.notePrompts ?? []).map((label, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">{label}</label>
                  <textarea
                    rows={2}
                    value={notes[i] ?? ""}
                    onChange={(e) => setNotes((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPhase("feedback")}
                className="w-full rounded-2xl bg-emerald-700 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-600"
              >
                제출하고 모범 노트 보기
              </button>
            </div>
          )}

          {phase === "feedback" && isMcq && (
            <div className="w-full space-y-2">
              {(item.choices ?? []).map((c, i) => {
                const isSelected = selectedChoice === i;
                const isCorrect = !!c.correct;
                let cls = "w-full rounded-2xl border px-4 py-3 text-left text-[15px] leading-relaxed";
                if (isCorrect) cls += " border-emerald-400 bg-emerald-50 text-emerald-900";
                else if (isSelected) cls += " border-rose-300 bg-rose-50 text-rose-800";
                else cls += " border-black/5 bg-white text-slate-400";
                return (
                  <div key={i} className={cls}>
                    {c.text}
                    {isCorrect && <span className="ml-2 text-emerald-600">✓</span>}
                    {isSelected && !isCorrect && <span className="ml-2 text-rose-500">✕</span>}
                  </div>
                );
              })}
              <p className={`text-center text-sm font-bold ${selectedChoice !== null && item.choices?.[selectedChoice]?.correct ? "text-emerald-600" : "text-rose-500"}`}>
                {selectedChoice === null ? "시간 초과 — 정답을 확인하세요" : item.choices?.[selectedChoice]?.correct ? "정답입니다! 🎉" : "아쉬워요 — 정답을 확인하세요"}
              </p>
            </div>
          )}

          {phase === "feedback" && !isMcq && (
            <div className="w-full space-y-3">
              <p className="text-xs font-semibold text-slate-500">모범 노트와 비교해보세요</p>
              {(item.notePrompts ?? []).map((label, i) => (
                <div key={i} className="rounded-xl border border-black/5 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-400">{label}</p>
                  <p className="mt-1 text-sm text-slate-500 line-through decoration-slate-300">{notes[i] || "(작성 안 함)"}</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">{item.modelNotes?.[i] ?? "-"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </StageScaffold>
    </div>
  );
}
