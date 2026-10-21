import VoiceLabClient from './VoiceLabClient';

export const dynamic = 'force-dynamic';

export default function VoiceLabPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-gray-400">Admin · 강의 음성</div>
        <h1 className="text-xl font-bold text-gray-900">음성 시험대</h1>
        <p className="text-xs text-gray-500">
          같은 문장을 "한 번에 읽기"와 "영어 구간 따로 읽기"로 만들어 비교해 듣고, 가장 자연스러운 모델과 방식을 고르세요. 결과는 저장되지 않습니다
          (ElevenLabs 사용량은 소모됩니다).
        </p>
      </header>
      <VoiceLabClient />
    </main>
  );
}
