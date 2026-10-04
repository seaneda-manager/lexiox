import Link from "next/link";
import { getSessionBoardAction } from "../actions";
import BoardClient from "./_client/BoardClient";

export const dynamic = "force-dynamic";

export default async function TeacherSessionBoardPage({ params }: { params: { sessionId: string } }) {
  const res = await getSessionBoardAction({ sessionId: params.sessionId });

  if (!res.ok || !res.board) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link className="text-sm text-blue-600 underline" href="/teacher/session">
          ← 오늘의 수업
        </Link>
        <div className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">❌ {res.error ?? "수업을 불러오지 못했습니다."}</div>
      </div>
    );
  }

  return <BoardClient initial={res.board} />;
}
