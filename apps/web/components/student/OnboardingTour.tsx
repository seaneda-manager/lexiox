"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Step = {
  emoji: string;
  title: (name: string) => string;
  body: string;
};

const STEPS: Step[] = [
  {
    emoji: "👋",
    title: (name) => `${name}님, LEXiOX에 오신 걸 환영해요!`,
    body: "학습을 시작하기 전에, 화면 구성을 간단히 안내해드릴게요.",
  },
  {
    emoji: "📚",
    title: () => "왼쪽 메뉴에서 학습을 선택하세요",
    body: "Reading, Listening, Speaking, Writing과 단어 학습, Daily Tests 등 모든 학습 콘텐츠는 왼쪽 사이드바에서 찾을 수 있어요.",
  },
  {
    emoji: "🔥",
    title: () => "포인트 · 레벨 · 연속 학습",
    body: "학습할 때마다 포인트를 얻고 레벨이 올라가요. 매일 꾸준히 하면 연속 학습(스트릭)이 쌓입니다.",
  },
  {
    emoji: "✅",
    title: () => "오늘의 학습부터 시작해보세요",
    body: "대시보드 상단의 카드가 오늘 꼭 해야 할 일을 알려줘요. 거기서부터 시작하면 돼요.",
  },
  {
    emoji: "❓",
    title: () => "안내는 언제든 다시 볼 수 있어요",
    body: "사이드바 하단의 '가이드 다시보기'를 누르면 이 안내를 다시 확인할 수 있습니다.",
  },
];

function storageKey(userId: string) {
  return `lexiox_onboarding_v1_${userId}`;
}

export default function OnboardingTour({
  userId,
  studentName,
}: {
  userId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wasForced = params.get("tour") === "1";
    const seen = window.localStorage.getItem(storageKey(userId));
    if (wasForced || !seen) {
      setForced(wasForced);
      setStep(0);
      setOpen(true);
    }
  }, [userId]);

  function close() {
    window.localStorage.setItem(storageKey(userId), "1");
    setOpen(false);
    if (forced) router.replace("/student");
  }

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex justify-end">
          <button
            onClick={close}
            className="text-xs text-neutral-400 hover:text-neutral-600"
          >
            건너뛰기
          </button>
        </div>

        <div className="py-4 text-center">
          <div className="mb-3 text-4xl">{current.emoji}</div>
          <h2 className="text-lg font-bold text-neutral-900">
            {current.title(studentName)}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            {current.body}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 py-3">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-5 bg-sky-500" : "w-1.5 bg-neutral-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              이전
            </button>
          )}
          <button
            onClick={() => (isLast ? close() : setStep((s) => s + 1))}
            className="flex-1 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-600"
          >
            {isLast ? "시작하기" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}
