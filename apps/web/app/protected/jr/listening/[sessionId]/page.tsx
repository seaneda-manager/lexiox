import { getServiceSupabase } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import JrListeningSessionClient from "./_components/JrListeningSessionClient";

export default async function JrListeningSessionPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const supabase = getServiceSupabase();

  const { data: session, error } = await supabase
    .from("jr_listening_sessions")
    .select("*")
    .eq("id", params.sessionId)
    .single();

  if (error || !session) {
    notFound();
  }

  return (
    <JrListeningSessionClient
      sessionId={params.sessionId}
      audioUrl={session.audio_url}
      audioTranscript={session.audio_transcript}
      initialStage={session.stage || "notes"}
    />
  );
}
