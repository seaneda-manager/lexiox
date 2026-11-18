// 선생님 홈 / 원장 홈이 같이 쓰는 계산 헬퍼 (서버 전용: DB 클라이언트를 받아서 쓴다).

import type { SupabaseClient } from "@supabase/supabase-js";
import { diffDays } from "@/lib/vocab/review/teacherReview";

/** 한국 시간 기준 지금이 하루 중 몇 분째인지 (0~1439) */
export function kstNowMinutes(): number {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** "HH:MM:SS" → 분 */
export function startMinutes(startTime: string): number {
  const [h, m] = startTime.split(":");
  return Number(h) * 60 + Number(m);
}

export function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type SessionPhase = "live" | "upcoming" | "done";

/** 수업 시각 기준으로 진행 중 / 예정 / 종료를 판정한다. */
export function sessionPhase(startTime: string, durationMin: number, nowMin = kstNowMinutes()): SessionPhase {
  const start = startMinutes(startTime);
  const end = start + durationMin;
  return nowMin >= end ? "done" : nowMin >= start ? "live" : "upcoming";
}

export type UpcomingExam = { title: string; start: string; count: number; days: number };

/**
 * 앞으로 `withinDays`일 안에 시작하는(또는 진행 중인) 시험을 "같은 시험(제목+시작일)" 단위로 묶는다.
 * error 가 있으면 집계 실패로 본다.
 */
export async function loadUpcomingExams(
  db: SupabaseClient,
  today: string,
  withinDays = 14,
): Promise<{ exams: UpcomingExam[]; error: boolean }> {
  const { data, error } = await db
    .from("student_exams")
    .select("student_id, title, start_date")
    .gte("end_date", today)
    .lte("start_date", addDaysIso(today, withinDays))
    .order("start_date", { ascending: true })
    .limit(300);
  if (error) return { exams: [], error: true };

  const groups = new Map<string, { title: string; start: string; students: Set<string> }>();
  for (const r of (data ?? []) as { student_id: unknown; title: unknown; start_date: unknown }[]) {
    const key = `${r.title}|${r.start_date}`;
    const g = groups.get(key) ?? {
      title: String(r.title ?? "시험"),
      start: String(r.start_date),
      students: new Set<string>(),
    };
    g.students.add(String(r.student_id));
    groups.set(key, g);
  }
  const exams = [...groups.values()]
    .map((g) => ({ title: g.title, start: g.start, count: g.students.size, days: diffDays(g.start, today) }))
    .sort((a, b) => a.days - b.days);
  return { exams, error: false };
}
