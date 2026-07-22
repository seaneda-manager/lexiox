import ValidateAllClient from "./_client/ValidateAllClient";
import { fetchAllVocabTracks } from "./actions";

export default async function Page() {
  const tracksResult = await fetchAllVocabTracks();

  return (
    <ValidateAllClient
      initialTracks={tracksResult.ok ? tracksResult.tracks : []}
    />
  );
}
