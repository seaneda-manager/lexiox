"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Track = "naesin" | "junior" | "toefl";
type Section = "reading" | "listening" | "speaking" | "writing" | "grammar" | "vocab";
type SchoolLevel = "elementary" | "middle" | "high";
type SourceType = "textbook" | "mock_exam" | "external" | "teacher_made";
type Status = "draft" | "published" | "archived";

type Choice = {
  id: string;
  text: string;
};

type QuestionDraft = {
  id: string;
  number: number;
  type: string;
  prompt: string;
  choices: Choice[];
  correctChoiceId: string;
  evidence: string;
  explanation: string;
};

type ContentDraft = {
  track: Track;
  section: Section;
  schoolLevel: SchoolLevel;
  title: string;
  sourceType: SourceType;
  sourceBook: string;
  publisher: string;
  grade: string;
  semester: string;
  unitChapter: string;
  status: Status;
  passage: string;
  questions: QuestionDraft[];
};

const SECTION_EDITORS = [
  "ReadingEditor",
  "ListeningEditor",
  "SpeakingEditor",
  "WritingEditor",
  "GrammarEditor",
  "VocabEditor",
] as const;

function createChoice(index: number): Choice {
  return {
    id: `choice_${index + 1}`,
    text: "",
  };
}

function createQuestionDraft(number: number): QuestionDraft {
  return {
    id: `q_${Date.now()}_${number}`,
    number,
    type: "multiple_choice",
    prompt: "",
    choices: [createChoice(0), createChoice(1), createChoice(2), createChoice(3)],
    correctChoiceId: "choice_1",
    evidence: "",
    explanation: "",
  };
}

const INITIAL_DRAFT: ContentDraft = {
  track: "naesin",
  section: "reading",
  schoolLevel: "high",
  title: "",
  sourceType: "textbook",
  sourceBook: "",
  publisher: "",
  grade: "고1",
  semester: "1학기",
  unitChapter: "",
  status: "draft",
  passage: "",
  questions: [createQuestionDraft(1)],
};

export default function AdminContentNewPage() {
  const [draft, setDraft] = useState<ContentDraft>(INITIAL_DRAFT);

  const questionCount = draft.questions.length;
  const choiceCount = useMemo(
    () => draft.questions.reduce((acc, q) => acc + q.choices.length, 0),
    [draft.questions],
  );

  function updateField<K extends keyof ContentDraft>(key: K, value: ContentDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function updateQuestion(questionId: string, patch: Partial<QuestionDraft>) {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
    }));
  }

  function updateChoice(questionId: string, choiceId: string, text: string) {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          choices: q.choices.map((choice) =>
            choice.id === choiceId ? { ...choice, text } : choice,
          ),
        };
      }),
    }));
  }

  function addQuestion() {
    setDraft((prev) => ({
      ...prev,
      questions: [...prev.questions, createQuestionDraft(prev.questions.length + 1)],
    }));
  }

  function removeQuestion(questionId: string) {
    setDraft((prev) => {
      const nextQuestions = prev.questions
        .filter((q) => q.id !== questionId)
        .map((q, index) => ({ ...q, number: index + 1 }));

      return {
        ...prev,
        questions: nextQuestions.length > 0 ? nextQuestions : [createQuestionDraft(1)],
      };
    });
  }

  const payloadPreview = useMemo(
    () =>
      JSON.stringify(
        {
          ...draft,
          questionCount,
        },
        null,
        2,
      ),
    [draft, questionCount],
  );

  const isReading = draft.section === "reading";

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Admin / Content / New
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">새 콘텐츠 만들기</h1>
          <p className="text-sm text-neutral-500">
            공통 메타를 먼저 잡고, Reading은 기존 2026 전용 생성기로 연결한다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/content"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            목록으로
          </Link>

          {isReading ? (
            <Link
              href="/admin/content/updated-reading/new"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Reading 2026 생성기로 이동
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-500"
            >
              섹션별 생성기 준비중
            </button>
          )}
        </div>
      </header>

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">공통 메타</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Day 2 기준 필수 메타만 먼저 고정한다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
            <span className="rounded-full border px-3 py-1">문항 {questionCount}개</span>
            <span className="rounded-full border px-3 py-1">선지 {choiceCount}개</span>
            <span className="rounded-full border px-3 py-1">
              상태 {statusLabel(draft.status)}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SelectField
            label="트랙"
            value={draft.track}
            onChange={(value) => updateField("track", value as Track)}
            options={[
              { value: "naesin", label: "내신" },
              { value: "junior", label: "주니어" },
              { value: "toefl", label: "TOEFL" },
            ]}
          />

          <SelectField
            label="영역"
            value={draft.section}
            onChange={(value) => updateField("section", value as Section)}
            options={[
              { value: "reading", label: "리딩" },
              { value: "listening", label: "리스닝" },
              { value: "speaking", label: "스피킹" },
              { value: "writing", label: "라이팅" },
              { value: "grammar", label: "문법" },
              { value: "vocab", label: "보카" },
            ]}
          />

          <SelectField
            label="학교급"
            value={draft.schoolLevel}
            onChange={(value) => updateField("schoolLevel", value as SchoolLevel)}
            options={[
              { value: "elementary", label: "초등" },
              { value: "middle", label: "중등" },
              { value: "high", label: "고등" },
            ]}
          />

          <TextField
            label="제목"
            value={draft.title}
            placeholder="예) 송도고1-1 중간 대비 Reading Passage A"
            onChange={(value) => updateField("title", value)}
          />

          <SelectField
            label="출처 유형"
            value={draft.sourceType}
            onChange={(value) => updateField("sourceType", value as SourceType)}
            options={[
              { value: "textbook", label: "교과서" },
              { value: "mock_exam", label: "모의고사" },
              { value: "external", label: "외부교재" },
              { value: "teacher_made", label: "자체제작" },
            ]}
          />

          <TextField
            label="교재 / 자료명"
            value={draft.sourceBook}
            placeholder="예) High School English 1"
            onChange={(value) => updateField("sourceBook", value)}
          />

          <TextField
            label="출판사"
            value={draft.publisher}
            placeholder="예) YBM / 능률 / 교육청"
            onChange={(value) => updateField("publisher", value)}
          />

          <TextField
            label="학년"
            value={draft.grade}
            placeholder="예) 고1 / 중2"
            onChange={(value) => updateField("grade", value)}
          />

          <TextField
            label="학기"
            value={draft.semester}
            placeholder="예) 1학기 / 2학기"
            onChange={(value) => updateField("semester", value)}
          />

          <TextField
            label="단원 / 챕터"
            value={draft.unitChapter}
            placeholder="예) Unit 3 / 18번 / Chapter 1"
            onChange={(value) => updateField("unitChapter", value)}
          />

          <SelectField
            label="상태"
            value={draft.status}
            onChange={(value) => updateField("status", value as Status)}
            options={[
              { value: "draft", label: "초안" },
              { value: "published", label: "운영중" },
              { value: "archived", label: "보관" },
            ]}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-sm font-semibold text-neutral-900">섹션 에디터 라우팅</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {SECTION_EDITORS.map((editor) => {
            const active =
              (draft.section === "reading" && editor === "ReadingEditor") ||
              (draft.section === "listening" && editor === "ListeningEditor") ||
              (draft.section === "speaking" && editor === "SpeakingEditor") ||
              (draft.section === "writing" && editor === "WritingEditor") ||
              (draft.section === "grammar" && editor === "GrammarEditor") ||
              (draft.section === "vocab" && editor === "VocabEditor");

            return (
              <span
                key={editor}
                className={`rounded-full border px-3 py-1 text-xs ${
                  active ? "border-neutral-900 bg-neutral-900 text-white" : "text-neutral-500"
                }`}
              >
                {editor}
              </span>
            );
          })}
        </div>

        {isReading ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Reading은 기존 전용 생성기가 이미 있으니, 아래 버튼으로 바로 이동해서 생성한다.
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            이번 스프린트에서는 Reading만 먼저 live로 연결한다. 현재 선택한 섹션은 이후 단계에서 연결한다.
          </div>
        )}

        <div className="mt-4">
          {isReading ? (
            <Link
              href="/admin/content/updated-reading/new"
              className="inline-flex rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Reading 2026 생성기로 이동
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex rounded-lg bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-500"
            >
              섹션별 생성기 준비중
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Reading 입력 초안</h2>
            <p className="mt-1 text-xs text-neutral-500">
              공통 허브에서도 shape은 미리 볼 수 있게 유지한다.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-neutral-800">지문 본문</span>
            <textarea
              value={draft.passage}
              onChange={(e) => updateField("passage", e.target.value)}
              rows={10}
              placeholder="지문 본문 초안"
              className="w-full rounded-xl border px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Reading 문항 초안</h2>
            <p className="mt-1 text-xs text-neutral-500">
              실제 저장은 전용 생성기 기준으로 가되, 공통 허브에서도 초안 shape은 유지한다.
            </p>
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            문항 추가
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {draft.questions.map((question) => (
            <article key={question.id} className="rounded-2xl border border-neutral-200">
              <div className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-neutral-900">문항 {question.number}</p>
                  <p className="text-xs text-neutral-500">객관식 기본형</p>
                </div>

                <div className="flex gap-2">
                  <select
                    value={question.type}
                    onChange={(e) => updateQuestion(question.id, { type: e.target.value })}
                    className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-neutral-400"
                  >
                    <option value="multiple_choice">multiple_choice</option>
                    <option value="vocab">vocab</option>
                    <option value="inference">inference</option>
                    <option value="sentence_insertion">sentence_insertion</option>
                    <option value="summary">summary</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => removeQuestion(question.id)}
                    className="rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="space-y-5 px-4 py-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-neutral-800">문제</span>
                  <textarea
                    value={question.prompt}
                    onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
                    rows={3}
                    placeholder="문제 문장을 입력하세요."
                    className="w-full rounded-xl border px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                  />
                </label>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-neutral-800">선지</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {question.choices.map((choice, index) => (
                      <label key={`${question.id}-${choice.id}`} className="rounded-xl border p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-neutral-500">
                            선택지 {index + 1}
                          </span>

                          <label className="flex items-center gap-2 text-xs text-neutral-600">
                            <input
                              type="radio"
                              name={`correct-${question.id}`}
                              checked={question.correctChoiceId === choice.id}
                              onChange={() =>
                                updateQuestion(question.id, {
                                  correctChoiceId: choice.id,
                                })
                              }
                            />
                            정답
                          </label>
                        </div>

                        <textarea
                          value={choice.text}
                          onChange={(e) => updateChoice(question.id, choice.id, e.target.value)}
                          rows={3}
                          placeholder={`선택지 ${index + 1}`}
                          className="w-full rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-neutral-800">정답 근거</span>
                    <textarea
                      value={question.evidence}
                      onChange={(e) => updateQuestion(question.id, { evidence: e.target.value })}
                      rows={4}
                      placeholder="정답 근거 문장을 입력하세요."
                      className="w-full rounded-xl border px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-neutral-800">해설</span>
                    <textarea
                      value={question.explanation}
                      onChange={(e) =>
                        updateQuestion(question.id, { explanation: e.target.value })
                      }
                      rows={4}
                      placeholder="해설을 입력하세요."
                      className="w-full rounded-xl border px-3 py-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
                    />
                  </label>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">저장 payload 미리보기</h2>
          <p className="mt-1 text-xs text-neutral-500">
            공통 shape 점검용. 실제 Reading 생성은 전용 업로더 기준.
          </p>
        </div>

        <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral-950 p-4 text-xs leading-6 text-neutral-100">
          {payloadPreview}
        </pre>
      </section>
    </main>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-neutral-400"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function statusLabel(status: Status) {
  switch (status) {
    case "draft":
      return "초안";
    case "published":
      return "운영중";
    case "archived":
      return "보관";
    default:
      return status;
  }
}
