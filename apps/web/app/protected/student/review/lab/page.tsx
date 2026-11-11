import Link from "next/link";

export const dynamic = "force-dynamic";

const ITEMS = [
  { href: "/student/review/lab/reading", title: "Reading", desc: "근거 문장 하이라이트 · 다시 풀기 · 성찰", ready: true, dot: "bg-indigo-500" },
  { href: "#", title: "Listening", desc: "오디오·스크립트 동기화 · 함정 분석", ready: false, dot: "bg-sky-500" },
  { href: "#", title: "Speaking", desc: "내 녹음 vs 모범 · 재녹음", ready: false, dot: "bg-orange-500" },
  { href: "#", title: "Writing", desc: "교정 비교 · 루브릭 · 다시 쓰기", ready: false, dot: "bg-emerald-500" },
];

export default function ReviewLabIndex() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Review Lab</p>
        <h1 className="text-2xl font-bold text-slate-900">복습 화면 시뮬레이션</h1>
        <p className="text-sm text-slate-500">가짜 데이터로 화면 흐름을 먼저 확인하고 다듬는 곳입니다. 아무것도 저장되지 않습니다.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((it) => (
          <Link
            key={it.title}
            href={it.href}
            aria-disabled={!it.ready}
            className={`rounded-2xl border p-5 transition ${
              it.ready ? "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md" : "pointer-events-none border-dashed border-slate-200 bg-slate-50 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><span className={`h-2.5 w-2.5 rounded-full ${it.dot}`} />{it.title}</h2>
              {!it.ready && <span className="text-[10px] font-semibold text-slate-400">준비 중</span>}
            </div>
            <p className="mt-1 text-sm text-slate-500">{it.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
