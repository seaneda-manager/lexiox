import { listStudentsAction, listTracksReadinessAction } from "./actions";
import AssignClient from "./_client/AssignClient";

export const dynamic = "force-dynamic";

export default async function AdminVocabAssignPage() {
  const [studentsRes, tracksRes] = await Promise.all([
    listStudentsAction().catch((e) => ({
      ok: false as const,
      error: String(e?.message ?? "Unknown"),
      rows: [],
    })),
    listTracksReadinessAction().catch((e) => ({
      ok: false as const,
      error: String(e?.message ?? "Unknown"),
      rows: [],
    })),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-2 py-6">
      <div>
        <h1 className="text-2xl font-bold">📚 단어 배정</h1>
        <p className="mt-1 text-sm text-gray-600">학생에게 vocab 트랙을 배정합니다. (회차 조정은 트랙 배포에서)</p>
      </div>

      <AssignClient
        students={studentsRes.ok ? studentsRes.rows : []}
        tracks={tracksRes.ok ? tracksRes.rows : []}
      />
    </div>
  );
}
