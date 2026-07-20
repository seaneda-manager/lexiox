'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { saveSpeakingWritingTaskAction, updateSpeakingWritingTaskAction } from '../actions';

type Props = {
  initialTask?: any;
};

type Section = 'basic' | 'prompt' | 'sample' | 'rubric' | 'mapping';

export default function SpeakingWritingEditorClientV2({ initialTask }: Props) {
  const router = useRouter();
  const isEditing = !!initialTask;

  // Basic Info
  const [title, setTitle] = useState(initialTask?.title || '');
  const [taskType, setTaskType] = useState(initialTask?.task_type || 'speaking');
  const [difficulty, setDifficulty] = useState(initialTask?.difficulty || 'medium');
  const [level, setLevel] = useState(initialTask?.level || 3);
  const [dueDate, setDueDate] = useState(initialTask?.due_date || '');

  // Prompt
  const [prompt, setPrompt] = useState(initialTask?.prompt || '');
  const [koreanPrompt, setKoreanPrompt] = useState(initialTask?.korean_prompt || '');
  const [preparationTime, setPreparationTime] = useState(initialTask?.preparation_time || 15);
  const [responseTime, setResponseTime] = useState(initialTask?.response_time || 45);

  // Sample Answer
  const [sampleAnswer, setSampleAnswer] = useState(initialTask?.sample_answer || '');
  const [sampleAnswerKorean, setSampleAnswerKorean] = useState(initialTask?.sample_answer_korean || '');

  // Rubric
  const [rubric, setRubric] = useState(initialTask?.rubric || '');

  // Mapping
  const [textbookMapping, setTextbookMapping] = useState(initialTask?.textbook_mapping || '');

  // UI State
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['basic', 'prompt']));
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

  const handleSave = async () => {
    if (!title.trim() || !prompt.trim()) {
      alert('제목과 과제 설명을 입력하세요');
      return;
    }

    setSaving(true);
    const data = {
      id: initialTask?.id,
      title,
      task_type: taskType,
      difficulty,
      level,
      due_date: dueDate || null,
      prompt,
      korean_prompt: koreanPrompt || null,
      preparation_time: preparationTime,
      response_time: responseTime,
      sample_answer: sampleAnswer || null,
      sample_answer_korean: sampleAnswerKorean || null,
      rubric: rubric || null,
      textbook_mapping: textbookMapping || null,
    };

    let result;
    if (isEditing) {
      result = await updateSpeakingWritingTaskAction(data);
    } else {
      result = await saveSpeakingWritingTaskAction(data);
    }

    if (result.ok) {
      alert(`과제가 ${isEditing ? '수정' : '저장'}되었습니다`);
      router.push('/admin/jr/content/speaking-writing');
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
            {isEditing ? 'Speaking/Writing 과제 편집' : '새 Speaking/Writing 과제'}
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
                    <label className="block text-sm font-semibold text-slate-900 mb-2">과제 제목</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="예: Describe Your Hobby"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">유형</label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="speaking">Speaking</option>
                      <option value="writing">Writing</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
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
                    <label className="block text-sm font-semibold text-slate-900 mb-2">준비시간(초)</label>
                    <input
                      type="number"
                      value={preparationTime}
                      onChange={(e) => setPreparationTime(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">응답시간(초)</label>
                    <input
                      type="number"
                      value={responseTime}
                      onChange={(e) => setResponseTime(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">제출 기한</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Prompt */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('prompt')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">📝 과제 설명</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('prompt') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('prompt') && (
              <div className="px-6 pb-6 pt-4 space-y-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">영문 과제</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="과제 설명 (영문)..."
                      rows={8}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">한국어 과제</label>
                    <textarea
                      value={koreanPrompt}
                      onChange={(e) => setKoreanPrompt(e.target.value)}
                      placeholder="과제 설명 (한국어)..."
                      rows={8}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Sample Answer */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('sample')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">⭐ 모범 답안</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('sample') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('sample') && (
              <div className="px-6 pb-6 pt-4 space-y-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">모범 답안 (영문)</label>
                    <textarea
                      value={sampleAnswer}
                      onChange={(e) => setSampleAnswer(e.target.value)}
                      placeholder="모범 답안..."
                      rows={6}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">모범 답안 (한국어)</label>
                    <textarea
                      value={sampleAnswerKorean}
                      onChange={(e) => setSampleAnswerKorean(e.target.value)}
                      placeholder="모범 답안 해석..."
                      rows={6}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Rubric */}
          <div className="bg-white rounded-lg shadow">
            <button
              onClick={() => toggleSection('rubric')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">📊 평가 기준</h2>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${expandedSections.has('rubric') ? 'rotate-180' : ''}`}
              />
            </button>

            {expandedSections.has('rubric') && (
              <div className="px-6 pb-6 pt-4 border-t">
                <label className="block text-sm font-semibold text-slate-900 mb-2">평가 기준</label>
                <textarea
                  value={rubric}
                  onChange={(e) => setRubric(e.target.value)}
                  placeholder="발음, 문법, 내용 등 평가 기준 작성..."
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
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
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-slate-400"
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
