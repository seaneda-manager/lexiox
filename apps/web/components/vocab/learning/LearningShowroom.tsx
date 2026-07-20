"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { LearningWord } from "./learning.types";
import StageScaffold from "@/components/common/stage/StageScaffold";

type Accent = "US" | "UK";

type Props = {
  word: LearningWord;
  index: number;
  total: number;
  onDoneWord: () => void;
  trackTitle?: string | null;
  dayIndex?: number | null;
  totalDays?: number | null;
};

function normEn(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}
function normKo(s: string) {
  return String(s ?? "")
    .replace(/\s+/g, "")
    .replace(/[.,!?~`'"""''(){}\[\]<>]/g, "")
    .trim();
}

function splitList(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  const s = String(v).trim();
  if (!s) return [];
  return s
    .split(/[\n;|/]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}
function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((x) => x.trim()).filter(Boolean)));
}

function pickWordText(word: any): string {
  return String(word?.text ?? word?.lemma ?? word?.target ?? "").trim();
}
function pickMeaningsKo(word: any): string[] {
  return uniq([
    ...splitList(word?.meanings_ko),
    ...splitList(word?.meaning_ko),
    ...splitList(word?.meaningKo),
  ]);
}
function pickSynonyms(word: any): string[] {
  const syn = uniq([
    ...splitList(word?.synonyms_en_simple),
    ...splitList(word?.synonyms_en),
    ...splitList(word?.synonyms),
  ]);
  if (syn.length > 0) return syn;

  const fallback = uniq([
    ...splitList(word?.meanings_en_simple),
    ...splitList(word?.meaning_en_simple),
    ...splitList(word?.definition_en),
  ]);
  return fallback.slice(0, 3);
}

function speak(text: string, accent: Accent) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;

  const u = new SpeechSynthesisUtterance(text);
  u.lang = accent === "US" ? "en-US" : "en-GB";
  u.rate = 0.95;
  u.pitch = 1.0;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function FlagButton({
  active,
  flag,
  ariaLabel,
  onClick,
}: {
  active: boolean;
  flag: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        "h-9 w-11 rounded-full font-extrabold",
        "bg-white/90 border border-black/10",
        active ? "ring-2 ring-black/10" : "hover:bg-white",
        "inline-flex items-center justify-center",
      ].join(" ")}
      style={{ fontSize: "18px", lineHeight: 1 }}
    >
      {flag}
    </button>
  );
}

export default function LearningShowroom({ word, index, total, onDoneWord, trackTitle, dayIndex, totalDays }: Props) {
  // 모던 미니멀 색상 팔레트
  const colors = {
    bg: "#FFFFFF",
    bgLight: "#F3F4F6",
    text: "#1F2937",
    textLight: "#6B7280",
    textPale: "#D1D5DB",
    point: "#3B82F6",
    pointLight: "#DBEAFE",
    success: "#10B981",
  };

  // 완성 시 튀기는 애니메이션
  const bounceAnimation = `
    @keyframes bounce-pop {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `;

  const getInputAnimation = (isOk: boolean) => {
    if (isOk) {
      return "bounce-pop 0.4s ease-in-out";
    }
    return "none";
  };

  const [accent, setAccent] = useState<Accent>("US");

  const w: any = word as any;
  const target = useMemo(() => pickWordText(w), [w]);
  const targetNorm = useMemo(() => normEn(target), [target]);

  const meaningsKo = useMemo(() => pickMeaningsKo(w), [w]);
  const synonyms = useMemo(() => pickSynonyms(w), [w]);

  // 뜻에서 품사 자동 유추
  const inferPosFromMeaning = (meaning: string): string => {
    if (!meaning) return "v";
    // "하다", "되다" 등으로 끝나면 동사
    if (meaning.endsWith("하다") || meaning.endsWith("되다") || meaning.endsWith("하게")) {
      return "v";
    }
    // 그 외는 명사
    return "n";
  };

  // 뜻 정의
  const meaning1Expected = meaningsKo[0] ?? "";
  const meaning2Expected = meaningsKo[1] ?? (meaningsKo[0] ?? "");

  // 품사 배열 파싱
  const posList = useMemo(() => {
    const posRaw = w?.pos || "";
    if (typeof posRaw === "string") {
      return posRaw.split(",").map(p => p.trim()).filter(Boolean);
    }
    return Array.isArray(posRaw) ? posRaw : [];
  }, [w?.pos]);

  // 예문 가져오기
  const exampleSentence = (w?.example_en || w?.sentence_en || w?.example || "") as string;
  const exampleKo = (w?.example_ko || w?.sentence_ko || "") as string;

  const [spelling, setSpelling] = useState("");
  const [spellingOk, setSpellingOk] = useState(false);

  const [pos, setPos] = useState(""); // 품사
  const [posOk, setPosOk] = useState(false);

  const [meaning1, setMeaning1] = useState("");
  const [meaning1Ok, setMeaning1Ok] = useState(false);

  const [meaning2, setMeaning2] = useState("");
  const [meaning2Ok, setMeaning2Ok] = useState(false);

  const [showExample, setShowExample] = useState(false);

  // 현재 뜻에 해당하는 품사 유추
  const currentMeaning = meaning1Ok ? meaning2Expected : meaning1Expected;
  const inferredPos = useMemo(() => {
    if (posList.length > 0) return posList;
    return [inferPosFromMeaning(currentMeaning)];
  }, [posList, currentMeaning, meaning1Ok]);

  const spellingRef = useRef<HTMLInputElement | null>(null);
  const posRef = useRef<HTMLSelectElement | null>(null);
  const meaning1Ref = useRef<HTMLInputElement | null>(null);
  const meaning2Ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    console.log("📚 Word Data:", {
      id: w.id,
      text: w.text,
      pos: w.pos,
      meanings_ko: w.meanings_ko,
      lemma: w.lemma,
      allKeys: Object.keys(w)
    });

    setAccent("US");
    setSpelling("");
    setSpellingOk(false);
    setPos("");
    setPosOk(false);
    setMeaning1("");
    setMeaning1Ok(false);
    setMeaning2("");
    setMeaning2Ok(false);
    setShowExample(false);

    const t = window.setTimeout(() => spellingRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [targetNorm]);

  // 철자 완료 시 자동으로 품사 설정
  useEffect(() => {
    if (spellingOk && !posOk) {
      setPos(inferredPos[0]);
      setPosOk(true);
      window.setTimeout(() => meaning1Ref.current?.focus(), 250);
    }
  }, [spellingOk, posOk, inferredPos]);

  const passSpelling = () => {
    if (spellingOk) return;
    setSpellingOk(true);
    if (target) speak(target, accent);
    window.setTimeout(() => posRef.current?.focus(), 250);
  };

  const onChangeSpelling = (v: string) => {
    setSpelling(v);
    if (!targetNorm) return;
    if (normEn(v) === targetNorm) passSpelling();
  };

  const tryPassPos = (v: string) => {
    if (posOk) return;
    if (!v) return;
    setPosOk(true);
    window.setTimeout(() => meaning1Ref.current?.focus(), 100);
  };

  const speakKorean = (text: string) => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const tryPassMeaning1 = (v: string) => {
    if (meaning1Ok) return;
    if (!meaning1Expected) return;
    if (normKo(v) === normKo(meaning1Expected)) {
      setMeaning1Ok(true);
      speakKorean(meaning1Expected);
      window.setTimeout(() => meaning2Ref.current?.focus(), 50);
    }
  };

  const tryPassMeaning2 = (v: string) => {
    if (meaning2Ok) return;
    if (!meaning2Expected) return;
    if (normKo(v) === normKo(meaning2Expected)) {
      setMeaning2Ok(true);
      speakKorean(meaning2Expected);
      window.setTimeout(() => setShowExample(true), 50);
    }
  };

  const nextEnabled = spellingOk && posOk && meaning1Ok && meaning2Ok;

  const syn1 = synonyms[0] ?? "";
  const syn2 = synonyms[1] ?? synonyms[0] ?? "";

  const topRight = (
    <div className="flex items-center gap-2">
      <FlagButton active={accent === "US"} flag="🇺🇸" ariaLabel="US accent" onClick={() => setAccent("US")} />
      <FlagButton active={accent === "UK"} flag="🇬🇧" ariaLabel="UK accent" onClick={() => setAccent("UK")} />
      <button
        type="button"
        onClick={() => target && speak(target, accent)}
        className="h-9 px-4 rounded-lg font-semibold transition-colors"
        style={{ background: colors.point, border: "none", color: "white", fontSize: "13px" }}
      >
        🔊 Play
      </button>
    </div>
  );

  const cardStyle = { background: colors.bgLight, border: `1px solid ${colors.textPale}` };
  const labelStyle = { fontSize: "12px", color: colors.textLight, fontWeight: 600 };
  const inputStyle = (ok: boolean, active: boolean) => ({
    fontSize: "clamp(20px, 2.5cqi, 32px)",
    background: colors.bg,
    border: ok ? `2px solid ${colors.success}` : active ? `2px solid ${colors.point}` : `1px solid ${colors.textPale}`,
    color: colors.text,
    fontWeight: 600,
    animation: ok ? "1s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0s 1 normal none running bounce-pop" : "none",
  });

  return (
    <div className="fixed inset-0 w-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 z-50">
      <style>{`
        @keyframes bounce-pop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
      `}</style>

      {/* 헤더 - 단어장 정보 + 진행률 */}
      <div className="bg-emerald-600 border-b px-6 py-4 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {trackTitle && dayIndex !== null && totalDays !== null ? (
            <div style={{ fontSize: "16px", color: "#ffffff", fontWeight: 700, letterSpacing: "0.5px" }}>
              {trackTitle} - Day {dayIndex}/{totalDays}
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <div style={{ fontSize: "24px", color: colors.point, fontWeight: 700 }}>
              {index + 1}/{total}
            </div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: colors.text }}>
              {target}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => target && speak(target, accent)}
          style={{
            background: colors.point,
            border: "none",
            color: "white",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            fontSize: "20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          🔊
        </button>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8">
        <div className="w-full max-w-2xl space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto">
            {/* Spelling */}
            <div className="rounded-xl p-5" style={cardStyle}>
              <div style={labelStyle}>철자 (Spelling)</div>
              <div className="relative mt-3">
                <div
                  className="absolute inset-0 grid place-items-center select-none pointer-events-none transition-all duration-300"
                  style={{
                    color: colors.textPale,
                    fontWeight: 800,
                    fontSize: "clamp(16px, 2.0cqi, 28px)",
                    opacity: spellingOk ? 0 : 1
                  }}
                >
                  {target}
                </div>
                <input
                  ref={spellingRef}
                  value={spelling}
                  onChange={(e) => onChangeSpelling(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && passSpelling()}
                  disabled={spellingOk}
                  className="w-full rounded-lg px-5 py-4 text-center outline-none focus:ring-2 transition-all duration-300"
                  style={inputStyle(spellingOk, true)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              {spellingOk && <div style={{ fontSize: "12px", color: colors.success, marginTop: "8px" }}>✅ 철자 완료</div>}
            </div>

            {/* POS (품사) - 자동 표시 */}
            {spellingOk && (
              <div className="rounded-xl p-5" style={cardStyle}>
                <div style={{ fontSize: "12px", color: colors.textLight, fontWeight: 600 }}>
                  품사 (Part of Speech)
                </div>
                <div style={{ marginTop: "8px", fontSize: "14px", color: colors.text, fontWeight: 500 }}>
                  {inferredPos[0] === "n" ? "명사" : inferredPos[0] === "v" ? "동사" : inferredPos[0]}
                  <span style={{ marginLeft: "6px", color: colors.textLight }}>({inferredPos[0]})</span>
                </div>
              </div>
            )}

            {/* Meanings */}
            {posOk && (
              <div className="space-y-3">
                {/* Meaning 1 */}
                <div className="rounded-xl p-5" style={cardStyle}>
                  <div style={labelStyle}>뜻 1 (Meaning)</div>
                  <div className="relative mt-3">
                    <div
                      className="absolute inset-0 grid place-items-center select-none pointer-events-none transition-all duration-300"
                      style={{
                        color: colors.textPale,
                        fontWeight: 700,
                        fontSize: "clamp(12px, 1.2cqi, 16px)",
                        opacity: meaning1Ok ? 0 : 1
                      }}
                    >
                      {meaning1Expected}
                    </div>
                    <input
                      ref={meaning1Ref}
                      value={meaning1}
                      onChange={(e) => { setMeaning1(e.target.value); tryPassMeaning1(e.target.value); }}
                      onKeyDown={(e) => e.key === "Enter" && tryPassMeaning1(meaning1)}
                      disabled={meaning1Ok}
                      className="w-full rounded-lg px-4 py-3 text-center outline-none focus:ring-2 transition-all duration-300"
                      style={inputStyle(meaning1Ok, posOk)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  {meaning1Ok && <div style={{ fontSize: "12px", color: colors.success, marginTop: "8px" }}>✅ {syn1 && `동의어: ${syn1}`}</div>}
                </div>

                {/* Meaning 2 */}
                {meaning1Ok && (
                  <div className="rounded-xl p-5" style={cardStyle}>
                    <div style={labelStyle}>뜻 2 (Meaning)</div>
                    <div className="relative mt-3">
                      <div
                        className="absolute inset-0 grid place-items-center select-none pointer-events-none transition-all duration-300"
                        style={{
                          color: colors.textPale,
                          fontWeight: 700,
                          fontSize: "clamp(12px, 1.2cqi, 16px)",
                          opacity: meaning2Ok ? 0 : 1
                        }}
                      >
                        {meaning2Expected}
                      </div>
                      <input
                        ref={meaning2Ref}
                        value={meaning2}
                        onChange={(e) => { setMeaning2(e.target.value); tryPassMeaning2(e.target.value); }}
                        onKeyDown={(e) => e.key === "Enter" && tryPassMeaning2(meaning2)}
                        disabled={meaning2Ok}
                        className="w-full rounded-lg px-4 py-3 text-center outline-none focus:ring-2 transition-all duration-300"
                        style={inputStyle(meaning2Ok, meaning1Ok)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    {meaning2Ok && <div style={{ fontSize: "12px", color: colors.success, marginTop: "8px" }}>✅ {syn2 && `동의어: ${syn2}`}</div>}
                  </div>
                )}
              </div>
            )}

            {/* Example */}
            {meaning2Ok && exampleSentence && (
              <div className="rounded-xl p-5" style={{ ...cardStyle, background: colors.pointLight }}>
                <div style={labelStyle}>예문 (Example)</div>
                <p style={{ fontSize: "clamp(14px, 1.8cqi, 18px)", color: colors.text, marginTop: "12px", fontWeight: 500 }}>
                  {exampleSentence}
                </p>
                {exampleKo && (
                  <p style={{ fontSize: "13px", color: colors.textLight, marginTop: "8px" }}>
                    {exampleKo}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => exampleSentence && speak(exampleSentence, accent)}
                  style={{ fontSize: "12px", color: colors.point, marginTop: "8px", cursor: "pointer", fontWeight: 600 }}
                >
                  🔊 예문 발음 듣기
                </button>
              </div>
            )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bg-white border-t px-6 py-4 flex gap-3">
        <button
          type="button"
          onClick={() => onDoneWord()}
          disabled={!nextEnabled}
          style={{
            flex: 1,
            padding: "14px 24px",
            borderRadius: "12px",
            border: "none",
            background: nextEnabled ? colors.success : colors.textPale,
            color: "white",
            fontSize: "16px",
            fontWeight: 600,
            cursor: nextEnabled ? "pointer" : "not-allowed",
            opacity: nextEnabled ? 1 : 0.5,
            transition: "all 200ms"
          }}
        >
          {nextEnabled ? "다음 단어 →" : "진행 중..."}
        </button>
      </div>
    </div>
  );
}
