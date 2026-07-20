export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default function Page({ searchParams }: { searchParams?: { setId?: string } }) {
  const setId = searchParams?.setId ?? "demo-set";
  redirect(`/reading/test?setId=${encodeURIComponent(setId)}&profileId=toefl_test`);
}