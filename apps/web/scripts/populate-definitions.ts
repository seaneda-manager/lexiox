#!/usr/bin/env node

/**
 * API Ninjas Dictionary API에서 정의와 품사를 fetch해서 words 테이블 업데이트
 *
 * Usage:
 * npx ts-node scripts/populate-definitions.ts
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

interface DictionaryResult {
  word: string;
  definitions: Array<{
    definition: string;
    part_of_speech: string;
  }>;
}

async function fetchDefinitionFromAPI(word: string): Promise<DictionaryResult | null> {
  try {
    const apiKey = process.env.API_NINJAS_KEY;
    if (!apiKey) {
      console.error("❌ API_NINJAS_KEY not set in environment");
      return null;
    }

    const response = await fetch(
      `https://api.api-ninjas.com/v1/dictionary?word=${encodeURIComponent(word)}`,
      {
        headers: {
          "X-Api-Key": apiKey,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // 단어가 없음
      }
      console.error(`❌ API Ninjas error for "${word}":`, response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error fetching definition for "${word}":`, error);
    return null;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("🎯 Populating word definitions from API Ninjas Dictionary...\n");

  try {
    // 1. words 테이블에서 pos나 meanings_en_simple이 없는 단어 조회
    const { data: words, error: wordsError } = await supabase
      .from("words")
      .select("id, text, pos, meanings_en_simple")
      .is("meanings_en_simple", null)
      .limit(1000);

    if (wordsError) {
      console.error("❌ Failed to fetch words:", wordsError);
      process.exit(1);
    }

    if (!words || words.length === 0) {
      console.log("✅ All words have definitions!");
      process.exit(0);
    }

    console.log(`📊 Found ${words.length} words without definitions\n`);

    let successCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i] as any;
      process.stdout.write(`\r[${i + 1}/${words.length}] Processing "${word.text}"...`);

      const definition = await fetchDefinitionFromAPI(word.text);

      if (definition && definition.definitions && definition.definitions.length > 0) {
        const firstDef = definition.definitions[0];
        const pos = word.pos || firstDef.part_of_speech;
        const meanings = definition.definitions.map(d => d.definition);

        const { error: updateError } = await supabase
          .from("words")
          .update({
            pos,
            meanings_en_simple: meanings,
          })
          .eq("id", word.id);

        if (!updateError) {
          successCount++;
          updatedCount++;
        } else {
          console.error(`\n❌ Error updating "${word.text}":`, updateError);
        }
      } else {
        successCount++;
      }

      // API rate limiting (100ms delay)
      await sleep(100);
    }

    console.log(`\n\n✅ Complete!\n`);
    console.log(`📈 Summary:`);
    console.log(`   - Words processed: ${successCount}/${words.length}`);
    console.log(`   - Definitions updated: ${updatedCount}`);
    console.log(`\n💾 Data saved to words table`);
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

main();
