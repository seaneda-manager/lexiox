"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GameThumb from "@/components/workout/GameThumb";
import { GAME_GROUPS, playHref } from "@/lib/workout/gameCatalog";
import { usePerk } from "@/lib/workout/usePerk";
import PerkLock from "@/components/workout/PerkLock";
import { loadMyAssignments, type MyAssignment } from "@/lib/workout/assignments";

const MODE_LABEL: Record<string, string> = { "en-en": "영영", "ko-en": "한영", "en-ko": "영한", spelling: "스펠링" };

function styleName(style: string): string {
  for (const g of GAME_GROUPS) {
    const m = g.modes.find((x) => x.style === style);
    if (m) return `${g.subtitle} · ${m.label}`;
  }
  return style;
}

/** 선생님이 내준 게임 — 시간 잠금과 상관없이 열린다(시간 차감 없음) */
function AssignedGames({ list }: { list: MyAssignment[] }) {
  if (list.length === 0) return null;
  return (
    <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <h2 className="font-bold text-emerald-900">선생님이 내준 게임</h2>
      <p className="text-xs text-emerald-700 mt-0.5">게임 시간이 차감되지 않아요. 목표 판 수를 채우면 완료!</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {list.map((a) => (
          <li key={a.id} className="rounded-xl bg-white border border-emerald-100 p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 truncate">{styleName(a.style)}</div>
              <div className="text-xs text-slate-500">
                {a.setLabel ?? "단어장"} · {MODE_LABEL[a.mode] ?? a.mode} · {a.plays}/{a.targetPlays}판{a.dueDate ? ` · 기한 ${a.dueDate}` : ""}
              </div>
              {a.note && <div className="text-xs text-slate-400 truncate">“{a.note}”</div>}
            </div>
            {a.done ? (
              <span className="rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1">완료 ✓</span>
            ) : (
              <Link href={`${playHref(a.style)}&assignment=${a.id}`} className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-1.5">
                ▶ {a.plays > 0 ? "이어서" : "시작"}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function WorkoutGamesPage() {
  const perk = usePerk(); // 조회만(차감은 플레이 페이지에서)
  const [assigned, setAssigned] = useState<MyAssignment[]>([]);
  useEffect(() => {
    let alive = true;
    loadMyAssignments().then((l) => alive && setAssigned(l));
    return () => {
      alive = false;
    };
  }, []);
  const playable = assigned.filter((a) => !a.done);

  if (perk.state === "loading") return <main className="w-full p-6 text-slate-500 text-sm">게임 시간을 확인하는 중...</main>;
  const locked = perk.state === "locked" || perk.state === "login";
  // 배정받은 게임이 있거나 시간이 잠겼으면 나머지 게임은 흐리게(눌러도 체험판 또는 일반 플레이)
  const assignedStyles = new Set(playable.map((a) => a.style));
  const dimOthers = locked || (assignedStyles.size > 0 && !perk.unlimited);

  return (
    <main className="w-full p-4 md:p-6">
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

      {locked && (
        <div className="mb-6">
          <PerkLock perk={perk} />
          <p className="mt-2 text-sm text-slate-500">아래 게임은 샘플 단어 10개로 한 판 <b>체험</b>해 볼 수 있어요.</p>
        </div>
      )}
      <AssignedGames list={assigned.slice(0, 8)} />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {GAME_GROUPS.map((g) => {
          const isAssigned = g.modes.some((m) => assignedStyles.has(m.style));
          const dim = dimOthers && !isAssigned;
          const href = (st: (typeof g.modes)[number]["style"]) => (locked ? `${playHref(st)}&demo=1` : playHref(st));
          return (
          <article key={g.id} className={`group rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition overflow-hidden flex flex-col transition ${dim ? "opacity-50 grayscale hover:opacity-100 hover:grayscale-0" : ""} ${isAssigned && dimOthers ? "ring-2 ring-emerald-400" : ""}`}>
            <Link href={href(g.modes[0].style)} className="block relative aspect-video bg-slate-900" aria-label={`${g.name} 시작`}>
              <GameThumb kind={g.thumb} />
              <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
              <span className="absolute left-3 bottom-2 text-white font-extrabold tracking-wide text-lg drop-shadow">{g.name}</span>
              <span className="absolute right-3 bottom-3 rounded-full bg-amber-400 text-slate-900 text-xs font-bold px-3 py-1 opacity-0 group-hover:opacity-100 transition">
                {locked ? "▶ 체험" : "▶ 플레이"}
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
                    href={href(m.style)}
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
          );
        })}
      </div>
    </main>
  );
}
