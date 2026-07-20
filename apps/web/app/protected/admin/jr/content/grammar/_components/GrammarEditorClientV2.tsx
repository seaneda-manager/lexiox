'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { saveGrammarChapterAction, updateGrammarChapterAction } from '../actions';

type Props = {
  initialChapter?: any;
};

type Section = 'basic' | 'explanation' | 'examples' | 'exercises' | 'mapping';

export default function GrammarEditorClientV2({ initialChapter }: Props) {
  const router = useRouter();
  const isEditing = !!initialChapter;

  // Basic Info
  const [title, setTitle] = useState(initialChapter?.title || '');
  const [difficulty, setDifficulty] = useState(initialChapter?.difficulty || 'medium');
  const [level, setLevel] = useState(initialChapter?.level || 3);
  const [textbook, setTextbook] = useState(initialChapter?.textbook || '');

  // Explanation
  const [explanation, setExplanation] = useState(initialChapter?.explanation || '');
  const [koreanExplanation, setKoreanExplanation] = useState(initialChapter?.korean_explanation || '');
  const [keyPoints, setKeyPoints] = useState(initialChapter?.key_points || '');

  // Examples
  const [examples, setExamples] = useState<string[]>(initialChapter?.examples || []);
  const [exampleInput, setExampleInput] = useState('');

  // Exercises
  const [exercises, setExercises] = useState(initialChapter?.exercises || []);
  const [generatingExercises, setGeneratingExercises] = useState(false);

  // Mapping
  const [textbookMapping, setTextbookMapping] = useState(initialChapter?.textbook_mapping || '');

  // UI State
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['basic', 'explanation']));
  const [saving, setSaving] = useState(false);

  const toggleSection = (section: Section) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  const addExample = () => {
    if (exampleInput.trim()) {
      setExamples([...examples, exampleInput.trim()]);
      setExampleInput('');
    }
  };

  const removeExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  const generateExercisesAI = async () => {
    if (!explanation.trim()) {
      alert('먼저 문법 설명을 입력하세요');
      return;
    }

    setGeneratingExercises(true);
    // TODO: Call AI API to generate exercises
    setTimeout(() => {
      setExercises([
        { text: '다음 문장을 올바르게 완성하세요.', options: ['A', 'B', 'C', 'D'], correct: 'A' },
        { text: '밑줄 친 부분의 오류를 찾으세요.', options: ['A', 'B', 'C', 'D'], correct: 'B' },
      ]);
      setGeneratingExercises(false);
    }, 1000);
  };

  const handleSave = async () => {
    if (!title.trim() || !explanation.trim()) {
      alert('제목과 문법 설명을 입력하세요');
      return;
    }

    setSaving(true);
    const data = {
      id: initialChapter?.id,
      title,
      difficulty,
      level,
      textbook,
      explanation,
      korean_explanation: koreanExplanation,
      key_points: keyPoints,
      examples,
      exercises,
      textbook_mapping: textbookMapping,
    };

    let result;
    if (isEditing) {
      result = await updateGrammarChapterAction(data);
    } else {
      result = await saveGrammarChapterAction(data);
    }

    if (result.ok) {
      alert(`단원이 ${isEditing ? '수정' : '저장'}되었습니다`);
      router.push('/admin/jr/content/grammar');
    } else {
      alert(`${isEditing ? '수정' : '저장'} 실패: ${result.error}`);
    }
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-5xl px-6">
          <h1 className="text-3xl font-bold text-slate-900">
            {isEditing ? 'Grammar 단원 편집' : '새 Grammar 단원'}
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="space-y-4">
          {/* 1. Basic Info */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('basic')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">📋 기본 정보</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('basic') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('basic') && (
              <div className="px-6 pb-6 pt-4 space-y-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">단원 제목</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="예: Present Tense"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">난이도</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="easy">쉬움</option>
                      <option value="medium">중간</option>
                      <option value="hard">어려움</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">레벨 (1~5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={level}
                      onChange={(e) => setLevel(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">교재</label>
                    <select
                      value={textbook}
                      onChange={(e) => setTextbook(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">선택하세요</option>
                      <option value="능률">능률 영어</option>
                      <option value="YBM">YBM 영어</option>
                      <option value="와이비엠">와이비엠 영어</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Explanation */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('explanation')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">📖 문법 설명</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('explanation') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('explanation') && (
              <div className="px-6 pb-6 pt-4 space-y-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">영문 설명</label>
                    <textarea
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      placeholder="문법 규칙을 영어로 설명..."
                      rows={8}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">한국어 설명</label>
                    <textarea
                      value={koreanExplanation}
                      onChange={(e) => setKoreanExplanation(e.target.value)}
                      placeholder="문법 규칙을 한국어로 설명..."
                      rows={8}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">핵심 포인트</label>
                  <textarea
                    value={keyPoints}
                    onChange={(e) => setKeyPoints(e.target.value)}
                    placeholder="암기해야 할 핵심 포인트 (한 줄씩)"
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Examples */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('examples')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">💡 예제 문장</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('examples') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('examples') && (
              <div className="px-6 pb-6 pt-4 space-y-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={exampleInput}
                    onChange={(e) => setExampleInput(e.target.value)}
                    placeholder="예제를 입력하세요 (예: I have been studying English.)"
                    onKeyPress={(e) => e.key === 'Enter' && addExample()}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={addExample}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                  >
                    + 추가
                  </button>
                </div>

                {examples.length > 0 && (
                  <div className="space-y-2">
                    {examples.map((example, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg text-sm"
                      >
                        <span>{example}</span>
                        <button
                          onClick={() => removeExample(idx)}
                          className="text-red-600 hover:text-red-700 font-semibold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Exercises */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('exercises')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">🤖 연습 문제 생성</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('exercises') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('exercises') && (
              <div className="px-6 pb-6 pt-4 space-y-4 border-t">
                <button
                  onClick={generateExercisesAI}
                  disabled={generatingExercises || !explanation.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400"
                >
                  {generatingExercises ? '생성 중...' : '🤖 AI로 문제 생성'}
                </button>

                {exercises.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">생성된 문제 ({exercises.length})</h3>
                    {exercises.map((ex, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-lg text-sm">
                        <div className="font-semibold text-slate-900">{idx + 1}. {ex.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Textbook Mapping */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('mapping')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">📌 교재 매핑</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('mapping') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('mapping') && (
              <div className="px-6 pb-6 pt-4 border-t">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  교재 위치 (예: 능률 Unit 3, YBM Lesson 5)
                </label>
                <input
                  type="text"
                  value={textbookMapping}
                  onChange={(e) => setTextbookMapping(e.target.value)}
                  placeholder="능률 Unit 3 / YBM Lesson 5"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>

          {/* Save/Cancel */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400"
            >
              {saving ? '저장 중...' : '💾 저장'}
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-slate-300 text-slate-900 rounded-lg font-semibold hover:bg-slate-400"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
