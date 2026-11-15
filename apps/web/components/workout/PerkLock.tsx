"use client";

import Link from "next/link";
import type { PerkInfo } from "@/lib/workout/usePerk";

/** 게임이 잠겨 있을 때 보여 주는 안내: 무엇을 하면 열리는지 + 오늘 적립 현황 */
export default function PerkLock({ perk }: { perk: PerkInfo }) {
  const needLogin = perk.state === "login";
  const timeUp = perk.state === "locked" && perk.usedToday > 0;
  return (
    <div className="max-w-xl mx-auto rounded-3xl bg-slate-900 text-white p-8 text-center shadow-xl">
      <div className="text-5xl mb-3" aria-hidden>
        {timeUp ? "⏰" : "🔒"}
      </div>
      <h2 className="text-xl font-extrabold">
        {needLogin ? "로그인이 필요해요" : timeUp ? "오늘 게임 시간을 다 썼어요" : "게임은 보상이에요"}
      </h2>
      <p className="text-slate-300 mt-2 text-sm leading-relaxed">
        {needLogin
          ? "로그인하면 오늘 열린 게임 시간을 확인할 수 있어요."
          : "숙제를 끝내거나 학원에서 학습을 끝내면 게임 시간이 생겨요. 내일 또 열려요!"}
      </p>

      {!needLogin && (
        <ul className="mt-5 space-y-2 text-left text-sm">
          <li className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
            <span>{perk.homeworkDone ? "✅" : "⬜"} 오늘 숙제(단어 Day) 끝내기</span>
            <span className="text-amber-300 font-bold">+{perk.homeworkMinutes}분</span>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
            <span>{perk.academyChecked ? "✅" : "⬜"} 학원 학습 끝내기 (선생님 체크)</span>
            <span className="text-amber-300 font-bold">+{perk.academyMinutes}분</span>
          </li>
        </ul>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {needLogin ? (
          <Link href="/login" className="rounded-full bg-amber-400 text-slate-900 font-bold px-6 py-2.5">
            로그인
          </Link>
        ) : (
          <Link href="/vocab/hub-new" className="rounded-full bg-amber-400 text-slate-900 font-bold px-6 py-2.5">
            오늘 숙제 하러 가기
          </Link>
        )}
      </div>
    </div>
  );
}
