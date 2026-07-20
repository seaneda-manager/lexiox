const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const file = "C:\\Users\\user\\Downloads\\능률VOCA 어원편 고등 (2025개정)_어휘리스트.xlsx";

console.log("엑셀 파일 읽는 중...");
const workbook = xlsx.readFile(file);

console.log("\n=== 엑셀 구조 분석 ===");
console.log("시트 목록:", workbook.SheetNames);

const ws = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws);

console.log(`\n전체 행 수: ${data.length}`);
console.log(`\n열 이름: ${Object.keys(data[0]).join(', ')}`);
console.log("\n첫 15행:");
data.slice(0, 15).forEach((row, i) => {
  console.log(`\n행 ${i + 1}:`);
  Object.entries(row).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') {
      console.log(`  ${k}: ${v}`);
    }
  });
});
