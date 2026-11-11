'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { splitPassage, maskTarget, type MaskedSegment } from '@/lib/hi-naesin/passageStructure';

export type PassageMask = {
  /** 지문에서 가릴 정답 문장(또는 빈칸 템플릿) */
  target: string;
  /** mask = 문장 전체를 자리표시자로(작문), blank = 빈칸 템플릿으로 교체(빈칸·문법) */
  mode: 'mask' | 'blank';
  label?: string;
};

type Props = {
  passageTitle: string;
  passageText: string;
  passageTranslation: string | null;
  highlightText: string | null;
  highlightType: 'sentence' | 'word' | null;
  /** 해석/작문 문제를 푸는 중엔 번역이 곧 정답이라 토글 자체를 숨긴다 */
  hideTranslationToggle?: boolean;
  /** 현재 문제의 정답이 지문에 그대로 드러나지 않게 가린다 */
  mask?: PassageMask | null;
  /** 단어장에 담긴 표현 — 본문에서 밑줄로 표시 */
  savedTerms?: string[];
  /** 본문에서 단어/구를 드래그(선택)했을 때 */
  onPickTerm?: (term: string, context: string | null) => void;
  /** 선택해도 뜻 조회를 하지 않는 상태(단어 문제 풀이 중) */
  pickDisabledReason?: string | null;
};

type Piece = { text: string; cls?: string };

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightPieces(text: string, highlight: string | null, type: 'sentence' | 'word' | null): Piece[] {
  if (!highlight || !type) return [{ text }];
  const matchStr = highlight.replace(/_{3,}/g, '').trim().slice(0, 40).toLowerCase();
  if (!matchStr) return [{ text }];

  if (type === 'word') {
    const regex = new RegExp(`(${escapeRe(matchStr)})`, 'gi');
    return text.split(regex).filter(Boolean).map((part) =>
      part.toLowerCase() === matchStr ? { text: part, cls: 'rounded bg-amber-200 px-0.5 text-amber-900' } : { text: part },
    );
  }

  const idx = text.toLowerCase().indexOf(matchStr);
  if (idx === -1) return [{ text }];
  const sentStart = Math.max(0, text.lastIndexOf('.', idx - 1) + 1);
  const sentEndRaw = text.indexOf('.', idx + matchStr.length);
  const sentEnd = sentEndRaw === -1 ? text.length : sentEndRaw + 1;
  return [
    { text: text.slice(0, sentStart) },
    { text: text.slice(sentStart, sentEnd), cls: 'rounded bg-sky-100 px-0.5 text-sky-900' },
    { text: text.slice(sentEnd) },
  ].filter((p) => p.text);
}

function Blank({ text }: { text: string }) {
  const parts = text.split(/(_{3,})/);
  return (
    <span className="rounded bg-violet-50 px-0.5 text-violet-900">
      {parts.map((p, i) =>
        /^_{3,}$/.test(p) ? (
          <span key={i} className="mx-0.5 inline-block min-w-[3.5rem] border-b-2 border-violet-400 align-baseline">&nbsp;</span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

/** 한 덩어리 텍스트(제목/주제문/본문)를 가리기 → 하이라이트 → 단어장 밑줄 순으로 렌더 */
function RichText({
  text, mask, highlight, highlightType, savedRe,
}: {
  text: string;
  mask: PassageMask | null | undefined;
  highlight: string | null;
  highlightType: 'sentence' | 'word' | null;
  savedRe: RegExp | null;
}) {
  const segments: MaskedSegment[] = mask ? maskTarget(text, mask.target, mask.mode, mask.label) : [{ kind: 'text', text }];
  const masked = segments.some((s) => s.kind !== 'text');

  return (
    <>
      {segments.map((seg, si) => {
        if (seg.kind === 'mask') {
          return (
            <span
              key={si}
              className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-dashed border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
            >
              ✍ {seg.label} <span className="font-normal text-amber-500">(가려짐)</span>
            </span>
          );
        }
        if (seg.kind === 'blank') return <Blank key={si} text={seg.text} />;

        // 가려진 문장이 있으면 그 문서에서는 문장 하이라이트를 하지 않는다(위치 힌트 방지)
        const pieces = highlightPieces(seg.text, masked ? null : highlight, masked ? null : highlightType);
        return pieces.map((pc, pi) => {
          const parts = savedRe ? pc.text.split(savedRe) : [pc.text];
          return (
            <span key={`${si}-${pi}`} className={pc.cls}>
              {parts.map((part, k) =>
                savedRe && k % 2 === 1 ? (
                  <span key={k} className="border-b-2 border-amber-400 bg-amber-50/70">{part}</span>
                ) : (
                  <span key={k}>{part}</span>
                ),
              )}
            </span>
          );
        });
      })}
    </>
  );
}

function sentenceAround(body: string, selected: string): string | null {
  const i = body.indexOf(selected);
  if (i < 0) return null;
  const start = Math.max(body.lastIndexOf('. ', i), body.lastIndexOf('\n', i));
  const endDot = body.indexOf('. ', i + selected.length);
  const end = endDot === -1 ? body.length : endDot + 1;
  return body.slice(start < 0 ? 0 : start + 1, end).trim();
}

export default function PassagePanel({
  passageTitle,
  passageText,
  passageTranslation,
  highlightText,
  highlightType,
  hideTranslationToggle = false,
  mask = null,
  savedTerms = [],
  onPickTerm,
  pickDisabledReason = null,
}: Props) {
  const [showTranslation, setShowTranslation] = useState(false);
  const canShowTranslation = !hideTranslationToggle && showTranslation;
  const bodyRef = useRef<HTMLDivElement>(null);

  const parts = useMemo(() => {
    const sp = splitPassage(passageText);
    // 문장이 끝나지 않았는데 줄바꿈된 곳(원문 줄 나눔)은 이어 붙인다. 문장부호로 끝난 줄 뒤의 줄바꿈만 문단으로 유지.
    const body = sp.body.replace(/([^.!?"'”’)\s])[ \t]*\n[ \t]*(?=\S)/g, '$1 ');
    return { ...sp, body };
  }, [passageText]);
  const titleText = parts.title ?? passageTitle;

  const savedRe = useMemo(() => {
    const ts = savedTerms.map((t) => (typeof t === 'string' ? t.trim() : '')).filter((t) => t.length >= 2).sort((a, b) => b.length - a.length);
    if (ts.length === 0) return null;
    return new RegExp(`\\b(${ts.map(escapeRe).join('|')})\\b`, 'gi');
  }, [savedTerms]);

  const handleSelect = useCallback(() => {
    if (!onPickTerm || pickDisabledReason) return;
    window.setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !bodyRef.current) return;
      const range = sel.getRangeAt(0);
      if (!bodyRef.current.contains(range.commonAncestorContainer)) return;
      const raw = sel.toString().replace(/\s+/g, ' ').trim();
      const term = raw.replace(/^[^A-Za-z]+|[^A-Za-z.'’-]+$/g, '').replace(/[.]+$/, '');
      if (term.length < 2 || term.length > 60 || term.split(' ').length > 6 || !/[A-Za-z]/.test(term)) return;
      const context = sentenceAround(bodyRef.current.innerText, raw) ?? sentenceAround(passageText, raw);
      onPickTerm(term, context);
      sel.removeAllRanges();
    }, 10);
  }, [onPickTerm, pickDisabledReason, passageText]);

  const rich = (text: string) => (
    <RichText text={text} mask={mask} highlight={highlightText} highlightType={highlightType} savedRe={savedRe} />
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* ── 제목 ───────────────────────── */}
      <div className="border-b border-neutral-200 bg-neutral-900 px-6 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Title · 제목</div>
        <h2 className="mt-1 text-lg font-bold leading-snug text-white">{rich(titleText)}</h2>
      </div>

      {/* ── 주제문 ─────────────────────── */}
      {parts.topic && (
        <div className="border-b border-indigo-100 bg-indigo-50 px-6 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">Topic · 주제문</div>
          <p className="mt-1 text-sm font-medium leading-7 text-indigo-950">{rich(parts.topic)}</p>
        </div>
      )}

      {/* ── 본문 ───────────────────────── */}
      <div className="px-6 pb-6 pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Passage · 본문</div>
          {passageTranslation &&
            (hideTranslationToggle ? (
              <span className="text-[11px] text-neutral-400">해석/작문 중엔 번역이 숨겨져요</span>
            ) : (
              <button
                type="button"
                onClick={() => setShowTranslation((v) => !v)}
                className="rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
              >
                {showTranslation ? '번역 숨기기' : '번역 보기'}
              </button>
            ))}
        </div>

        <div
          ref={bodyRef}
          onMouseUp={handleSelect}
          onTouchEnd={handleSelect}
          onKeyUp={handleSelect}
          className="whitespace-pre-wrap text-[15px] leading-8 text-neutral-800 selection:bg-amber-200"
        >
          {rich(parts.body)}
        </div>

        {onPickTerm && (
          <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-[11px] leading-relaxed text-neutral-500">
            {pickDisabledReason ?? '💡 모르는 단어나 표현을 드래그(또는 더블클릭)하면 단어장에 자동으로 담기고 뜻·품사가 나와요.'}
          </p>
        )}

        {canShowTranslation && passageTranslation && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-7 text-blue-900">
            {passageTranslation}
          </div>
        )}
      </div>
    </div>
  );
}
