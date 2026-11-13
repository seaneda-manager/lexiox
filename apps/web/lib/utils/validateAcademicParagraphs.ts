/**
 * Updated TOEFL Reading 학술 지문(academic_passage)은 3문단이어야 한다.
 * passageHtml 안의 <p> 개수가 3이 아닌 항목을 사람이 읽을 수 있는 문장으로 돌려준다(없으면 빈 배열).
 */
export const ACADEMIC_PARAGRAPHS = 3;

export function findAcademicParagraphIssues(payload: unknown): string[] {
  const issues: string[] = [];
  function walk(obj: any, path: string): void {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      obj.forEach((x, i) => walk(x, `${path}[${i}]`));
      return;
    }
    if (obj.taskKind === "academic_passage") {
      const html: string = typeof obj.passageHtml === "string" ? obj.passageHtml : "";
      const n = (html.match(/<p[\s>]/gi) ?? []).length;
      if (n !== ACADEMIC_PARAGRAPHS) issues.push(`${path} (${obj.id ?? "no-id"}): 학술 지문 문단=${n}개 (${ACADEMIC_PARAGRAPHS}개 필요)`);
    }
    for (const k of Object.keys(obj)) {
      if (obj[k] && typeof obj[k] === "object") walk(obj[k], `${path}.${k}`);
    }
  }
  walk(payload, "payload");
  return issues;
}
