type SupabaseServerClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").getServerSupabase>
>;

type ValidationOk<T extends object = {}> = { ok: true } & T;
type ValidationFail = { ok: false; error: string };

export type NaesinSessionRef = {
  id: string;
  set_id: string;
  student_id: string;
  score_percent: number | null;
};

export async function assertOwnNaesinSession(
  supabase: SupabaseServerClient,
  sessionId: string,
): Promise<ValidationOk<{ session: NaesinSessionRef }> | ValidationFail> {
  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    return { ok: false, error: "Invalid sessionId" };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) return { ok: false, error: userError.message };
  if (!user) return { ok: false, error: "Authentication required" };

  const { data, error } = await supabase
    .from("naesin_reading_sessions")
    .select("id, set_id, student_id, score_percent")
    .eq("id", normalizedSessionId)
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Session not found" };
  }

  const session = data as NaesinSessionRef;

  if (session.student_id !== user.id) {
    return { ok: false, error: "Forbidden" };
  }

  return { ok: true, session };
}
