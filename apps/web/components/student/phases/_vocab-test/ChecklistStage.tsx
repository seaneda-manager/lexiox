'use client';

import { useState, useMemo } from 'react';
import type { VocabWord, POS_LABELS } from '@/lib/types/vocab-test';
import { POS_LABELS } from '@/lib/types/vocab-test';

interface ChecklistStageProps {
  words: VocabWord[];
  onContinue: (uncheckedWordIds: string[]) => void;
}

export function ChecklistStage({ words, onContinue }: ChecklistStageProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const filteredWords = useMemo(() => {
    return words.filter(word =>
      word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      word.meaning.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [words, searchTerm]);

  const checkedCount = checkedIds.size;
  const allChecked = checkedCount === words.length;

  const handleToggle = (wordId: string) => {
    setCheckedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(words.map(w => w.id)));
    }
  };

  const handleContinue = () => {
    const uncheckedIds = words
      .filter(w => !checkedIds.has(w.id))
      .map(w => w.id);

    if (uncheckedIds.length === 0) {
      alert('테스트할 단어를 최소 1개 이상 선택해주세요');
      return;
    }

    onContinue(uncheckedIds);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <h2 className="text-lg font-bold text-blue-900 mb-2">📝 단어 인식 확인</h2>
        <p className="text-sm text-blue-700">
          아래 단어들 중에서 <strong>아는 단어</strong>를 체크하세요.
        </p>
        <p className="text-xs text-blue-600 mt-1">
          체크하지 않은 단어들이 테스트 대상입니다.
        </p>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            확인 완료: {checkedCount} / {words.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round((checkedCount / words.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${(checkedCount / words.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="단어 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Select All */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={handleToggleAll}
          className="w-5 h-5 text-blue-600 rounded cursor-pointer"
        />
        <label className="flex-1 cursor-pointer">
          <p className="text-sm font-medium text-gray-900">전체 선택</p>
          <p className="text-xs text-gray-500">모든 단어를 아는 것으로 표시</p>
        </label>
      </div>

      {/* Word List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredWords.map(word => (
          <div
            key={word.id}
            className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition"
            onClick={() => handleToggle(word.id)}
          >
            <input
              type="checkbox"
              checked={checkedIds.has(word.id)}
              onChange={() => {}}
              className="w-5 h-5 text-blue-600 rounded cursor-pointer mt-1"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-gray-900">{word.word}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                  {POS_LABELS[word.pos]}
                </span>
              </div>
              <p className="text-sm text-gray-600">{word.meaning}</p>
              {word.example && (
                <p className="text-xs text-gray-500 italic mt-1">예: {word.example}</p>
              )}
            </div>
            {checkedIds.has(word.id) && (
              <div className="flex items-center gap-1 text-green-600 flex-shrink-0">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}

        {filteredWords.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
      >
        ▶️ 테스트 시작 ({words.length - checkedCount}개 단어)
      </button>
    </div>
  );
}
