#!/usr/bin/env node
/**
 * 로컬 supabase/migrations 중 운영(linked) DB에 아직 적용되지 않은 것을 찾는다.
 * 읽기 전용: `supabase migration list --linked` 출력만 파싱하며 DB를 변경하지 않는다.
 *
 * 사용: npm run migrations:check   (미적용이 있으면 exit 1, CLI/파싱 실패는 exit 2)
 * 전제: supabase CLI 설치 + `supabase link` 완료
 *
 * 주의: 반드시 apps/web 에서 실행한다. 저장소 루트에도 supabase/ 폴더가 있어
 *       루트에서 실행하면 다른 마이그레이션 목록과 비교하게 된다.
 * CLI 출력 형식은 환경(TTY 여부, -o 값)에 따라 표/JSON으로 달라지므로 둘 다 처리한다.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const res = spawnSync("supabase", ["migration", "list", "--linked"], {
  cwd: webRoot,
  encoding: "utf8",
  shell: process.platform === "win32",
});

function fail(msg) {
  console.error(msg);
  process.exit(2);
}

if (res.error || res.status !== 0) {
  fail(
    "supabase migration list 실행 실패. CLI 설치와 `supabase link` 상태를 확인하세요.\n" +
      (res.error?.message ?? res.stderr ?? "")
  );
}

const out = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
const isVersion = (v) => /^\d{8,}$/.test(v ?? "");

/** @returns {{local: string, remote: string}[]} */
function parse(text) {
  const jsonStart = text.search(/\{\s*"migrations"/);
  if (jsonStart >= 0) {
    const json = JSON.parse(text.slice(jsonStart, text.lastIndexOf("}") + 1));
    return json.migrations.map((m) => ({ local: m.local ?? "", remote: m.remote ?? "" }));
  }
  // 표 형식:  `2026...` | `2026...` | `time`   (백틱은 제거)
  const rows = [];
  for (const line of text.split("\n")) {
    const cols = line.replace(/`/g, "").split("|").map((c) => c.trim());
    if (cols.length >= 3 && (isVersion(cols[0]) || isVersion(cols[1]))) {
      rows.push({ local: isVersion(cols[0]) ? cols[0] : "", remote: isVersion(cols[1]) ? cols[1] : "" });
    }
  }
  return rows;
}

let rows;
try {
  rows = parse(out);
} catch (e) {
  fail(`CLI 출력 파싱 실패: ${e.message}`);
}
if (rows.length === 0) fail("마이그레이션 행을 하나도 읽지 못했습니다. CLI 출력 형식이 바뀌었는지 확인하세요.");

const pending = rows.filter((r) => r.local && !r.remote).map((r) => r.local);
const remoteOnly = rows.filter((r) => !r.local && r.remote).map((r) => r.remote);

console.log(`확인한 마이그레이션 ${rows.length}개`);
if (remoteOnly.length) {
  console.warn(`⚠️  운영 DB에만 있고 로컬 파일이 없는 마이그레이션 ${remoteOnly.length}개:`);
  for (const v of remoteOnly) console.warn(`   ${v}`);
}

if (pending.length === 0) {
  console.log("✅ 모든 로컬 마이그레이션이 운영 DB에 적용되어 있습니다.");
  process.exit(0);
}

console.error(`❌ 운영 DB에 미적용된 마이그레이션 ${pending.length}개:`);
for (const v of pending) console.error(`   ${v}`);
console.error("→ 콘솔에서 이미 수동 적용했다면 `supabase migration repair --status applied <버전>`으로 이력을 맞추세요.");
process.exit(1);
