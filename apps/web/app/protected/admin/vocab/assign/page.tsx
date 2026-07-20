// apps/web/app/(protected)/admin/vocab/assign/page.tsx
import Link from "next/link";
import AssignClient from "./_client/AssignClient";
import { listStudentsAction, listTracksWithReadinessAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminVocabAssignPage() {
  const [studentsRes, tracksRes] = await Promise.all([
    listStudentsAction(),
    listTracksWithReadinessAction(),
  ]);

  const students = studentsRes.ok ? studentsRes.rows : [];
  const tracks = tracksRes.ok ? tracksRes.rows : [];

  const errorParts: string[] = [];
  if ("error" in studentsRes) errorParts.push(`학생: ${studentsRes.error}`);
  if ("error" in tracksRes) errorParts.push(`트랙: ${tracksRes.error}`);
  const loadError = errorParts.join(" · ");

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-6 py-8">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Admin / Vocab / 단어 배정
          </div>
          <h1 className="text-2xl font-bold tracking-tight">단어 배정</h1>
          <p className="text-sm text-neutral-500">
            학생을 고르고 · 준비된 트랙을 고르고 · 일정을 확인한 뒤 배정합니다.
          </p>
        </div>
        <Link
          href="/admin/vocab/Tracks"
          className="rounded-xl border px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
        >
          기존 배포 화면
        </Link>
      </header>

      {loadError.trim() ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          데이터 로드 실패 — {loadError}
        </div>
      ) : null}

      <AssignClient students={students} tracks={tracks} />
    </main>
  );
}
