import type { SupabaseClient } from "@supabase/supabase-js";
import {
  saveWeakTagsAndCreatePrescriptions,
  type WeakTagInput,
} from "@/lib/student-activities/prescriptions";

type JsonRecord = Record<string, unknown>;

type StudentActivityRow = {
  id: string;
  student_id: string;
  activity_type: string;
  track: string | null;
  section: string | null;
  status: string;
  title: string | null;
  description: string | null;
  meta: JsonRecord | null;
  accuracy: number | null;
  score: number | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type AutoPrescriptionSuccess = {
  ok: true;
  activityId: string;
  insertedWeakTags: number;
  createdPrescriptions: number;
  tags: WeakTagInput[];
};

type AutoPrescriptionFailure = {
  ok: false;
  error: string;
  activityId?: string;
  insertedWeakTags: number;
  createdPrescriptions: number;
  tags: WeakTagInput[];
};

type AutoPrescriptionResult = AutoPrescriptionSuccess | AutoPrescriptionFailure;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function daysFromNowIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function pushTag(
  bucket: WeakTagInput[],
  weakTag: string,
  severity: "low" | "medium" | "high",
  source: string,
  meta?: Record<string, string | number | boolean | null>,
) {
  if (bucket.some((x) => x.weakTag === weakTag)) return;

  bucket.push({
    weakTag,
    severity,
    source,
    meta,
  });
}

function deriveWeakTagsFromActivity(activity: StudentActivityRow): WeakTagInput[] {
  const tags: WeakTagInput[] = [];
  const meta = asRecord(activity.meta);
  const accuracy = activity.accuracy ?? asNumber(meta?.accuracy);
  const section = activity.section ?? "";
  const activityType = activity.activity_type ?? "";

  if (section === "reading" || activityType === "reading_session") {
    if (accuracy !== null) {
      if (accuracy < 60) {
        pushTag(tags, "근거찾기-약함", "high", "activity_rule", {
          accuracy,
          rule: "reading_accuracy_below_60",
        });
        pushTag(tags, "문장구조-약함", "medium", "activity_rule", {
          accuracy,
          rule: "reading_accuracy_below_60",
        });
      } else if (accuracy < 75) {
        pushTag(tags, "근거찾기-약함", "medium", "activity_rule", {
          accuracy,
          rule: "reading_accuracy_below_75",
        });
      }
    }

    const weakTagList = Array.isArray(meta?.weakTags)
      ? meta.weakTags
      : Array.isArray(meta?.weak_tags)
        ? meta.weak_tags
        : [];

    for (const item of weakTagList) {
      if (typeof item !== "string") continue;

      if (item.includes("근거")) {
        pushTag(tags, "근거찾기-약함", "medium", "activity_meta", {
          raw: item,
        });
      } else if (item.includes("어휘")) {
        pushTag(tags, "어휘-문맥추론-약함", "medium", "activity_meta", {
          raw: item,
        });
      } else if (item.includes("구조") || item.includes("문장")) {
        pushTag(tags, "문장구조-약함", "medium", "activity_meta", {
          raw: item,
        });
      } else if (item.includes("해석")) {
        pushTag(tags, "해석-약함", "medium", "activity_meta", {
          raw: item,
        });
      }
    }
  }

  return tags;
}

export async function autoCreatePrescriptionsForActivity(
  supabase: SupabaseClient,
  activityId: string,
): Promise<AutoPrescriptionResult> {
  const activityRes = await supabase
    .from("student_activities")
    .select(
      "id, student_id, activity_type, track, section, status, title, description, meta, accuracy, score, created_at, started_at, completed_at",
    )
    .eq("id", activityId)
    .single();

  if (activityRes.error) {
    return {
      ok: false,
      error: activityRes.error.message,
      insertedWeakTags: 0,
      createdPrescriptions: 0,
      tags: [],
    };
  }

  const activity = activityRes.data as StudentActivityRow;
  const tags = deriveWeakTagsFromActivity(activity);

  if (tags.length === 0) {
    return {
      ok: true,
      activityId: activity.id,
      insertedWeakTags: 0,
      createdPrescriptions: 0,
      tags: [],
    };
  }

  const result = await saveWeakTagsAndCreatePrescriptions(supabase, {
    activityId: activity.id,
    studentId: activity.student_id,
    tags,
    dueAt: daysFromNowIso(1),
  });

  if ("error" in result) {
    return {
      ok: false,
      error: result.error,
      activityId: activity.id,
      insertedWeakTags: result.insertedWeakTags,
      createdPrescriptions: result.createdPrescriptions,
      tags,
    };
  }

  return {
    ok: true,
    activityId: activity.id,
    insertedWeakTags: result.insertedWeakTags,
    createdPrescriptions: result.createdPrescriptions,
    tags,
  };
}

export async function autoCreatePrescriptionsForLatestReadingActivity(
  supabase: SupabaseClient,
  studentId: string,
): Promise<AutoPrescriptionResult> {
  const latestRes = await supabase
    .from("student_activities")
    .select("id")
    .eq("student_id", studentId)
    .eq("activity_type", "reading_session")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRes.error) {
    return {
      ok: false,
      error: latestRes.error.message,
      insertedWeakTags: 0,
      createdPrescriptions: 0,
      tags: [],
    };
  }

  if (!latestRes.data?.id) {
    return {
      ok: false,
      error: "No reading activity found for this student.",
      insertedWeakTags: 0,
      createdPrescriptions: 0,
      tags: [],
    };
  }

  return autoCreatePrescriptionsForActivity(supabase, latestRes.data.id as string);
}
