#!/usr/bin/env node

/**
 * publicapi.dev에서 동의어를 fetch해서 word_synonyms 테이블에 저장
 *
 * Usage:
 * node -r dotenv/config scripts/populate-synonyms.ts
 * 또는 환경변수 설정 후:
 * npx ts-node scripts/populate-synonyms.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface WordRecord {
  id: string;
  text: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSynonymsFromAPI(word: string): Promise<string[]> {
  try {
    const apiKey = process.env.API_NINJAS_KEY;
    if (!apiKey) {
      console.error("❌ API_NINJAS_KEY not set in environment");
      return [];
    }

    const response = await fetch(
      `https://api.api-ninjas.com/v1/thesaurus?word=${encodeURIComponent(word)}`,
      {
        headers: {
          "X-Api-Key": apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ API Ninjas error for "${word}":`, response.status);
      return [];
    }

    const data = await response.json();

    // API Ninjas response format: { word: "...", synonyms: ["word1", "word2", ...], ... }
    if (data.synonyms && Array.isArray(data.synonyms)) {
      return data.synonyms.slice(0, 10);
    }

    return [];
  } catch (error) {
    console.error(`❌ Error fetching synonyms for "${word}":`, error);
    return [];
  }
}

async function main() {
  console.log("🎯 Populating word_synonyms from Datamuse API...\n");

  try {
    // 1. 모든 단어 조회
    const { data: words, error: wordsError } = await supabase
      .from("words")
      .select("id, text")
      .limit(500);

    if (wordsError) {
      console.error("❌ Failed to fetch words:", wordsError);
      process.exit(1);
    }

    if (!words || words.length === 0) {
      console.error("❌ No words found in database");
      process.exit(1);
    }

    console.log(`📊 Found ${words.length} words to process\n`);

    // 2. 각 단어의 동의어 fetch 및 DB에 저장
    let successCount = 0;
    let synonymCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i] as WordRecord;
      process.stdout.write(`\r[${i + 1}/${words.length}] Processing "${word.text}"...`);

      const synonymTexts = await fetchSynonymsFromAPI(word.text);

      if (synonymTexts.length > 0) {
        // 동의어 텍스트를 DB의 word.id로 변환
        const { data: synonymWords, error: synonymWordsError } = await supabase
          .from("words")
          .select("id, text")
          .in("text", synonymTexts);

        if (synonymWordsError) {
          console.error(`\n❌ Error fetching synonym words:`, synonymWordsError);
          continue;
        }

        if (synonymWords && synonymWords.length > 0) {
          // word_synonyms에 insert
          const records = synonymWords.map(synWord => ({
            word_id: word.id,
            synonym_word_id: synWord.id,
            tier: 1,
            relationship_type: "synonym",
            similarity_score: 100,
            source: "datamuse_auto",
          }));

          const { error: insertError } = await supabase
            .from("word_synonyms")
            .insert(records)
            .select();

          if (!insertError) {
            successCount++;
            synonymCount += records.length;
          } else if (insertError.code !== "23505") {
            // 23505: unique constraint violation (무시)
            console.error(`\n❌ Error inserting synonyms for "${word.text}":`, insertError);
          }
        }
      }

      // API rate limiting (100ms delay)
      await sleep(100);
    }

    console.log(`\n\n✅ Complete!\n`);
    console.log(`📈 Summary:`);
    console.log(`   - Words processed: ${successCount}/${words.length}`);
    console.log(`   - Synonyms created: ${synonymCount}`);
    console.log(`\n💾 Data saved to word_synonyms table`);
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
}

main();
