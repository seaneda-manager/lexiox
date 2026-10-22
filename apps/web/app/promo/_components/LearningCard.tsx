import type { Snapshot } from "@/lib/promo/types";
import { Panel } from "./ui";

/** Lexiox 학습 데이터 집계 요약 (홍보 근거) */
export function LearningCard({ snapshot, prev }: { snapshot: Snapshot | null; prev: Snapshot | null }) {
  if (!snapshot) {
    return (
      <Panel title="이번 달 학습 데이터">
        <p className="text-sm text-slate-500">
          아직 집계 전이에요. 매일 새벽 Lexiox 학습 기록을 가맹점 단위로 모아서 보여드려요. 학생이 가맹점에 연결돼 있어야 집계돼요.
        </p>
      </Panel>
    );
  }
  const m = snapshot.metrics;
  const p = prev?.metrics;
  const diff =
    p && p.vocab.accuracy != null && m.vocab.accuracy != null ? Math.round((m.vocab.accuracy - p.vocab.accuracy) * 10) / 10 : null;
  const items = [
    { l: "재원생", v: `${m.students.active}명`, s: `초 ${m.students.byBand.초등} · 중 ${m.students.byBand.중등} · 고 ${m.students.byBand.고등}` },
    {
      l: "어휘 정답률",
      v: m.vocab.accuracy == null ? "-" : `${m.vocab.accuracy}%`,
      s: diff == null ? `${m.vocab.drillTotal.toLocaleString()}문항` : `지난달 대비 ${diff >= 0 ? "+" : ""}${diff}%p`,
    },
    { l: "완료한 어휘 세트", v: `${m.vocab.setsCompleted}개`, s: `참여 ${m.vocab.activeStudents}명` },
    { l: "과제 제출", v: `${m.homework.submissions}건`, s: m.homework.accuracy == null ? "" : `정답률 ${m.homework.accuracy}%` },
  ];
  return (
    <Panel
      title="이번 달 학습 데이터"
      right={<span className="text-xs text-slate-400">{new Date(snapshot.computed_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric" })} 집계</span>}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((i) => (
          <div key={i.l}>
            <div className="text-xs text-slate-500">{i.l}</div>
            <div className="text-lg font-extrabold tabular-nums">{i.v}</div>
            <div className="text-xs text-slate-400">{i.s}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">문구 생성 시 이 수치를 학원 평균으로만 인용해요. 개인 기록은 쓰지 않아요.</p>
    </Panel>
  );
}
