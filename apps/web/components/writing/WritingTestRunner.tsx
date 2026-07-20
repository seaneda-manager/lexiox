"use client";

import { useState, useRef, useEffect } from "react";
import type { WWritingTest2026, WFillBlankItem, WEmailWritingItem, WAcademicWritingItem } from "@/models/writing";

type Props = {
  test: WWritingTest2026;
  onFinish: (answers: Record<string, string>) => void;
};

const TASK_LABEL: Record<string, string> = {
  fill_in_blank: "빈칸 채우기",
  email: "Email Writing",
  academic_discussion: "Academic Discussion",
};

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function WritingTestRunner({ test, onFinish }: Props) {
  const tasks = test.items;
  const [taskIdx, setTaskIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const currentTask = tasks[taskIdx];

  const setAnswer = (key: string, val: string) =>
    setAnswers((prev) => ({ ...prev, [key]: val }));

  const handleNext = () => {
    if (taskIdx < tasks.length - 1) {
      setTaskIdx((i) => i + 1);
    } else {
      setDone(true);
      onFinish(answers);
    }
  };

  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 text-center px-4">
        <div className="text-5xl">✍️</div>
        <h2 className="text-xl font-bold">Writing 완료!</h2>
        <p className="text-sm text-gray-500">총 {tasks.length}개 태스크를 모두 완료했습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <header className="shrink-0 border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
            Task {taskIdx + 1} / {tasks.length}
          </span>
          <span className="text-sm font-semibold text-gray-800">
            {TASK_LABEL[currentTask.taskKind] ?? currentTask.taskKind}
          </span>
        </div>
        <div className="flex gap-1">
          {tasks.map((_, i) => (
            <button
              key={i}
              onClick={() => setTaskIdx(i)}
              className={`h-2 w-6 rounded-full transition ${i === taskIdx ? "bg-teal-500" : i < taskIdx ? "bg-teal-200" : "bg-gray-200"}`}
            />
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {currentTask.taskKind === "fill_in_blank" && (
          <FillBlankPanel
            item={currentTask as WFillBlankItem}
            answers={answers}
            setAnswer={setAnswer}
          />
        )}
        {currentTask.taskKind === "email" && (
          <EmailPanel
            item={currentTask as WEmailWritingItem}
            value={answers[currentTask.id] ?? ""}
            onChange={(v) => setAnswer(currentTask.id, v)}
          />
        )}
        {currentTask.taskKind === "academic_discussion" && (
          <AcademicPanel
            item={currentTask as WAcademicWritingItem}
            value={answers[currentTask.id] ?? ""}
            onChange={(v) => setAnswer(currentTask.id, v)}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t bg-white px-4 py-3 flex justify-end">
        <button
          onClick={handleNext}
          className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          {taskIdx < tasks.length - 1 ? "다음 태스크 →" : "제출 완료"}
        </button>
      </footer>
    </div>
  );
}

// ── Task Panels ────────────────────────────────────────────────────

function FillBlankPanel({
  item, answers, setAnswer,
}: {
  item: WFillBlankItem;
  answers: Record<string, string>;
  setAnswer: (key: string, val: string) => void;
}) {
  // Replace {{BLANK_X}} with textarea placeholders rendered inline
  const renderHtml = () => {
    const parts = item.promptHtml.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, i) => {
      const match = part.match(/^\{\{([^}]+)\}\}$/);
      if (match) {
        const blankId = match[1];
        const blank = item.blanks.find((b) => b.id === blankId);
        const key = `${item.id}::${blankId}`;
        return (
          <span key={i} className="inline-block align-middle mx-1">
            <input
              className="rounded border-b-2 border-teal-400 bg-teal-50 px-2 py-0.5 text-sm focus:outline-none focus:border-teal-600 min-w-[120px]"
              placeholder={blank?.placeholder ?? "답을 입력하세요"}
              value={answers[key] ?? ""}
              onChange={(e) => setAnswer(key, e.target.value)}
            />
          </span>
        );
      }
      return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 space-y-6">
      <h2 className="text-lg font-bold">{item.title}</h2>
      <div className="rounded-xl border bg-white p-6 text-sm leading-8 text-gray-800">
        {renderHtml()}
      </div>
      <div className="rounded-xl border bg-teal-50 p-4 space-y-2">
        <p className="text-xs font-semibold text-teal-700">빈칸 목록</p>
        {item.blanks.map((blank) => {
          const key = `${item.id}::${blank.id}`;
          const wc = countWords(answers[key] ?? "");
          return (
            <div key={blank.id} className="flex items-center gap-3 text-xs">
              <span className="w-20 shrink-0 font-mono text-gray-500">{blank.id}</span>
              <span className="text-gray-700">{answers[key] || <em className="text-gray-400">미입력</em>}</span>
              <span className="ml-auto text-gray-400">{wc}단어</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmailPanel({
  item, value, onChange,
}: {
  item: WEmailWritingItem;
  value: string;
  onChange: (v: string) => void;
}) {
  const wc = countWords(value);
  const min = item.wordLimit?.min ?? 0;
  const max = item.wordLimit?.max ?? Infinity;

  return (
    <div className="flex h-full">
      {/* Left: instructions */}
      <div className="w-2/5 shrink-0 border-r bg-white overflow-y-auto p-6 space-y-4">
        <h2 className="text-base font-bold">Email Writing</h2>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-700">상황</p>
          <p className="text-sm text-gray-800">{item.situation}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-600">지시문</p>
          <p className="text-sm text-gray-700">{item.prompt}</p>
        </div>
        {item.hints && item.hints.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600">포함해야 할 내용</p>
            <ul className="space-y-1">
              {item.hints.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="text-xs text-gray-400">
          권장: {item.wordLimit?.min ?? "-"}~{item.wordLimit?.max ?? "-"}단어
        </div>
      </div>

      {/* Right: writing area */}
      <div className="flex-1 flex flex-col p-6 gap-3">
        <div className="shrink-0 rounded-lg border bg-gray-50 p-3 text-xs space-y-1">
          <div className="flex gap-2 text-gray-500"><span className="w-12 shrink-0 font-semibold">To:</span><span className="text-gray-800">{(item as any).toField ?? ""}</span></div>
          <div className="flex gap-2 text-gray-500"><span className="w-12 shrink-0 font-semibold">Subject:</span><span className="text-gray-800">{(item as any).subjectField ?? ""}</span></div>
        </div>
        <textarea
          className="flex-1 rounded-xl border p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono"
          placeholder="이메일 내용을 작성하세요..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className={`text-right text-xs ${wc < min ? "text-rose-500" : wc > max ? "text-amber-500" : "text-teal-600"}`}>
          {wc}단어 {min > 0 && `(최소 ${min}단어)`}
        </div>
      </div>
    </div>
  );
}

function AcademicPanel({
  item, value, onChange,
}: {
  item: WAcademicWritingItem;
  value: string;
  onChange: (v: string) => void;
}) {
  const wc = countWords(value);
  const min = item.wordLimit?.min ?? 0;
  const max = item.wordLimit?.max ?? Infinity;

  return (
    <div className="flex h-full">
      {/* Left: discussion context */}
      <div className="w-2/5 shrink-0 border-r bg-white overflow-y-auto p-6 space-y-5">
        <h2 className="text-base font-bold">Academic Discussion</h2>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-blue-700">수업 배경</p>
          <p className="text-sm text-gray-700">{item.context}</p>
        </div>
        <div className="rounded-lg border-l-4 border-teal-400 bg-gray-50 p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-500">교수 질문</p>
          <p className="text-sm font-medium text-gray-800">{item.professorPrompt}</p>
        </div>
        {(item.studentPosts ?? []).map((post) => (
          <div key={post.id} className="rounded-lg border bg-white p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-800">{post.author}</p>
            <p className="text-xs text-gray-600 leading-relaxed">{post.content}</p>
          </div>
        ))}
        <div className="text-xs text-gray-400">
          권장: {item.wordLimit?.min ?? "-"}~{item.wordLimit?.max ?? "-"}단어
        </div>
      </div>

      {/* Right: writing area */}
      <div className="flex-1 flex flex-col p-6 gap-3">
        <p className="text-xs font-semibold text-gray-600 shrink-0">내 의견을 작성하세요</p>
        <textarea
          className="flex-1 rounded-xl border p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="교수의 질문에 대한 나의 의견을 작성하세요..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className={`text-right text-xs ${wc < min ? "text-rose-500" : wc > max ? "text-amber-500" : "text-teal-600"}`}>
          {wc}단어 {min > 0 && `(최소 ${min}단어)`}
        </div>
      </div>
    </div>
  );
}
