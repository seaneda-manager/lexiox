import { getServerSupabase } from "@/lib/supabase/server";
import {
  assertOwnNaesinSession,
  type NaesinSessionRef,
} from "@/lib/reading-review/adapters/naesin/session";
import {
  validateNaesinPassageRef,
  validateNaesinQuestionRef,
} from "@/lib/reading-review/adapters/naesin/validation";

type SupabaseServerClient = Awaited<ReturnType<typeof getServerSupabase>>;

type ActionOk<T extends object = {}> = { ok: true } & T;
type ActionFail = { ok: false; error: string };

type NaesinQuestionRef = {
  id: string;
  set_id: string;
  passage_id: string;
};

export type NaesinSessionContext = {
  supabase: SupabaseServerClient;
  session: NaesinSessionRef;
};

export type NaesinQuestionContext = NaesinSessionContext & {
  question: NaesinQuestionRef;
};

export type NaesinPassageContext = NaesinSessionContext & {
  passageId: string;
};

export async function getOwnNaesinSessionContext(
  sessionId: string,
): Promise<ActionOk<NaesinSessionContext> | ActionFail> {
  const supabase = await getServerSupabase();

  const own = await assertOwnNaesinSession(supabase, sessionId);
  if (own.ok === false) return own;

  return {
    ok: true,
    supabase,
    session: own.session,
  };
}

export async function resolveNaesinQuestionContext(input: {
  sessionId: string;
  questionId: string;
  passageId?: string | null;
}): Promise<ActionOk<NaesinQuestionContext> | ActionFail> {
  const base = await getOwnNaesinSessionContext(input.sessionId);
  if (base.ok === false) return base;

  const validation = await validateNaesinQuestionRef(base.supabase, {
    setId: base.session.set_id,
    questionId: input.questionId,
    passageId: input.passageId,
  });
  if (validation.ok === false) return validation;

  return {
    ok: true,
    supabase: base.supabase,
    session: base.session,
    question: validation.question,
  };
}

export async function resolveNaesinPassageContext(input: {
  sessionId: string;
  passageId: string;
}): Promise<ActionOk<NaesinPassageContext> | ActionFail> {
  const base = await getOwnNaesinSessionContext(input.sessionId);
  if (base.ok === false) return base;

  const validation = await validateNaesinPassageRef(base.supabase, {
    setId: base.session.set_id,
    passageId: input.passageId,
  });
  if (validation.ok === false) return validation;

  return {
    ok: true,
    supabase: base.supabase,
    session: base.session,
    passageId: validation.passageId,
  };
}
