'use client';

import AudioScriptSync from '@/components/listening/AudioScriptSync';
import type { ScriptSegment } from '@/models/listening';

// Demo: Academic Lecture script
const demoScriptSegments: ScriptSegment[] = [
  {
    id: 'SEG_001',
    speaker: 'professor',
    text: 'Good morning, everyone.',
    startTime: 0.5,
    endTime: 1.5,
    words: [
      { word: 'Good', startTime: 0.5, endTime: 0.8 },
      { word: 'morning', startTime: 0.9, endTime: 1.2 },
      { word: 'everyone', startTime: 1.3, endTime: 1.5 },
    ],
  },
  {
    id: 'SEG_002',
    speaker: 'professor',
    text: "Today we're going to discuss the phenomenon of bioluminescence, which is the ability of living organisms to produce light.",
    startTime: 2.0,
    endTime: 8.5,
    words: [
      { word: 'Today', startTime: 2.0, endTime: 2.3 },
      { word: "we're", startTime: 2.4, endTime: 2.7 },
      { word: 'going', startTime: 2.8, endTime: 3.0 },
      { word: 'to', startTime: 3.1, endTime: 3.2 },
      { word: 'discuss', startTime: 3.3, endTime: 3.6 },
      { word: 'the', startTime: 3.7, endTime: 3.9 },
      { word: 'phenomenon', startTime: 4.0, endTime: 4.4 },
      { word: 'of', startTime: 4.5, endTime: 4.7 },
      { word: 'bioluminescence', startTime: 4.8, endTime: 5.6 },
      { word: 'which', startTime: 5.7, endTime: 6.0 },
      { word: 'is', startTime: 6.1, endTime: 6.3 },
      { word: 'the', startTime: 6.4, endTime: 6.6 },
      { word: 'ability', startTime: 6.7, endTime: 7.1 },
      { word: 'of', startTime: 7.2, endTime: 7.4 },
      { word: 'living', startTime: 7.5, endTime: 8.0 },
      { word: 'organisms', startTime: 8.1, endTime: 8.5 },
      { word: 'to', startTime: 8.6, endTime: 8.7 },
      { word: 'produce', startTime: 8.8, endTime: 9.0 },
      { word: 'light', startTime: 9.1, endTime: 9.3 },
    ],
  },
  {
    id: 'SEG_003',
    speaker: 'professor',
    text: 'However, this phenomenon is not as rare as you might think.',
    startTime: 10.0,
    endTime: 13.5,
    words: [
      { word: 'However', startTime: 10.0, endTime: 10.4 },
      { word: 'this', startTime: 10.5, endTime: 10.7 },
      { word: 'phenomenon', startTime: 10.8, endTime: 11.2 },
      { word: 'is', startTime: 11.3, endTime: 11.5 },
      { word: 'not', startTime: 11.6, endTime: 11.9 },
      { word: 'as', startTime: 12.0, endTime: 12.2 },
      { word: 'rare', startTime: 12.3, endTime: 12.7 },
      { word: 'as', startTime: 12.8, endTime: 13.0 },
      { word: 'you', startTime: 13.1, endTime: 13.2 },
      { word: 'might', startTime: 13.3, endTime: 13.4 },
      { word: 'think', startTime: 13.5, endTime: 13.5 },
    ],
  },
];

export default function ListeningStudyScriptPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Listening Study with Script Sync</h1>
        <p className="text-sm text-gray-600">
          오디오와 스크립트를 동기화하며 학습합니다. 단어를 클릭하면 그 부분부터 재생됩니다.
        </p>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <h2 className="font-semibold text-indigo-900">Demo: Bioluminescence Lecture</h2>
        <p className="mt-1 text-sm text-indigo-800">
          이 페이지는 AudioScriptSync 컴포넌트의 프로토타입 테스트입니다.
        </p>
      </div>

      {/* AudioScriptSync 컴포넌트 */}
      <AudioScriptSync
        audioUrl="/audio/dev/lecture-sample.mp3"
        scriptSegments={demoScriptSegments}
        onReady={() => console.log('AudioScriptSync ready!')}
      />

      {/* 기능 설명 */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div>
          <h3 className="font-semibold text-gray-900">기능</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
            <li>▶ 버튼으로 오디오 재생/일시정지</li>
            <li>단어를 클릭하면 그 위치로 점프하며 재생</li>
            <li>현재 재생 중인 구간이 파란색으로 강조됨</li>
            <li>발화자별로 다른 색상 (교수: 파란색, 학생: 초록색, 안내: 주황색)</li>
            <li>타임스탐프 마커 표시</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900">다음 단계</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
            <li>Study 모드에 AudioScriptSync 통합</li>
            <li>Admin에서 STT로 자동 타임스탐프 생성</li>
            <li>Review 모드에 trap metadata 표시</li>
            <li>Practice/Drill 모드에서 선택적으로 표시</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
