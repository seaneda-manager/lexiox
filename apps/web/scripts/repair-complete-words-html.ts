/**
 * Complete Words 문제의 paragraphHtml을 학생 화면 렌더러가 실제로 이해하는
 * "visible + 정확히 밑줄 2개" 포맷으로 재구성한다.
 *
 * 배경: components/reading/ReadingAdaptiveRunner2026.tsx의 CompleteWordsItemView가
 * paragraphHtml에서 태그를 다 벗긴 순수 텍스트를 "__" 기준으로 쪼개서 입력칸을 꽂는
 * 방식으로 동작하는데, generate/route.ts가 예전엔 이 포맷을 안 지켜서(data-order 스팬,
 * ___ [N] 브래킷 등) 학생 화면에서 빈칸이 아예 안 생기거나(정답 노출) 텍스트가 지저분하게
 * 나왔다. blanks 배열(word/visible/hidden/correctToken/order)은 멀쩡하므로 그걸 기준으로
 * paragraphHtml만 재구성한다.
 *
 * 사용법:
 *   npx tsx scripts/repair-complete-words-html.ts            # 드라이런 (아무것도 안 씀, 결과만 출력)
 *   npx tsx scripts/repair-complete-words-html.ts --apply     # 실제로 DB에 반영
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function loadEnv() {
  const raw = fs.readFileSync(".env.local", "latin1");
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

type Blank = { order: number; word: string; visible: string; hidden: string; correctToken?: string };

const CORRECT_MARKER = "__";

/** paragraphHtml이 이미 정식 포맷("visible__")인지 판단: 태그 벗긴 텍스트의 "__" 개수가 blanks 개수와 일치하면 손댈 필요 없음. */
function isAlreadyCorrect(html: string, blanks: Blank[]): boolean {
  const plain = html.replace(/<[^>]+>/g, "");
  const underscoreCount = (plain.match(/__/g) ?? []).length;
  const hasLegacyMarkup = /data-order=|<u>___<\/u>/.test(html);
  return !hasLegacyMarkup && underscoreCount === blanks.length;
}

/**
 * data-order 스팬 포맷(모듈1 스타일) 복구: 태그를 벗기면 숨긴 글자까지 통째로 노출된
 * "완성된" 평문이 나오므로, 그 평문에서 각 blank.word를 순서대로 찾아 visible+"__"로 치환한다.
 */
function rebuildFromRevealedText(html: string, blanks: Blank[]): { html: string; ok: boolean; reason?: string } {
  const revealed = html.replace(/<[^>]+>/g, "");
  const sorted = [...blanks].sort((a, b) => a.order - b.order);

  let cursor = 0;
  let result = "";
  for (const b of sorted) {
    const idx = revealed.indexOf(b.word, cursor);
    if (idx === -1) {
      return { html, ok: false, reason: `단어 "${b.word}"를 본문에서 못 찾음 (order ${b.order})` };
    }
    result += revealed.slice(cursor, idx) + b.visible + CORRECT_MARKER;
    cursor = idx + b.word.length;
  }
  result += revealed.slice(cursor);
  return { html: `<p>${result}</p>`, ok: true };
}

/**
 * ___ [N] 브래킷 포맷(모듈2 스타일) 복구: 태그를 벗기면 "visible___ [N]" 형태만 남고
 * hidden 글자는 어디에도 없으므로(원래부터 paragraphHtml에 안 들어있었음), blanks 배열의
 * visible로 프리픽스가 일치하는지 순서대로 검증하면서 "___ [N]" 잔재만 "__"로 치환한다.
 */
function rebuildFromBracketFormat(html: string, blanks: Blank[]): { html: string; ok: boolean; reason?: string } {
  const stripped = html.replace(/<\/?[bui]>/g, "");
  const sorted = [...blanks].sort((a, b) => a.order - b.order);

  let text = stripped;
  for (const b of sorted) {
    const pattern = new RegExp(`${escapeRegex(b.visible)}_+\\s*\\[${b.order}\\]`);
    if (!pattern.test(text)) {
      return { html, ok: false, reason: `"${b.visible}...[${b.order}]" 패턴을 못 찾음` };
    }
    text = text.replace(pattern, `${b.visible}${CORRECT_MARKER}`);
  }
  return { html: `<p>${text.replace(/<[^>]+>/g, "")}</p>`, ok: true };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function repairItem(item: any): { changed: boolean; newHtml?: string; reason?: string } {
  if (item.taskKind !== "complete_words") return { changed: false };
  const blanks: Blank[] = Array.isArray(item.blanks) ? item.blanks : [];
  if (blanks.length === 0) return { changed: false };

  const html: string = item.paragraphHtml ?? "";
  if (isAlreadyCorrect(html, blanks)) return { changed: false };

  const isBracketFormat = /<u>___<\/u>/.test(html);
  const result = isBracketFormat ? rebuildFromBracketFormat(html, blanks) : rebuildFromRevealedText(html, blanks);

  if (!result.ok) return { changed: false, reason: result.reason };

  // 안전장치: 재구성 결과도 "__" 개수가 정확히 맞는지 다시 확인
  const finalPlain = result.html.replace(/<[^>]+>/g, "");
  const finalCount = (finalPlain.match(/__/g) ?? []).length;
  if (finalCount !== blanks.length) {
    return { changed: false, reason: `재구성 후에도 개수 불일치 (${finalCount} != ${blanks.length})` };
  }

  return { changed: true, newHtml: result.html };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: rows, error } = await sb.from("reading_tests_2026").select("id, payload");
  if (error) throw new Error(error.message);

  let totalItems = 0;
  let repaired = 0;
  let skippedOk = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const payload = row.payload;
    let touched = false;

    function walk(obj: any) {
      if (!obj || typeof obj !== "object") return;
      if (obj.taskKind === "complete_words") {
        totalItems++;
        const { changed, newHtml, reason } = repairItem(obj);
        if (changed && newHtml) {
          console.log(`\n[REPAIR] test=${row.id} item=${obj.id}`);
          console.log(`  이전: ${(obj.paragraphHtml ?? "").slice(0, 140)}...`);
          console.log(`  이후: ${newHtml.slice(0, 140)}...`);
          obj.paragraphHtml = newHtml;
          touched = true;
          repaired++;
        } else if (!changed && reason) {
          console.log(`\n[FAIL]   test=${row.id} item=${obj.id}: ${reason}`);
          failed++;
        } else {
          skippedOk++;
        }
      }
      if (Array.isArray(obj.items)) obj.items.forEach(walk);
      if (Array.isArray(obj.modules)) obj.modules.forEach(walk);
      if (obj.stage2Pool) {
        if (obj.stage2Pool.hard) walk(obj.stage2Pool.hard);
        if (obj.stage2Pool.easy) walk(obj.stage2Pool.easy);
      }
    }
    walk(payload);

    if (touched && apply) {
      const { error: updateErr } = await sb.from("reading_tests_2026").update({ payload }).eq("id", row.id);
      if (updateErr) console.error(`  ⚠️ 저장 실패 (${row.id}):`, updateErr.message);
      else console.log(`  ✅ 저장됨 (${row.id})`);
    }
  }

  console.log(`\n=== 요약 ===`);
  console.log(`전체 complete_words 항목: ${totalItems}`);
  console.log(`이미 정상: ${skippedOk}`);
  console.log(`복구됨: ${repaired}${apply ? " (DB에 저장됨)" : " (드라이런 — 저장 안 함, --apply로 재실행 필요)"}`);
  console.log(`복구 실패(수동 확인 필요): ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
