// lib/speaking-2026/shadowingStage.ts
// speaking_tests에서 "Shadowing:" 접두 스테이지의 listen_repeat task를 뽑아오는 공용 로더
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpeakingTaskListenRepeat2026, SpeakingTest2026 } from "@/models/speaking-2026";

export const SHADOWING_PREFIX = "Shadowing:";

export type ShadowingStage = {
  id: string;
  label: string;
  situation: string;
  imageUrl: string | null;
  sentences: {
    id: string;
    text: string;
    audioUrl: string | null;
    speakingSeconds: number;
    region: SpeakingTaskListenRepeat2026["sentences"][number]["region"] | null;
  }[];
};

export async function loadShadowingStage(
  supabase: SupabaseClient,
  id: string,
): Promise<ShadowingStage | null> {
  const { data, error } = await supabase
    .from("speaking_tests")
    .select("id, label, payload")
    .eq("id", id)
    .maybeSingle();

  if (error || !data || !(data.label as string)?.startsWith(SHADOWING_PREFIX)) {
    return null;
  }

  const test = data.payload as SpeakingTest2026;
  const listenRepeat = test.tasks?.find(
    (t): t is SpeakingTaskListenRepeat2026 => t.type === "listen_repeat",
  );

  if (!listenRepeat) return null;

  return {
    id: data.id as string,
    label: (data.label as string).slice(SHADOWING_PREFIX.length).trim(),
    situation: listenRepeat.situation,
    imageUrl: listenRepeat.imageUrl ?? null,
    sentences: listenRepeat.sentences.map((s) => ({
      id: s.id,
      text: s.text,
      audioUrl: s.audioUrl ?? null,
      speakingSeconds: s.speakingSeconds,
      region: s.region ?? null,
    })),
  };
}
