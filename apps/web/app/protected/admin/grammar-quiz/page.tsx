import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { GRAMMAR_TRACKS } from "@/models/grammar/quiz";
import QuizBankClient from "./_client/QuizBankClient";

export const dynamic = "force-dynamic";

export default async function GrammarQuizAdminPage() {
  let elements: any[] = [];
  let items: any[] = [];
  let trackCounts: Record<string, number> = {};
  let loadError: string | null = null;
  let needsSeed = false;

  try {
    const authed = await getServerSupabase();
    await authed.auth.getUser();
    const db = getServiceRoleClient();

    const [elRes, itemRes] = await Promise.all([
      db.from("grammar_elements").select("code, label_ko, label_en, category, order_index").order("order_index"),
      db
        .from("grammar_quiz_items")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (elRes.error) loadError = elRes.error.message;
    elements = elRes.data ?? [];
    items = itemRes.data ?? [];
    needsSeed = elements.length === 0 && !loadError;

    for (const t of GRAMMAR_TRACKS) {
      const { count } = await db
        .from("grammar_quiz_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("track", t);
      trackCounts[t] = count ?? 0;
    }
  } catch (e: any) {
    loadError = e?.message ?? "로드 실패";
  }

  return (
    <QuizBankClient
      initialElements={elements}
      initialItems={items}
      trackCounts={trackCounts}
      loadError={loadError}
      needsSeed={needsSeed}
    />
  );
}
