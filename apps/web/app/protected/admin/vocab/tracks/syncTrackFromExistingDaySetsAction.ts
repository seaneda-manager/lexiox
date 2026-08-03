// apps/web/app/(protected)/admin/vocab/Tracks/syncTrackFromExistingDaySetsAction.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";

export async function syncTrackFromExistingDaySetsAction(input: {
  trackId: string;
  dryRun?: boolean;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Login required");

  // TODO: implement later (not needed for Track→Assign flow right now)
  return { ok: false as const, reason: "NOT_IMPLEMENTED", input };
}
