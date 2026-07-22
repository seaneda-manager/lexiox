import ValidateAllClient from "./_client/ValidateAllClient";
import { fetchAllWordsForValidation } from "./actions";

export default async function Page() {
  const result = await fetchAllWordsForValidation();

  return (
    <ValidateAllClient initialWords={result.ok ? result.words : []} />
  );
}
