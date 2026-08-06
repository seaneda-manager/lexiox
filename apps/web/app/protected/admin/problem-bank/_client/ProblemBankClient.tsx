'use client';

import { useState } from 'react';

type ProblemType = 'complete_words' | 'daily_life' | 'academic_passage';
type Difficulty = 'easy' | 'core' | 'hard';

interface RecentProblem {
  id: string;
  topic: string;
  difficulty: Difficulty;
  created_at: string;
  source_test_id: string | null;
}

interface Stats {
  totalCompleteWords: number;
  totalDailyLife: number;
  totalAcademicPassage: number;
  total: number;
}

export default function ProblemBankClient({ stats, recentProblems }: { stats: Stats; recentProblems: RecentProblem[] }) {
  const [activeTab, setActiveTab] = useState<'view' | 'generate'>('view');
  const [problemType, setProblemType] = useState<ProblemType>('complete_words');
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 생성 폼 상태
  const [formData, setFormData] = useState({
    passage: '',
    content: '',
    topic: '',
    title: '',
    difficulty: 'core' as Difficulty,
    contextType: 'email' as 'email' | 'notice' | 'social_post' | 'web_article' | 'other',
  });

  const TABS: { id: ProblemType; label: string; icon: string; count: number }[] = [
    { id: 'complete_words', label: '완성형', icon: '✏️', count: stats.totalCompleteWords },
    { id: 'daily_life', label: '일상', icon: '💬', count: stats.totalDailyLife },
    { id: 'academic_passage', label: '학술', icon: '📖', count: stats.totalAcademicPassage },
  ];

  const handleMigration = async () => {
    if (!confirm('🔄 기존 모든 Reading/Listening 테스트를 Problem Bank로 마이그레이션하시겠습니까?\n\n이 작업은 몇 분 걸릴 수 있습니다.')) {
      return;
    }

    setMigrating(true);
    setError(null);
    setMigrationResult(null);

    try {
      const res = await fetch('/api/admin/problem-bank/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Migration failed');

      setMigrationResult(data.summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMigrating(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setMessage(null);

    try {
      let endpoint = '';
      let body: any = {};

      if (problemType === 'complete_words') {
        if (!formData.passage || !formData.topic) {
          throw new Error('지문과 주제를 입력하세요');
        }
        endpoint = '/api/admin/problem-bank/generate-complete-words';
        body = {
          passage: formData.passage,
          topic: formData.topic,
          difficulty: formData.difficulty,
        };
      } else if (problemType === 'daily_life') {
        if (!formData.content || !formData.topic) {
          throw new Error('내용과 주제를 입력하세요');
        }
        endpoint = '/api/admin/problem-bank/generate-daily-life';
        body = {
          content: formData.content,
          topic: formData.topic,
          difficulty: formData.difficulty,
          contextType: formData.contextType,
        };
      } else if (problemType === 'academic_passage') {
        if (!formData.passage || !formData.title || !formData.topic) {
          throw new Error('지문, 제목, 주제를 입력하세요');
        }
        endpoint = '/api/admin/problem-bank/generate-academic';
        body = {
          passage: formData.passage,
          title: formData.title,
          topic: formData.topic,
          difficulty: formData.difficulty,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Generation failed');

      setMessage({
        type: 'success',
        text: `✅ ${problemType === 'complete_words' ? '완성형' : problemType === 'daily_life' ? '일상' : '학술'} 문제가 생성되었습니다`,
      });

      // 폼 초기화
      setFormData({
        passage: '',
        content: '',
        topic: '',
        title: '',
        difficulty: 'core',
        contextType: 'email',
      });

      // 페이지 새로고침
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setMessage({ type: 'error', text: `❌ ${e.message}` });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 마이그레이션 섹션 */}
      <div className="rounded-lg border bg-gradient-to-r from-emerald-50 to-teal-50 p-6 shadow-sm border-emerald-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-emerald-900">🔄 벌크 마이그레이션</h2>
            <p className="text-xs text-emerald-700 mt-1">기존 Reading/Listening 테스트에서 모든 문제를 Problem Bank로 추출</p>
          </div>
          <button
            onClick={handleMigration}
            disabled={migrating}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {migrating ? '마이그레이션 중…' : '지금 실행'}
          </button>
        </div>

        {migrationResult && (
          <div className="mt-4 rounded-lg bg-white p-4 border border-emerald-200">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-600">처리된 테스트</p>
                <p className="text-lg font-bold text-gray-900">{migrationResult.total_tests_processed}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">추출된 문제</p>
                <p className="text-lg font-bold text-gray-900">{migrationResult.total_problems_extracted}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">완성형</p>
                <p className="text-lg font-bold text-sky-600">{migrationResult.by_type?.complete_words ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">일상 / 학술</p>
                <p className="text-lg font-bold text-amber-600">
                  {(migrationResult.by_type?.daily_life ?? 0) + (migrationResult.by_type?.academic_passage ?? 0)}
                </p>
              </div>
            </div>
            <p className="text-xs text-emerald-700 mt-3">✅ 마이그레이션 완료! 페이지를 새로고침하면 통계가 업데이트됩니다.</p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 p-3 border border-rose-200">
            <p className="text-xs text-rose-700">❌ 오류: {error}</p>
          </div>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('view')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'view'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 전체 보기
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'generate'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            ✨ 문제 생성
          </button>
        </div>
      </div>

      {/* 생성 탭 */}
      {activeTab === 'generate' && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">✨ 문제 생성</h2>

          {/* 문제 유형 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">문제 유형 선택</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { id: 'complete_words' as ProblemType, label: '✏️ 완성형', desc: '짧은 지문 (70-120단어)' },
                { id: 'daily_life' as ProblemType, label: '💬 일상', desc: '이메일/공지 (짧은 지문)' },
                { id: 'academic_passage' as ProblemType, label: '📖 학술', desc: '긴 학술 지문 (200-250단어)' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setProblemType(type.id)}
                  className={`p-4 rounded-lg border-2 transition text-left ${
                    problemType === type.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{type.label}</p>
                  <p className="text-xs text-gray-600 mt-1">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 생성 폼 */}
          <form onSubmit={handleGenerate} className="space-y-6">
            {/* Complete Words 폼 */}
            {problemType === 'complete_words' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">지문 (70-120 단어)</label>
                  <textarea
                    value={formData.passage}
                    onChange={(e) => setFormData({ ...formData, passage: e.target.value })}
                    placeholder="완성형 문제 원문을 입력하세요..."
                    rows={6}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Daily Life 폼 */}
            {problemType === 'daily_life' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">지문 유형</label>
                  <select
                    value={formData.contextType}
                    onChange={(e) =>
                      setFormData({ ...formData, contextType: e.target.value as any })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="email">📧 이메일</option>
                    <option value="notice">📌 공지</option>
                    <option value="social_post">📱 SNS</option>
                    <option value="web_article">📰 웹 기사</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="일상 지문을 입력하세요..."
                    rows={6}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Academic Passage 폼 */}
            {problemType === 'academic_passage' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="예: Marine Biology"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">지문 (200-250 단어)</label>
                  <textarea
                    value={formData.passage}
                    onChange={(e) => setFormData({ ...formData, passage: e.target.value })}
                    placeholder="학술 지문을 입력하세요..."
                    rows={8}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* 공통 필드 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">주제</label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="예: Prehistoric People"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">난이도</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="easy">쉬움</option>
                  <option value="core">중간</option>
                  <option value="hard">어려움</option>
                </select>
              </div>
            </div>

            {/* 메시지 */}
            {message && (
              <div
                className={`rounded-lg p-4 text-sm ${
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={generating}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? '생성 중…' : '✨ 문제 생성 및 저장'}
            </button>
          </form>
        </div>
      )}

      {/* 최근 문제 목록 */}
      {activeTab === 'view' && (
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="text-sm font-semibold text-gray-900">최근 추가된 문제 (완성형)</h3>
          <p className="text-xs text-gray-600 mt-1">Problem Bank의 최신 10개 문제</p>
        </div>

        <div className="divide-y">
          {recentProblems.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-600">아직 추출된 문제가 없습니다</p>
              <p className="text-xs text-gray-500 mt-1">Reading/Listening 테스트를 생성하거나 마이그레이션을 실행해주세요</p>
            </div>
          ) : (
            recentProblems.map((problem) => (
              <div key={problem.id} className="px-6 py-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{problem.topic}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          problem.difficulty === 'easy'
                            ? 'bg-green-100 text-green-800'
                            : problem.difficulty === 'core'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {problem.difficulty === 'easy' ? '쉬움' : problem.difficulty === 'core' ? '중간' : '어려움'}
                      </span>
                      {problem.source_test_id && (
                        <span className="text-xs text-gray-500">
                          출처: <code className="font-mono">{problem.source_test_id.slice(0, 8)}...</code>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{new Date(problem.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {/* 정보 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs text-blue-700">
          💡 <strong>Problem Bank</strong>는 Reading/Listening 테스트에서 자동으로 추출된 문제 저장소입니다.
        </p>
        <ul className="text-xs text-blue-600 mt-2 space-y-1 ml-5 list-disc">
          <li>새로운 테스트 생성 시 자동으로 추출</li>
          <li>Daily Test 생성의 문제 소스</li>
          <li>벌크 마이그레이션으로 기존 테스트 일괄 처리 가능</li>
        </ul>
      </div>
    </div>
  );
}
