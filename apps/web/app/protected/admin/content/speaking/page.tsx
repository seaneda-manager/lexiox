'use client';

import Link from 'next/link';

export default function AdminContentSpeakingPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-8">Speaking 콘텐츠 관리</h1>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Link
          href="/admin/content/speaking/task1-builder"
          className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <div className="text-2xl mb-2">📝</div>
          <div className="font-bold text-lg">Task 1 스크립트 빌더</div>
          <div className="text-sm opacity-90">문장 입력 → 음성 생성 → 저장</div>
        </Link>

        <Link
          href="/admin/content/speaking/generate-audio"
          className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <div className="text-2xl mb-2">🎵</div>
          <div className="font-bold text-lg">음성 생성 도구</div>
          <div className="text-sm opacity-90">개별 오디오 생성</div>
        </Link>
      </div>
    </main>
  );
}
