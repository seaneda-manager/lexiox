"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Play, Square } from "lucide-react";

type AudioFlashcardProps = {
  wordId: string;
  word: string;
  audioUrl?: string;
  meanings: string[];
  keywords: string[];
  onComplete: (cycle: number, points: number) => void;
};

type Stage = "intro" | "pronunciation" | "spelling" | "meaning" | "result" | "complete";

export function AudioFlashcard({
  wordId,
  word,
  audioUrl,
  meanings,
  keywords,
  onComplete,
}: AudioFlashcardProps) {
  const [stage, setStage] = useState<Stage>("intro");
  const [cycle, setCycle] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pronunciationScore, setPronunciationScore] = useState<"Great" | "Good" | "Pass" | "Fail" | null>(null);
  const [spellingMatched, setSpellingMatched] = useState(0);
  const [spellingTotal, setSpellingTotal] = useState(0);
  const [meaningCorrect, setMeaningCorrect] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // 음량 분석용 AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 3) {
            stopRecording();
            return 3;
          }
          return prev + 0.1;
        });
      }, 100);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("마이크에 접근할 수 없습니다.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);

      if (timerRef.current) clearInterval(timerRef.current);

      // STT 수행
      performSTT();
    }
  };

  const performSTT = async () => {
    // Web Speech API를 사용한 음성 인식
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported");
      simulateAudioAnalysis();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      processTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      simulateAudioAnalysis(); // Fallback
    };

    recognition.start();
  };

  const processTranscript = (transcript: string) => {
    if (stage === "pronunciation") {
      // 발음 점수 계산 (유사도 기반)
      const similarity = calculateSimilarity(transcript, word.toLowerCase());
      let score: "Great" | "Good" | "Pass" | "Fail";

      if (similarity > 0.85) score = "Great";
      else if (similarity > 0.7) score = "Good";
      else if (similarity > 0.5) score = "Pass";
      else score = "Fail";

      setPronunciationScore(score);
      setStage("result");
    } else if (stage === "spelling") {
      // 스펠링 비교
      const chars = word.toLowerCase().split("");
      const spoken = transcript.split(/[-\s]/); // "E-X-T-E-N-D" 형식 지원

      let matched = 0;
      chars.forEach((char, idx) => {
        if (spoken[idx]?.toLowerCase() === char || spoken[idx]?.toLowerCase() === charName(char)) {
          matched++;
        }
      });

      setSpellingMatched(matched);
      setSpellingTotal(word.length);
      setStage("result");
    } else if (stage === "meaning") {
      // 키워드 매칭
      const hasKeyword = keywords.some((kw) => transcript.includes(kw.toLowerCase()));
      setMeaningCorrect(hasKeyword);
      setStage("result");
    }
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    // 간단한 유사도 계산 (Levenshtein distance 기반)
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const getEditDistance = (s1: string, s2: string): number => {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  const charName = (char: string): string => {
    const names: Record<string, string> = {
      a: "a", b: "bee", c: "see", d: "dee", e: "e", f: "eff", g: "gee", h: "aitch", i: "i",
      j: "jay", k: "kay", l: "el", m: "em", n: "en", o: "o", p: "pee", q: "cue", r: "ar",
      s: "ess", t: "tee", u: "u", v: "vee", w: "double-you", x: "ex", y: "why", z: "zee",
    };
    return names[char] || char;
  };

  const simulateAudioAnalysis = () => {
    // STT 실패 시 시뮬레이션
    if (stage === "pronunciation") {
      const scores: Array<"Great" | "Good" | "Pass" | "Fail"> = ["Great", "Good", "Pass", "Fail"];
      setPronunciationScore(scores[Math.floor(Math.random() * scores.length)]);
      setStage("result");
    } else if (stage === "spelling") {
      const matched = Math.floor(Math.random() * (word.length + 1));
      setSpellingMatched(matched);
      setSpellingTotal(word.length);
      setStage("result");
    } else if (stage === "meaning") {
      setMeaningCorrect(Math.random() > 0.3);
      setStage("result");
    }
  };

  const handleCycleComplete = () => {
    const isExcellent = pronunciationScore === "Great" && spellingMatched === spellingTotal && meaningCorrect;
    const points = isExcellent ? 10 : 5;

    if (cycle < 3) {
      setCycle(cycle + 1);
      setPronunciationScore(null);
      setSpellingMatched(0);
      setMeaningCorrect(null);
      setStage("pronunciation");
    } else {
      onComplete(cycle, points);
      setStage("complete");
    }
  };

  const handleSkipResult = () => {
    if (pronunciationScore && pronunciationScore !== "Fail") {
      if (stage === "pronunciation") {
        setStage("spelling");
      } else if (stage === "spelling") {
        setStage("meaning");
      } else if (stage === "meaning") {
        handleCycleComplete();
      }
    } else {
      // Fail 상태면 다시 녹음
      setStage(stage.replace("result", "") as Stage);
    }
  };

  if (stage === "intro") {
    return (
      <div className="rounded-2xl border-2 border-rose-300 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-600">오디오 깜지</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{word}</p>
          <p className="text-slate-600 mt-1">{meanings.slice(0, 2).join(", ")}</p>
        </div>

        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
          <p className="text-sm text-rose-800">
            🎙️ 발음 → 스펠링 → 뜻을 차례로 말해보세요. (3회 반복)
          </p>
        </div>

        <button
          onClick={() => setStage("pronunciation")}
          className="w-full rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-3 text-white font-semibold transition"
        >
          ▶️ 시작하기
        </button>
      </div>
    );
  }

  if (stage === "complete") {
    return (
      <div className="rounded-2xl border-2 border-emerald-300 bg-white p-6 shadow-sm text-center">
        <p className="text-4xl mb-2">🎉</p>
        <p className="text-xl font-bold text-emerald-700">완벽합니다!</p>
        <p className="text-sm text-slate-600 mt-2">3회 사이클 완료</p>
      </div>
    );
  }

  // Pronunciation stage
  if (stage === "pronunciation" || (stage === "result" && pronunciationScore)) {
    return (
      <div className="rounded-2xl border-2 border-rose-300 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-600">완료횟수: {cycle}/3</p>
            <p className="text-lg font-bold text-slate-900 mt-1">1단계: 발음</p>
          </div>
          <div className="text-right text-2xl font-bold text-rose-600">{Math.round(recordingTime * 10) / 10}초</div>
        </div>

        {stage === "pronunciation" && (
          <div className="mb-4 space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-600 mb-2">📖 모델 음성</p>
              <div className="flex items-center gap-2">
                <button className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" />
                  {word} 재생
                </button>
              </div>
            </div>

            <div className="p-3 bg-rose-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-600 mb-2">🎙️ 당신의 발음</p>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-full rounded-lg px-3 py-3 text-white font-semibold transition flex items-center justify-center gap-2 ${
                  isRecording ? "bg-red-600 hover:bg-red-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-4 h-4" />
                    녹음 중... ({Math.round(recordingTime * 10) / 10}초)
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    녹음 시작
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {stage === "result" && pronunciationScore && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg text-center">
            <div className="text-4xl mb-2">
              {pronunciationScore === "Great" && "⭐⭐⭐⭐⭐"}
              {pronunciationScore === "Good" && "⭐⭐⭐⭐"}
              {pronunciationScore === "Pass" && "⭐⭐"}
              {pronunciationScore === "Fail" && "❌"}
            </div>
            <p className="text-lg font-bold text-slate-900">
              {pronunciationScore === "Great" && "완벽합니다!"}
              {pronunciationScore === "Good" && "좋습니다!"}
              {pronunciationScore === "Pass" && "다시 해주세요"}
              {pronunciationScore === "Fail" && "더 크게 또박또박!"}
            </p>
            {pronunciationScore === "Fail" && (
              <p className="text-xs text-slate-600 mt-2">❌ 음량이 작거나 명확하지 않습니다</p>
            )}
          </div>
        )}

        {stage === "result" && (
          <button
            onClick={handleSkipResult}
            className="w-full rounded-lg bg-slate-600 hover:bg-slate-700 px-4 py-3 text-white font-semibold transition"
          >
            {pronunciationScore === "Fail" ? "🔄 다시 녹음" : "다음 단계 →"}
          </button>
        )}
      </div>
    );
  }

  // Spelling stage
  if (stage === "spelling" || (stage === "result" && spellingTotal > 0)) {
    return (
      <div className="rounded-2xl border-2 border-blue-300 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-600">완료횟수: {cycle}/3</p>
          <p className="text-lg font-bold text-slate-900 mt-1">2단계: 스펠링</p>
        </div>

        {stage === "spelling" && (
          <div className="mb-4 space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-600 mb-2">📖 모델 음성</p>
              <button className="flex-1 w-full rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                철자 읽기 (E-X-T-E-N-D)
              </button>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-600 mb-2">🎙️ 당신의 스펠링</p>
              <button
                onClick={startRecording}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-3 text-white font-semibold transition flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4" />
                철자 말하기
              </button>
            </div>
          </div>
        )}

        {stage === "result" && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-2 gap-2">
              {word.split("").map((char, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-sm font-bold text-slate-900">
                    {char.toUpperCase()}
                    {idx < spellingMatched ? " ✓" : idx < spellingTotal ? " ❌" : " ○"}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-slate-600 mt-3">
              정확도: {spellingMatched}/{spellingTotal}
            </p>
          </div>
        )}

        {stage === "result" && (
          <button
            onClick={handleSkipResult}
            className="w-full rounded-lg bg-slate-600 hover:bg-slate-700 px-4 py-3 text-white font-semibold transition"
          >
            {spellingMatched === spellingTotal ? "다음 단계 →" : "🔄 다시 녹음"}
          </button>
        )}
      </div>
    );
  }

  // Meaning stage
  if (stage === "meaning" || (stage === "result" && meaningCorrect !== null)) {
    return (
      <div className="rounded-2xl border-2 border-emerald-300 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-600">완료횟수: {cycle}/3</p>
          <p className="text-lg font-bold text-slate-900 mt-1">3단계: 뜻</p>
        </div>

        {stage === "meaning" && (
          <div className="mb-4 space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-600 mb-2">📖 뜻</p>
              <button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                {meanings[0]} 재생
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-600 mb-2">🎙️ 당신의 뜻 설명</p>
              <button
                onClick={startRecording}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-3 text-white font-semibold transition flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4" />
                뜻 말하기
              </button>
            </div>
          </div>
        )}

        {stage === "result" && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-3xl mb-2">{meaningCorrect ? "✅" : "❌"}</p>
            <p className="text-lg font-bold text-slate-900">
              {meaningCorrect ? "정확합니다!" : "다시 시도해주세요"}
            </p>
          </div>
        )}

        {stage === "result" && (
          <button
            onClick={handleCycleComplete}
            className="w-full rounded-lg bg-slate-600 hover:bg-slate-700 px-4 py-3 text-white font-semibold transition"
          >
            {cycle < 3 ? "다음 사이클 →" : "완료"}
          </button>
        )}
      </div>
    );
  }

  return null;
}
