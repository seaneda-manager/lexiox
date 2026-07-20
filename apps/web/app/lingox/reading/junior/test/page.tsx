// apps/web/app/lingox/reading/junior/test/page.tsx
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function Page({ searchParams }: { searchParams?: { setId?: string } }) {
  const setId = searchParams?.setId ?? "demo-set";
  redirect(`/reading/test?setId=${encodeURIComponent(setId)}&profileId=lingox_junior`);
}