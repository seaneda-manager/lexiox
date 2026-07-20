// apps/web/app/(protected)/admin/content/reading/editor/page.tsx
import { redirect } from "next/navigation";

export default function AdminContentReadingEditorPage() {
  redirect("/admin/content/new/json");
}
