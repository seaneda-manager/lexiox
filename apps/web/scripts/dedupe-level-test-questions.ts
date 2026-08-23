#!/usr/bin/env node
// track+section+sub_level당 가장 오래된(created_at 최솟값) AI 생성 문항 하나만 남기고 나머지 중복 삭제.
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
    .select("id, track, section, sub_level, created_at")
    .eq("generated_by_ai", true)
    .order("created_at", { ascending: true });

  const seen = new Set<string>();
  const toDelete: string[] = [];
  for (const q of qs ?? []) {
    const key = `${q.track}/${q.section}/${q.sub_level}`;
    if (seen.has(key)) {
      toDelete.push(q.id);
    } else {
      seen.add(key);
    }
  }

  console.log(`삭제 대상 ${toDelete.length}개`);
  if (toDelete.length > 0) {
    const { error } = await svc.from("level_test_questions").delete().in("id", toDelete);
    if (error) throw new Error(error.message);
  }
  console.log("완료");
}
main();
