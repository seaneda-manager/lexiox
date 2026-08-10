'use client';

import { useState, type ReactNode } from 'react';

export type ProgramTab = {
  id: string;
  label: string;
  badge?: number;
  content: ReactNode;
};

// 학생이 프로그램 하나만 배정받는 게 보통이지만 여러 개(TOEFL + Voca 등)를 동시에
// 배정받는 경우도 있어 탭으로 분리한다. 데이터가 없는 프로그램 탭은 호출부에서 아예 넘기지 않는다.
export default function ProgramTabs({ tabs }: { tabs: ProgramTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  if (tabs.length === 0) return null;

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={`relative -mb-px flex items-center gap-1.5 rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-gray-200 bg-white text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
              {!!tab.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div>{activeTab.content}</div>
    </div>
  );
}
