import { CHANNEL_KINDS, SEASONS, type ChannelKind } from "./constants";
import { monthOf } from "./dates";
import type { BrandGuide, LearningMetrics, OrgProfile, Snapshot } from "./types";

export function profileBlock(name: string, p: OrgProfile | null): string {
  return [
    `학원명: ${p?.display_name || name}`,
    `지역·인근 학교: ${p?.region || "(미입력)"}`,
    `대상 학년: ${p?.grades || "초·중·고"}`,
    `과목: ${p?.subjects || "(미입력)"}`,
    `강점: ${p?.strengths || "(미입력)"}`,
    `수업 방식·반 구성: ${p?.classes || "(미입력)"}`,
    `상담 연락처: ${p?.phone || "[연락처]"}`,
    `선호 말투: ${p?.tone || "신뢰감 있게"}`,
    p?.avoid ? `이 학원이 쓰지 않는 표현: ${p.avoid}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function brandBlock(g: BrandGuide | null): string {
  if (!g) return "";
  return [
    "[본사 브랜드 가이드 - 반드시 지킬 것]",
    g.brand_name ? `브랜드명 표기: ${g.brand_name}` : "",
    g.tone ? `브랜드 말투: ${g.tone}` : "",
    g.must_include.length ? `가능하면 포함할 문구: ${g.must_include.join(" / ")}` : "",
    g.must_avoid.length ? `절대 쓰지 말 표현: ${g.must_avoid.join(" / ")}` : "",
    g.default_hashtags.length ? `기본 해시태그(해시태그 쓰는 채널만): ${g.default_hashtags.join(" ")}` : "",
    g.footer ? `글 마지막에 붙일 문구: ${g.footer}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const pct = (v: number | null | undefined) => (v == null ? "자료 없음" : `${v}%`);

/** 학습 통계 스냅샷을 홍보 근거로 쓸 수 있는 문장으로. 표본이 작으면 쓰지 말라고 알려준다. */
export function learningBlock(current: Snapshot | null, previous: Snapshot | null): string {
  if (!current) return "[Lexiox 학습 데이터]\n아직 집계된 데이터가 없음. 학습 수치를 언급하지 말 것.";
  const m: LearningMetrics = current.metrics;
  const p: LearningMetrics | undefined = previous?.metrics;
  const lines = [
    `[Lexiox 학습 데이터 - ${current.period_month.slice(0, 7)} 가맹점 전체 집계, 개인 정보 없음]`,
    `재원생 ${m.students.active}명 (초등 ${m.students.byBand.초등}, 중등 ${m.students.byBand.중등}, 고등 ${m.students.byBand.고등})`,
    `어휘 드릴: 참여 학생 ${m.vocab.activeStudents}명, 누적 ${m.vocab.drillTotal.toLocaleString()}문항, 정답률 ${pct(m.vocab.accuracy)}, 완료 세트 ${m.vocab.setsCompleted}개`,
    `과제 제출 ${m.homework.submissions}건, 과제 정답률 ${pct(m.homework.accuracy)}`,
    `리딩 테스트 응시 ${m.reading.testsFinished}회`,
  ];
  if (p && p.vocab.accuracy != null && m.vocab.accuracy != null) {
    const diff = Math.round((m.vocab.accuracy - p.vocab.accuracy) * 10) / 10;
    lines.push(`지난달 대비 어휘 정답률 변화: ${diff >= 0 ? "+" : ""}${diff}%p`);
  }
  lines.push(
    "이 수치는 학원 전체 평균이다. 쓸 때는 '우리 학원 학생들의 이번 달 평균' 같은 식으로 정확히 표현하고, " +
      "특정 학생의 성과처럼 쓰거나 부풀리지 말 것. 재원생이 5명 미만이거나 수치가 0이면 언급하지 말 것."
  );
  return lines.join("\n");
}

export const CONTENT_RULES = [
  "지켜야 할 규칙:",
  "- 성적·합격 보장, '100%', '최고·1등' 같은 근거 없는 과장, 타 학원 비방, 학생 실명은 쓰지 않는다.",
  "- 학부모가 읽고 믿을 수 있게 구체적인 수업 방식과 일정을 쓴다.",
  "- 모르는 사실(가격, 날짜, 정원 등)은 지어내지 말고 [ ] 빈칸으로 둔다.",
  "- 광고성 문자·카카오 메시지는 '(광고)' 표기와 수신거부 안내를 넣는다.",
].join("\n");

export function seasonLine(ymd: string): string {
  const m = monthOf(ymd);
  return `[시즌] ${m}월: ${SEASONS[m]}`;
}

export function channelGuide(kind: ChannelKind): string {
  return CHANNEL_KINDS[kind]?.guide ?? CHANNEL_KINDS.blog.guide;
}

export const JSON_POST_SHAPE = `{"title":"제목 또는 첫 줄","body":"본문 전체(줄바꿈 포함)","hashtags":["#태그"]}`;
