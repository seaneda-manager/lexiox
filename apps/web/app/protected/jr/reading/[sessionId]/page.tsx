import { getServiceSupabase } from "@/lib/supabase/service";
import JrReadingSessionClient from "./_components/JrReadingSessionClient";

export const dynamic = "force-dynamic";

type Props = {
  params: { sessionId: string };
};

export default async function JrReadingSessionPage({ params }: Props) {
  const supabase = getServiceSupabase();
  const sessionId = params.sessionId;

  try {
    // Session 조회
    const { data: session, error: sessionError } = await supabase
      .from("jr_reading_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return (
        <div className="min-h-screen bg-slate-50 p-6">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-2xl font-bold text-slate-900">세션을 찾을 수 없습니다</h1>
          </div>
        </div>
      );
    }

    // 기존 Log 데이터 조회 (진도 복원용)
    const [vocabLogs, grammarLogs, translationLogs, comprehensionLogs] = await Promise.all([
      supabase
        .from("jr_reading_vocab_logs")
        .select("*")
        .eq("session_id", sessionId),
      supabase
        .from("jr_reading_grammar_logs")
        .select("*")
        .eq("session_id", sessionId),
      supabase
        .from("jr_reading_translation_logs")
        .select("*")
        .eq("session_id", sessionId),
      supabase
        .from("jr_reading_comprehension_logs")
        .select("*")
        .eq("session_id", sessionId),
    ]);

    return (
      <JrReadingSessionClient
        sessionId={sessionId}
        passage={{
          id: session.passage_id,
          content: session.passage_content || "",
        }}
        initialStage={(session.stage || "vocabulary") as any}
        initialSentenceIndex={session.current_sentence_index || 0}
        initialVocabLogs={vocabLogs.data || []}
        initialGrammarLogs={grammarLogs.data || []}
        initialTranslationLogs={translationLogs.data || []}
        initialComprehensionLogs={comprehensionLogs.data || []}
      />
    );
  } catch (e) {
    console.error("Failed to load session:", e);
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-2xl font-bold text-slate-900">오류가 발생했습니다</h1>
        </div>
      </div>
    );
  }
}
