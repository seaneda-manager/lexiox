// apps/web/app/(protected)/admin/vocab/Tracks/page.tsx
import TrackAssignClient from "./_client/TrackAssignClient";
import GroupAssignClient from "./_client/GroupAssignClient";
import { listAcademyStudentsAction, listVocabTracksAction, getTracksForSetsAction } from "./actions";

export default async function AdminVocabTracksAssignPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const singleSet = params?.set ? String(params.set) : null;
  const multipleSets = params?.sets ? String(params.sets).split(",").filter(Boolean) : [];
  const selectedSetIds = singleSet ? [singleSet] : multipleSets;

  console.log("[Tracks] Page rendering...", {
    tab: params?.tab,
    set: singleSet,
    sets: multipleSets,
    track_id: params?.track_id
  });

  const tab = params?.tab === "group" ? "group" : "single";
  let selectedTrackId = params?.track_id ? String(params.track_id) : null;

  console.log("[Tracks] Loading students and tracks...");

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

  // 선택된 세트의 트랙 조회
  if (!selectedTrackId && selectedSetIds.length > 0) {
    console.log("[Tracks] Getting tracks for sets:", selectedSetIds);
    const setsTracksRes = await getTracksForSetsAction(selectedSetIds).catch((err) => {
      console.log("[Tracks] Error getting tracks:", err);
      return { ok: false, trackIds: [] };
    });
    console.log("[Tracks] setsTracksRes:", setsTracksRes);
    if (setsTracksRes.ok && setsTracksRes.trackIds.length > 0) {
      selectedTrackId = setsTracksRes.trackIds[0];
      console.log("[Tracks] Auto-selected track from sets:", selectedTrackId);
    } else {
      console.log("[Tracks] No track found for sets");
    }
  }

  console.log("[Tracks] Students:", studentsRes.ok, "Tracks:", tracksRes.ok);

  const students = studentsRes.ok ? studentsRes.rows : [];
  const tracks = tracksRes.ok ? tracksRes.rows : [];
  const studentsError = "error" in studentsRes ? studentsRes.error : null;
  const tracksError = "error" in tracksRes ? tracksRes.error : null;

  return (
    <div className="mx-auto w-full max-w-5xl p-6 space-y-4">
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-xl font-extrabold">Vocab Tracks · 배포</div>
        <div className="mt-1 text-sm text-slate-600">
          학생별 Track 플랜 생성 · 큐 관리 · 그룹 배포
        </div>

        {selectedSetIds.length > 0 && (
          <div className="mt-3 rounded-xl bg-violet-50 border border-violet-200 p-3">
            <div className="text-xs font-bold text-violet-900 mb-2">선택된 세트</div>
            <div className="flex flex-wrap gap-2">
              {selectedSetIds.map((id) => (
                <span
                  key={id}
                  className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700"
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        )}

        {studentsError || tracksError ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {studentsError && <div>students: {studentsError}</div>}
            {tracksError && <div>tracks: {tracksError}</div>}
          </div>
        ) : null}

        {/* 탭 */}
        <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
          <a
            href="?tab=single"
            className={[
              "rounded-lg px-5 py-2 text-sm font-extrabold transition-colors",
              tab === "single" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            개인 배포
          </a>
          <a
            href="?tab=group"
            className={[
              "rounded-lg px-5 py-2 text-sm font-extrabold transition-colors",
              tab === "group" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            그룹 배포
          </a>
        </div>
      </div>

      {/* 데이터 로드 실패 시 경고 */}
      {(!studentsRes.ok || !tracksRes.ok) && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4">
          <div className="font-semibold text-amber-900">⚠️ 일부 데이터 로드 실패</div>
          {!studentsRes.ok && <p className="text-sm text-amber-700">학생 데이터: {studentsError}</p>}
          {!tracksRes.ok && <p className="text-sm text-amber-700">트랙 데이터: {tracksError}</p>}
          <p className="text-xs text-amber-600 mt-2">페이지를 새로고침하거나 나중에 다시 시도하세요.</p>
        </div>
      )}

      {/* 데이터가 있을 때만 렌더링 */}
      {studentsRes.ok && tracksRes.ok && (
        <>
          {tab === "single" ? (
            <TrackAssignClient
              initialStudents={students}
              initialTracks={tracks}
              selectedTrackId={selectedTrackId}
              selectedSetIds={selectedSetIds}
            />
          ) : (
            <GroupAssignClient
              initialStudents={students}
              initialTracks={tracks}
              selectedTrackId={selectedTrackId}
            />
          )}
        </>
      )}
    </div>
  );
}
