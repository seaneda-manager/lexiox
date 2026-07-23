'use client';

import type { TodayProgressWord } from '@/types/learning-stage';

interface Props {
  title: string;
  words: TodayProgressWord[];
}

export default function SidebarCard({ title, words }: Props) {
  return (
    <div className="bg-white rounded-lg border-2 border-green-300 p-4">
      <p className="text-sm font-semibold text-gray-700 mb-4">{title}</p>

      {words.length > 0 ? (
        <div className="space-y-3">
          {words.map((word, idx) => (
            <div key={idx} className="bg-green-50 rounded-lg p-3">
              <p className="font-bold text-green-700">{word.word}</p>
              <p className="text-xs text-gray-600 mt-1">{word.pos}</p>
              <p className="text-xs text-gray-600 mt-1">{word.meaning}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">아직 학습한 단어가 없습니다.</p>
      )}
    </div>
  );
}
