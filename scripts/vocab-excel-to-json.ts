// scripts/vocab-excel-to-json.ts
// ts-node로 실행하거나, js로 변환해서 node로 실행하면 됨.

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

type WordCreatePayload = {
  text: string;
  lemma: string | null;
  pos: string;
  is_function_word: boolean;
  meanings_ko: string[];
  meanings_en_simple: string[];
  examples_easy: string[];
  examples_normal: string[];
  derived_terms: string[];
  difficulty: number | null;
  frequency_score: number | null;
  notes: string;
  gradeBands: string[];
  sources: {
    sourceType: string;
    sourceLabel: string;
    examYear: number | null;
    examMonth: number | null;
    examRound: string | null;
    grade: string | null;
  }[];
  semanticTagIds: string[];
  grammarHints: {
    grammarCategory: string;
    shortTipKo: string;
    shortTipEn: string;
    wrongExample: string;
    rightExample: string;
    showUntilGrade: string | null;
    sortOrder: number | null;
  }[];
};

function splitCell(value: any): string[] {
  if (!value) return [];
  if (typeof value !== "string") return [String(value).trim()];
  return value
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

function main() {
  const excelPath = process.argv[2];
  if (!excelPath) {
    console.error("사용법: pnpm ts-node scripts/vocab-excel-to-json.ts <엑셀파일경로>");
    process.exit(1);
  }

  const absPath = path.resolve(excelPath);
  if (!fs.existsSync(absPath)) {
    console.error("파일을 찾을 수 없습니다:", absPath);
    process.exit(1);
  }

  const workbook = XLSX.readFile(absPath);
  const sheetName = workbook.SheetNames[0]; // 첫 시트 사용
  const sheet = workbook.Sheets[sheetName];

  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const payloads: WordCreatePayload[] = rows.map((row, idx) => {
    const text = (row["text"] || "").toString().trim();
    const pos = (row["pos"] || "").toString().trim();
    if (!text || !pos) {
      console.warn(`행 ${idx + 2}: text 또는 pos가 비어있습니다. (스킵 예정일 수 있음)`);
    }

    const difficultyRaw = row["difficulty"];
    const freqRaw = row["frequency_score"];

    const difficulty =
      difficultyRaw === "" || difficultyRaw == null
        ? null
        : Number(difficultyRaw);

    const frequency_score =
      freqRaw === "" || freqRaw == null ? null : Number(freqRaw);

    const gradeBands = splitCell(row["gradeBands"]);

    return {
      text,
      lemma: null,
      pos,
      is_function_word: false,
      meanings_ko: splitCell(row["meaning_ko"]),
      meanings_en_simple: splitCell(row["meaning_en_simple"]),
      examples_easy: splitCell(row["examples_easy"]),
      examples_normal: splitCell(row["examples_normal"]),
      derived_terms: splitCell(row["derived_terms"]),
      difficulty: Number.isNaN(difficulty) ? null : difficulty,
      frequency_score: Number.isNaN(frequency_score) ? null : frequency_score,
      notes: "",
      gradeBands,
      sources: [],
      semanticTagIds: [],
      grammarHints: [],
    };
  });

  const outPath = path.resolve(process.cwd(), "vocab-import.json");
  fs.writeFileSync(outPath, JSON.stringify(payloads, null, 2), "utf-8");

  console.log(
    `변환 완료 ✅  (${payloads.length}개 단어)\nJSON 파일: ${outPath}\n\n이 파일 내용을 /admin/vocab/words/import 페이지에 붙여넣고 Import 하면 됩니다.`,
  );
}

main();
