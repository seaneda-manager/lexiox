/**
 * "이미 쓴 주제" 장부 — Reading/Listening 생성·추천이 같은 기준으로 중복을 피하도록 한 곳에서 모은다.
 *
 * 예전에는 (1) 최근 N개 테스트만 보고, (2) 관리자가 '입력한' 주제 문자열(meta.usedTopics)만 믿었고,
 * (3) usedTopics가 없는 옛 저장분과 usedTopics를 안 남기는 Module 2는 통째로 빠졌다.
 * → 저장된 모든 테스트에서 usedTopics + 실제 지문 제목(title)을 함께 모아 최신순으로 중복 제거한다.
 */

/** 지문/스크립트 제목이 곧 주제인 항목. choose_response는 문항 단위 발화라 제외(diversity.ts가 따로 처리). */
const TITLED_KINDS = new Set([
  "complete_words",
  "daily_life",
  "academic_passage",
  "conversation",
  "announcement",
  "academic_talk",
]);

const GENERIC_TITLES = /^(title|untitled|\.\.\.|passage|academic passage|daily life)$/i;

function pushStrings(v: unknown, out: string[]): void {
  if (Array.isArray(v)) v.forEach((x) => pushStrings(x, out));
  else if (typeof v === "string" && v.trim()) out.push(v.trim());
}

function itemsOf(payload: any): any[] {
  return [
    ...(payload?.modules ?? []).flatMap((m: any) => m?.items ?? []),
    ...(payload?.stage2Pool?.hard?.items ?? []),
    ...(payload?.stage2Pool?.easy?.items ?? []),
    ...(Array.isArray(payload?.items) ? payload.items : []),
  ];
}

/** 테스트 payload 하나에서 쓰인 주제를 모은다. */
export function extractUsedTopics(payload: any): string[] {
  const out: string[] = [];
  const meta = payload?.meta ?? {};
  // 1) 생성 시 기록한 입력 주제 (bucket 구분 없이 모두)
  if (meta.usedTopics && typeof meta.usedTopics === "object") Object.values(meta.usedTopics).forEach((v) => pushStrings(v, out));
  // 2) 아주 오래된 레거시 필드
  [meta.conversationTopic, meta.announcementTopic, meta.lectureTopic1, meta.lectureTopic2].forEach((v) => pushStrings(v, out));
  // 3) 실제로 만들어진 지문/스크립트 제목 — 입력 주제와 달라졌거나 usedTopics가 없는 저장분도 잡힌다.
  for (const item of itemsOf(payload)) {
    if (!TITLED_KINDS.has(item?.taskKind)) continue;
    const t = typeof item?.title === "string" ? item.title.replace(/^the\s+/i, "").trim() : "";
    if (t && !GENERIC_TITLES.test(t)) out.push(t);
  }
  return out;
}

/** 여러 테스트(최신순 입력)의 주제를 합쳐 대소문자 무시로 중복 제거하고 최대 max개로 자른다. */
export function collectUsedTopics(payloads: any[], max = 150): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of payloads) {
    for (const t of extractUsedTopics(p)) {
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** 저장된 테스트 payload를 최신순으로 가져온다. 기간 제한 대신 넉넉한 행 수 상한만 둔다. */
export async function fetchTestPayloads(supabase: any, table: string, limit = 500): Promise<any[]> {
  const { data, error } = await supabase.from(table).select("payload").order("created_at", { ascending: false }).limit(limit);
  if (error) {
    console.error(`[usedTopics] ${table} 조회 실패`, error.message);
    return [];
  }
  return (data ?? []).map((r: any) => r.payload);
}
