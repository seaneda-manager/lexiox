#!/usr/bin/env node

/**
 * 동의어 정확성 분석 및 부정확한 쌍 식별
 * 기준: 실제 문장에서 대체해서 쓸 수 있는가?
 */

import fs from "fs";

// 명백히 부정확한 패턴들
const INVALID_PATTERNS = [
  // 의미가 완전히 다른 경우
  { word1: "profile", word2: "geometry", reason: "개요 vs 학문" },
  { word1: "purchase", words2: ["grab", "grasp", "grip", "hold"], reason: "구매 vs 잡다" },
  { word1: "preview", words2: ["exercise", "drill", "practice"], reason: "미리보기 vs 운동" },
  { word1: "predict", words2: ["warn", "announce"], reason: "예측 vs 경고/발표" },
  { word1: "infection", words2: ["attack", "germ"], reason: "감염 vs 공격/세균" },
  { word1: "premature", words2: ["sudden", "unexpected", "abrupt"], reason: "시기상조 vs 갑작스러운" },
  { word1: "outline", words2: ["surround", "trim"], reason: "윤곽 vs 둘러싸다/다듬다" },
  { word1: "outbreak", words2: ["increase", "surge"], reason: "발발 vs 증가" },
  { word1: "progress", words2: ["flow", "passage"], reason: "진보 vs 흐름/통로" },
  { word1: "illustrate", words2: ["mention", "cite", "analyze"], reason: "설명하다 vs 언급/인용/분석" },
  { word1: "recall", words2: ["reproduce"], reason: "기억해내다 vs 재현하다" },
  { word1: "precaution", words2: ["guard", "screen"], reason: "예방책 vs 방패/보호막" },
];

function analyzeFile() {
  console.log("🔍 동의어 정확성 분석 중...\n");

  const content = fs.readFileSync("all_synonyms.txt", "utf-8");
  const lines = content.split("\n").filter(line => line.includes("|"));

  const toDelete: { word1: string; word2: string; reason: string }[] = [];

  for (const line of lines) {
    const parts = line.split("|").map(p => p.trim()).filter(p => p);
    if (parts.length < 2) continue;

    const [word1, word2] = parts;

    // 패턴 매칭으로 부정확한 쌍 찾기
    for (const pattern of INVALID_PATTERNS) {
      if (pattern.word1.toLowerCase() === word1.toLowerCase()) {
        if ("word2" in pattern) {
          if (pattern.word2.toLowerCase() === word2.toLowerCase()) {
            toDelete.push({ word1, word2, reason: (pattern as any).reason });
          }
        } else if ("words2" in pattern) {
          if ((pattern as any).words2.some((w: string) => w.toLowerCase() === word2.toLowerCase())) {
            toDelete.push({ word1, word2, reason: (pattern as any).reason });
          }
        }
      }
    }
  }

  console.log(`📊 총 동의어 쌍: ${lines.length}`);
  console.log(`❌ 부정확한 쌍: ${toDelete.length}\n`);

  if (toDelete.length > 0) {
    console.log("🗑️ 제거할 동의어 쌍:\n");
    for (const item of toDelete) {
      console.log(`"${item.word1}" | "${item.word2}" - ${item.reason}`);
    }

    // SQL 스크립트 생성
    console.log("\n\n📋 SQL 삭제 쿼리:\n");
    console.log("DELETE FROM word_synonyms WHERE (word_id, synonym_word_id) IN (");

    for (let i = 0; i < toDelete.length; i++) {
      const item = toDelete[i];
      console.log(`  (SELECT w1.id, w2.id FROM words w1, words w2 WHERE w1.text = '${item.word1}' AND w2.text = '${item.word2}')${i < toDelete.length - 1 ? "," : ""}`);
    }

    console.log(");");
  }
}

analyzeFile();
