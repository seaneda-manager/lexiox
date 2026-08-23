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
  const { data: rows, error } = await svc
    .from("hi_naesin_drill_responses")
    .select("id, drill_id, session_id, is_correct, reviewed_at, created_at")
    .eq("is_correct", false)
    .is("reviewed_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) { console.error(error); return; }

  console.log(`총 오답(미확인) 행: ${(rows ?? []).length}`);

  const sessionIds = [...new Set((rows ?? []).map((r) => r.session_id).filter(Boolean))];
  console.log(`고유 session_id 개수: ${sessionIds.length}`);
  console.log(`session_id가 null인 행: ${(rows ?? []).filter((r) => !r.session_id).length}`);

  const { data: sessions } = sessionIds.length > 0
    ? await svc.from("hi_naesin_sessions").select("id, student_id").in("id", sessionIds)
    : { data: [] };
  console.log(`hi_naesin_sessions에서 매칭된 행: ${(sessions ?? []).length} / ${sessionIds.length}`);

  const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]));
  const studentIds = [...new Set((sessions ?? []).map((s: any) => s.student_id).filter(Boolean))];
  console.log(`고유 student_id 개수: ${studentIds.length}`);

  const { data: profiles } = studentIds.length > 0
    ? await svc.from("profiles").select("id, full_name, name, email").in("id", studentIds)
    : { data: [] };
  console.log(`profiles에서 매칭된 학생: ${(profiles ?? []).length} / ${studentIds.length}`);

  // 실제로 몇 개 행이 "학생 미확인"으로 떨어지는지 시뮬레이션
  let unresolved = 0;
  for (const r of rows ?? []) {
    const session = r.session_id ? sessionById.get(r.session_id) : undefined;
    if (!session?.student_id) unresolved += 1;
  }
  console.log(`최종적으로 학생 미확인 처리될 행: ${unresolved} / ${(rows ?? []).length}`);
}
main();
