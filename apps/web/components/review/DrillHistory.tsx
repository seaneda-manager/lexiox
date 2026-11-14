// 리뷰 화면의 "Drill 기록" 카드: 최근 시도, 자주 틀리는 항목, 다시 외울 단어. 학생과 선생님이 같은 카드를 본다.
import type { DrillAttempt } from "@/lib/reviewAttempts";

const when = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function DrillHistory({ attempts }: { attempts?: DrillAttempt[] | null }) {
  const list = Array.isArray(attempts) ? attempts : [];
  if (list.length === 0) return null;

  const recent = [...list].reverse().slice(0, 5);

  // 문법/문형 태그별 누적 정답률 → 정답률이 낮은 순 (2문항 이상 나온 것만)
  const agg = new Map<string, { ok: number; n: number }>();
  for (const a of list) {
    if (a.kind !== "drill") continue;
    for (const t of a.byTag) {
      const cur = agg.get(t.tag) ?? { ok: 0, n: 0 };
      cur.ok += t.ok;
      cur.n += t.n;
      agg.set(t.tag, cur);
    }
  }
  const weak = [...agg.entries()]
    .filter(([, v]) => v.n >= 2 && v.ok < v.n)
    .sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)
    .slice(0, 3);

  const lastVocab = [...list].reverse().find((a) => a.kind === "vocab" && (a.missed?.length ?? 0) > 0);

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-900">Drill 기록</h3>

      <ul className="space-y-1.5">
        {recent.map((a) => {
          const pct = a.total > 0 ? Math.round((a.correct / a.total) * 100) : 0;
          return (
            <li key={a.id} className="flex items-center gap-3 text-xs">
              <span className="w-24 shrink-0 text-slate-500">{when(a.at)}</span>
              <span className="w-14 shrink-0 font-semibold text-slate-700">{a.kind === "vocab" ? "단어시험" : "Drill"}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right font-bold tabular-nums text-slate-800">
                {a.correct}/{a.total}
              </span>
            </li>
          );
        })}
      </ul>

      {weak.length > 0 && (
        <div className="rounded-lg bg-rose-50 p-3">
          <p className="mb-1 text-[11px] font-bold text-rose-800">자주 틀리는 항목</p>
          <ul className="flex flex-wrap gap-2">
            {weak.map(([tag, v]) => (
              <li key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                {tag} <span className="tabular-nums text-rose-400">{v.ok}/{v.n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lastVocab && (
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="mb-1 text-[11px] font-bold text-amber-800">다시 외울 표현 (최근 단어시험)</p>
          <p className="text-xs leading-relaxed text-amber-900">{lastVocab.missed!.join(" · ")}</p>
        </div>
      )}
    </section>
  );
}
