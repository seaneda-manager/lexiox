import type { AnnotatedSentence } from '@/lib/middle-naesin/summaryAnnotate';

// 주요 표현은 노란 형광펜, 연결어는 파란 밑줄 + 번호로 표시한다.
export function Marked({ a }: { a: AnnotatedSentence }) {
  return (
    <>
      {a.segments.map((s, i) =>
        s.kind === 'plain' ? (
          <span key={i}>{s.text}</span>
        ) : s.kind === 'expr' ? (
          <mark key={i} className="rounded bg-yellow-200 px-0.5 text-neutral-900">
            {s.text}
          </mark>
        ) : (
          <span key={i}>
            <mark className="rounded bg-sky-100 px-0.5 font-semibold text-sky-900 underline decoration-sky-400 decoration-2 underline-offset-2">
              {s.text}
            </mark>
            <sup className="ml-0.5 text-[9px] font-bold text-sky-600">{s.no}</sup>
          </span>
        ),
      )}
    </>
  );
}
