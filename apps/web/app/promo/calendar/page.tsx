import { SEASONS } from "@/lib/promo/constants";
import { addDays, addMonths, todayKST, weekday } from "@/lib/promo/dates";
import { loadBase, loadPosts } from "../_data";
import { PageHead } from "../_components/ui";
import { CalendarClient } from "./CalendarClient";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> | { m?: string } }) {
  const sp = await searchParams;
  const { ctx, channels } = await loadBase();
  const today = todayKST();
  const month = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? `${sp.m}-01` : today.slice(0, 7) + "-01";
  const gridStart = addDays(month, -weekday(month));
  const nextMonth = addMonths(month, 1);
  const lastDay = addDays(nextMonth, -1);
  const gridEnd = addDays(lastDay, 6 - weekday(lastDay));
  const posts = await loadPosts(ctx.org.id, ctx.supabase, gridStart, gridEnd);

  return (
    <>
      <PageHead title="홍보 캘린더" desc="채널별 게시 일정을 한눈에 보고, 날짜를 눌러 새 게시물을 추가하세요." />
      <CalendarClient
        month={month}
        prev={addMonths(month, -1).slice(0, 7)}
        next={nextMonth.slice(0, 7)}
        gridStart={gridStart}
        gridEnd={gridEnd}
        today={today}
        season={SEASONS[Number(month.slice(5, 7))]}
        posts={posts}
        channels={channels}
      />
    </>
  );
}
