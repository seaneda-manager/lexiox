/**
 * paragraphHtml/passage 안에서 실제로 마킹된 빈칸 개수를 센다.
 * 실제 저장된 콘텐츠를 까보니 생성 포맷이 여러 개 섞여 있었다(2026-08-24 발견):
 *   - <span class='blank' data-order='1'>...</span>  (구형, 학생 화면 렌더러가 이해 못 함)
 *   - <b>prefix<u>___</u></b> [1]                      (구형, 마찬가지)
 *   - "prefix__"  (정식 포맷 — 학생 화면 렌더러(ReadingAdaptiveRunner2026.tsx)가
 *     실제로 하는 일이 바로 이거다: 태그를 다 벗겨낸 순수 텍스트를 "__" 기준으로 쪼개서
 *     그 자리에 입력칸을 꽂는다. 즉 "__"가 아닌 다른 표시는 학생 화면에서 안 먹힌다.)
 * 여러 포맷을 다 관대하게 인식해서(과소 매칭보다 과다 매칭이 안전) 이 중 가장 많이 잡힌
 * 신호를 채택한다 — 포맷마다 신호가 다르기 때문에(구형은 order 번호로만 잡히고, 정식
 * 포맷은 "__" 개수로만 잡힘) 하나만 보면 다른 포맷을 오탐지로 놓친다.
 */
function countBlankMarkers(html: string): number {
  const orders = new Set<number>();
  for (const m of html.matchAll(/data-order=['"](\d+)['"]/g)) orders.add(Number(m[1]));
  for (const m of html.matchAll(/\[(\d+)\]/g)) orders.add(Number(m[1]));

  // 정식 포맷: 태그를 벗긴 순수 텍스트에서 "__" 개수 — 렌더러(.split("__"))와 동일한 방식으로 센다.
  const plainText = html.replace(/<[^>]+>/g, "");
  const underscoreCount = (plainText.match(/__/g) ?? []).length;

  return Math.max(orders.size, underscoreCount);
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
      const markerCount = countBlankMarkers(html);
      if (markerCount !== n) {
        issues.push(
          `${path} (${obj.id ?? "no-id"}): 본문에 실제 마킹된 빈칸이 ${markerCount}개인데 blanks 배열엔 ${n}개 — 불일치`
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
