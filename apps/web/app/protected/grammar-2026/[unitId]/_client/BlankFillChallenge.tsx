"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BlankSegmentContent } from "@/models/grammar/types";
import { acceptedAnswers, buildOptions, isCorrectAnswer } from "@/lib/grammar/gate";

type Props = {
  content: BlankSegmentContent;
  unitId?: string;
  segmentId?: string;
  onDone: () => void;
};

// 관문(팝업 퀴즈): 주관식 → (틀리면) 객관식 → (오답이면) 정답 확인 후 다시 직접 입력 + 감점 → 통과
type Step = "typing" | "choice" | "retype" | "done";

const shuffle = (a: string[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

function report(kind: "correct" | "penalty", unitId?: string, segmentId?: string) {
  if (!unitId || !segmentId) return;
  fetch("/api/grammar-2026/gate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unit_id: unitId, segment_id: segmentId, kind }),
  }).catch(() => {});
}

export default function BlankFillChallenge({ content, unitId, segmentId, onDone }: Props) {
  const options = useMemo(() => buildOptions(content, shuffle), [content]);
  const [step, setStep] = useState<Step>("typing");
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const answer = acceptedAnswers(content)[0] ?? "";

  useEffect(() => {
    if (step === "typing" || step === "retype") inputRef.current?.focus();
  }, [step]);

  const finish = (delay = 700) => {
    setStep("done");
    setTimeout(onDone, delay);
  };

  const submitTyping = () => {
    if (!input.trim()) return;
    if (isCorrectAnswer(content, input)) {
      report("correct", unitId, segmentId);
      setMsg("정답입니다! +점수");
      finish();
    } else {
      setInput("");
      setMsg(null);
      // 보기가 없는 빈칸은 객관식 없이 정답을 보여 주고 다시 입력하게 한다
      setStep(options.length > 0 ? "choice" : "retype");
    }
  };

  const pickOption = (o: string) => {
    if (picked) return;
    setPicked(o);
    if (isCorrectAnswer(content, o)) {
      setMsg("정답! (점수 없음)");
      finish();
    } else {
      report("penalty", unitId, segmentId);
      setTimeout(() => {
        setPicked(null);
        setInput("");
        setMsg("틀렸어요. 정답을 보고 직접 다시 써 보세요. (감점)");
        setStep("retype");
      }, 700);
    }
  };

  const submitRetype = () => {
    if (isCorrectAnswer(content, input)) {
      setMsg("좋아요!");
      finish(500);
    } else {
      setMsg("정답과 똑같이 써 주세요.");
    }
  };

  const parts = content.prompt.split("___");
  const filled = step === "done" ? answer : null;

  return (
    <div className="my-4 p-5 rounded-2xl bg-amber-50 border border-amber-200">
      <p className="text-xs text-amber-600 font-medium mb-3 uppercase tracking-wide">
        확인 퀴즈 — 빈칸을 채워야 다음으로 넘어가요
      </p>

      <p className="text-base leading-relaxed mb-4">
        <span>{parts[0]}</span>
        <span className="inline-block border-b-2 border-amber-400 min-w-[80px] text-center font-bold text-amber-700 px-1">
          {filled ?? (step === "typing" ? input || " " : "＿＿＿")}
        </span>
        <span>{parts[1]}</span>
      </p>

      {step === "typing" && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitTyping()}
            placeholder={content.hint_ko ?? "입력..."}
            autoComplete="off"
            className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
          <button onClick={submitTyping} className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition">
            확인
          </button>
        </div>
      )}

      {step === "choice" && (
        <div className="space-y-2">
          <p className="text-sm text-amber-700">아쉬워요! 보기에서 골라 보세요.</p>
          <div className="grid grid-cols-2 gap-2">
            {options.map((o) => {
              const isPicked = picked === o;
              const wrong = isPicked && !isCorrectAnswer(content, o);
              const right = picked && isCorrectAnswer(content, o);
              return (
                <button
                  key={o}
                  type="button"
                  disabled={!!picked}
                  onClick={() => pickOption(o)}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${
                    wrong ? "border-red-400 bg-red-50 text-red-700"
                    : right ? "border-green-500 bg-green-50 text-green-700"
                    : "border-amber-200 bg-white hover:border-amber-400"
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === "retype" && (
        <div className="space-y-2">
          <p className="text-sm text-red-600">
            정답: <span className="font-bold">{acceptedAnswers(content).join(" / ")}</span>
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitRetype()}
              placeholder="정답을 직접 써 보세요"
              autoComplete="off"
              className="flex-1 border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
            />
            <button onClick={submitRetype} className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition">
              확인
            </button>
          </div>
        </div>
      )}

      {msg && <p className="mt-2 text-sm font-medium text-gray-700">{msg}</p>}
    </div>
  );
}
