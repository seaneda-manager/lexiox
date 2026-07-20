'use client';

import { useState } from 'react';
import { useGenerateSpeech } from '@/lib/elevenlabs/use-generate-speech';

interface Task1Item {
  id: number;
  sentence: string;
  audioUrl?: string;
  isGenerating?: boolean;
}

export default function Task1BuilderPage() {
  const { generateAudio, loading, error } = useGenerateSpeech();
  const [items, setItems] = useState<Task1Item[]>(
    Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      sentence: '',
    }))
  );

  const handleSentenceChange = (id: number, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, sentence: value } : item
      )
    );
  };

  const handleGenerateOne = async (id: number) => {
    const item = items.find((i) => i.id === id);
    if (!item?.sentence.trim()) return;

    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, isGenerating: true } : i
      )
    );

    const result = await generateAudio(item.sentence);
    if (result) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, audioUrl: result.url, isGenerating: false }
            : i
        )
      );
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, isGenerating: false } : i
        )
      );
    }
  };

  const handleGenerateAll = async () => {
    for (const item of items) {
      if (item.sentence.trim() && !item.audioUrl) {
        await handleGenerateOne(item.id);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  };

  const handleSaveScript = () => {
    const script = items
      .map(
        (item, i) =>
          `// Sentence ${i + 1}\nconst task1Sentence${i + 1} = {\n  sentence: "${item.sentence}",\n  audioUrl: "${item.audioUrl || ''}",\n};\n`
      )
      .join('\n');

    navigator.clipboard.writeText(script);
    alert('스크립트가 클립보드에 복사되었습니다!');
  };

  const allGenerated = items.every((item) => item.audioUrl);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">🎤 Task 1 스크립트 빌더</h1>
      <p className="text-gray-600 mb-8">
        7개 문장을 입력하고 음성을 생성하세요. 모든 준비가 되면 스크립트를 저장합니다.
      </p>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded mb-6">{error}</div>}

      <div className="space-y-6 mb-8">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-6 bg-gray-50">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-lg font-bold text-blue-600 w-8">
                #{item.id}
              </span>
              <textarea
                value={item.sentence}
                onChange={(e) => handleSentenceChange(item.id, e.target.value)}
                placeholder="문장을 입력하세요..."
                className="flex-1 p-3 border rounded-lg resize-none"
                rows={2}
              />
              <button
                onClick={() => handleGenerateOne(item.id)}
                disabled={
                  !item.sentence.trim() || item.isGenerating || loading
                }
                className={`px-4 py-2 rounded font-semibold text-white whitespace-nowrap ${
                  item.isGenerating || loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {item.isGenerating ? '생성중...' : '생성'}
              </button>
            </div>

            {item.audioUrl && (
              <div className="mt-4">
                <audio
                  controls
                  src={item.audioUrl}
                  className="w-full h-10"
                />
                <p className="text-xs text-gray-500 mt-2 break-all">
                  {item.audioUrl}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleGenerateAll}
          disabled={loading || items.every((i) => i.audioUrl)}
          className={`flex-1 px-6 py-3 rounded-lg font-bold text-white ${
            loading || items.every((i) => i.audioUrl)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? '생성 중...' : '비어있는 것 모두 생성'}
        </button>

        <button
          onClick={handleSaveScript}
          disabled={!allGenerated}
          className={`flex-1 px-6 py-3 rounded-lg font-bold text-white ${
            allGenerated
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          📋 스크립트 저장 (복사)
        </button>
      </div>

      {allGenerated && (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-semibold mb-2">✅ 모든 음성이 준비되었습니다!</p>
          <p className="text-sm text-gray-600">
            "스크립트 저장" 버튼을 클릭해서 복사한 후, Task 1 코드에 추가하세요.
          </p>
        </div>
      )}
    </div>
  );
}
