"use client";

import Link from "next/link";
import GameThumb from "@/components/workout/GameThumb";
import { GAME_GROUPS, playHref } from "@/lib/workout/gameCatalog";
import { usePerk } from "@/lib/workout/usePerk";
import PerkLock from "@/components/workout/PerkLock";

export default function WorkoutGamesPage() {
  const perk = usePerk(); // 조회만(차감은 플레이 페이지에서)

  if (perk.state === "loading") return <main className="max-w-6xl mx-auto p-6 text-slate-500 text-sm">게임 시간을 확인하는 중...</main>;
  if (perk.state === "locked" || perk.state === "login") {
    return (
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <PerkLock perk={perk} />
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">단어 게임</h1>
          {perk.unlimited ? (
            <span className="rounded-full bg-slate-200 text-slate-700 text-xs px-3 py-1">{perk.dev ? "개발 환경 · 잠금 우회" : "직원 미리보기 · 시간 제한 없음"}</span>
          ) : (
            <span className="rounded-full bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1">오늘 남은 게임 시간 {perk.balance}분</span>
          )}
        </div>
        <p className="text-slate-500 mt-1">게임을 고르고, 안에서 모드를 선택하세요. 문제 방식(영영 · 한영 · 영한 · 스펠링)은 게임 안에서 바꿀 수 있어요.</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_GROUPS.map((g) => (
          <article key={g.id} className="group rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden flex flex-col">
            <Link href={playHref(g.modes[0].style)} className="block relative aspect-video bg-slate-900" aria-label={`${g.name} 시작`}>
              <GameThumb kind={g.thumb} />
              <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
              <span className="absolute left-3 bottom-2 text-white font-extrabold tracking-wide text-lg drop-shadow">{g.name}</span>
              <span className="absolute right-3 bottom-3 rounded-full bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1 opacity-0 group-hover:opacity-100 transition">
                ▶ 플레이
              </span>
            </Link>

            <div className="p-4 flex flex-col gap-3 flex-1">
              <div>
                <h2 className="font-bold text-slate-900">{g.subtitle}</h2>
                <p className="text-sm text-slate-600 mt-0.5">{g.tagline}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {g.modes.map((m) => (
                  <Link
                    key={m.style}
                    href={playHref(m.style)}
                    title={m.desc}
                    className="rounded-full border border-slate-300 bg-slate-50 hover:bg-amber-100 hover:border-amber-300 text-slate-800 text-sm font-semibold px-3 py-1.5 transition"
                  >
                    {m.label}
                  </Link>
                ))}
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">{g.controls}</p>

              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {g.platforms.map((p) => (
                  <span key={p} className="rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium px-2 py-0.5">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
