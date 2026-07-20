
// Drop-in file
// Place at:
// apps/web/app/(protected)/admin/naesin/passages/[id]/preview/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

type LooseRecord = Record<string, unknown>;

function isRecord(value: unknown): value is LooseRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): LooseRecord | null {
  return isRecord(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    const v = asString(value);
    if (v) return v;
  }
  return null;
}

function pickStringArray(...values: unknown[]): string[] {
  for (const value of values) {
    const arr = asStringArray(value);
    if (arr.length) return arr;
  }
  return [];
}

function splitParagraphsFromText(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitSentencesFromText(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+|\n+/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseJsonLike(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getLoosePayload(row: LooseRecord): LooseRecord {
  const payload = parseJsonLike(row.payload);
  return asRecord(payload) ?? {};
}

function getLooseMeta(row: LooseRecord, payload: LooseRecord): LooseRecord {
  return asRecord(row.meta) ?? asRecord(payload.meta) ?? {};
}

function getLooseCore(row: LooseRecord, payload: LooseRecord): LooseRecord {
  return asRecord(row.core) ?? asRecord(payload.core) ?? {};
}

function getLooseWorkbook(row: LooseRecord, payload: LooseRecord): LooseRecord {
  return asRecord(row.workbook) ?? asRecord(payload.workbook) ?? {};
}

function getLoosePreview(row: LooseRecord, payload: LooseRecord): LooseRecord {
  return asRecord(row.preview) ?? asRecord(payload.preview) ?? {};
}

function getObjectArray(value: unknown): LooseRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function getDisplayText(item: LooseRecord): string | null {
  return pickFirstString(
    item.text,
    item.content,
    item.value,
    item.label,
    item.title,
    item.sentence,
    item.paragraph
  );
}

export default async function AdminNaesinPassagePreviewPage({
  params,
}: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("naesin_passages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const row = data as LooseRecord;
  const payload = getLoosePayload(row);
  const meta = getLooseMeta(row, payload);
  const core = getLooseCore(row, payload);
  const workbook = getLooseWorkbook(row, payload);
  const preview = getLoosePreview(row, payload);

  const title = pickFirstString(
    row.title,
    core.title,
    meta.title,
    "Untitled Passage"
  );

  const status = pickFirstString(row.status, meta.status, core.status, "draft");
  const track = pickFirstString(row.track, meta.track, core.track, "-");
  const sourceType = pickFirstString(
    row.source_type,
    row.sourceType,
    meta.sourceType,
    core.sourceType,
    "-"
  );

  const rawText = pickFirstString(
    row.passage_text,
    row.text,
    row.content,
    core.text,
    core.content,
    preview.fullText
  );

  const paragraphs = pickStringArray(
    row.paragraphs,
    core.paragraphs,
    preview.paragraphs,
    workbook.paragraphs
  );

  const sentences = pickStringArray(
    row.sentences,
    core.sentences,
    preview.sentences,
    workbook.sentences
  );

  const normalizedParagraphs =
    paragraphs.length > 0 ? paragraphs : splitParagraphsFromText(rawText);

  const normalizedSentences =
    sentences.length > 0 ? sentences : splitSentencesFromText(rawText);

  const tags = pickStringArray(row.tags, core.tags, meta.tags);

  const grammarTargets = getObjectArray(
    row.grammar_targets ?? row.grammarTargets ?? workbook.grammarTargets
  );

  const readAloudItems = getObjectArray(
    row.read_aloud_items ?? row.readAloudItems ?? workbook.readAloudItems
  );

  const sentenceOrderItems = getObjectArray(
    row.sentence_order_items ?? row.sentenceOrderItems ?? workbook.sentenceOrderItems
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="text-sm text-neutral-500">Naesin Passage Preview</div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {title}
          </h1>
          <div className="text-sm text-neutral-500">
            ID: {id} · Status: {status} · Track: {track}
          </div>
          <div className="text-sm text-neutral-500">Source Type: {sourceType}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/naesin/passages/${id}/edit`}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Edit
          </Link>
          <Link
            href="/admin/naesin/passages/new"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            New
          </Link>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">문단 Preview</h2>

            {normalizedParagraphs.length > 0 ? (
              <div className="space-y-4">
                {normalizedParagraphs.map((paragraph, index) => (
                  <article
                    key={`${index}-${paragraph.slice(0, 20)}`}
                    className="rounded-2xl bg-neutral-50 p-4"
                  >
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Paragraph {index + 1}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-800">
                      {paragraph}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                문단 데이터가 없습니다.
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">문장 Preview</h2>

            {normalizedSentences.length > 0 ? (
              <div className="space-y-3">
                {normalizedSentences.map((sentence, index) => (
                  <div
                    key={`${index}-${sentence.slice(0, 20)}`}
                    className="rounded-2xl bg-neutral-50 p-4"
                  >
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Sentence {index + 1}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-800">
                      {sentence}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                문장 데이터가 없습니다.
              </div>
            )}
          </section>

          {rawText ? (
            <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">원문</h2>
              <div className="rounded-2xl bg-neutral-50 p-4">
                <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-800">
                  {rawText}
                </p>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">태그</h2>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">태그 없음</div>
            )}
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Grammar Targets
            </h2>
            {grammarTargets.length > 0 ? (
              <div className="space-y-3">
                {grammarTargets.map((item, index) => (
                  <div key={index} className="rounded-2xl bg-neutral-50 p-4 text-sm">
                    <div className="font-medium text-neutral-800">
                      {getDisplayText(item) ?? `Target ${index + 1}`}
                    </div>
                    <pre className="mt-2 overflow-x-auto text-xs text-neutral-600">
                      {safeJson(item)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">항목 없음</div>
            )}
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Read Aloud Items
            </h2>
            {readAloudItems.length > 0 ? (
              <div className="space-y-3">
                {readAloudItems.map((item, index) => (
                  <div key={index} className="rounded-2xl bg-neutral-50 p-4 text-sm">
                    <div className="font-medium text-neutral-800">
                      {getDisplayText(item) ?? `Item ${index + 1}`}
                    </div>
                    <pre className="mt-2 overflow-x-auto text-xs text-neutral-600">
                      {safeJson(item)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">항목 없음</div>
            )}
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Sentence Order Items
            </h2>
            {sentenceOrderItems.length > 0 ? (
              <div className="space-y-3">
                {sentenceOrderItems.map((item, index) => (
                  <div key={index} className="rounded-2xl bg-neutral-50 p-4 text-sm">
                    <div className="font-medium text-neutral-800">
                      {getDisplayText(item) ?? `Item ${index + 1}`}
                    </div>
                    <pre className="mt-2 overflow-x-auto text-xs text-neutral-600">
                      {safeJson(item)}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">항목 없음</div>
            )}
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">JSON Preview</h2>
            <pre className="overflow-x-auto rounded-2xl bg-black p-4 text-xs text-white">
              {safeJson(row)}
            </pre>
          </section>
        </aside>
      </section>
    </main>
  );
}
