'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { saveReadingPassageAction, updateReadingPassageAction } from '../actions';

type Props = {
  initialPassage?: any;
};

type Section = 'basic' | 'content' | 'grammar' | 'vocabulary' | 'questions' | 'mapping';

export default function ReadingEditorClientV2({ initialPassage }: Props) {
  const router = useRouter();
  const isEditing = !!initialPassage;

  // Basic Info
  const [title, setTitle] = useState(initialPassage?.title || '');
  const [difficulty, setDifficulty] = useState(initialPassage?.difficulty || 'medium');
  const [level, setLevel] = useState(initialPassage?.level || 3);
  const [textbook, setTextbook] = useState(initialPassage?.textbook || '');

  // Content
  const [content, setContent] = useState(initialPassage?.content || '');
  const [koreanTranslation, setKoreanTranslation] = useState(initialPassage?.korean_translation || '');

  // Grammar Structure
  const [grammarAnalysis, setGrammarAnalysis] = useState(initialPassage?.grammar_analysis || '');

  // Vocabulary
  const [vocabulary, setVocabulary] = useState<string[]>(initialPassage?.vocabulary || []);
  const [vocabInput, setVocabInput] = useState('');

  // Questions (AI generated)
  const [questions, setQuestions] = useState(initialPassage?.questions || []);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // Mapping
  const [textbookMapping, setTextbookMapping] = useState(initialPassage?.textbook_mapping || '');

  // UI State
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['basic', 'content']));
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

  const addVocabulary = () => {
    if (vocabInput.trim()) {
      setVocabulary([...vocabulary, vocabInput.trim()]);
      setVocabInput('');
    }
  };

  const removeVocabulary = (index: number) => {
    setVocabulary(vocabulary.filter((_, i) => i !== index));
  };

  const generateQuestionsAI = async () => {
    if (!content.trim()) {
      alert('먼저 영문 지문을 입력하세요');
      return;
    }

    setGeneratingQuestions(true);
    // TODO: Call AI API to generate questions
    // For now, just show mock data
    setTimeout(() => {
      setQuestions([
        { type: 'inference', text: '이 지문의 주제는?', options: ['A', 'B', 'C', 'D'], correct: 'A' },
        { type: 'main_idea', text: '저자의 주장은?', options: ['A', 'B', 'C', 'D'], correct: 'B' },
      ]);
      setGeneratingQuestions(false);
    }, 1000);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('제목과 영문 지문을 입력하세요');
      return;
    }

    setSaving(true);
    const data = {
      id: initialPassage?.id,
      title,
      difficulty,
      level,
      textbook,
      content,
      korean_translation: koreanTranslation,
      grammar_analysis: grammarAnalysis,
      vocabulary,
      questions,
      textbook_mapping: textbookMapping,
    };

    let result;
    if (isEditing) {
      result = await updateReadingPassageAction(data);
    } else {
      result = await saveReadingPassageAction(data);
    }

    if (result.ok) {
      alert(`지문이 ${isEditing ? '수정' : '저장'}되었습니다`);
      router.push('/admin/jr/content/reading');
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
            {isEditing ? 'Reading 지문 편집' : '새 Reading 지문'}
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
                    <label className="block text-sm font-semibold text-slate-900 mb-2">제목</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="지문 제목"
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

          {/* 2. Content (영문 + 해석) */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('content')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">📖 지문 콘텐츠</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('content') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('content') && (
              <div className="px-6 pb-6 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">영문</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="영문 지문을 입력하세요..."
                      rows={10}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">한국어 해석</label>
                    <textarea
                      value={koreanTranslation}
                      onChange={(e) => setKoreanTranslation(e.target.value)}
                      placeholder="한국어 해석문을 입력하세요..."
                      rows={10}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Grammar Structure */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('grammar')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">📚 문법 구조 분석</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('grammar') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('grammar') && (
              <div className="px-6 pb-6 pt-4 border-t">
                <label className="block text-sm font-semibold text-slate-900 mb-2">문법 분석 (JSON)</label>
                <textarea
                  value={grammarAnalysis}
                  onChange={(e) => setGrammarAnalysis(e.target.value)}
                  placeholder='{"sentences": [{"num": 1, "subject": "...", "verb": "...", "tense": "..."}]}'
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                />
                <p className="text-xs text-slate-500 mt-2">각 문장의 주어, 동사, 시제, 구조를 JSON으로 입력</p>
              </div>
            )}
          </div>

          {/* 4. Vocabulary */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('vocabulary')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">💡 단어/표현</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('vocabulary') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('vocabulary') && (
              <div className="px-6 pb-6 pt-4 border-t space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vocabInput}
                    onChange={(e) => setVocabInput(e.target.value)}
                    placeholder="단어를 입력하세요 (예: understand = 이해하다)"
                    onKeyPress={(e) => e.key === 'Enter' && addVocabulary()}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={addVocabulary}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                  >
                    + 추가
                  </button>
                </div>

                {vocabulary.length > 0 && (
                  <div className="space-y-2">
                    {vocabulary.map((vocab, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg text-sm"
                      >
                        <span>{vocab}</span>
                        <button
                          onClick={() => removeVocabulary(idx)}
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

          {/* 5. Questions (AI Generated) */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('questions')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">🤖 문제 자동 생성</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('questions') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('questions') && (
              <div className="px-6 pb-6 pt-4 border-t space-y-4">
                <button
                  onClick={generateQuestionsAI}
                  disabled={generatingQuestions || !content.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-400"
                >
                  {generatingQuestions ? '생성 중...' : '🤖 AI로 문제 생성'}
                </button>

                {questions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">생성된 문제 ({questions.length})</h3>
                    {questions.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-lg text-sm">
                        <div className="font-semibold text-slate-900">{idx + 1}. {q.text}</div>
                        <div className="text-xs text-slate-600 mt-1">유형: {q.type}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. Textbook Mapping */}
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
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-slate-400"
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
