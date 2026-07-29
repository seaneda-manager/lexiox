import { getUserAndProfile } from "@/lib/getUserAndProfile";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function ProtectedRootPage() {
  const { user, profile } = await getUserAndProfile();

  if (!user) {
    redirect("/auth/login");
  }

  const role = profile?.role || "student";

  // 역할별 시작 페이지로 리다이렉트
  // /admin, /student, /teacher로 리다이렉트 → middleware가 /protected/...로 rewrite
  switch (role) {
    case "admin":
      redirect("/admin");
    case "teacher":
      redirect("/admin");
    case "student":
    default:
      redirect("/student");
  }
}
