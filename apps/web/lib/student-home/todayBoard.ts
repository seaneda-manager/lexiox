import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getStudentAssignmentCalendar,
  ASSIGNMENT_AREA_ORDER,
  type AssignmentItem,
  type AssignmentArea,
} from "@/lib/assignments/studentAssignmentCalendar";
import { toIsoDate, type PlannerZone } from "@/lib/planner/types";

// 학생 홈 1단계: 이미 있는 배정 집계(getStudentAssignmentCalendar)와 데이플래너 블록으로
// "어제 한 것 / 하다 만 것 / 오늘 할 것"을 만든다. 스키마 변경 없음.

const DONE = new Set(["completed", "graded", "submitted"]);

/** 배정 종류 → 학생이 실제로 들어갈 수 있는 화면. (집계의 href 는 관리자 화면이라 쓰지 않는다) */
export function studentHrefFor(it: AssignmentItem): string {
  switch (it.kind) {
    case "homework": return "/student/homework";
    case "daily_test":
    case "toefl_section":
    case "toefl_group": return "/student/test-center";
    case "vocab": return "/vocab/hub-new";
    case "jr": return "/jr";
    case "hi_naesin": return "/hi-naesin";
    case "middle_naesin":
    case "middle_general": return "/naesin/middle";
    case "grammar_plan": return "/student/grammar";
    default: return "/student/schedule";
  }
}

export type BoardItem = {
  key: string;
  title: string;
  area: AssignmentArea;
  href: string;
  status: AssignmentItem["status"];
  date: string;
  overdue: boolean;
};

export type AreaGroup = { area: AssignmentArea; items: BoardItem[]; done: number; total: number };

/** 중학·JR 학생은 오늘 할 일을 정규 / 내신 두 덩어리로 나눠 보여 준다 */
export type TodaySection = { key: "regular" | "naesin" | "all"; label: string | null; groups: AreaGroup[]; todo: number };

export type PlanBlock = {
  id: string;
  zone: PlannerZone;
  title: string;
  startTime: string | null;
  done: boolean;
};

export type TodayBoard = {
  todayIso: string;
  resume: BoardItem | null;
  yesterdayDone: BoardItem[];
  todayGroups: AreaGroup[];
  sections: TodaySection[];
  todoCount: number;
  doneTodayCount: number;
  planToday: PlanBlock[];
  planExists: boolean;
  weekDots: Array<{ iso: string; label: string; on: boolean; today: boolean }>;
};

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
}

function toBoardItem(it: AssignmentItem, todayIso: string): BoardItem {
  return {
    key: `${it.kind}:${it.id}`,
    title: it.title,
    area: it.area ?? "other",
    href: studentHrefFor(it),
    status: it.status,
    date: it.date,
    overdue: it.status === "overdue" || (!DONE.has(it.status) && it.date < todayIso),
  };
}

export async function getTodayBoard(opts: {
  supabase: SupabaseClient;
  authUserId: string;
  academyStudentId: string | null;
  streak: { current: number; lastActivityDate: string | null } | null;
  /** 중학·JR 학생이면 true: 정규/내신으로 나눈다 */
  splitNaesin?: boolean;
}): Promise<TodayBoard> {
  const todayIso = toIsoDate(new Date());
  const yesterdayIso = addDays(todayIso, -1);

  const items = await getStudentAssignmentCalendar({
    authUserId: opts.authUserId,
    academyStudentId: opts.academyStudentId,
    fromIso: addDays(todayIso, -14),
    toIso: addDays(todayIso, 3),
  }).catch(() => [] as AssignmentItem[]);

  const open = items.filter((i) => !DONE.has(i.status) && i.date <= todayIso);
  const doneToday = items.filter((i) => DONE.has(i.status) && i.date === todayIso);
  const doneYesterday = items.filter((i) => DONE.has(i.status) && i.date === yesterdayIso);

  const inProgress = open
    .filter((i) => i.status === "in_progress")
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const resumeSrc = inProgress ?? null;

  const isNaesin = (i: AssignmentItem) => i.kind === "middle_naesin" || i.kind === "hi_naesin";
  const buildGroups = (pred: (i: AssignmentItem) => boolean): AreaGroup[] => {
    const out: AreaGroup[] = [];
    for (const area of ASSIGNMENT_AREA_ORDER) {
      const inArea = (i: AssignmentItem) => pred(i) && (i.area ?? "other") === area;
      const pending = open.filter(inArea).map((i) => toBoardItem(i, todayIso));
      const doneN = doneToday.filter(inArea).length;
      if (pending.length === 0 && doneN === 0) continue;
      out.push({ area, items: pending.slice(0, 5), done: doneN, total: pending.length + doneN });
    }
    return out;
  };
  const groups = buildGroups(() => true);
  const sections: TodaySection[] = opts.splitNaesin
    ? [
        { key: "regular", label: "정규 수업", groups: buildGroups((i) => !isNaesin(i)), todo: open.filter((i) => !isNaesin(i)).length },
        { key: "naesin", label: "내신 대비", groups: buildGroups(isNaesin), todo: open.filter(isNaesin).length },
      ]
    : [{ key: "all", label: null, groups, todo: open.length }];

  let planToday: PlanBlock[] = [];
  let planExists = false;
  if (opts.academyStudentId) {
    // 오늘 이후에 계획 블록이 하나라도 있으면 "계획을 세운 상태"
    const { count } = await opts.supabase
      .from("student_day_blocks")
      .select("id", { count: "exact", head: true })
      .eq("student_id", opts.academyStudentId)
      .gte("block_date", todayIso);
    planExists = (count ?? 0) > 0;

    const { data } = await opts.supabase
      .from("student_day_blocks")
      .select("id, zone, title, start_time, done")
      .eq("student_id", opts.academyStudentId)
      .eq("block_date", todayIso)
      .order("start_time", { ascending: true, nullsFirst: false });
    planToday = (data ?? []).map((b: any) => ({
      id: b.id,
      zone: b.zone,
      title: b.title,
      startTime: b.start_time ? String(b.start_time).slice(0, 5) : null,
      done: !!b.done,
    }));
  }

  // 연속 학습일: 마지막 활동일에서 거꾸로 current 일. 마지막 활동이 어제보다 오래되면 끊긴 것.
  const streakDays = new Set<string>();
  const s = opts.streak;
  if (s && s.lastActivityDate && s.current > 0 && s.lastActivityDate >= yesterdayIso) {
    for (let k = 0; k < s.current; k++) streakDays.add(addDays(s.lastActivityDate, -k));
  }
  const LABELS = ["일", "월", "화", "수", "목", "금", "토"];
  const weekDots = Array.from({ length: 7 }, (_, k) => {
    const iso = addDays(todayIso, k - 6);
    return { iso, label: LABELS[new Date(`${iso}T00:00:00`).getDay()], on: streakDays.has(iso), today: iso === todayIso };
  });

  return {
    todayIso,
    resume: resumeSrc ? toBoardItem(resumeSrc, todayIso) : null,
    yesterdayDone: doneYesterday.slice(0, 4).map((i) => toBoardItem(i, todayIso)),
    todayGroups: groups,
    sections,
    todoCount: open.length,
    doneTodayCount: doneToday.length,
    planToday,
    planExists,
    weekDots,
  };
}
