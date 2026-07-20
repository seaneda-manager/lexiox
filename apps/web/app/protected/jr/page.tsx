import { getUserAndProfile } from "@/lib/getUserAndProfile";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function JrHubPage() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/auth/login");

  const supabase = await getSupabaseServer();

  // 학생에게 할당된 과제들 조회
  const { data: readingSessions } = await supabase
    .from("jr_reading_sessions")
    .select("id, passage_id, stage, completed_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: grammarSessions } = await supabase
    .from("jr_grammar_sessions")
    .select("id, chapter_id, stage, completed_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: listeningSessions } = await supabase
    .from("jr_listening_sessions")
    .select("id, stage, completed_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: speakingWritingTasks } = await supabase
    .from("jr_speaking_writing_tasks")
    .select("id, task_type, prompt, due_date")
    .eq("assigned_to_student_id", user.id)
    .order("due_date", { ascending: true })
    .limit(5);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-900">Jr. Learning</h1>
            <div className="flex gap-2">
              <Link
                href="/student/dashboard"
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-900 font-semibold hover:bg-slate-50"
              >
                📊 내 진도
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-900 font-semibold hover:bg-slate-50"
              >
                👨‍🏫 선생님용
              </Link>
            </div>
          </div>
          <p className="text-slate-600">
            당신의 4대 모듈: Reading · Grammar · Listening · Speaking & Writing
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Reading */}
          <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-emerald-900">📚 Reading</h2>
              <div className="text-3xl">📖</div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              단어 책업 · 문법 · 번역 · 이해 · 토론 (5단계)
            </p>
            {readingSessions && readingSessions.length > 0 ? (
              <div className="space-y-2">
                {readingSessions.slice(0, 3).map((session) => (
                  <Link
                    key={session.id}
                    href={`/jr/reading/${session.id}`}
                    className="block text-sm px-3 py-2 bg-emerald-50 rounded hover:bg-emerald-100 transition"
                  >
                    {session.completed_at ? "✅" : "⏳"} Session{" "}
                    {readingSessions.indexOf(session) + 1}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">할당된 세션이 없습니다</p>
            )}
          </div>

          {/* Grammar */}
          <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-blue-900">🔤 Grammar</h2>
              <div className="text-3xl">📚</div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              문법 개념 학습 · 연습 문제 (2단계)
            </p>
            {grammarSessions && grammarSessions.length > 0 ? (
              <div className="space-y-2">
                {grammarSessions.slice(0, 3).map((session) => (
                  <Link
                    key={session.id}
                    href={`/jr/grammar/${session.id}`}
                    className="block text-sm px-3 py-2 bg-blue-50 rounded hover:bg-blue-100 transition"
                  >
                    {session.completed_at ? "✅" : "⏳"} Chapter{" "}
                    {grammarSessions.indexOf(session) + 1}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">할당된 단원이 없습니다</p>
            )}
          </div>

          {/* Listening */}
          <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-amber-900">🔊 Listening</h2>
              <div className="text-3xl">🎧</div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              노트 · 문제 풀이 · 스크립트 · Shadowing · 과제 (5단계)
            </p>
            {listeningSessions && listeningSessions.length > 0 ? (
              <div className="space-y-2">
                {listeningSessions.slice(0, 3).map((session) => (
                  <Link
                    key={session.id}
                    href={`/jr/listening/${session.id}`}
                    className="block text-sm px-3 py-2 bg-amber-50 rounded hover:bg-amber-100 transition"
                  >
                    {session.completed_at ? "✅" : "⏳"} Session{" "}
                    {listeningSessions.indexOf(session) + 1}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">할당된 세션이 없습니다</p>
            )}
          </div>

          {/* Speaking & Writing */}
          <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-purple-900">
                🎤 Speaking & Writing
              </h2>
              <div className="text-3xl">✏️</div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              음성 녹음·글쓰기 제출
            </p>
            {speakingWritingTasks && speakingWritingTasks.length > 0 ? (
              <div className="space-y-2">
                {speakingWritingTasks.slice(0, 3).map((task) => (
                  <Link
                    key={task.id}
                    href={`/jr/speaking-writing/${task.id}`}
                    className="block text-sm px-3 py-2 bg-purple-50 rounded hover:bg-purple-100 transition"
                  >
                    {task.task_type === "speaking" ? "🎤" : "✍️"} 과제
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">할당된 과제가 없습니다</p>
            )}
          </div>

          {/* Vocabulary */}
          <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-indigo-900">📝 단어학습</h2>
              <div className="text-3xl">💡</div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              단어 학습 · 드릴 · 게임
            </p>
            <Link
              href="/vocab"
              className="block text-sm px-3 py-2 bg-indigo-50 rounded hover:bg-indigo-100 transition text-center font-medium text-indigo-700"
            >
              단어학습 시작하기 →
            </Link>
          </div>
        </div>

        {/* Learning Stats */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-bold text-slate-900 mb-4">학습 진도</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {readingSessions?.filter((s) => s.completed_at).length || 0}
              </div>
              <div className="text-xs text-slate-600">Reading 완료</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {grammarSessions?.filter((s) => s.completed_at).length || 0}
              </div>
              <div className="text-xs text-slate-600">Grammar 완료</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {listeningSessions?.filter((s) => s.completed_at).length || 0}
              </div>
              <div className="text-xs text-slate-600">Listening 완료</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {speakingWritingTasks?.length || 0}
              </div>
              <div className="text-xs text-slate-600">할당된 과제</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
