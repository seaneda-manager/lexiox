import { getUserAndProfile } from "@/lib/getUserAndProfile";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function JrContentPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") redirect("/login");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-3xl font-bold text-slate-900">Jr. 콘텐츠 관리</h1>
          <p className="text-slate-600 mt-1">
            Reading/Grammar/Listening/Speaking&Writing 콘텐츠를 생성하고 관리합니다
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reading Passages */}
          <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
            <div className="text-3xl mb-2">📖</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Reading</h2>
            <p className="text-sm text-slate-600 mb-4">
              지문을 생성하고 관리합니다. 각 지문은 5단계 학습 모듈로 사용됩니다.
            </p>
            <Link
              href="/admin/jr/content/reading"
              className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
            >
              관리하기
            </Link>
          </div>

          {/* Grammar Chapters */}
          <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
            <div className="text-3xl mb-2">📚</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Grammar</h2>
            <p className="text-sm text-slate-600 mb-4">
              문법 단원을 생성하고 관리합니다. 개념 + 연습 문제 포함.
            </p>
            <Link
              href="/admin/jr/content/grammar"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              관리하기
            </Link>
          </div>

          {/* Listening Audio */}
          <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
            <div className="text-3xl mb-2">🎧</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Listening</h2>
            <p className="text-sm text-slate-600 mb-4">
              음성 파일, 스크립트, 문제를 업로드하고 관리합니다.
            </p>
            <Link
              href="/admin/jr/content/listening"
              className="inline-block px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700"
            >
              관리하기
            </Link>
          </div>

          {/* Speaking & Writing Tasks */}
          <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
            <div className="text-3xl mb-2">🎤</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Speaking & Writing
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              음성 녹음 또는 글쓰기 과제를 생성하고 관리합니다.
            </p>
            <Link
              href="/admin/jr/content/tasks"
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            >
              관리하기
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
