import { getServiceSupabase } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import JrGrammarSessionClient from "./_components/JrGrammarSessionClient";

export default async function JrGrammarSessionPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const supabase = getServiceSupabase();

  const { data: session, error } = await supabase
    .from("jr_grammar_sessions")
    .select("*, jr_grammar_chapters(id, title, content)")
    .eq("id", params.sessionId)
    .single();

  if (error || !session) {
    notFound();
  }

  const chapter = session.jr_grammar_chapters;

  return (
    <JrGrammarSessionClient
      sessionId={params.sessionId}
      chapter={{
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
      }}
      initialStage={session.stage || "lesson"}
    />
  );
}
