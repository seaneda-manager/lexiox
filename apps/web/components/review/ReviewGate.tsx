"use client";
// 리뷰/Drill/단어시험이 아직 열리지 않았을 때 보여 주는 안내 카드.
//  - 학생: 공개 예정일 안내 ("자세한 리뷰는 11월 16일(월)에 공개돼요. 점수는 위에서 먼저 볼 수 있어요.")
//  - 선생님/관리자: 아직 만들지 않았다는 안내 + 리뷰 관리로 가는 링크
import Link from "next/link";
import { releaseMessage } from "@/lib/reviewRelease";

export type GateInfo = { notPublished?: boolean; notGenerated?: boolean; releaseAt?: string | null; error?: string; isStaff?: boolean };

export default function ReviewGate({ gate }: { gate: GateInfo }) {
  if (gate.notGenerated || gate.isStaff) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
        <p className="text-sm font-semibold text-amber-900">{gate.error ?? "아직 만들지 않았어요."}</p>
        <Link href="/teacher/reviews" className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700">
          리뷰 관리로 가기
        </Link>
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
      <p className="text-3xl">📅</p>
      <p className="mt-3 text-base font-bold text-slate-900">{releaseMessage(gate.releaseAt)}</p>
      <p className="mt-1 text-xs text-slate-500">점수는 위에서 먼저 확인할 수 있어요.</p>
    </section>
  );
}
