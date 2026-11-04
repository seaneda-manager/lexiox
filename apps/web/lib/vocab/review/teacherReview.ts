/**
 * 선생님용 단어 복습 현황 — 학생별로 오늘 복습이 몇 개 밀렸는지, 며칠째 밀렸는지, 총 시험은 언제 봤는지.
 * "복습 의무"를 알림에서 막기로 바꿀지 판단할 근거가 되는 화면의 집계 로직.
 */

import { kstToday, type ReviewClient } from "./reviewItems";
import { computeTotalExamStatus } from "./totalExam";
import { DEFAULT_TOTAL_EXAM_INTERVAL_DAYS } from "@/lib/vocab/test/testConfig";

export type ReviewItemRow = {
  student_id: string;
  status: "open" | "graduated" | "lapsed";
  due_on: string;
  last_reviewed_on: string | null;
};

export type StudentReviewSummary = {
  /** 오늘(이전 포함) 복습해야 할 단어 수 */
  dueCount: number;
  /** 가장 오래 밀린 단어가 며칠째 밀렸는지 (오늘 기한이면 0) */
  overdueDays: number;
  /** 아직 복습 중인 단어 수(미래 기한 포함) */
  openCount: number;
  /** 복습에서 끝내 못 맞혀 총 시험으로 넘어간 단어 수 */
  lapsedCount: number;
  /** 마지막으로 복습 시험을 본 날 */
  lastReviewedOn: string | null;
};

export type ReviewStatus = "ok" | "due" | "late";

/** 날짜 차이(일): a - b */
export function diffDays(a: string, b: string): number {
  const ms = new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

/** 한 학생의 복습 항목들을 요약 (순수 함수) */
export function summarizeStudentReview(items: ReviewItemRow[], today: string): StudentReviewSummary {
  let dueCount = 0;
  let overdueDays = 0;
  let openCount = 0;
  let lapsedCount = 0;
  let lastReviewedOn: string | null = null;

  for (const it of items) {
    if (it.last_reviewed_on && (!lastReviewedOn || it.last_reviewed_on > lastReviewedOn)) {
      lastReviewedOn = it.last_reviewed_on;
    }
    if (it.status === "lapsed") lapsedCount++;
    if (it.status !== "open") continue;
    openCount++;
    if (it.due_on <= today) {
      dueCount++;
      overdueDays = Math.max(overdueDays, diffDays(today, it.due_on));
    }
  }
  return { dueCount, overdueDays, openCount, lapsedCount, lastReviewedOn };
}

/**
 * 상태 분류: 밀린 게 없으면 ok, 오늘/하루 밀린 복습이면 due, 이틀 이상 밀렸으면 late.
 * (복습은 학습 다음 날부터 하는 것이라, 오늘 기한·하루 밀림까지는 아직 정상 범위로 본다)
 */
export function classifyReviewStatus(s: StudentReviewSummary): ReviewStatus {
  if (s.dueCount === 0) return "ok";
  return s.overdueDays >= 2 ? "late" : "due";
}

/** 정렬 우선순위: 늦음 → 오늘 할 것 → 정상, 같은 상태에서는 더 오래/많이 밀린 순, 마지막은 이름순 */
export function compareReviewRows(
  a: { status: ReviewStatus; overdueDays: number; dueCount: number; name: string },
  b: { status: ReviewStatus; overdueDays: number; dueCount: number; name: string },
): number {
  const rank: Record<ReviewStatus, number> = { late: 0, due: 1, ok: 2 };
  if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
  if (a.overdueDays !== b.overdueDays) return b.overdueDays - a.overdueDays;
  if (a.dueCount !== b.dueCount) return b.dueCount - a.dueCount;
  return a.name.localeCompare(b.name, "ko");
}

type ConfigRow = { scope: string; scope_id: string | null; total_exam_interval_days?: number | null };

/** 학생에게 적용되는 총 시험 간격 (학생별 > 반별 > 전역 > 기본 30일) — 순수 함수 */
export function resolveTotalInterval(configs: ConfigRow[], authId: string, classIds: string[]): number {
  const student = configs.find((c) => c.scope === "student" && c.scope_id === authId);
  if (student?.total_exam_interval_days != null) return Number(student.total_exam_interval_days);
  for (const cid of classIds) {
    const c = configs.find((x) => x.scope === "class" && x.scope_id === cid);
    if (c?.total_exam_interval_days != null) return Number(c.total_exam_interval_days);
  }
  const global = configs.find((c) => c.scope === "global");
  if (global?.total_exam_interval_days != null) return Number(global.total_exam_interval_days);
  return DEFAULT_TOTAL_EXAM_INTERVAL_DAYS;
}

export type TeacherReviewRow = {
  studentId: string; // academy_students.id
  authId: string;
  name: string;
  grade: string | null;
  school: string | null;
  classNames: string[];
  classIds: string[];
  summary: StudentReviewSummary;
  status: ReviewStatus;
  /** 총 시험 시기가 된 교재 수 */
  totalDueTracks: number;
  /** 마지막 총 시험(교재 무관 가장 최근) */
  lastTotalOn: string | null;
};

export type TeacherReviewOverview = {
  today: string;
  rows: TeacherReviewRow[];
  classes: { id: string; name: string }[];
  counts: { students: number; withDue: number; late: number; totalDue: number };
};

/** 전체 학생의 복습 현황을 모아서 돌려준다 (service role 클라이언트 필요) */
export async function loadTeacherReviewOverview(
  client: ReviewClient,
  now: Date = new Date(),
): Promise<TeacherReviewOverview> {
  const today = kstToday(now);

  const [studentsRes, classesRes, membersRes, itemsRes, configsRes, assignsRes, totalsRes] = await Promise.all([
    client
      .from("academy_students")
      .select("id, display_name, grade, school, auth_user_id, user_id, profile_id")
      .eq("is_active", true),
    client.from("academy_classes").select("id, name"),
    client.from("academy_class_students").select("class_id, student_id").limit(20000),
    client.from("vocab_review_items").select("student_id, status, due_on, last_reviewed_on").limit(100000),
    client.from("vocab_test_configs").select("*"),
    client
      .from("student_vocab_assignments")
      .select("student_id, track_id, completed_at")
      .not("completed_at", "is", null)
      .limit(100000),
    client
      .from("vocab_test_sessions")
      .select("student_id, track_id, submitted_at")
      .eq("mode", "total")
      .eq("status", "graded")
      .limit(20000),
  ]);

  const classList = ((classesRes.data as any[]) ?? []).map((c) => ({ id: String(c.id), name: String(c.name ?? "") }));
  const className = new Map(classList.map((c) => [c.id, c.name]));
  const classesByAuth = new Map<string, string[]>();
  for (const m of (membersRes.data as any[]) ?? []) {
    const k = String(m.student_id);
    const list = classesByAuth.get(k) ?? [];
    list.push(String(m.class_id));
    classesByAuth.set(k, list);
  }

  const itemsByStudent = new Map<string, ReviewItemRow[]>();
  for (const r of (itemsRes.data as any[]) ?? []) {
    const k = String(r.student_id);
    const list = itemsByStudent.get(k) ?? [];
    list.push(r as ReviewItemRow);
    itemsByStudent.set(k, list);
  }

  // 학생(academy)×교재별 첫 학습 완료일
  const firstLearned = new Map<string, Map<string, string>>();
  for (const a of (assignsRes.data as any[]) ?? []) {
    if (!a.track_id || !a.completed_at) continue;
    const sid = String(a.student_id);
    const tid = String(a.track_id);
    const d = kstToday(new Date(a.completed_at));
    const m = firstLearned.get(sid) ?? new Map<string, string>();
    if (!m.has(tid) || d < (m.get(tid) as string)) m.set(tid, d);
    firstLearned.set(sid, m);
  }

  // 학생(auth)×교재별 마지막 총 시험일
  const lastTotal = new Map<string, Map<string, string>>();
  for (const t of (totalsRes.data as any[]) ?? []) {
    if (!t.submitted_at) continue;
    const sid = String(t.student_id);
    const tid = String(t.track_id);
    const d = kstToday(new Date(t.submitted_at));
    const m = lastTotal.get(sid) ?? new Map<string, string>();
    if (!m.has(tid) || d > (m.get(tid) as string)) m.set(tid, d);
    lastTotal.set(sid, m);
  }

  const configs = ((configsRes.data as any[]) ?? []) as ConfigRow[];

  const rows: TeacherReviewRow[] = [];
  for (const s of (studentsRes.data as any[]) ?? []) {
    const authId = (s.auth_user_id ?? s.user_id ?? s.profile_id) as string | null;
    if (!authId) continue; // 로그인 계정이 없는 학생은 응시/복습 대상이 아니다
    const studentId = String(s.id);
    const classIds = classesByAuth.get(String(authId)) ?? [];

    const summary = summarizeStudentReview(itemsByStudent.get(studentId) ?? [], today);
    const interval = resolveTotalInterval(configs, String(authId), classIds);

    let totalDueTracks = 0;
    let lastTotalOn: string | null = null;
    const learned = firstLearned.get(studentId);
    if (learned) {
      for (const [trackId, first] of learned) {
        const last = lastTotal.get(String(authId))?.get(trackId) ?? null;
        if (last && (!lastTotalOn || last > lastTotalOn)) lastTotalOn = last;
        const st = computeTotalExamStatus({ today, intervalDays: interval, lastTotalOn: last, firstLearnedOn: first });
        if (st.due) totalDueTracks++;
      }
    }

    // 복습 기록도 학습 기록도 없는 학생은 현황에 올리지 않는다(빈 줄이 늘어나는 것 방지)
    const hasAnything =
      summary.openCount > 0 || summary.lapsedCount > 0 || !!summary.lastReviewedOn || (learned ? learned.size > 0 : false);
    if (!hasAnything) continue;

    rows.push({
      studentId,
      authId: String(authId),
      name: String(s.display_name ?? "(이름 없음)"),
      grade: s.grade ?? null,
      school: s.school ?? null,
      classIds,
      classNames: classIds.map((id) => className.get(id)).filter(Boolean) as string[],
      summary,
      status: classifyReviewStatus(summary),
      totalDueTracks,
      lastTotalOn,
    });
  }

  rows.sort((a, b) =>
    compareReviewRows(
      { status: a.status, overdueDays: a.summary.overdueDays, dueCount: a.summary.dueCount, name: a.name },
      { status: b.status, overdueDays: b.summary.overdueDays, dueCount: b.summary.dueCount, name: b.name },
    ),
  );

  return {
    today,
    rows,
    classes: [...classList].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    counts: {
      students: rows.length,
      withDue: rows.filter((r) => r.summary.dueCount > 0).length,
      late: rows.filter((r) => r.status === "late").length,
      totalDue: rows.filter((r) => r.totalDueTracks > 0).length,
    },
  };
}
