"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tribe = "kenine" | "fenine" | "lutrine";

const QUESTIONS = [
  {
    q: "새로운 걸 배울 때 나는?",
    options: [
      { tribe: "kenine" as Tribe, emoji: "🦊", label: "일단 해보고 틀리면서 익힌다" },
      { tribe: "fenine" as Tribe, emoji: "🐱", label: "이해가 될 때까지 먼저 생각한다" },
      { tribe: "lutrine" as Tribe, emoji: "🦦", label: "직접 뭔가 만들거나 써보면서 익힌다" },
    ],
  },
  {
    q: "어려운 문제를 만나면?",
    options: [
      { tribe: "kenine" as Tribe, emoji: "🦊", label: "일단 도전. 틀려도 괜찮아" },
      { tribe: "fenine" as Tribe, emoji: "🐱", label: "왜 어려운지 먼저 파악한다" },
      { tribe: "lutrine" as Tribe, emoji: "🦦", label: "방법을 바꿔서 다시 시도한다" },
    ],
  },
  {
    q: "공부할 때 나는?",
    options: [
      { tribe: "kenine" as Tribe, emoji: "🦊", label: "빠르게 많이 보는 게 좋다" },
      { tribe: "fenine" as Tribe, emoji: "🐱", label: "하나를 깊이 이해하는 게 좋다" },
      { tribe: "lutrine" as Tribe, emoji: "🦦", label: "결과물이 생기면 동기부여가 된다" },
    ],
  },
] as const;

const TRIBE_INFO: Record<Tribe, { name: string; subtitle: string; tagline: string; emoji: string; color: string; companion: string }> = {
  kenine: {
    name: "Kenine",
    subtitle: "The Walkers",
    tagline: "행동하면서 배우는 타입.\n완벽하지 않아도 일단 시작하는 용기가 있어.",
    emoji: "🦊",
    color: "from-orange-400 to-amber-500",
    companion: "나랑 잘 맞을 것 같은데?",
  },
  fenine: {
    name: "Fenine",
    subtitle: "The Seekers",
    tagline: "이해하면서 배우는 타입.\n한번 알면 절대 안 잊어.",
    emoji: "🐱",
    color: "from-indigo-400 to-violet-500",
    companion: "Lyra가 함께할게.",
  },
  lutrine: {
    name: "Lutrine",
    subtitle: "The Makers",
    tagline: "만들면서 배우는 타입.\n실패해도 바로 다시 시작하는 게 강점이야.",
    emoji: "🦦",
    color: "from-amber-400 to-yellow-500",
    companion: "Rivet이랑 같이 가보자.",
  },
};

function assignTribe(answers: Tribe[]): Tribe {
  const counts = { kenine: 0, fenine: 0, lutrine: 0 };
  for (const a of answers) counts[a]++;
  const max = Math.max(...Object.values(counts));
  const winners = (Object.keys(counts) as Tribe[]).filter((k) => counts[k] === max);
  if (winners.length === 1) return winners[0];
  return "kenine"; // tie → Pax default
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "quiz" | "result">("intro");
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Tribe[]>([]);
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [saving, setSaving] = useState(false);

  function handleAnswer(t: Tribe) {
    const next = [...answers, t];
    if (qIdx < QUESTIONS.length - 1) {
      setAnswers(next);
      setQIdx((i) => i + 1);
    } else {
      const result = assignTribe(next);
      setTribe(result);
      setStep("result");
    }
  }

  async function handleConfirm() {
    if (!tribe) return;
    setSaving(true);
    await fetch("/api/onboarding/set-tribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tribe }),
    });
    router.push("/home");
  }

  // ── Intro ─────────────────────────────────────────────────────
  if (step === "intro") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="text-7xl">🦊</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              안녕! 나는 Pax야.
            </h1>
            <p className="text-sm leading-relaxed text-gray-600">
              Lexiox에 온 걸 환영해.
              <br />
              근데 있잖아, 사람마다 배우는 방식이 달라.
              <br />
              딱 3가지만 물어볼게.
            </p>
          </div>
          <button
            onClick={() => setStep("quiz")}
            className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-600 active:scale-95 transition-all"
          >
            솔직하게 대답해줄게 →
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz ──────────────────────────────────────────────────────
  if (step === "quiz") {
    const q = QUESTIONS[qIdx];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Progress */}
          <div className="flex items-center gap-2">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= qIdx ? "bg-emerald-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Question */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-emerald-600">Q{qIdx + 1} / {QUESTIONS.length}</p>
            <h2 className="text-xl font-bold text-gray-900">{q.q}</h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt.tribe}
                onClick={() => handleAnswer(opt.tribe)}
                className="flex w-full items-center gap-4 rounded-2xl border-2 border-gray-200 bg-white px-4 py-4 text-left text-sm font-medium text-gray-800 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md active:scale-98"
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────
  if (step === "result" && tribe) {
    const info = TRIBE_INFO[tribe];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f9fa] px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          {/* Tribe card */}
          <div className={`rounded-3xl bg-gradient-to-br ${info.color} p-8 shadow-xl`}>
            <div className="text-7xl mb-4">{info.emoji}</div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
              {info.subtitle}
            </p>
            <h2 className="mt-1 text-3xl font-black text-white">
              너는 {info.name}이야.
            </h2>
          </div>

          <div className="space-y-1 px-2">
            {info.tagline.split("\n").map((line, i) => (
              <p key={i} className={`text-sm ${i === 0 ? "font-semibold text-gray-800" : "text-gray-500"}`}>
                {line}
              </p>
            ))}
            <p className="mt-3 text-sm font-medium text-emerald-600">{info.companion}</p>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-60"
            >
              {saving ? "저장 중..." : "Lexiox 시작하기 →"}
            </button>
            <button
              onClick={() => { setStep("quiz"); setQIdx(0); setAnswers([]); }}
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 text-xs text-gray-500 hover:bg-gray-50"
            >
              다시 해볼게
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
