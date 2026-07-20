/* apps/web/app/auth/update-password/callback/page.tsx */
import { redirect } from "next/navigation";
import { exchangeCodeForSession } from "@/actions/auth";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Record<string, string | string[] | undefined> };

export default async function UpdatePasswordCallbackPage({
  searchParams,
}: Props) {
  const code =
    (Array.isArray(searchParams?.code)
      ? searchParams?.code[0]
      : searchParams?.code) ?? "";

  if (!code) {
    redirect("/auth/login?error=Missing%20code");
  }

  const r = await exchangeCodeForSession(code);
  if (!r.ok) {
    redirect(
      `/auth/login?error=${encodeURIComponent(
        r.error ?? "Session exchange failed"
      )}`
    );
  }

  // 세션이 들어온 상태 → 비번 업데이트 화면으로 이동
  redirect("/auth/update-password");
}
