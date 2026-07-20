'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import SectionGuide from '@/app/components/SectionGuide';

export default function WritingHubPage() {
  const [activeDropdown, setActiveDropdown] = useState<'study' | 'test' | null>(null);

  const studyModules = [
    { id: 1, title: 'Task 1: Build a Sentence', href: '/updated-writing/study' },
    { id: 2, title: 'Task 2: Integrated Writing', href: '/updated-writing/study' },
    { id: 3, title: 'Task 3: Academic Discussion', href: '/updated-writing/study' },
    { id: 4, title: 'Writing Strategies', href: '/updated-writing/study' },
  ];

  const testPractices = [
    { id: 1, title: 'Practice Test 1', difficulty: 'Medium', time: '18 min', href: '/updated-writing/test/1' },
    { id: 2, title: 'Practice Test 2', difficulty: 'Hard', time: '25 min', comingSoon: true },
    { id: 3, title: 'Practice Test 3', difficulty: 'Medium', time: '25 min', comingSoon: true },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Writing 2026</h1>

      <SectionGuide
        storageKey="guide-seen-updated-writing"
        color="indigo"
        icon="✍️"
        title="라이팅"
        tagline="Integrated Writing과 Academic Discussion으로 고득점 에세이를 작성합니다."
        outcomes={[
          'Integrated Task에서 읽기·듣기 정보를 효과적으로 통합하여 작성할 수 있다',
          'Academic Discussion에서 학술적 토론에 자연스럽게 참여할 수 있다',
          '25분 내에 목표 단어 수(200-300)를 달성하는 시간 관리 능력을 갖춘다',
        ]}
        steps={[
          { icon: '📚', title: 'Study Mode', desc: '라이팅 기초 전략과 Task별 접근법을 학습합니다.' },
          { icon: '✍️', title: 'Test Mode', desc: '실전과 동일한 환경에서 모의고사를 응시합니다.' },
          { icon: '📊', title: 'Review Mode', desc: 'AI 첨삭으로 피드백을 받고 개선점을 학습합니다.' },
        ]}
        nextAction={{ label: 'Test 시작', href: '/updated-writing/test' }}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {/* Study Mode with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'study' ? null : 'study')}
            className="w-full rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-indigo-50 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl mb-2">📚</div>
                <div className="text-sm font-semibold">Study Mode</div>
                <div className="mt-1 text-xs text-gray-500">
                  라이팅 전략과 Task별 기초를 익힙니다.
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition ${activeDropdown === 'study' ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {activeDropdown === 'study' && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
              {studyModules.map((module) => (
                <Link
                  key={module.id}
                  href={module.href}
                  className="block px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 border-b last:border-b-0"
                >
                  {module.title}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Test Mode with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setActiveDropdown(activeDropdown === 'test' ? null : 'test')}
            className="w-full rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-indigo-50 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl mb-2">✍️</div>
                <div className="text-sm font-semibold">Test Mode</div>
                <div className="mt-1 text-xs text-gray-500">
                  실전 모의고사를 25분 내에 응시합니다.
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition ${activeDropdown === 'test' ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {activeDropdown === 'test' && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
              {testPractices.map((test) => (
                <Link
                  key={test.id}
                  href={test.comingSoon ? '#' : test.href}
                  onClick={(e) => test.comingSoon && e.preventDefault()}
                  className={`block px-4 py-3 text-sm border-b last:border-b-0 ${
                    test.comingSoon
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-indigo-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{test.title}</span>
                    {test.comingSoon && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Soon</span>}
                  </div>
                  {!test.comingSoon && <div className="text-xs text-gray-500 mt-1">{test.difficulty} • {test.time}</div>}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Review Mode */}
        <Link
          href="/student/review"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-indigo-50 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm font-semibold">Review Mode</div>
          <div className="mt-1 text-xs text-gray-500">
            AI 첨삭으로 피드백을 받고 개선합니다.
          </div>
        </Link>
      </div>

      {/* 고득점 10계명 */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-2">
        <p className="text-xs font-semibold text-indigo-700 uppercase">🏆 Writing 고득점 10계명</p>
        <ol className="text-xs text-indigo-900 space-y-1 list-inside list-decimal">
          <li><strong>Task 1은 무조건 만점.</strong> 주어·동사·시제 확인 후 제출하세요.</li>
          <li><strong>Task 2 조건 3개는 무조건 다 써라.</strong> 체크리스트로 하나씩 확인하세요.</li>
          <li><strong>이메일 인사말은 공식 형식.</strong> "Dear Professor/Housing Administration"으로 시작, "Sincerely/Best regards"로 끝내세요.</li>
          <li><strong>Task 3 첫 문장은 주제 요약.</strong> 교수 주제 + Rachel/Mike 의견 2가지를 먼저 정리하고 나의 입장을 밝혀세요.</li>
          <li><strong>참신한 아이디어는 버려라.</strong> Rachel이나 Mike 의견에 구체적 예시만 더하세요.</li>
          <li><strong>단어 수는 정확히.</strong> Task 2: 100~140 단어, Task 3: 120~150 단어로 유지하세요.</li>
          <li><strong>본문 단어는 다르게 표현.</strong> 같은 단어 반복 대신 동의어나 유사 표현을 사용하세요.</li>
          <li><strong>짧은 문장은 연결하세요.</strong> Although, Consequently, which means 등으로 문장을 길게 만드세요.</li>
          <li><strong>연결어를 아끼지 마라.</strong> For instance, On the other hand, Therefore 등을 적재적소에 넣으세요.</li>
          <li><strong>마지막 30초는 검토에만 써라.</strong> 주어·동사 매칭, 3인칭 -s, 스펠링 오타를 점검하세요.</li>
        </ol>
      </div>
    </div>
  );
}
