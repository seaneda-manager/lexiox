/**
 * complete_words 문제는 반드시 blanks가 10개여야 함 (ETS 패턴).
 * 생성 직후 이 검증 없이 그대로 저장되던 게 버그였음 — Claude가 가끔 1~2개만 만들고 끝내도 못 걸러냄.
 */
export function findBlankCountIssues(payload: unknown): string[] {
  const issues: string[] = [];

  function walk(obj: any, path: string): void {
    if (!obj || typeof obj !== "object") return;

    if (obj.taskKind === "complete_words") {
      const n = Array.isArray(obj.blanks) ? obj.blanks.length : 0;
      if (n !== 10) issues.push(`${path} (${obj.id ?? "no-id"}): blanks=${n}개 (10개 필요)`);
    }

    if (Array.isArray(obj.items)) {
      obj.items.forEach((it: any, i: number) => walk(it, `${path}.items[${i}]`));
    }
    if (Array.isArray(obj.modules)) {
      obj.modules.forEach((m: any, i: number) => walk(m, `${path}.modules[${i}]`));
    }
    if (obj.stage2Pool) {
      if (obj.stage2Pool.hard) walk(obj.stage2Pool.hard, `${path}.stage2Pool.hard`);
      if (obj.stage2Pool.easy) walk(obj.stage2Pool.easy, `${path}.stage2Pool.easy`);
    }
  }

  // 배열(items 리스트) 또는 중첩 객체(전체 payload) 둘 다 지원
  if (Array.isArray(payload)) {
    payload.forEach((it, i) => walk(it, `items[${i}]`));
  } else {
    walk(payload, "root");
  }

  return issues;
}
