/**
 * paragraphHtml/passage 안에서 실제로 마킹된 빈칸의 order 번호를 전부 추출한다.
 * 실제 저장된 콘텐츠를 까보니 생성 포맷이 두 가지가 섞여 있었다(2026-08-24 발견):
 *   - <span class='blank' data-order='1'>...</span>
 *   - <b>prefix<u>___</u></b> [1]
 * 둘 다 지원해야 하고, 앞으로 또 다른 포맷이 나올 수 있어 최대한 관대하게 매칭한다 —
 * 과다 매칭(엉뚱한 대괄호 숫자를 빈칸으로 오인)은 그냥 불필요한 재시도로 끝나지만,
 * 과소 매칭(진짜 있는 빈칸을 놓침)은 이 검증 자체의 존재 의미를 없앤다.
 */
function extractBlankOrders(html: string): Set<number> {
  const orders = new Set<number>();
  for (const m of html.matchAll(/data-order=['"](\d+)['"]/g)) orders.add(Number(m[1]));
  for (const m of html.matchAll(/\[(\d+)\]/g)) orders.add(Number(m[1]));
  return orders;
}

/**
 * complete_words 문제는 반드시 blanks가 10개여야 하고(ETS 패턴), 그 10개가 실제로
 * paragraphHtml 본문에도 빈칸으로 마킹되어 있어야 한다.
 *
 * 처음엔 blanks 배열 길이만 검증했는데(생성 직후 검증 없이 그대로 저장되던 게 버그였음 —
 * Claude가 가끔 1~2개만 만들고 끝내도 못 걸러냄), 그것만으론 부족하다는 게 AI 학생 리뷰로
 * 드러났다(2026-08-24) — blanks 배열엔 10개를 적어놓고 본문엔 9개만 실제로 빈칸 처리한
 * 케이스를 배열 길이 체크로는 못 잡음. 그래서 본문 안의 실제 빈칸 마킹 개수도 같이 센다.
 */
export function findBlankCountIssues(payload: unknown): string[] {
  const issues: string[] = [];

  function walk(obj: any, path: string): void {
    if (!obj || typeof obj !== "object") return;

    if (obj.taskKind === "complete_words") {
      const n = Array.isArray(obj.blanks) ? obj.blanks.length : 0;
      if (n !== 10) issues.push(`${path} (${obj.id ?? "no-id"}): blanks 배열=${n}개 (10개 필요)`);

      const html: string = obj.paragraphHtml ?? obj.passage ?? "";
      const foundOrders = extractBlankOrders(html);
      const expected = Math.min(n, 10) || 10;
      const missing = Array.from({ length: expected }, (_, i) => i + 1).filter((o) => !foundOrders.has(o));
      if (missing.length > 0) {
        issues.push(
          `${path} (${obj.id ?? "no-id"}): 본문에 실제 마킹된 빈칸이 ${foundOrders.size}개뿐 (order ${missing.join(",")} 누락) — blanks 배열엔 ${n}개라고 되어 있음`
        );
      }
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
