'use client';

import { useState } from 'react';

interface HavrutaTopic {
  id: string;
  title: string;
  description: string;
  category: 'discussion' | 'debate' | 'presentation';
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTimeMinutes: number;
}

interface HavrutaPeer {
  id: string;
  name: string;
  level: number;
  avatar?: string;
}

interface PhaseHavrutaProps {
  studentId: string;
  topics: HavrutaTopic[];
  peers?: HavrutaPeer[];
  onTopicSelect?: (topicId: string) => void;
  onPeerSelect?: (peerId: string) => void;
}

export function PhaseHavruta({
  studentId,
  topics,
  peers = [],
  onTopicSelect,
  onPeerSelect,
}: PhaseHavrutaProps) {
  const [selectedMode, setSelectedMode] = useState<'topic' | 'peer'>('topic');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'discussion':
        return '💬 토론';
      case 'debate':
        return '⚔️ 논쟁';
      case 'presentation':
        return '🎤 발표';
      default:
        return category;
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '쉬움';
      case 'medium':
        return '중간';
      case 'hard':
        return '어려움';
      default:
        return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-emerald-100 text-emerald-700';
      case 'medium':
        return 'bg-amber-100 text-amber-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
        <h2 className="text-2xl font-bold text-purple-900 mb-2">💬 하브루타</h2>
        <p className="text-sm text-purple-700 mb-4">
          학습 내용을 동료와 함께 토론합니다. 서로 다른 관점을 공유하고 깊이 있는 학습을 도모하세요.
        </p>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedMode('topic')}
            className={`flex-1 rounded-lg px-4 py-2 font-semibold transition ${
              selectedMode === 'topic'
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-50'
            }`}
          >
            📚 주제 선택
          </button>
          <button
            onClick={() => setSelectedMode('peer')}
            className={`flex-1 rounded-lg px-4 py-2 font-semibold transition ${
              selectedMode === 'peer'
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-50'
            }`}
          >
            👥 동료 선택
          </button>
        </div>
      </div>

      {/* Topics Mode */}
      {selectedMode === 'topic' && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">하브루타 주제</h3>

          {topics.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-slate-500">현재 추천 주제가 없습니다.</p>
            </div>
          ) : (
            topics.map(topic => (
              <div
                key={topic.id}
                onClick={() => {
                  setSelectedTopic(topic.id);
                  onTopicSelect?.(topic.id);
                }}
                className={`rounded-lg border-2 p-4 cursor-pointer transition ${
                  selectedTopic === topic.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{topic.icon}</span>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {topic.title}
                      </h4>
                      <p className="text-xs text-slate-500">{topic.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 ml-10">
                  <span className="inline-block rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">
                    {getCategoryLabel(topic.category)}
                  </span>
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${getDifficultyColor(topic.difficulty)}`}>
                    {getDifficultyLabel(topic.difficulty)}
                  </span>
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    ⏱️ {topic.estimatedTimeMinutes}분
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Peers Mode */}
      {selectedMode === 'peer' && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900">학습 동료</h3>

          {peers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-slate-500">현재 이용 가능한 동료가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {peers.map(peer => (
                <button
                  key={peer.id}
                  onClick={() => onPeerSelect?.(peer.id)}
                  className="rounded-lg border-2 border-slate-200 bg-white p-4 text-left hover:border-purple-300 hover:bg-purple-50 transition"
                >
                  <div className="flex items-center gap-3">
                    {peer.avatar ? (
                      <img
                        src={peer.avatar}
                        alt={peer.name}
                        className="h-10 w-10 rounded-full bg-slate-200"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-sm">
                        {peer.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{peer.name}</p>
                      <p className="text-xs text-slate-500">Lv. {peer.level}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>하브루타 팁:</strong> 서로 질문을 던지고, 다양한 관점에서 사고하며, 논리적으로 설득해보세요. 깊이 있는 토론이 최고의 학습입니다.
        </p>
      </div>

      {/* Start Button */}
      <button
        disabled={selectedTopic === null && selectedMode === 'topic'}
        className={`w-full rounded-lg px-6 py-3 font-semibold text-white transition ${
          selectedTopic === null && selectedMode === 'topic'
            ? 'bg-slate-400 cursor-not-allowed opacity-50'
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        {selectedMode === 'topic'
          ? '주제로 시작하기'
          : '동료와 함께하기'}
      </button>
    </div>
  );
}
