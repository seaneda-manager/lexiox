// apps/web/app/(protected)/reading/test/page.tsx
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { RPassage, RQuestion } from "@/models/reading";
import TestRunnerV2 from "@/components/reading/runner/TestRunnerV2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RQType = RQuestion["type"];

function normalizeType(t: unknown): RQType {
  const ok: RQType[] = [
    "vocab",
    "detail",
    "negative_detail",
    "paraphrasing",
    "inference",
    "purpose",
    "pronoun_ref",
    "insertion",
    "summary",
    "organization",
  ];
  if (t === "single") return "detail";
  const s = String(t);
  return (ok as unknown as string[]).includes(s) ? (s as RQType) : "detail";
}

function rejectAfter<T = never>(ms: number, label: string): Promise<T> {
  return new Promise((_res, rej) => {
    setTimeout(() => rej(new Error(`timeout:${label} (${ms}ms)`)), ms);
  });
}

function withTimeout<T>(promiseLike: any, ms: number, label: string): Promise<T> {
  const p: Promise<T> = Promise.resolve(promiseLike);
  return Promise.race([p, rejectAfter<T>(ms, label)]);
}

type Resp<T> = { data: T; error?: any };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ setId?: string; profileId?: string; gateFirst?: string }>;
}) {
  const sp = await searchParams;

  const rawSetId = sp?.setId;
  const setId = typeof rawSetId === "string" ? rawSetId.trim() : "";
  const profileId = sp?.profileId;
  const gateFirst =
    typeof sp?.gateFirst === "string"
      ? sp.gateFirst === "1"
      : undefined;

  if (!setId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          setId가 없습니다. /reading 에서 실제 세트를 선택해서 다시 시작하세요.
        </div>
      </div>
    );
  }

  let passage: RPassage | null = null;

  try {
    const supabase = await getSupabaseServer();

    const respP = await withTimeout<Resp<any>>(
      supabase
        .from("reading_passages")
        .select("*")
        .eq("set_id", setId)
        .order("ord", { ascending: false })
        .limit(1)
        .maybeSingle(),
      4000,
      "select:reading_passages"
    );

    if (respP.error) {
      throw respP.error;
    }

    const p = respP.data;

    if (!p) {
      return (
        <div className="p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Passage가 없습니다. setId=<b>{setId}</b>
          </div>
        </div>
      );
    }

    const respQs = await withTimeout<Resp<any[]>>(
      supabase
        .from("reading_questions")
        .select("*, choices:reading_choices(*)")
        .eq("passage_id", p.id)
        .order("number", { ascending: true }),
      4000,
      "select:reading_questions+choices"
    );

    if (respQs.error) {
      throw respQs.error;
    }

    const qs = respQs.data ?? [];

    const paragraphs: string[] = Array.isArray((p as any)?.paragraphs)
      ? (p as any).paragraphs
      : typeof (p as any)?.content === "string" && (p as any).content.length
        ? String((p as any).content).split(/\r?\n\r?\n+/g)
        : [];

    passage = {
      id: p.id,
      title: p.title ?? "",
      paragraphs,
      questions: qs.map((q: any) => {
        const metaRaw =
          typeof q.meta === "string"
            ? (() => {
                try {
                  return JSON.parse(q.meta);
                } catch {
                  return undefined;
                }
              })()
            : q.meta ?? undefined;

        const meta =
          metaRaw || q.explanation || q.clue_quote
            ? {
                ...(metaRaw ?? {}),
                ...(q.explanation ? { explanation: String(q.explanation) } : {}),
                ...(q.clue_quote ? { clue_quote: String(q.clue_quote) } : {}),
              }
            : undefined;

        const choices = (q.choices ?? []).map((c: any) => ({
          id: c.id,
          text: c.text ?? c.label ?? "",
          isCorrect: (c as any).isCorrect ?? !!c.is_correct,
        }));

        return {
          id: q.id,
          number: q.number ?? 0,
          stem: q.stem ?? "",
          type: normalizeType(q.type),
          meta,
          choices,
        } as RQuestion;
      }),
    };
  } catch (e: any) {
    console.warn("[Reading/Test] DB load failed:", e?.message || e);
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Reading test 데이터를 불러오지 못했습니다.
          <div className="mt-2 text-xs text-red-600">
            {String(e?.message || e || "unknown error")}
          </div>
        </div>
      </div>
    );
  }

  if (!passage?.questions?.length) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          현재 패시지에는 문항이 없습니다. passage: <b>{passage?.title || "untitled"}</b>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <TestRunnerV2
        passage={passage}
        setId={setId}
        profileId={profileId}
        gateFirst={gateFirst}
      />
    </div>
  );
}