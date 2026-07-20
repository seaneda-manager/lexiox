import { uniqTextArray } from "@/lib/reading-review/core/text";

type SupabaseServerClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").getServerSupabase>
>;

type ActionOk<T extends object = {}> = { ok: true } & T;
type ActionFail = { ok: false; error: string };

export async function getOfficialNaesinEvidenceQuotes(
  supabase: SupabaseServerClient,
  input: { questionId: string },
): Promise<ActionOk<{ quotes: string[] }> | ActionFail> {
  const questionId = input.questionId.trim();
  if (!questionId) {
    return { ok: false, error: "Invalid questionId" };
  }

  const { data, error } = await supabase
    .from("naesin_reading_evidence")
    .select("quote")
    .eq("question_id", questionId);

  if (error) return { ok: false, error: error.message };

  const quotes = uniqTextArray(
    (data ?? []).map((row: { quote?: unknown }) => String(row.quote ?? "").trim()),
  );

  return { ok: true, quotes };
}
