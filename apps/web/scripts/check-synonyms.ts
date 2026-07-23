#!/usr/bin/env node

/**
 * 저장된 동의어들을 샘플로 조회해서 정확성 검증
 */

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// .env.local 파일 로드
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
      const [key, value] = line.split("=");
      if (key && value) {
        process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, "");
      }
    });
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function main() {
  console.log("🔍 Checking synonyms accuracy...\n");

  try {
    const { data: synonyms, error } = await supabase
      .from("word_synonyms")
      .select(
        `
        word_id,
        synonym_word_id,
        words!word_synonyms_word_id_fkey(text),
        words_synonym:words!word_synonyms_synonym_word_id_fkey(text)
      `
      );

    if (error) {
      console.error("❌ Error:", error);
      process.exit(1);
    }

    if (!synonyms || synonyms.length === 0) {
      console.log("No synonyms found");
      process.exit(0);
    }

    console.log(`📊 Total synonyms to check: ${synonyms.length}\n`);
    console.log("Word 1                  | Word 2                  | 동의어?\n");
    console.log("-".repeat(70));

    for (const syn of synonyms) {
      const word1 = (syn as any).words?.text || "?";
      const word2 = (syn as any).words_synonym?.text || "?";
      console.log(`${word1.padEnd(23)} | ${word2.padEnd(23)} |`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
