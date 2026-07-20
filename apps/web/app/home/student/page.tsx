import { redirect } from "next/navigation";

export default function LegacyStudentRedirect() {
  redirect("/student");
}
