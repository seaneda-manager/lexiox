/**
 * 직원 계정(Super / 본사직원 / 원장 / 선생님)의 사이드바 메뉴 — 하나의 정의에서 권한으로 걸러서 만든다.
 *
 * - 각 메뉴는 필요한 권한(perm)을 가진다. 계정의 권한 집합에 없으면 보이지 않는다.
 *   (선생님은 직급별로 권한이 다르고 원장이 정한다 → 나중에 DB 권한 집합을 그대로 넣으면 된다)
 * - /admin/* 경로는 지금 admin 레이아웃이 막고 있어서, 진짜 선생님 계정에는 보여주지 않는다.
 *   (원장·본사직원 계정이 실제로 만들어질 때 접근 범위를 풀어 준다 — 3단계)
 */

import {
  BarChart2,
  BookOpen,
  BookText,
  Building2,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Download,
  Dumbbell,
  FileCheck,
  FileText,
  Gift,
  Globe,
  GraduationCap,
  Headphones,
  History,
  Home,
  LayoutDashboard,
  Library,
  List,
  Mic,
  PenLine,
  PlayCircle,
  RotateCcw,
  School,
  Send,
  Settings,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
  type LucideProps,
} from "lucide-react";
import { hasPermission, type AppRole, type PermissionKey } from "@/lib/auth/permissions";

type Icon = React.ComponentType<LucideProps>;

export type StaffNavItem = {
  section: string;
  label: string;
  href?: string;
  disabled?: boolean;
  icon?: Icon;
  perm?: PermissionKey;
  /** 이 메뉴의 하위로 취급할 다른 경로들 */
  also?: string[];
};

export type StaffRole = Extract<AppRole, "admin" | "hq_staff" | "franchisee" | "teacher">;

export function isStaffRole(role: string): role is StaffRole {
  return role === "admin" || role === "hq_staff" || role === "franchisee" || role === "teacher";
}

// 섹션 이름 (한 곳에서 관리)
export const S = {
  today: "오늘 운영",
  people: "학생·반 관리",
  assign: "배정·시험 관리",
  tools: "수업 도구",
  toefl: "Updated TOEFL",
  speaking: "Updated-Speaking",
  naesin: "내신관리",
  jr: "Jr.",
  vocab: "어휘관리",
  hq: "본사",
  system: "시스템",
  settings: "설정",
} as const;

/** 콘텐츠 제작 섹션들 — 자주 쓰지 않으므로 기본으로 접어 둔다 */
export const CONTENT_SECTIONS: string[] = [S.toefl, S.speaking, S.naesin, S.jr, S.vocab];

function homeFor(role: StaffRole): StaffNavItem {
  switch (role) {
    case "admin":
      return { section: S.today, href: "/admin", label: "대시보드", icon: LayoutDashboard };
    case "hq_staff":
      return { section: S.today, href: "/admin/franchise", label: "본사 허브", icon: Building2, perm: "franchise.hq" };
    case "franchisee":
      return { section: S.today, href: "/franchise/home", label: "오늘 현황", icon: LayoutDashboard };
    default:
      return { section: S.today, href: "/teacher/home", label: "선생님 홈", icon: Home };
  }
}

function allItems(role: StaffRole): StaffNavItem[] {
  const items: StaffNavItem[] = [
    // ── 오늘 운영 ──
    homeFor(role),
    { section: S.today, href: "/teacher/session", label: "오늘의 수업", icon: ClipboardCheck, perm: "today.sessions" },
    { section: S.today, href: "/admin/attendance", label: "출석 현황", icon: Calendar, perm: "attendance.check" },
    { section: S.today, href: "/admin/homework", label: "숙제 관리", icon: ClipboardCheck, perm: "homework.grade" },
    { section: S.today, href: "/teacher/students", label: "학생 현황", icon: Users, perm: "students.view" },
    { section: S.today, href: "/admin/dashboard", label: "학생 진행 현황", icon: BarChart2, perm: "students.view" },
    { section: S.today, href: "/teacher/vocab-review", label: "단어 복습 현황", icon: RotateCcw, perm: "reports.view" },
    { section: S.today, href: "/teacher/reports/students", label: "활동 리포트", icon: BarChart2, perm: "reports.view" },
    { section: S.today, href: "/teacher/tasks", label: "할 일 관리", icon: CheckSquare },

    // ── 학생·반 관리 ──
    { section: S.people, href: "/admin/students", label: "학생 추가/관리", icon: UserPlus, perm: "students.manage" },
    { section: S.people, href: "/admin/classes", label: "반 관리", icon: Users, perm: "classes.manage" },
    { section: S.people, href: "/admin/guardians", label: "학부모 연락처", icon: Users, perm: "guardians.view" },
    { section: S.people, href: "/admin/schools", label: "학교 관리", icon: School, perm: "students.manage" },
    { section: S.people, href: "/admin/exam-mode", label: "시험모드 현황", icon: Calendar, perm: "students.view" },
    { section: S.people, href: "/teacher/homework-calendar", label: "배정 캘린더", icon: Calendar, perm: "assign.manage" },
    { section: S.people, href: "/teacher/lesson-log", label: "수업 로그", icon: ClipboardCheck, perm: "lesson_log.write" },
    // 원장이 선생님 직급과 권한을 정하는 화면 (2단계에서 구현)
    { section: S.people, label: "직급·권한 관리 (soon)", icon: ShieldCheck, perm: "branch.staff", disabled: true },

    // ── 배정·시험 관리 ──
    { section: S.assign, href: "/teacher/exam-schedule", label: "시험 배정", icon: ClipboardList, perm: "assign.manage" },
    { section: S.assign, href: "/teacher/vocab-exams", label: "단어 시험 출제", icon: FileText, perm: "exam.create" },
    { section: S.assign, href: "/teacher/vocab-test-config", label: "단어 시험 설정", icon: Settings, perm: "exam.create" },
    { section: S.assign, href: "/admin/homework/books", label: "교재별 정기 숙제", icon: Library, perm: "assign.manage" },
    { section: S.assign, href: "/admin/vocab/assign", label: "단어 배정", icon: UserPlus, perm: "assign.manage" },
    { section: S.assign, href: "/admin/vocab/Tracks", label: "트랙 배포", icon: Send, perm: "assign.manage" },
    { section: S.assign, href: "/admin/level-test", label: "레벨 테스트", icon: BarChart2, perm: "assign.manage" },
    { section: S.assign, href: "/admin/deepcheck", label: "DeepCheck 현황", icon: BookText, perm: "reports.view" },
    { section: S.assign, href: "/teacher/reports/assignments", label: "배정 과제 현황", icon: BarChart2, perm: "reports.view" },
    { section: S.assign, href: "/teacher/middle-naesin-drill-results", label: "중학내신 드릴 결과", icon: BarChart2, perm: "reports.view" },

    // ── 수업 도구 (선생님·원장이 수업에 바로 쓰는 것) ──
    { section: S.tools, href: "/vocab/hub-new", label: "단어 학습", icon: Library },
    { section: S.tools, href: "/teacher/speaking-drills", label: "Speaking 훈련", icon: Dumbbell },

    // ── 콘텐츠 제작 (본사·Super) ──
    { section: S.toefl, href: "/admin/content/updated-reading", label: "Reading", icon: BookOpen, perm: "content.produce" },
    { section: S.toefl, href: "/admin/content/updated-listening", label: "Listening", icon: Headphones, perm: "content.produce" },
    { section: S.toefl, href: "/admin/content/updated-writing", label: "Writing", icon: PenLine, perm: "content.produce" },
    { section: S.toefl, href: "/admin/content/grammar-2026", label: "Grammar", icon: BookText, perm: "content.produce" },
    { section: S.toefl, href: "/admin/grammar-engine", label: "문법 엔진(개념×레벨)", icon: BookText, perm: "content.produce" },
    { section: S.toefl, href: "/admin/content/grammar-2026/plans", label: "문법 스케줄", icon: Calendar, perm: "content.produce" },
    { section: S.toefl, href: "/admin/voice-lab", label: "강의 음성 시험대", icon: Mic, perm: "content.produce" },
    { section: S.toefl, href: "/admin/grammar-quiz", label: "문법 퀴즈 뱅크", icon: CheckSquare, perm: "content.produce" },
    { section: S.toefl, href: "/admin/problem-bank", label: "Problem Bank", icon: Library, perm: "content.produce" },
    { section: S.toefl, href: "/admin/daily-tests", label: "Daily Tests", icon: CheckSquare, perm: "content.produce" },
    { section: S.toefl, href: "/admin/lectures", label: "강의 관리", icon: PlayCircle, perm: "content.produce" },
    { section: S.toefl, href: "/admin/toefl/curriculum", label: "TOEFL 커리", icon: PlayCircle, perm: "content.produce" },
    { section: S.toefl, href: "/admin/toefl/content/practice", label: "Practice 지문", icon: PlayCircle, perm: "content.produce" },

    { section: S.speaking, href: "/admin/content/updated-speaking", label: "Speaking", icon: Mic, perm: "content.produce" },
    { section: S.speaking, href: "/admin/speaking-drills", label: "Speaking 훈련", icon: PlayCircle, perm: "content.produce" },

    { section: S.naesin, href: "/admin/naesin", label: "고등 드릴 관리", icon: ClipboardList, perm: "content.produce" },
    { section: S.naesin, href: "/admin/hi-naesin/passages", label: "고등 지문", icon: FileText, perm: "content.produce" },
    { section: S.naesin, href: "/admin/middle-naesin/units", label: "중학 단원·드릴", icon: GraduationCap, perm: "content.produce" },
    { section: S.naesin, href: "/admin/middle-naesin/drill-results", label: "중학 드릴 결과", icon: BarChart2, perm: "content.produce" },
    { section: S.naesin, href: "/admin/hi-naesin/wrong-answers", label: "오답 검토", icon: ClipboardCheck, perm: "content.produce" },

    { section: S.jr, href: "/admin/jr/content/generate", label: "AI 콘텐츠 생성", icon: Mic, perm: "content.produce" },
    { section: S.jr, href: "/admin/jr/content/review", label: "AI 검토", icon: ClipboardCheck, perm: "content.produce" },
    { section: S.jr, href: "/admin/jr/content/reading", label: "읽기", icon: FileText, perm: "content.produce" },
    { section: S.jr, href: "/admin/jr/content/grammar", label: "문법", icon: BookOpen, perm: "content.produce" },
    { section: S.jr, href: "/admin/jr/content/listening", label: "청취", icon: Headphones, perm: "content.produce" },
    { section: S.jr, href: "/admin/jr/content/speaking-writing", label: "말하기/쓰기", icon: Mic, perm: "content.produce" },

    { section: S.vocab, href: "/admin/vocab/sets", label: "단어 책 관리", icon: Library, perm: "content.produce" },
    { section: S.vocab, href: "/admin/vocab/words", label: "단어 목록", icon: List, perm: "content.produce" },
    { section: S.vocab, href: "/admin/vocab/words/import", label: "단어 가져오기", icon: Download, perm: "content.produce" },
    { section: S.vocab, href: "/admin/vocab/import", label: "CSV 업로드", icon: Upload, perm: "content.produce" },
    { section: S.vocab, href: "/admin/vocab/validate", label: "단어 검증", icon: FileCheck, perm: "content.produce" },
    { section: S.vocab, href: "/admin/vocab/tracks/new", label: "트랙 만들기", icon: Library, perm: "content.produce" },
    { section: S.vocab, href: "/admin/vocab/progress", label: "단어 학습 진행", icon: BarChart2, perm: "content.produce" },
    { section: S.vocab, href: "/admin/vocab/speed-settings", label: "Speed 타이머", icon: Settings, perm: "content.produce" },

    // ── 본사 ──
    { section: S.hq, href: "/admin/franchise", label: "프랜차이즈 허브", icon: Building2, perm: "franchise.hq" },

    // ── 시스템 (Super) ──
    { section: S.system, href: "/admin/perks", label: "Perk 관리", icon: Gift, perm: "system.admin" },
    { section: S.system, href: "/admin/users", label: "사용자/권한", icon: ShieldCheck, perm: "system.admin" },
    { section: S.system, href: "/admin/login-history", label: "로그인 기록", icon: History, perm: "system.admin" },
    { section: S.system, href: "/admin/landing", label: "랜딩 페이지", icon: Globe, perm: "system.admin" },
    { section: S.system, href: "/admin/settings", label: "설정", icon: Settings, perm: "system.admin" },
  ];

  // 선생님·원장은 개인 설정
  if (role === "teacher" || role === "franchisee") {
    items.push({ section: S.settings, href: "/settings", label: "설정", icon: Settings });
  }
  return items;
}

/**
 * 역할과 권한 집합으로 메뉴를 만든다.
 * - perm 이 없는 메뉴는 누구에게나, 있으면 permissions 에 있을 때만.
 * - 선생님에게는 /admin/* 경로를 보여주지 않는다 (admin 레이아웃이 막고 있음 — 3단계에서 접근 범위 조정).
 * - 본사 허브는 홈과 중복되지 않게 정리.
 */
export function buildStaffMenu(role: StaffRole, permissions: readonly string[]): StaffNavItem[] {
  const seen = new Set<string>();
  const out: StaffNavItem[] = [];
  for (const it of allItems(role)) {
    if (!hasPermission(permissions, it.perm)) continue;
    if (role === "teacher" && it.href?.startsWith("/admin")) continue;
    // 수업 도구는 수업을 하는 역할(선생님·원장)에게만
    if (it.section === S.tools && (role === "admin" || role === "hq_staff")) continue;
    // 중학내신 드릴 결과(선생님용 경로)는 내신 콘텐츠를 가진 쪽과 중복되니 제외
    if ((role === "admin" || role === "hq_staff") && it.href === "/teacher/middle-naesin-drill-results") continue;
    // 같은 경로가 한 메뉴에 두 번 나오지 않게 (본사 직원: 홈=본사 허브)
    const key = `${it.section}|${it.href ?? it.label}`;
    const hrefKey = it.href ? `href|${it.href}` : null;
    if (seen.has(key) || (hrefKey && seen.has(hrefKey))) continue;
    seen.add(key);
    if (hrefKey) seen.add(hrefKey);
    out.push(it);
  }
  return out;
}
