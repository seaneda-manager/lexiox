'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export type GuideStep = {
  icon: string;
  title: string;
  desc: string;
};

export type SectionProgress = {
  done: number;
  total: number;
  unit: string; // e.g. "챕터", "드릴", "단어"
};

export type NextAction = {
  label: string;
  href: string;
};

type Props = {
  storageKey: string;
  color: 'emerald' | 'indigo' | 'sky' | 'amber';
  icon: string;
  title: string;
  tagline: string;
  outcomes: string[];       // "이 과정을 마치면 ___할 수 있다"
  steps: GuideStep[];       // how-to guide
  progress?: SectionProgress;
  nextAction?: NextAction;
};

const COLORS = {
  emerald: {
    wrap:      'border-emerald-200 bg-emerald-50',
    badge:     'text-emerald-700 bg-emerald-100',
    btn:       'border-emerald-300 text-emerald-600 hover:bg-emerald-100',
    panel:     'border-emerald-200 bg-white',
    bar:       'bg-emerald-400',
    barBg:     'bg-emerald-100',
    cta:       'bg-emerald-600 hover:bg-emerald-700 text-white',
    check:     'text-emerald-500',
    dot:       'bg-emerald-400',
  },
  indigo: {
    wrap:      'border-indigo-200 bg-indigo-50',
    badge:     'text-indigo-700 bg-indigo-100',
    btn:       'border-indigo-300 text-indigo-600 hover:bg-indigo-100',
    panel:     'border-indigo-200 bg-white',
    bar:       'bg-indigo-400',
    barBg:     'bg-indigo-100',
    cta:       'bg-indigo-600 hover:bg-indigo-700 text-white',
    check:     'text-indigo-500',
    dot:       'bg-indigo-400',
  },
  sky: {
    wrap:      'border-sky-200 bg-sky-50',
    badge:     'text-sky-700 bg-sky-100',
    btn:       'border-sky-300 text-sky-600 hover:bg-sky-100',
    panel:     'border-sky-200 bg-white',
    bar:       'bg-sky-400',
    barBg:     'bg-sky-100',
    cta:       'bg-sky-600 hover:bg-sky-700 text-white',
    check:     'text-sky-500',
    dot:       'bg-sky-400',
  },
  amber: {
    wrap:      'border-amber-200 bg-amber-50',
    badge:     'text-amber-700 bg-amber-100',
    btn:       'border-amber-300 text-amber-600 hover:bg-amber-100',
    panel:     'border-amber-200 bg-white',
    bar:       'bg-amber-400',
    barBg:     'bg-amber-100',
    cta:       'bg-amber-600 hover:bg-amber-700 text-white',
    check:     'text-amber-500',
    dot:       'bg-amber-400',
  },
};

export default function SectionGuide({
  storageKey, color, icon, title, tagline,
  outcomes, steps, progress, nextAction,
}: Props) {
  const c = COLORS[color] || COLORS.emerald;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem(storageKey);
    if (!seen) setOpen(true);
  }, [storageKey]);

  function dismiss() {
    localStorage.setItem(storageKey, '1');
    setOpen(false);
  }

  const pct = progress && progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : null;

  if (!mounted) {
    // SSR placeholder — same height as compact bar to avoid layout shift
    return <div className={`rounded-2xl border ${c.wrap} h-12 mb-6`} />;
  }

  return (
    <div className={`rounded-2xl border ${c.wrap} overflow-hidden mb-6`}>

      {/* ── compact bar (always visible) ────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
          {icon} {title}
        </span>

        <p className="flex-1 text-xs text-neutral-500 min-w-0 truncate hidden sm:block">
          {tagline}
        </p>

        {/* progress pill */}
        {pct !== null && (
          <div className="flex items-center gap-2 shrink-0">
            <div className={`h-1.5 w-20 rounded-full ${c.barBg}`}>
              <div
                className={`h-1.5 rounded-full ${c.bar} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-neutral-500 whitespace-nowrap">
              {progress!.done}/{progress!.total} {progress!.unit}
            </span>
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className={`shrink-0 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border transition ${c.btn}`}
          aria-label={open ? '가이드 닫기' : '학습 가이드 보기'}
        >
          {open ? '×' : '?'}
        </button>
      </div>

      {/* ── expandable panel ─────────────────────────────────── */}
      {open && (
        <div className={`border-t ${c.panel} p-5 space-y-5`}>

          {/* learning outcomes */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
              이 과정을 마치면
            </p>
            <ul className="space-y-1.5">
              {outcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`mt-0.5 text-sm font-bold ${c.check}`}>✓</span>
                  <span className="text-xs text-neutral-700">{o}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* how-to steps */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
              이렇게 사용하세요
            </p>
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-base leading-none mt-0.5">{step.icon}</span>
                  <div>
                    <span className="text-xs font-semibold text-neutral-700">{step.title}</span>
                    <span className="text-[11px] text-neutral-500"> — {step.desc}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* CTA + dismiss */}
          <div className="flex items-center justify-between pt-1">
            {nextAction ? (
              <Link
                href={nextAction.href}
                className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${c.cta}`}
              >
                {nextAction.label} →
              </Link>
            ) : <div />}
            <button
              onClick={dismiss}
              className="text-[11px] text-neutral-400 hover:text-neutral-600 transition"
            >
              다음부터 숨기기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
