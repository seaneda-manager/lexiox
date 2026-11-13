/**
 * Reading 테스트 payload의 빈칸·문항에 id를 보장한다.
 *
 * 응시 화면·채점·복습·데일리태스크가 모두 답을 `blank.id` / `q.id`로 저장·조회한다.
 * 생성 프롬프트(JSON 예시)는 이 id를 만들어 주지 않으므로, id가 없으면 한 지문의 빈칸 10개가
 * 모두 `cw__<item>__undefined` 한 키를 공유해서 한 칸에 입력하면 전 칸이 같은 값이 된다.
 *
 * 이미 id가 있으면 건드리지 않는다. payload를 직접 수정하고 수정한 개수를 돌려준다.
 */
export function ensureReadingIds(payload: any): { blanks: number; questions: number } {
  const counts = { blanks: 0, questions: 0 };

  const groups: any[][] = [
    ...(payload?.modules ?? []).map((m: any) => m?.items ?? []),
    payload?.stage2Pool?.hard?.items ?? [],
    payload?.stage2Pool?.easy?.items ?? [],
  ];

  for (const items of groups) {
    items.forEach((item: any, itemIdx: number) => {
      if (!item || typeof item !== "object") return;
      // item.id가 없을 때만 위치 기반 대체값을 쓴다(충돌 방지용 접두어 포함).
      const base: string = typeof item.id === "string" && item.id ? item.id : `item${itemIdx + 1}`;

      if (item.taskKind === "complete_words" && Array.isArray(item.blanks)) {
        item.blanks.forEach((b: any, i: number) => {
          if (b && !b.id) {
            b.id = `${base}-b${b.order ?? i + 1}`;
            counts.blanks++;
          }
        });
      }

      if (Array.isArray(item.questions)) {
        item.questions.forEach((q: any, i: number) => {
          if (q && !q.id) {
            q.id = `${base}-q${i + 1}`;
            counts.questions++;
          }
        });
      }
    });
  }
  return counts;
}
