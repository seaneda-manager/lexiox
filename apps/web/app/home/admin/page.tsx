// apps/web/app/home/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAndRole } from "@/lib/authServer";
import AdminUploader from "./uploader";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const { session, role } = await getSessionAndRole();

  if (!session) redirect("/auth/login?next=/home/admin");

  if (role !== "admin") {
    if (role === "teacher") redirect("/home/teacher");
    redirect("/home/student");
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Admin Home</h1>
        <p className="text-sm opacity-75">
          콘텐츠 생성, 업로드, 목록 관리를 여기서 진행합니다.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/content/new/json"
          prefetch={false}
          className="block rounded-2xl border p-5 hover:bg-white/5"
        >
          <div className="text-lg font-medium">JSON Import</div>
          <p className="mt-1 text-sm opacity-75">
            Reading/Listening JSON 스키마를 붙여넣어 업로드합니다.
          </p>
        </Link>

        <Link
          href="/reading/admin"
          prefetch={false}
          className="block rounded-2xl border p-5 hover:bg-white/5"
        >
          <div className="text-lg font-medium">Reading Editor</div>
          <p className="mt-1 text-sm opacity-75">
            Reading 세트를 생성하고 수정합니다.
          </p>
        </Link>

        <Link
          href="/admin/content/list"
          prefetch={false}
          className="block rounded-2xl border p-5 hover:bg-white/5"
        >
          <div className="text-lg font-medium">Content List</div>
          <p className="mt-1 text-sm opacity-75">
            기존 Reading 항목을 확인합니다.
          </p>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Quick JSON Uploader (to Storage)</h2>
        <p className="text-sm opacity-75">
          <code>content</code> 버킷의 <code>reading/</code> 경로에 JSON 파일을 업로드합니다.
          빠르게 자료를 붙여넣고 이후 DB와 연결할 수 있습니다.
        </p>
        <AdminUploader />
      </section>
    </main>
  );
}