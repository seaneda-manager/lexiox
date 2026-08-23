#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const idx = line.indexOf("=");
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !key.startsWith("#")) process.env[key] = value;
    });
  }
}
loadEnv();

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

async function main() {
  const { data: qs } = await svc
    .from("level_test_questions")
    .select("id, section, track, sub_level, prompt, passage_text, choices, correct_choice_id")
    .eq("generated_by_ai", true)
    .order("track", { ascending: true })
    .order("sub_level", { ascending: true })
    .order("section", { ascending: true });

  for (const q of qs ?? []) {
    console.log(`\n=== ${q.track}/${q.sub_level}/${q.section} (id:${q.id.slice(0, 8)}) ===`);
    if (q.passage_text) console.log(`[PASSAGE] ${q.passage_text}`);
    console.log(`Q: ${q.prompt}`);
    if (q.choices) {
      for (const c of q.choices as { id: string; text: string }[]) {
        console.log(`  ${c.id === q.correct_choice_id ? "✅" : "  "} (${c.id}) ${c.text}`);
      }
    }
  }
  console.log(`\n총 ${qs?.length ?? 0}개`);
}
main();
