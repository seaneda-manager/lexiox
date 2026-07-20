type SupabaseServerClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").getServerSupabase>
>;

type ValidationOk<T extends object = {}> = { ok: true } & T;
type ValidationFail = { ok: false; error: string };

type NaesinQuestionRef = {
  id: string;
  set_id: string;
  passage_id: string;
};

export async function validateNaesinQuestionRef(
  supabase: SupabaseServerClient,
  input: {
    setId: string;
    questionId: string;
    passageId?: string | null;
  },
): Promise<ValidationOk<{ question: NaesinQuestionRef }> | ValidationFail> {
  const setId = input.setId.trim();
  const questionId = input.questionId.trim();
  const passageId = String(input.passageId ?? "").trim();

  if (!setId) return { ok: false, error: "Invalid setId" };
  if (!questionId) return { ok: false, error: "Invalid questionId" };

  const { data, error } = await supabase
    .from("naesin_reading_questions")
    .select("id, set_id, passage_id")
    .eq("id", questionId)
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Question not found" };
  }

  const question = data as NaesinQuestionRef;

  if (question.set_id !== setId) {
    return { ok: false, error: "Question does not belong to this session set" };
  }

  if (passageId && question.passage_id !== passageId) {
    return { ok: false, error: "Question and passage do not match" };
  }

  return { ok: true, question };
}

export async function validateNaesinPassageRef(
  supabase: SupabaseServerClient,
  input: {
    setId: string;
    passageId: string;
  },
): Promise<ValidationOk<{ passageId: string }> | ValidationFail> {
  const setId = input.setId.trim();
  const passageId = input.passageId.trim();

  if (!setId) return { ok: false, error: "Invalid setId" };
  if (!passageId) return { ok: false, error: "Invalid passageId" };

  const { data, error } = await supabase
    .from("naesin_reading_questions")
    .select("passage_id")
    .eq("set_id", setId)
    .eq("passage_id", passageId)
    .limit(1);

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Passage does not belong to this session set" };
  }

  return { ok: true, passageId };
}
