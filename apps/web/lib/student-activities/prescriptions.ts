import type { SupabaseClient } from "@supabase/supabase-js";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type WeakSeverity = "low" | "medium" | "high";

export type WeakTagInput = {
  weakTag: string;
  severity?: WeakSeverity | null;
  source?: string | null;
  meta?: Record<string, Json>;
};

type SaveWeakTagsSuccess = { ok: true; inserted: number };
type SaveWeakTagsFailure = { ok: false; error: string; inserted: number };
type SaveWeakTagsResult = SaveWeakTagsSuccess | SaveWeakTagsFailure;

type CreatePrescriptionsSuccess = { ok: true; created: number };
type CreatePrescriptionsFailure = { ok: false; error: string; created: number };
type CreatePrescriptionsResult =
  | CreatePrescriptionsSuccess
  | CreatePrescriptionsFailure;

type SaveWeakTagsAndCreatePrescriptionsSuccess = {
  ok: true;
  insertedWeakTags: number;
  createdPrescriptions: number;
};

type SaveWeakTagsAndCreatePrescriptionsFailure = {
  ok: false;
  error: string;
  insertedWeakTags: number;
  createdPrescriptions: number;
};

type SaveWeakTagsAndCreatePrescriptionsResult =
  | SaveWeakTagsAndCreatePrescriptionsSuccess
  | SaveWeakTagsAndCreatePrescriptionsFailure;

const WEAK_TAG_TO_PRESCRIPTION: Record<
  string,
  {
    prescriptionType: string;
    title: string;
    section?: string;
    payload?: Record<string, Json>;
  }
> = {
  "근거찾기-약함": {
    prescriptionType: "evidence_drill",
    title: "근거 찾기 Drill",
    section: "reading",
  },
  "어휘-문맥추론-약함": {
    prescriptionType: "context_vocab_drill",
    title: "문맥 어휘 Drill",
    section: "reading",
  },
  "문장구조-약함": {
    prescriptionType: "structure_drill",
    title: "문장 구조 Drill",
    section: "reading",
  },
  "해석-약함": {
    prescriptionType: "translation_drill",
    title: "해석 복원 Drill",
    section: "reading",
  },
};

function normalizeWeakTag(value: string): string {
  return value.trim();
}

function uniqueWeakTags(items: WeakTagInput[]): WeakTagInput[] {
  const seen = new Set<string>();
  const result: WeakTagInput[] = [];

  for (const item of items) {
    const key = normalizeWeakTag(item.weakTag);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    result.push({
      ...item,
      weakTag: key,
    });
  }

  return result;
}

export async function saveActivityWeakTags(
  supabase: SupabaseClient,
  input: {
    activityId: string;
    studentId: string;
    tags: WeakTagInput[];
  },
): Promise<SaveWeakTagsResult> {
  const tags = uniqueWeakTags(input.tags);

  if (tags.length === 0) {
    return { ok: true, inserted: 0 };
  }

  const tagNames = tags.map((t) => t.weakTag);

  const { data: existing, error: existsErr } = await supabase
    .from("student_activity_weak_tags")
    .select("weak_tag")
    .eq("activity_id", input.activityId)
    .in("weak_tag", tagNames);

  if (existsErr) return { ok: false, error: existsErr.message, inserted: 0 };

  const existingSet = new Set((existing ?? []).map((r: any) => r.weak_tag));
  const toInsert = tags.filter((t) => !existingSet.has(t.weakTag));

  if (toInsert.length === 0) return { ok: true, inserted: 0 };

  const { error: insertErr } = await supabase.from("student_activity_weak_tags").insert(
    toInsert.map((tag) => ({
      activity_id: input.activityId,
      student_id: input.studentId,
      weak_tag: tag.weakTag,
      severity: tag.severity ?? null,
      source: tag.source ?? null,
      meta: tag.meta ?? {},
    })),
  );

  if (insertErr) return { ok: false, error: insertErr.message, inserted: 0 };

  return { ok: true, inserted: toInsert.length };
}

export async function createPrescriptionsFromWeakTags(
  supabase: SupabaseClient,
  input: {
    activityId: string;
    studentId: string;
    tags: WeakTagInput[];
    dueAt?: string | null;
  },
): Promise<CreatePrescriptionsResult> {
  const tags = uniqueWeakTags(input.tags);

  if (tags.length === 0) {
    return { ok: true, created: 0 };
  }

  const mappedTags = tags.flatMap((tag) => {
    const mapped = WEAK_TAG_TO_PRESCRIPTION[tag.weakTag];
    return mapped ? [{ tag, mapped }] : [];
  });

  if (mappedTags.length === 0) return { ok: true, created: 0 };

  const { data: existing, error: existsErr } = await supabase
    .from("student_prescriptions")
    .select("weak_tag, prescription_type")
    .eq("student_id", input.studentId)
    .eq("activity_id", input.activityId)
    .in(
      "weak_tag",
      mappedTags.map((m) => m.tag.weakTag),
    );

  if (existsErr) return { ok: false, error: existsErr.message, created: 0 };

  const existingSet = new Set(
    (existing ?? []).map((r: any) => `${r.weak_tag}|${r.prescription_type}`),
  );

  const toInsert = mappedTags.filter(
    ({ tag, mapped }) => !existingSet.has(`${tag.weakTag}|${mapped.prescriptionType}`),
  );

  if (toInsert.length === 0) return { ok: true, created: 0 };

  const { error: insertErr } = await supabase.from("student_prescriptions").insert(
    toInsert.map(({ tag, mapped }) => ({
      student_id: input.studentId,
      activity_id: input.activityId,
      weak_tag: tag.weakTag,
      prescription_type: mapped.prescriptionType,
      status: "queued",
      title: mapped.title,
      due_at: input.dueAt ?? null,
      payload: {
        section: mapped.section ?? null,
        weakTag: tag.weakTag,
        severity: tag.severity ?? null,
        source: tag.source ?? null,
        ...(mapped.payload ?? {}),
      },
    })),
  );

  if (insertErr) return { ok: false, error: insertErr.message, created: 0 };

  return { ok: true, created: toInsert.length };
}

export async function saveWeakTagsAndCreatePrescriptions(
  supabase: SupabaseClient,
  input: {
    activityId: string;
    studentId: string;
    tags: WeakTagInput[];
    dueAt?: string | null;
  },
): Promise<SaveWeakTagsAndCreatePrescriptionsResult> {
  const weakRes = await saveActivityWeakTags(supabase, {
    activityId: input.activityId,
    studentId: input.studentId,
    tags: input.tags,
  });

  if ("error" in weakRes) {
    return {
      ok: false,
      error: weakRes.error,
      insertedWeakTags: weakRes.inserted,
      createdPrescriptions: 0,
    };
  }

  const prescriptionRes = await createPrescriptionsFromWeakTags(supabase, {
    activityId: input.activityId,
    studentId: input.studentId,
    tags: input.tags,
    dueAt: input.dueAt ?? null,
  });

  if ("error" in prescriptionRes) {
    return {
      ok: false,
      error: prescriptionRes.error,
      insertedWeakTags: weakRes.inserted,
      createdPrescriptions: prescriptionRes.created,
    };
  }

  return {
    ok: true,
    insertedWeakTags: weakRes.inserted,
    createdPrescriptions: prescriptionRes.created,
  };
}
