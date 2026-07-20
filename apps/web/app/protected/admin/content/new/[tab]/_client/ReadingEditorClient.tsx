"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
// TODO: Import when naesinReadingAdmin is available
// import {
//   createNaesinReadingSetAction,
//   updateNaesinReadingSetAction,
// } from "@/actions/naesinReadingAdmin";
import type { NaesinReadingCreatePayload } from "@/lib/reading/naesin-payload";

const SAMPLE_PAYLOAD: NaesinReadingCreatePayload = {
  set: {
    title: "M2 Midterm Reading Set 01",
    sourceType: "school_exam",
    examContext: "midterm",
    gradeBand: "M2",
    difficulty: "standard",
    schoolName: "Sample Middle School",
    semester: "2026-1",
    estimatedMinutes: 25,
    tags: ["midterm", "reading", "m2"],
    isPublished: false,
  },
  passages: [
    {
      passage: {
        orderIndex: 0,
        genre: "expository",
        text: "Many students think success comes only from talent. In reality, repeated effort often matters more than talent. Students who keep practicing usually improve over time.",
      },
      questions: [
        {
          orderIndex: 0,
          numberLabel: "1",
          type: "main_idea",
          stem: "What is the main idea of the passage?",
          choices: [
            { id: "q1_a", label: "1", text: "Talent matters more than effort." },
            { id: "q1_b", label: "2", text: "Success depends on repeated effort." },
            { id: "q1_c", label: "3", text: "Students dislike practice." },
            { id: "q1_d", label: "4", text: "Teachers should reduce homework." },
          ],
          answer: {
            kind: "single_choice",
            choiceId: "q1_b",
          },
          evidence: [
            {
              orderIndex: 0,
              type: "sentence",
              quote: "In reality, repeated effort often matters more than talent.",
            },
          ],
        },
      ],
    },
  ],
};

type Props = {
  initialPayload?: NaesinReadingCreatePayload;
  initialSetId?: string;
  loadError?: string | null;
};

export default function ReadingEditorClient({
  initialPayload,
  initialSetId,
  loadError,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const defaultPayload = initialPayload ?? SAMPLE_PAYLOAD;

  const defaultJson = useMemo(
    () => JSON.stringify(defaultPayload, null, 2),
    [defaultPayload],
  );

  const [rawJson, setRawJson] = useState(defaultJson);
  const [error, setError] = useState<string>(loadError ?? "");
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    setRawJson(defaultJson);
  }, [defaultJson]);

  useEffect(() => {
    setError(loadError ?? "");
  }, [loadError]);

  const parsedPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(rawJson) as NaesinReadingCreatePayload;
      return {
        ok: true as const,
        value: parsed,
      };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Invalid JSON",
      };
    }
  }, [rawJson]);

  function handlePretty() {
    try {
      const parsed = JSON.parse(rawJson);
      setRawJson(JSON.stringify(parsed, null, 2));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  function handleReset() {
    setRawJson(defaultJson);
    setError(loadError ?? "");
    setSuccess("");
  }

  function handleSave() {
    setError("");
    setSuccess("");

    if (!parsedPreview.ok) {
      setError(parsedPreview.error);
      return;
    }

    startTransition(async () => {
      const result = initialSetId
        ? await updateNaesinReadingSetAction(initialSetId, parsedPreview.value)
        : await createNaesinReadingSetAction(parsedPreview.value);

      if (result.ok === false) {
        setError(result.error);
        return;
      }

      setSuccess(
        initialSetId
          ? `Updated. setId: ${result.setId}`
          : `Saved. setId: ${result.setId}`,
      );

      router.refresh();

      setTimeout(() => {
        router.push(`/admin/content/new/json?setId=${result.setId}`);
      }, 600);
    });
  }

  const preview = parsedPreview.ok ? parsedPreview.value : null;
  const passageCount = preview?.passages?.length ?? 0;
  const questionCount =
    preview?.passages?.reduce((sum, bundle) => sum + bundle.questions.length, 0) ?? 0;

  return (
    <div className="space-y-4">
      {initialSetId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Loaded existing Naesin set:{" "}
          <span className="font-semibold">{initialSetId}</span>
        </div>
      )}

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Naesin Reading JSON Editor
            </h2>
            <p className="text-sm text-gray-500">
              Paste payload JSON, validate, and save directly to DB.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isPending}
            >
              {initialPayload ? "Reload Loaded" : "Sample"}
            </button>

            <button
              type="button"
              onClick={handlePretty}
              className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isPending}
            >
              Pretty
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              disabled={isPending}
            >
              {isPending ? "Saving..." : initialSetId ? "Update" : "Save"}
            </button>
          </div>
        </div>

        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Set title
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {preview?.set?.title ?? "-"}
            </div>
          </div>

          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Passages
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {passageCount}
            </div>
          </div>

          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Questions
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900">
              {questionCount}
            </div>
          </div>
        </div>

        {!parsedPreview.ok && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            JSON parse error: {parsedPreview.error}
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <textarea
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          spellCheck={false}
          className="min-h-[560px] w-full rounded-xl border bg-neutral-950 p-4 font-mono text-sm text-green-200 outline-none ring-0"
        />
      </div>
    </div>
  );
}
