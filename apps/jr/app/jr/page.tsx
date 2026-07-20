import Link from 'next/link';
import { getSupabaseServer } from 'web/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function JrHubPage() {
  const supabase = await getSupabaseServer();

  try {
    // Fetch all published content
    const { data: readingData } = await supabase
      .from('jr_reading_passages')
      .select('id, title, difficulty, level')
      .eq('status', 'PUBLISHED')
      .limit(10);

    const { data: grammarData } = await supabase
      .from('jr_grammar_chapters')
      .select('id, title, difficulty, level')
      .eq('status', 'PUBLISHED')
      .limit(10);

    const { data: listeningData } = await supabase
      .from('jr_listening_sessions')
      .select('id, title, listening_type, difficulty, level')
      .eq('status', 'PUBLISHED')
      .limit(10);

    const { data: speakingWritingData } = await supabase
      .from('jr_speaking_writing_tasks')
      .select('id, title, task_type, difficulty, level')
      .eq('status', 'PUBLISHED')
      .limit(10);

    // Ensure data is serializable
    const readingSessions = readingData ? JSON.parse(JSON.stringify(readingData)) : [];
    const grammarSessions = grammarData ? JSON.parse(JSON.stringify(grammarData)) : [];
    const listeningSessions = listeningData ? JSON.parse(JSON.stringify(listeningData)) : [];
    const speakingWritingTasks = speakingWritingData ? JSON.parse(JSON.stringify(speakingWritingData)) : [];

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
                    href={`/content/reading/${session.id}/study`}
                    className="block text-sm px-3 py-2 bg-emerald-50 rounded hover:bg-emerald-100 transition"
                  >
                    <div className="font-semibold text-emerald-900">{session.title}</div>
                    <div className="text-xs text-emerald-700">레벨 {session.level || '-'} · {
                      session.difficulty === 'easy' ? '쉬움' :
                      session.difficulty === 'medium' ? '중간' : '어려움'
                    }</div>
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
                    href={`/content/grammar/${session.id}/study`}
                    className="block text-sm px-3 py-2 bg-blue-50 rounded hover:bg-blue-100 transition"
                  >
                    <div className="font-semibold text-blue-900">{session.title}</div>
                    <div className="text-xs text-blue-700">레벨 {session.level || '-'} · {
                      session.difficulty === 'easy' ? '쉬움' :
                      session.difficulty === 'medium' ? '중간' : '어려움'
                    }</div>
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
                    href={`/content/listening/${session.id}/study`}
                    className="block text-sm px-3 py-2 bg-amber-50 rounded hover:bg-amber-100 transition"
                  >
                    <div className="font-semibold text-amber-900">{session.title}</div>
                    <div className="text-xs text-amber-700">
                      {session.listening_type === 'conversation' && '🗣️ 대화'}
                      {session.listening_type === 'announcement' && '📢 공지'}
                      {session.listening_type === 'lecture' && '🎓 강의'}
                      {session.listening_type === 'news' && '📰 뉴스'} · 레벨 {session.level || '-'}
                    </div>
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
                    href={`/content/speaking-writing/${task.id}/study`}
                    className="block text-sm px-3 py-2 bg-purple-50 rounded hover:bg-purple-100 transition"
                  >
                    <div className="font-semibold text-purple-900">
                      {task.task_type === 'speaking' ? '🎤' : '✍️'} {task.title}
                    </div>
                    <div className="text-xs text-purple-700">레벨 {task.level || '-'} · {
                      task.difficulty === 'easy' ? '쉬움' :
                      task.difficulty === 'medium' ? '중간' : '어려움'
                    }</div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">할당된 과제가 없습니다</p>
            )}
          </div>

          {/* Vocabulary */}
          <div className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition opacity-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-indigo-900">📝 단어학습</h2>
              <div className="text-3xl">💡</div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              단어 학습 · 드릴 · 게임
            </p>
            <div className="text-sm px-3 py-2 bg-indigo-50 rounded text-center font-medium text-indigo-700 cursor-not-allowed">
              준비 중입니다 (Coming Soon)
            </div>
          </div>
        </div>

        {/* Learning Stats */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-bold text-slate-900 mb-4">할당된 콘텐츠</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {readingSessions?.length || 0}
              </div>
              <div className="text-xs text-slate-600">📖 Reading</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {grammarSessions?.length || 0}
              </div>
              <div className="text-xs text-slate-600">📚 Grammar</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {listeningSessions?.length || 0}
              </div>
              <div className="text-xs text-slate-600">🎧 Listening</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {speakingWritingTasks?.length || 0}
              </div>
              <div className="text-xs text-slate-600">🎤✍️ Speaking-Writing</div>
            </div>
          </div>
        </div>
      </div>
    </main>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">콘텐츠를 불러올 수 없습니다</h1>
          <p className="text-slate-600 mt-2">잠시 후 다시 시도해주세요</p>
        </div>
      </div>
    );
  }
}
