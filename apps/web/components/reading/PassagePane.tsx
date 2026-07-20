// apps/web/components/reading/PassagePane.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { targetFromMeta } from './metaAdapter';

type QLike = {
  id?: string | number;
  type?: string;
  meta?: any;
};

type TargetShape = {
  mode?: 'paragraph' | 'insertion' | string;
  paragraph_index?: number;
  arrow?: boolean;
  anchors?: Array<string | number>;
};

type Props = {
  content: string;
  q: QLike;
};

export default function PassagePane({ content, q }: Props) {
  const target = useMemo<TargetShape | undefined>(() => safeTarget(targetFromMeta(q)), [q]);
  const isHTML = /<[a-z][\s\S]*>/i.test(content);

  // Plain text paragraphs
  const paragraphs = useMemo(() => {
    if (isHTML) return [] as string[];
    return content
      .split(/\n{2,}/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [content, isHTML]);

  // Scroll to target paragraph
  const targetRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [target?.paragraph_index]);

  if (isHTML) {
    // HTML mode: render content; show anchors if insertion mode
    return (
      <div className="prose max-w-none h-full overflow-y-auto pr-4">
        {target?.mode === 'insertion' && Array.isArray(target?.anchors) && (
          <div className="mb-3 flex flex-wrap gap-2">
            {target.anchors.map((a) => (
              <span key={String(a)} className="inline-block rounded border px-2 py-1 text-xs">
                #{String(a)}
              </span>
            ))}
          </div>
        )}
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    );
  }

  // Plain text mode
  return (
    <div className="prose max-w-none h-full overflow-y-auto pr-4">
      {paragraphs.map((p, i) => {
        const isTarget = target?.mode === 'paragraph' && target?.paragraph_index === i;

        const isInsertionRow =
          target?.mode === 'insertion' &&
          target?.paragraph_index === i &&
          Array.isArray(target?.anchors);

        return (
          <div
            key={i}
            ref={isTarget ? targetRef : null}
            className="relative my-4"
          >
            {isTarget && target?.arrow && (
              <div className="absolute -left-6 top-1 select-none" aria-hidden>
                {'➤'}
              </div>
            )}

            <span className={isTarget ? 'bg-yellow-200/60 dark:bg-sky-900/50' : ''}>
              {p}
            </span>

            {isInsertionRow && (
              <div className="mt-2 flex flex-wrap gap-2">
                {target.anchors!.map((a) => (
                  <span
                    key={String(a)}
                    className="inline-block rounded border px-2 py-1 text-xs"
                  >
                    #{String(a)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Normalize whatever metaAdapter returns into a safe/optional shape */
function safeTarget(t: any): TargetShape | undefined {
  if (!t || typeof t !== 'object') return undefined;
  const mode = typeof t.mode === 'string' ? t.mode : undefined;
  const paragraph_index =
    Number.isInteger(t.paragraph_index) && t.paragraph_index >= 0
      ? (t.paragraph_index as number)
      : undefined;
  const anchors = Array.isArray(t.anchors) ? t.anchors : undefined;
  const arrow = !!t.arrow;
  return { mode, paragraph_index, anchors, arrow };
}


