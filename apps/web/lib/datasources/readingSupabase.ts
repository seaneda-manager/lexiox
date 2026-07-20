// apps/web/lib/datasources/readingSupabase.ts
import type {
  ReadingEditorDataSource,
  RPassage,
} from "@/components/reading/admin/ReadingEditorData";

export const readingSupabaseDataSource: ReadingEditorDataSource = {
  async load(passageId: string) {
    const res = await fetch(
      `/api/admin/reading/passages/${encodeURIComponent(passageId)}/full`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Load failed");
    return json.data as RPassage;
  },
  async save(model: RPassage) {
    const res = await fetch("/api/admin/reading/passages/save_full", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passage: model }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Save failed");
    return { passage_id: json.result.passage_id as string };
  },
};
