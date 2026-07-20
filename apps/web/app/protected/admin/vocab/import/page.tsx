// apps/web/app/(protected)/admin/vocab/import/page.tsx
import WisewordCsvImporter from "./_client/WisewordCsvImporter";
import { listVocabTracksAction, type TrackLite } from "../Tracks/actions";

export default async function Page() {
  const tracksRes = await listVocabTracksAction().catch((e) => ({
    ok: false as const,
    error: `Tracks error: ${e?.message ?? "Unknown"}`,
    rows: [],
  }));

  const tracks = tracksRes.ok ? tracksRes.rows : [];

  return <WisewordCsvImporter initialTracks={tracks} />;
}
