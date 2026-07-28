// apps/web/app/(protected)/admin/vocab/assign/page.tsx
import TrackAssignClient from "../Tracks/_client/TrackAssignClient";
import GroupAssignClient from "../Tracks/_client/GroupAssignClient";
import { listAcademyStudentsAction, listVocabTracksAction, getTracksForSetsAction } from "../Tracks/actions";

export default async function AdminVocabAssignPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const singleSet = params?.set ? String(params.set) : null;
  const multipleSets = params?.sets ? String(params.sets).split(",").filter(Boolean) : [];
  const selectedSetIds = singleSet ? [singleSet] : multipleSets;

  const tab = params?.tab === "group" ? "group" : "single";
  let selectedTrackId = params?.track_id ? String(params.track_id) : null;

  const studentsRes = await listAcademyStudentsAction().catch((e) => ({
    ok: false as const,
    error: `Students error: ${e?.message ?? "Unknown"}`,
    rows: [],
  }));

  const tracksRes = await listVocabTracksAction().catch((e) => ({
    ok: false as const,
    error: `Tracks error: ${e?.message ?? "Unknown"}`,
    rows: [],
  }));

  if (selectedSetIds.length > 0) {
    const setsTracksRes = await getTracksForSetsAction(selectedSetIds).catch((err) => {
      return { ok: false, trackIds: [] };
    });
    if (setsTracksRes.ok && setsTracksRes.trackIds.length > 0) {
      selectedTrackId = setsTracksRes.trackIds[0];
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-2 py-6">
      <div>
        <h1 className="text-2xl font-bold">📚 단어 트랙 배정</h1>
        <p className="mt-1 text-sm text-gray-600">학생에게 vocab 트랙을 배정하고 학습 회차를 조정합니다.</p>
      </div>

      {tab === "group" ? (
        <GroupAssignClient initialStudents={studentsRes.rows || []} initialTracks={tracksRes.rows || []} />
      ) : (
        <TrackAssignClient
          initialStudents={studentsRes.rows || []}
          initialTracks={tracksRes.rows || []}
          selectedTrackId={selectedTrackId}
          selectedSetIds={selectedSetIds}
        />
      )}
    </div>
  );
}
