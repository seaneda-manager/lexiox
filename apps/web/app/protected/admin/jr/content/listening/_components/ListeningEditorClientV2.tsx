'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { saveListeningSessionAction, updateListeningSessionAction } from '../actions';

type Props = {
  initialSession?: any;
};

type Section = 'basic' | 'content' | 'type' | 'keywords' | 'questions' | 'mapping';

export default function ListeningEditorClientV2({ initialSession }: Props) {
  const router = useRouter();
  const isEditing = !!initialSession;

  // Basic Info
  const [title, setTitle] = useState(initialSession?.title || '');
  const [difficulty, setDifficulty] = useState(initialSession?.difficulty || 'medium');
  const [level, setLevel] = useState(initialSession?.level || 3);
  const [textbook, setTextbook] = useState(initialSession?.textbook || '');

  // Content
  const [audioUrl, setAudioUrl] = useState(initialSession?.audio_url || '');
  const [script, setScript] = useState(initialSession?.audio_transcript || '');
  const [koreanScript, setKoreanScript] = useState(initialSession?.korean_transcript || '');

  // Type
  const [listeningType, setListeningType] = useState(initialSession?.listening_type || 'conversation');

  // Keywords
  const [keywords, setKeywords] = useState<string[]>(initialSession?.keywords || []);
  const [keywordInput, setKeywordInput] = useState('');

  // Questions
  const [questions, setQuestions] = useState(initialSession?.questions || []);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);

  // Mapping
  const [textbookMapping, setTextbookMapping] = useState(initialSession?.textbook_mapping || '');

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

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const generateQuestionsAI = async () => {
    if (!script.trim()) {
      alert('먼저 영문 스크립트를 입력하세요');
      return;
    }

    setGeneratingQuestions(true);
    setTimeout(() => {
      setQuestions([
        { text: '이 대화의 주제는?', options: ['A', 'B', 'C', 'D'], correct: 'A' },
        { text: '화자의 의도는?', options: ['A', 'B', 'C', 'D'], correct: 'B' },
      ]);
      setGeneratingQuestions(false);
    }, 1000);
  };

  const handleSave = async () => {
    if (!title.trim() || !audioUrl.trim() || !script.trim()) {
      alert('제목, 오디오 URL, 스크립트를 입력하세요');
      return;
    }

    setSaving(true);
    const data = {
      id: initialSession?.id,
      title,
      difficulty,
      level,
      textbook,
      audio_url: audioUrl,
      audio_transcript: script,
      korean_transcript: koreanScript,
      listening_type: listeningType,
      keywords,
      questions,
      textbook_mapping: textbookMapping,
    };

    let result;
    if (isEditing) {
      result = await updateListeningSessionAction(data);
    } else {
      result = await saveListeningSessionAction(data);
    }

    if (result.ok) {
      alert(`세션이 ${isEditing ? '수정' : '저장'}되었습니다`);
      router.push('/admin/jr/content/listening');
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
            {isEditing ? 'Listening 세션 편집' : '새 Listening 세션'}
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
                    <label className="block text-sm font-semibold text-slate-900 mb-2">세션 제목</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="예: Campus Conversation"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">유형</label>
                    <select
                      value={listeningType}
                      onChange={(e) => setListeningType(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="conversation">대화</option>
                      <option value="announcement">공지</option>
                      <option value="lecture">강의</option>
                      <option value="news">뉴스</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">레벨</label>
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
                      <option value="">선택</option>
                      <option value="능률">능률</option>
                      <option value="YBM">YBM</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Content */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('content')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">🎧 오디오 & 스크립트</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('content') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('content') && (
              <div className="px-6 pb-6 pt-4 space-y-4 border-t">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">오디오 URL</label>
                  <input
                    type="url"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">영문 스크립트</label>
                    <textarea
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      placeholder="영문 대사..."
                      rows={8}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">한국어 해석</label>
                    <textarea
                      value={koreanScript}
                      onChange={(e) => setKoreanScript(e.target.value)}
                      placeholder="한국어 해석..."
                      rows={8}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Keywords */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('keywords')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">💡 주요 키워드</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('keywords') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('keywords') && (
              <div className="px-6 pb-6 pt-4 space-y-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="키워드를 입력하세요"
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={addKeyword}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700"
                  >
                    + 추가
                  </button>
                </div>

                {keywords.length > 0 && (
                  <div className="space-y-2">
                    {keywords.map((keyword, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg text-sm"
                      >
                        <span>{keyword}</span>
                        <button
                          onClick={() => removeKeyword(idx)}
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

          {/* 4. Questions */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('questions')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">🤖 문제 생성</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('questions') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('questions') && (
              <div className="px-6 pb-6 pt-4 space-y-4 border-t">
                <button
                  onClick={generateQuestionsAI}
                  disabled={generatingQuestions || !script.trim()}
                  className="px-6 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:bg-slate-400"
                >
                  {generatingQuestions ? '생성 중...' : '🤖 AI로 문제 생성'}
                </button>

                {questions.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900">생성된 문제 ({questions.length})</h3>
                    {questions.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-lg text-sm">
                        <div className="font-semibold text-slate-900">{idx + 1}. {q.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Mapping */}
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
                <input
                  type="text"
                  value={textbookMapping}
                  onChange={(e) => setTextbookMapping(e.target.value)}
                  placeholder="교재 위치"
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
              className="px-6 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:bg-slate-400"
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
