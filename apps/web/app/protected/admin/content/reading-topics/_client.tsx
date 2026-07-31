'use client';

import { useState } from 'react';
import { generateGeminiPrompt, type Topic } from '@/lib/reading-topics/gemini-prompt-generator';

interface PassageInput {
  content: string;
  type: string;
  topic: string;
  difficulty: string;
}

interface Question {
  id: string;
  number?: number;
  stem: string;
  type?: string;
  choices?: Array<{ id: string; text: string; isCorrect: boolean }>;
  correctToken?: string;
  order?: number;
}

export default function ReadingTopicsClient() {
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [module, setModule] = useState<'M1' | 'M2-Easy' | 'M2-Hard'>('M1');
  const [error, setError] = useState('');

  const [passages, setPassages] = useState<PassageInput[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<Record<string, Question[]>>({});

  const [activeTab, setActiveTab] = useState<'topics' | 'test'>('topics');
  const [testPassages, setTestPassages] = useState<PassageInput[]>([]);
  const [testQuestions, setTestQuestions] = useState<Record<string, Question[]>>({});

  const generateTopics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/reading-topics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: 10,
          excludedTopics: [],
          module,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error);
      }

      setTopics(data.topics);
      const prompt = generateGeminiPrompt(data.topics);
      setGeminiPrompt(prompt);
    } catch (err: any) {
      setError(err.message || '주제 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(geminiPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('복사 실패');
    }
  };

  const addPassage = () => {
    if (passages.length < topics.length) {
      const topic = topics[passages.length];
      setPassages([
        ...passages,
        {
          content: '',
          type: topic.type,
          topic: topic.topic,
          difficulty: topic.difficulty,
        },
      ]);
    }
  };

  const updatePassage = (index: number, content: string) => {
    const updated = [...passages];
    updated[index].content = content;
    setPassages(updated);
  };

  const generateQuestions = async (index: number) => {
    const passage = passages[index];
    if (!passage.content.trim()) {
      setError('지문을 입력해주세요');
      return;
    }

    // 형식별 문제 개수 결정
    const questionCounts: Record<string, number> = {
      complete_words: 10,
      daily_life_short: 4,
      daily_life_long: 5,
      academic_passage: 10,
    };
    const questionCount = questionCounts[passage.type] || 5;

    setGenLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/reading-topics/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passage: passage.content,
          passageType: passage.type,
          topic: passage.topic,
          difficulty: passage.difficulty,
          questionCount,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error);
      }

      setGeneratedQuestions({
        ...generatedQuestions,
        [index]: data.questions,
      });
    } catch (err: any) {
      setError(err.message || '문제 생성 실패');
    } finally {
      setGenLoading(false);
    }
  };

  const downloadJSON = (index: number) => {
    const passage = passages[index];
    const questions = generatedQuestions[index];

    const output = {
      passage: {
        topic: passage.topic,
        type: passage.type,
        difficulty: passage.difficulty,
        content: passage.content,
      },
      questions,
    };

    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${passage.topic.replace(/\s+/g, '_').toLowerCase()}-questions.json`;
    a.click();
  };

  // Test 기능
  const generateTestSamples = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/reading-topics/test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_samples' }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error);
      }

      const samplePassages = Object.values(data.passages).map((p: any) => ({
        content: p.content,
        type: p.type,
        topic: p.topic,
        difficulty: p.difficulty,
      }));

      setTestPassages(samplePassages);
      setTestQuestions({});
    } catch (err: any) {
      setError(err.message || 'Test 샘플 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const generateTestQuestions = async (index: number) => {
    const passage = testPassages[index];
    if (!passage.content.trim()) {
      setError('지문을 입력해주세요');
      return;
    }

    const questionCounts: Record<string, number> = {
      complete_words: 10,
      daily_life_short: 4,
      daily_life_long: 5,
      academic_passage: 10,
    };
    const questionCount = questionCounts[passage.type] || 5;

    setGenLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/reading-topics/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passage: passage.content,
          passageType: passage.type,
          topic: passage.topic,
          difficulty: passage.difficulty,
          questionCount,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error);
      }

      setTestQuestions({
        ...testQuestions,
        [index]: data.questions,
      });
    } catch (err: any) {
      setError(err.message || '문제 생성 실패');
    } finally {
      setGenLoading(false);
    }
  };

  const resetTest = () => {
    setTestPassages([]);
    setTestQuestions({});
    setError('');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📚 Reading Topics Manager</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('topics')}
            className={`px-4 py-2 rounded font-medium ${
              activeTab === 'topics'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Topics 생성
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2 rounded font-medium ${
              activeTab === 'test'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Test 데이터
          </button>
        </div>
      </div>

      {/* 생성 설정 */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">Step 1: 주제 생성</h2>

        <div className="mb-4 flex items-center gap-4">
          <label className="font-medium">모듈:</label>
          <select
            value={module}
            onChange={(e) => setModule(e.target.value as any)}
            className="rounded border px-3 py-2"
          >
            <option value="M1">Module 1 (공통)</option>
            <option value="M2-Easy">Module 2 - Easy</option>
            <option value="M2-Hard">Module 2 - Hard</option>
          </select>
        </div>

        <button
          onClick={generateTopics}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '생성 중...' : '주제 생성'}
        </button>

        {error && <p className="mt-4 text-red-600">{error}</p>}
      </div>

      {/* 생성된 주제 목록 */}
      {topics.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Step 2: 생성된 주제 ({topics.length}개)</h2>

          <div className="space-y-3">
            {topics.map((topic, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-3">
                <div className="flex-1">
                  <p className="font-medium">{idx + 1}. {topic.topic}</p>
                  <p className="text-sm text-gray-600">
                    {getTypeLabel(topic.type)} · {topic.word_count}단어 · {topic.difficulty}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gemini 의뢰문 */}
      {geminiPrompt && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Step 3: Gemini 의뢰문</h2>
            <button
              onClick={copyToClipboard}
              className={`rounded-lg px-4 py-2 text-white transition ${
                copied
                  ? 'bg-green-600'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {copied ? '✓ 복사됨' : '📋 복사'}
            </button>
          </div>

          <textarea
            value={geminiPrompt}
            readOnly
            className="h-96 w-full rounded-lg border bg-gray-50 p-4 font-mono text-sm"
          />

          <p className="mt-3 text-xs text-gray-500">
            💡 위 텍스트를 복사해서 Gemini (또는 지머나이)에 붙여넣으세요.
          </p>
        </div>
      )}

      {/* 지문 입력 + 문제 생성 */}
      {geminiPrompt && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold">Step 4: 지문 입력 & 문제 생성</h2>
            {passages.length < topics.length && (
              <button
                onClick={addPassage}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
              >
                + 지문 추가
              </button>
            )}
          </div>

          {passages.length === 0 && (
            <p className="text-sm text-gray-600">
              💡 "지문 추가" 버튼을 클릭하여 Gemini가 작성한 지문을 입력하세요.
            </p>
          )}

          {passages.map((passage, idx) => (
            <div
              key={idx}
              className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">
                  {idx + 1}. {passage.topic} ({passage.type})
                </h3>
                {generatedQuestions[idx] && (
                  <span className="text-xs font-semibold text-green-600">
                    ✓ {generatedQuestions[idx].length}개 문제 생성됨
                  </span>
                )}
              </div>

              <textarea
                value={passage.content}
                onChange={(e) => updatePassage(idx, e.target.value)}
                placeholder={`지문을 여기에 붙여넣으세요... (${passage.type})`}
                className="mb-3 h-48 w-full rounded-lg border p-3"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => generateQuestions(idx)}
                  disabled={genLoading || !passage.content.trim()}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {genLoading ? '생성 중...' : '문제 생성'}
                </button>

                {generatedQuestions[idx] && (
                  <button
                    onClick={() => downloadJSON(idx)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    📥 JSON 다운로드
                  </button>
                )}
              </div>

              {/* 생성된 문제 표시 */}
              {generatedQuestions[idx] && (
                <div className="mt-4 space-y-2 rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold text-gray-600">생성된 문제:</p>
                  {generatedQuestions[idx].map((q: Question, qIdx: number) => (
                    <div key={qIdx} className="text-xs text-gray-600">
                      <p>
                        {qIdx + 1}. {q.stem.substring(0, 60)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Test 탭 */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          {/* Test 샘플 생성 */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold">Test 데이터 생성</h2>
            <p className="text-sm text-gray-600 mb-4">4가지 유형별로 샘플 지문을 자동으로 생성합니다.</p>

            <div className="flex gap-2">
              <button
                onClick={generateTestSamples}
                disabled={loading}
                className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '생성 중...' : '📋 Test 샘플 생성'}
              </button>

              {testPassages.length > 0 && (
                <button
                  onClick={resetTest}
                  className="rounded-lg bg-gray-600 px-6 py-2 text-white hover:bg-gray-700"
                >
                  🔄 리셋
                </button>
              )}
            </div>
          </div>

          {/* Test 지문 & 문제 생성 */}
          {testPassages.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-6 font-semibold">Test 문제 생성 ({testPassages.length}개 유형)</h2>

              {testPassages.map((passage, idx) => (
                <div
                  key={idx}
                  className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">
                      {idx + 1}. {passage.topic} ({passage.type})
                    </h3>
                    {testQuestions[idx] && (
                      <span className="text-xs font-semibold text-green-600">
                        ✓ {testQuestions[idx].length}개 문제 생성됨
                      </span>
                    )}
                  </div>

                  <textarea
                    value={passage.content}
                    onChange={(e) => {
                      const updated = [...testPassages];
                      updated[idx].content = e.target.value;
                      setTestPassages(updated);
                    }}
                    placeholder={`지문을 여기에 입력하세요... (${passage.type})`}
                    className="mb-3 h-32 w-full rounded-lg border p-3"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => generateTestQuestions(idx)}
                      disabled={genLoading || !passage.content.trim()}
                      className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {genLoading ? '생성 중...' : '문제 생성'}
                    </button>

                    {testQuestions[idx] && (
                      <button
                        onClick={() => {
                          const output = {
                            passage: {
                              topic: passage.topic,
                              type: passage.type,
                              difficulty: passage.difficulty,
                              content: passage.content,
                            },
                            questions: testQuestions[idx],
                          };
                          const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `test-${passage.topic.replace(/\s+/g, '_').toLowerCase()}.json`;
                          a.click();
                        }}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                      >
                        📥 JSON 다운로드
                      </button>
                    )}
                  </div>

                  {testQuestions[idx] && (
                    <div className="mt-4 space-y-2 rounded-lg bg-white p-3">
                      <p className="text-xs font-semibold text-gray-600">생성된 문제:</p>
                      {testQuestions[idx].map((q: Question, qIdx: number) => (
                        <div key={qIdx} className="text-xs text-gray-600">
                          <p>
                            {qIdx + 1}. {q.stem.substring(0, 60)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    complete_words: 'Complete Words',
    daily_life_short: 'Daily Life (Short)',
    daily_life_long: 'Daily Life (Long)',
    academic_passage: 'Academic Passage',
  };
  return labels[type] || type;
}
