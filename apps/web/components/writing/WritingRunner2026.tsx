// apps/web/components/writing/WritingRunner2026.tsx
"use client";

import { useMemo, useState } from "react";
import type {
  WWritingTest2026,
  WMicroWritingItem,
  WEmailWritingItem,
  WAcademicWritingItem,
} from "@/models/writing";

type Props = {
  test: WWritingTest2026;
  onFinish?: (result: {
    testId: string;
    answers: Record<string, string>;
  }) => void;
};

// 각 Task 하나를 탭처럼 다루기 위해 내부용 타입
type WritingItem = WMicroWritingItem | WEmailWritingItem | WAcademicWritingItem;

export default function WritingRunner2026({ test, onFinish }: Props) {
  const items = useMemo(() => test.items as WritingItem[], [test.items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // 저장 상태
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const currentItem = items[currentIndex];

  const handleChangeAnswer = (key: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
    // 타이핑하면 다시 idle로
    if (saveStatus !== "idle") {
      setSaveStatus("idle");
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleFinish = async () => {
    try {
      setSaveStatus("saving");

      const res = await fetch("/api/writing-2026/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testId: test.meta.id,
          answers,
        }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok || (json && json.ok === false)) {
        throw new Error(json?.error || "Failed to save");
      }

      setSaveStatus("saved");

      onFinish?.({
        testId: test.meta.id,
        answers,
      });
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 상단 헤더 */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold text-sky-700">
            Writing · Task {currentIndex + 1} of {items.length}
          </div>
          <h1 className="text-lg font-semibold">
            {test.meta.label ?? test.meta.id}
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Practice the three new TOEFL iBT 2026 Writing tasks: Micro Writing,
            Email, and Academic Discussion.
          </p>
        </div>
        {/* 간단한 탭 인디케이터 */}
        <div className="flex gap-1 text-[11px]">
          {items.map((item, idx) => {
            const active = idx === currentIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={
                  "rounded-full border px-2 py-0.5 transition " +
                  (active
                    ? "border-sky-500 bg-sky-600 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-sky-300")
                }
              >
                {labelForItemKind(item.taskKind)}
              </button>
            );
          })}
        </div>
      </header>

      {/* 현재 Task 렌더링 */}
      <main className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {currentItem.taskKind === "micro_writing" && (
          <MicroWritingView
            item={currentItem as WMicroWritingItem}
            answers={answers}
            onChange={handleChangeAnswer}
          />
        )}

        {currentItem.taskKind === "email" && (
          <EmailWritingView
            item={currentItem as WEmailWritingItem}
            answers={answers}
            onChange={handleChangeAnswer}
          />
        )}

        {currentItem.taskKind === "academic_discussion" && (
          <AcademicDiscussionView
            item={currentItem as WAcademicWritingItem}
            answers={answers}
            onChange={handleChangeAnswer}
          />
        )}
      </main>

      {/* 하단 버튼들 */}
      <footer className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <div className="flex items-center gap-3">
          {/* 저장 상태 텍스트 (옵션) */}
          {saveStatus === "error" && (
            <span className="text-[11px] text-red-500">
              Save failed. Try again.
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[11px] text-emerald-600">
              Saved successfully.
            </span>
          )}

          {currentIndex < items.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg border border-sky-500 bg-sky-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-sky-700"
            >
              Next Task
            </button>
          )}
          {currentIndex === items.length - 1 && (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saveStatus === "saving"}
              className="rounded-lg border border-emerald-500 bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                ? "Saved!"
                : "Finish Writing Practice"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------
 *  Sub-views
 * ----------------------------------*/

type AnswerChangeHandler = (key: string, value: string) => void;

function MicroWritingView({
  item,
  answers,
  onChange,
}: {
  item: WMicroWritingItem;
  answers: Record<string, string>;
  onChange: AnswerChangeHandler;
}) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="rounded-lg bg-sky-50/70 p-3 text-xs text-sky-900">
        <p className="font-semibold">Micro Writing</p>
        <p className="mt-1">
          Write a short answer for each prompt. Focus on clear sentences rather
          than long paragraphs.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {item.prompts.map((p, idx) => {
          const key = p.id;
          const value = answers[key] ?? "";
          const wordCount = value.trim()
            ? value.trim().split(/\s+/).length
            : 0;

          return (
            <div
              key={p.id}
              className="rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="mb-1 text-xs font-semibold text-gray-700">
                Prompt {idx + 1}
              </div>
              <p className="mb-2 text-sm">{p.prompt}</p>
              {p.minWords && p.maxWords && (
                <p className="mb-1 text-[11px] text-gray-500">
                  Recommended length: {p.minWords}–{p.maxWords} words
                </p>
              )}
              <textarea
                className="mt-1 h-24 w-full rounded border border-gray-300 p-2 text-sm"
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
              />
              <div className="mt-1 text-right text-[11px] text-gray-500">
                Word count: {wordCount}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmailWritingView({
  item,
  answers,
  onChange,
}: {
  item: WEmailWritingItem;
  answers: Record<string, string>;
  onChange: AnswerChangeHandler;
}) {
  const key = `email-${item.id}`;
  const value = answers[key] ?? "";
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="rounded-lg bg-indigo-50/80 p-3 text-xs text-indigo-900">
        <p className="font-semibold">Email Writing</p>
        <p className="mt-1">{item.situation}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="mb-2 text-sm font-medium">{item.prompt}</p>
        {item.hints && item.hints.length > 0 && (
          <ul className="mb-2 list-disc pl-5 text-xs text-gray-600">
            {item.hints.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
        <p className="mb-1 text-[11px] text-gray-500">
          Recommended: about 120–180 words.
        </p>
        <textarea
          className="mt-1 h-40 w-full rounded border border-gray-300 p-2 text-sm"
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
        />
        <div className="mt-1 text-right text-[11px] text-gray-500">
          Word count: {wordCount}
        </div>
      </div>
    </div>
  );
}

function AcademicDiscussionView({
  item,
  answers,
  onChange,
}: {
  item: WAcademicWritingItem;
  answers: Record<string, string>;
  onChange: AnswerChangeHandler;
}) {
  const key = `acad-${item.id}`;
  const value = answers[key] ?? "";
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col gap-4 text-sm md:flex-row">
      <div className="md:w-1/2 md:pr-3">
        <div className="rounded-lg bg-violet-50/80 p-3 text-xs text-violet-900">
          <p className="font-semibold">Academic Discussion</p>
          <p className="mt-1">{item.context}</p>
        </div>
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
          <p className="mb-1 text-xs font-semibold text-gray-700">
            Professor&apos;s prompt
          </p>
          <p className="text-sm">{item.professorPrompt}</p>
        </div>
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
          <p className="mb-1 text-xs font-semibold text-gray-700">
            Other students&apos; posts
          </p>
          <div className="flex flex-col gap-2 text-xs text-gray-700">
            {item.studentPosts.map((post) => (
              <div
                key={post.id}
                className="rounded border border-gray-100 bg-gray-50 p-2"
              >
                <div className="mb-0.5 text-[11px] font-semibold text-gray-600">
                  {post.author}
                </div>
                <p>{post.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="md:w-1/2 md:pl-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="mb-1 text-xs font-semibold text-gray-700">
            Your post
          </p>
          <p className="mb-1 text-[11px] text-gray-500">
            Recommended: about 100–150 words. Explain your opinion and respond
            to one or more of the students above.
          </p>
          <textarea
            className="mt-1 h-48 w-full rounded border border-gray-300 p-2 text-sm"
            value={value}
            onChange={(e) => onChange(key, e.target.value)}
          />
          <div className="mt-1 text-right text-[11px] text-gray-500">
            Word count: {wordCount}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------
 *  Helper
 * ----------------------------------*/

function labelForItemKind(kind: WritingItem["taskKind"]): string {
  switch (kind) {
    case "micro_writing":
      return "Micro";
    case "email":
      return "Email";
    case "academic_discussion":
      return "Discussion";
    default:
      return kind;
  }
}
