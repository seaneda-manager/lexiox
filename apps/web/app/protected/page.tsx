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
  switch (role) {
    case "admin":
      redirect("/admin/jr/content");
    case "teacher":
      redirect("/dashboard");
    case "student":
    default:
      redirect("/protected/student/home");
  }
}
