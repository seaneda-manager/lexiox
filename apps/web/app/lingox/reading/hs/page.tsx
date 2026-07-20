// apps/web/app/lingox/reading/hs/page.tsx
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default function Page() {
  redirect("/reading?product=lingox&track=hs");
}