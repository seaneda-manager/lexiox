const xlsx = require('xlsx');
const fs = require('fs');

const file = "C:\\Users\\user\\Downloads\\능률VOCA 어원편 고등 (2025개정)_어휘리스트.xlsx";

console.log("엑셀 파일 읽는 중...");
const workbook = xlsx.readFile(file);
const ws = workbook.Sheets['어휘리스트'];
const rawData = xlsx.utils.sheet_to_json(ws);

console.log(`총 ${rawData.length}행 읽음\n`);

// 표제어(표)와 파생어(파)를 그룹화
const result = [];
let currentEntry = null;

rawData.forEach((row, idx) => {
  const word = (row['영단어'] || '').trim();
  const meaning = (row['한글 뜻'] || '').trim();
  const type = (row['유형'] || '').trim(); // "표" or "파"
  const day = row['단원'] || '';

  if (!word) return;

  if (type === '표') {
    // 새로운 표제어 시작
    if (currentEntry) {
      result.push(currentEntry);
    }
    currentEntry = {
      text: word,
      meanings_ko: meaning.split(/[;,;]/g).map(m => m.trim()).filter(Boolean),
      derived_terms: [],
      unit: day
    };
  } else if (type === '파' && currentEntry) {
    // 파생어 추가
    currentEntry.derived_terms.push({
      text: word,
      meanings_ko: meaning.split(/[;,;]/g).map(m => m.trim()).filter(Boolean)
    });
  }
});

// 마지막 항목 추가
if (currentEntry) {
  result.push(currentEntry);
}

console.log(`변환 완료: ${result.length}개 표제어 + ${result.reduce((sum, e) => sum + e.derived_terms.length, 0)}개 파생어\n`);

// 샘플 출력
console.log("=== 변환 샘플 (첫 5개) ===");
console.log(JSON.stringify(result.slice(0, 5), null, 2));

// JSON 파일 저장
const outputPath = 'C:\\Users\\user\\Downloads\\vocab-converted.json';
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
console.log(`\n✅ 변환 완료: ${outputPath}`);
console.log(`📊 통계: ${result.length} 표제어 + ${result.reduce((sum, e) => sum + e.derived_terms.length, 0)} 파생어 = ${result.reduce((sum, e) => sum + 1 + e.derived_terms.length, 0)} 단어`);
