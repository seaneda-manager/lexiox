// apps/web/components/HomeSelector.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Section = 'reading' | 'listening' | 'speaking' | 'writing';
type Mode = 'study' | 'test';

const SECTIONS: { id: Section; label: string; desc: string }[] = [
  { id: 'reading', label: 'Reading', desc: '지문/문항 러너' },
  { id: 'listening', label: 'Listening', desc: '오디오/문항 러너' },
  { id: 'speaking', label: 'Speaking', desc: '말하기 연습/데모' },
  { id: 'writing', label: 'Writing', desc: '쓰기 연습/데모' },
];

export default function HomeSelector() {
  const router = useRouter();
  const [section, setSection] = useState<Section>('reading');
  const [mode, setMode] = useState<Mode>('study');
  const [tpoSet, setTpoSet] = useState<'tpo1' | 'tpo2'>('tpo1');

  const go = (path: string) => router.push(path);

  const handleStart = () => {
    if (mode === 'study') {
      if (section === 'reading') go('/updated-reading/study');
      else if (section === 'listening') go('/updated-listening/study');
      else if (section === 'speaking') go('/speaking-2026/study');
      else if (section === 'writing') go('/writing-2026/study');
      else alert('알 수 없는 섹션입니다.');
      return;
    }

    if (section === 'reading') go('/updated-reading/test');
    else if (section === 'listening') go('/updated-listening/test');
    else if (section === 'speaking') alert('Speaking test UI는 준비 중입니다.');
    else if (section === 'writing') go('/writing-2026/test');
    else alert('알 수 없는 섹션입니다.');
  };

  const handleTeacherMode = () => {
    if (section === 'reading') go('/teacher/reading');
    else if (section === 'listening') go('/teacher/listening');
    else if (section === 'speaking') alert('Speaking Teacher UI는 준비 중입니다.');
    else if (section === 'writing') alert('Writing Teacher UI는 준비 중입니다.');
    else alert('알 수 없는 섹션입니다.');
  };

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            TOEFL Demo
          </div>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900">
            Demo Launcher
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            관리자 홈이 아니라 데모 실행용 패널입니다. 섹션과 모드를 빠르게 고른 뒤 러너를 테스트하거나,
            학생 과제 페이지로 바로 들어갈 수 있습니다.
          </p>
        </div>

        <div className="rounded-xl border bg-neutral-50 px-3 py-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            TPO Set
          </div>
          <select
            className="min-w-[180px] rounded-lg border bg-white px-3 py-2 text-sm"
            value={tpoSet}
            onChange={(e) => setTpoSet(e.target.value as 'tpo1' | 'tpo2')}
          >
            <option value="tpo1">TPO SET 1 (Demo)</option>
            <option value="tpo2">TPO SET 2 (Demo)</option>
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-semibold text-neutral-900">Section</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SECTIONS.map((s) => {
                const active = section === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSection(s.id)}
                    className={[
                      'rounded-2xl border p-4 text-left transition',
                      active
                        ? 'border-emerald-600 bg-emerald-50'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-neutral-900">{s.label}</div>
                      <span
                        className={[
                          'h-2.5 w-2.5 rounded-full',
                          active ? 'bg-emerald-600' : 'bg-neutral-300',
                        ].join(' ')}
                      />
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-neutral-900">Mode</div>
            <div className="inline-flex rounded-xl border bg-neutral-50 p-1">
              <button
                type="button"
                onClick={() => setMode('study')}
                className={[
                  'rounded-lg px-4 py-2 text-sm font-medium transition',
                  mode === 'study'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-700 hover:bg-white',
                ].join(' ')}
              >
                Study
              </button>
              <button
                type="button"
                onClick={() => setMode('test')}
                className={[
                  'rounded-lg px-4 py-2 text-sm font-medium transition',
                  mode === 'test'
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-700 hover:bg-white',
                ].join(' ')}
              >
                Test
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border bg-neutral-50 p-4">
          <div className="text-sm font-semibold text-neutral-900">Current Selection</div>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2">
              <span className="text-neutral-500">Section</span>
              <span className="font-medium text-neutral-900">
                {SECTIONS.find((s) => s.id === section)?.label}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2">
              <span className="text-neutral-500">Mode</span>
              <span className="font-medium text-neutral-900">{mode}</span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2">
              <span className="text-neutral-500">TPO</span>
              <span className="font-medium text-neutral-900">{tpoSet}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => go('/dashboard/tasks')}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Go My Tasks
            </button>

            <button
              type="button"
              onClick={handleStart}
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Start Demo
            </button>

            <button
              type="button"
              onClick={handleTeacherMode}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Start Teacher Mode
            </button>

            <button
              type="button"
              onClick={() => go('/admin')}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Go Admin Home
            </button>

            <button
              type="button"
              onClick={() => go('/admin/naesin')}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
            >
              Go Naesin Hub
            </button>
          </div>

          <p className="mt-4 text-xs leading-5 text-neutral-500">
            Legacy 버전은 왼쪽 사이드바의 Legacy 메뉴에서 들어갈 수 있습니다.
          </p>
        </aside>
      </div>
    </section>
  );
}
