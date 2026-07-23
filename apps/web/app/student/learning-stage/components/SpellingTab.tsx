'use client';

import { useState } from 'react';

interface Props {
  word: string;
  onSubmit: (spelling: string) => Promise<any>;
  disabled: boolean;
}

export default function SpellingTab({ word, onSubmit, disabled }: Props) {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const result = await onSubmit(input);

      if (result.success && result.result?.correct) {
        setFeedback({
          type: 'success',
          message: '정확합니다! 다음 탭으로 진행하세요.',
        });
      } else if (result.success) {
        setFeedback({
          type: 'error',
          message: '다시 시도해보세요.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: '오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 font-semibold mb-4">STEP 1: 철자 입력</p>

      {/* 주어진 철자 */}
      <div>
        <p className="text-xs text-gray-600 font-semibold mb-2">주어진 철자</p>
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <p className="text-2xl text-gray-400 tracking-widest">{word}</p>
        </div>
      </div>

      {/* 당신의 철자 */}
      <div>
        <p className="text-xs text-gray-600 font-semibold mb-2">당신의 철자</p>
        <div className="bg-teal-50 rounded-lg p-8 text-center border-2 border-teal-400 min-h-24 flex items-center justify-center">
          <p className="text-5xl font-bold text-teal-600">{input || '_'}</p>
        </div>
      </div>

      {/* 입력 필드 */}
      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
        <input
          type="text"
          placeholder="Type the word..."
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
          disabled={disabled || loading}
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 text-center text-lg font-semibold focus:outline-none focus:border-orange-400 disabled:bg-gray-100"
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleCheck}
            disabled={disabled || loading || !input}
            className="flex-1 bg-white border-2 border-gray-300 rounded-lg py-2 font-semibold hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
          >
            {loading ? '확인 중...' : 'Check'}
          </button>
          <button
            disabled={disabled}
            className="flex-1 bg-white border-2 border-gray-300 rounded-lg py-2 font-semibold hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition"
          >
            🔊 Hear
          </button>
        </div>
      </div>

      {/* 피드백 */}
      {feedback && (
        <div
          className={`rounded-lg p-4 text-center font-semibold ${
            feedback.type === 'success'
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-red-100 text-red-700 border-2 border-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
