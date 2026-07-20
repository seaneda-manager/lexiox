import { redirect } from "next/navigation";
import { getSessionAndRole } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { session, role } = await getSessionAndRole();

  if (!session) {
    redirect("/auth/login?next=/home");
  }

  if (role === "student") redirect("/student");
  if (role === "teacher") redirect("/teacher/home");
  if (role === "admin") redirect("/admin");

  redirect("/student");
}
