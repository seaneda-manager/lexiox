// apps/web/components/reading/SkimGate.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  content: string;
  /** ?쒖옉 ?몃━嫄?(Enter ?먮뒗 踰꾪듉 ?대┃) */
  onUnlockAction: () => void;   // ???대쫫 蹂寃?
  /** ?ㅽ겕濡?諛뺤뒪 ?믪씠(px) */
  height?: number;
};

export default function SkimGate({ content, onUnlockAction, height = 520 }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(false);
  const [progress, setProgress] = useState(0); // 0~100
  const rafRef = useRef<number | null>(null);

  const isHTML = useMemo(() => /<[a-z][\s\S]*>/i.test(content), [content]);
  const paragraphs = useMemo(
    () =>
      isHTML
        ? []
        : content
            .split(/\n{2,}/g)
            .map((s) => s.trim())
            .filter(Boolean),
    [content, isHTML]
  );

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const calc = () => {
      const total = el.scrollHeight;
      const view = el.clientHeight;
      const top = el.scrollTop;
      const pct = Math.min(100, Math.max(0, Math.round(((top + view) / Math.max(1, total)) * 100)));
      setProgress(pct);
      setAtBottom(top + view >= total - 4 || total <= view + 1);
    };

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        calc();
      });
    };

    calc();
    el.addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => calc();
    window.addEventListener('resize', onResize);

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Enter ?ㅻ줈 ?쒖옉 (?섎떒源뚯? ?ㅽ겕濡??꾨즺 ?쒖뿉留?
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!atBottom) return;
      if (e.key === 'Enter') onUnlockAction();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [atBottom, onUnlockAction]);

  return (
    <div className="p-6">
      <h2 className="mb-3 text-xl font-semibold">Skim the passage</h2>
      <p id="skim-instruction" className="mb-3 text-sm text-neutral-500">
        ?꾨옒 ?곸뿭???앷퉴吏 ?ㅽ겕濡ㅽ븯硫??쒖옉 踰꾪듉???쒖꽦?붾맗?덈떎.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(300px,420px)_1fr]">
        {/* 蹂몃Ц ?ㅽ겕濡?諛뺤뒪 */}
        <div
          ref={boxRef}
          className="overflow-y-auto rounded-2xl border p-4"
          style={{ height }}
          aria-labelledby="skim-instruction"
          role="region"
        >
          {/* 吏꾪뻾 留됰? */}
          <div className="mb-3 h-1 w-full overflow-hidden rounded bg-neutral-200/60">
            <div
              className="h-full bg-neutral-900 transition-[width]"
              style={{ width: `${progress}%` }}
              aria-hidden
            />
          </div>

          {isHTML ? (
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <div className="prose max-w-none">
              {paragraphs.map((p, i) => (
                <p key={i} className="mb-4">
                  {p}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* ?곗륫 ?⑤꼸 */}
        <div className="flex items-start">
          <button
            type="button"
            onClick={onUnlockAction}
            disabled={!atBottom}
            className={[
              'rounded-xl border px-4 py-2',
              atBottom ? 'bg-black text-white hover:opacity-90' : 'cursor-not-allowed opacity-50',
            ].join(' ')}
            aria-disabled={!atBottom}
            aria-describedby="skim-instruction"
          >
            {atBottom ? 'Start Questions (Enter)' : `Scroll to Continue 쨌 ${progress}%`}
          </button>
        </div>
      </div>
    </div>
  );
}




