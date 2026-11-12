'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight, ChevronDown,
  LayoutDashboard, BookOpen, Headphones, Mic, PenLine, BookText,
  ClipboardList, FileText, GraduationCap, Library, List, Download,
  Upload, Send, BarChart2, Home, UserPlus, CheckSquare, Users,
  ClipboardCheck, PlayCircle, Gift, ShieldCheck, Globe, Settings, Calendar, School, Gamepad2, History,
  Video, Dumbbell, Repeat, Target, TrendingUp, Trophy, Gauge, CalendarCheck, SearchCheck, FileCheck, Zap, RotateCcw,
  type LucideProps,
} from 'lucide-react';
import { useLang } from '@/contexts/LangContext';
import { normalizeRoutePath } from '@/lib/utils/examRoute';
import { buildStaffMenu, isStaffRole, CONTENT_SECTIONS } from './staffNav';
import { defaultPermissionsForRole } from '@/lib/auth/permissions';

type Icon = React.ComponentType<LucideProps>;

type Role    = 'student' | 'teacher' | 'admin' | 'franchisee' | 'hq_staff';
type Program = 'gap' | 'toefl' | 'lexiox' | null;
// collapsed는 ProtectedLayoutClient가 소유한다 — 사이드바 하단 프로필 카드도
// 같은 상태를 봐야 접혔을 때 서로 어긋나지 않는다.
type Props   = { role: Role; /** 이 계정이 가진 권한 키 (없으면 역할 기본값) */ permissions?: string[]; program?: Program; hasHiNaesin?: boolean; hasMiddleNaesin?: boolean; collapsed: boolean };

// ── Section type: all section keys used across roles ─────────────
type NavSection =
  // Admin
  | '대시보드' | 'Updated TOEFL' | 'Updated-Speaking' | '내신관리' | 'Jr.' | '어휘관리' | '선생님 도구' | '시스템'
  // Teacher
  | '콘텐츠' | '학생 관리'
  // Student — program-specific
  | '내신' | 'Hi-내신' | '어휘' | '숙제'   // lingx
  | '학습' | '내 현황'          // toefl / gap
  | '내 학습' | '학습 콘텐츠'   // unassigned (legacy)
  | '오늘 운영' | '학생·반 관리' | '배정·시험 관리' | '수업 도구' | '본사'  // staff (admin/hq/franchisee/teacher)
  | '오늘' | '공부하기' | '시험·복습' | '연습·게임' | '내 기록'  // toefl / gap (재구성)
  // Shared
  | '설정';

// ── 한/영 섹션 라벨 매핑 ─────────────────────────────────────────
const SECTION_EN: Record<NavSection, string> = {
  '대시보드': 'Dashboard',
  'Updated TOEFL': 'Updated TOEFL',
  'Updated-Speaking': 'Updated-Speaking',
  '내신관리': 'Naesin',
  'Jr.': 'Jr.',
  '어휘관리': 'Vocab',
  '콘텐츠': 'Content',

  '선생님 도구': 'Teacher',
  '시스템': 'System',
  '학생 관리': 'Students',
  '내신': 'Naesin',
  'Hi-내신': 'Hi-Naesin',
  '어휘': 'Vocab',
  '숙제': 'Homework',
  '학습': 'Study',
  '내 현황': 'My Progress',
  '내 학습': 'My Learning',
  '학습 콘텐츠': 'Content',
  '오늘': 'Today',
  '오늘 운영': 'Today',
  '학생·반 관리': 'Students & Classes',
  '배정·시험 관리': 'Assignments & Tests',
  '수업 도구': 'Class Tools',
  '본사': 'HQ',
  '공부하기': 'Study',
  '시험·복습': 'Tests & Review',
  '연습·게임': 'Practice',
  '내 기록': 'My Records',
  '설정': 'Settings',
};

// ── Admin section → group label (for visual grouping) ────────────
const SECTION_GROUP: Record<string, string> = {
  'Updated TOEFL': 'CONTENT',
  'Updated-Speaking': 'CONTENT',
  '내신관리':    'CONTENT',
  'Jr.':         'CONTENT',
  '어휘관리':    'CONTENT',
  '선생님 도구': 'TEACHER',
  '오늘 운영':      'OPERATIONS',
  '학생·반 관리':   'OPERATIONS',
  '배정·시험 관리': 'OPERATIONS',
  '수업 도구':      'OPERATIONS',
  '본사':           'HQ',
  '시스템':      'SYSTEM',
};

type SkillColor = 'reading' | 'listening' | 'speaking' | 'writing';

type NavItem = {
  section: NavSection;
  label: string;
  href?: string;
  disabled?: boolean;
  skill?: SkillColor;
  icon?: Icon;
  /** 이 메뉴의 하위로 취급할 다른 경로들 — 그 경로에 있을 때도 이 메뉴가 선택된 것으로 표시 */
  also?: string[];
};

// Shown only to admin / teacher / unassigned students
const LEGACY_ITEMS = [
  { href: '/admin/content/new?kind=reading',    label: 'Reading 세트 추가' },
  { href: '/admin/content/list?kind=reading',   label: 'Reading 세트 목록' },
  { href: '/admin/content/new?kind=listening',  label: 'Listening 세트 추가' },
  { href: '/admin/content/list?kind=listening', label: 'Listening 세트 목록' },
  { href: '/reading',   label: 'Reading (Legacy)' },
  { href: '/listening', label: 'Listening (Legacy)' },
  { href: '/speaking',  label: 'Speaking (Legacy)' },
  { href: '/writing',   label: 'Writing (Legacy)' },
];

// ── Helpers ───────────────────────────────────────────────────────
const normalizePath = normalizeRoutePath;

function collapsedLabel(section: string) {
  const map: Record<string, string> = {
    '대시보드': 'D', 'Updated TOEFL': 'UT', 'Updated-Speaking': 'US', '내신관리': 'N',
    'Jr.': 'Jr', '어휘관리': 'V', '콘텐츠 허브': '콘', '선생님 도구': 'T', '시스템': 'S',
    '학생 관리': '관',
    '내신': '내', 'Hi-내신': 'Hi', '어휘': '어', '숙제': '숙', '학습': '학', '내 현황': '현',
    '내 학습': '나', '학습 콘텐츠': '콘',
    '오늘 운영': '운', '학생·반 관리': '학', '배정·시험 관리': '배', '수업 도구': '도', '본사': '본',
    '오늘': '오', '공부하기': '공', '시험·복습': '시', '연습·게임': '연', '내 기록': '기',
    '설정': '설',
  };
  return map[section] ?? section.slice(0, 1);
}

// ── Section color themes ─────────────────────────────────────────
type SectionTheme = {
  header: string;       // 섹션 헤더 텍스트 색
  active: string;       // 활성 아이템 border+bg+text
  hover: string;        // hover 상태
  chevron: string;      // 활성 chevron 색
  dot: string;          // collapsed 활성 dot 색
};

const SECTION_THEME: Record<string, SectionTheme> = {
  '대시보드':     { header: 'text-slate-500',   active: 'border-slate-400   bg-slate-50   text-slate-700',   hover: 'hover:bg-slate-50   hover:text-slate-900',   chevron: 'text-slate-300',   dot: 'bg-slate-400'   },
  'Updated TOEFL': { header: 'text-blue-600',    active: 'border-blue-400    bg-blue-50    text-blue-700',    hover: 'hover:bg-blue-50    hover:text-blue-900',    chevron: 'text-blue-300',    dot: 'bg-blue-400'    },
  'Updated-Speaking': { header: 'text-orange-600', active: 'border-orange-400 bg-orange-50 text-orange-700', hover: 'hover:bg-orange-50 hover:text-orange-900', chevron: 'text-orange-300', dot: 'bg-orange-400' },
  '내신관리':     { header: 'text-emerald-600', active: 'border-emerald-400 bg-emerald-50 text-emerald-700', hover: 'hover:bg-emerald-50 hover:text-emerald-900', chevron: 'text-emerald-300', dot: 'bg-emerald-400' },
  'Jr.':          { header: 'text-orange-500',  active: 'border-orange-400  bg-orange-50  text-orange-700',  hover: 'hover:bg-orange-50  hover:text-orange-900',  chevron: 'text-orange-300',  dot: 'bg-orange-400'  },
  '어휘관리':     { header: 'text-violet-600',  active: 'border-violet-400  bg-violet-50  text-violet-700',  hover: 'hover:bg-violet-50  hover:text-violet-900',  chevron: 'text-violet-300',  dot: 'bg-violet-400'  },
  '콘텐츠':       { header: 'text-sky-600',     active: 'border-sky-400     bg-sky-50     text-sky-700',     hover: 'hover:bg-sky-50     hover:text-sky-900',     chevron: 'text-sky-300',     dot: 'bg-sky-400'     },

  '선생님 도구':  { header: 'text-amber-600',   active: 'border-amber-400   bg-amber-50   text-amber-700',   hover: 'hover:bg-amber-50   hover:text-amber-900',   chevron: 'text-amber-300',   dot: 'bg-amber-400'   },
  '시스템':       { header: 'text-slate-500',   active: 'border-slate-400   bg-slate-50   text-slate-700',   hover: 'hover:bg-slate-50   hover:text-slate-900',   chevron: 'text-slate-300',   dot: 'bg-slate-400'   },
  '학생 관리':    { header: 'text-teal-600',    active: 'border-teal-400    bg-teal-50    text-teal-700',    hover: 'hover:bg-teal-50    hover:text-teal-900',    chevron: 'text-teal-300',    dot: 'bg-teal-400'    },
  '내신':         { header: 'text-emerald-600', active: 'border-emerald-400 bg-emerald-50 text-emerald-700', hover: 'hover:bg-emerald-50 hover:text-emerald-900', chevron: 'text-emerald-300', dot: 'bg-emerald-400' },
  'Hi-내신':      { header: 'text-cyan-600',    active: 'border-cyan-400    bg-cyan-50    text-cyan-700',    hover: 'hover:bg-cyan-50    hover:text-cyan-900',    chevron: 'text-cyan-300',    dot: 'bg-cyan-400'    },
  '어휘':         { header: 'text-violet-600',  active: 'border-violet-400  bg-violet-50  text-violet-700',  hover: 'hover:bg-violet-50  hover:text-violet-900',  chevron: 'text-violet-300',  dot: 'bg-violet-400'  },
  '숙제':         { header: 'text-rose-500',    active: 'border-rose-400    bg-rose-50    text-rose-700',    hover: 'hover:bg-rose-50    hover:text-rose-900',    chevron: 'text-rose-300',    dot: 'bg-rose-400'    },
  '오늘 운영':    { header: 'text-rose-500',    active: 'border-rose-400    bg-rose-50    text-rose-700',    hover: 'hover:bg-rose-50    hover:text-rose-900',    chevron: 'text-rose-300',    dot: 'bg-rose-400'    },
  '학생·반 관리': { header: 'text-teal-600',    active: 'border-teal-400    bg-teal-50    text-teal-700',    hover: 'hover:bg-teal-50    hover:text-teal-900',    chevron: 'text-teal-300',    dot: 'bg-teal-400'    },
  '배정·시험 관리': { header: 'text-violet-600', active: 'border-violet-400  bg-violet-50  text-violet-700',  hover: 'hover:bg-violet-50  hover:text-violet-900',  chevron: 'text-violet-300',  dot: 'bg-violet-400'  },
  '수업 도구':    { header: 'text-orange-500',  active: 'border-orange-400  bg-orange-50  text-orange-700',  hover: 'hover:bg-orange-50  hover:text-orange-900',  chevron: 'text-orange-300',  dot: 'bg-orange-400'  },
  '본사':         { header: 'text-sky-600',     active: 'border-sky-400     bg-sky-50     text-sky-700',     hover: 'hover:bg-sky-50     hover:text-sky-900',     chevron: 'text-sky-300',     dot: 'bg-sky-400'     },
  '오늘':         { header: 'text-rose-500',    active: 'border-rose-400    bg-rose-50    text-rose-700',    hover: 'hover:bg-rose-50    hover:text-rose-900',    chevron: 'text-rose-300',    dot: 'bg-rose-400'    },
  '공부하기':     { header: 'text-blue-600',    active: 'border-blue-400    bg-blue-50    text-blue-700',    hover: 'hover:bg-blue-50    hover:text-blue-900',    chevron: 'text-blue-300',    dot: 'bg-blue-400'    },
  '시험·복습':    { header: 'text-violet-600',  active: 'border-violet-400  bg-violet-50  text-violet-700',  hover: 'hover:bg-violet-50  hover:text-violet-900',  chevron: 'text-violet-300',  dot: 'bg-violet-400'  },
  '연습·게임':    { header: 'text-orange-500',  active: 'border-orange-400  bg-orange-50  text-orange-700',  hover: 'hover:bg-orange-50  hover:text-orange-900',  chevron: 'text-orange-300',  dot: 'bg-orange-400'  },
  '내 기록':      { header: 'text-teal-600',    active: 'border-teal-400    bg-teal-50    text-teal-700',    hover: 'hover:bg-teal-50    hover:text-teal-900',    chevron: 'text-teal-300',    dot: 'bg-teal-400'    },
  '설정':         { header: 'text-neutral-500', active: 'border-neutral-400 bg-neutral-50 text-neutral-700', hover: 'hover:bg-neutral-50 hover:text-neutral-900', chevron: 'text-neutral-300', dot: 'bg-neutral-400' },
};

const DEFAULT_THEME: SectionTheme = {
  header: 'text-neutral-500',
  active: 'border-emerald-400 bg-emerald-50 text-emerald-700',
  hover:  'hover:bg-emerald-50 hover:text-neutral-900',
  chevron:'text-emerald-400',
  dot:    'bg-emerald-500',
};

function getSectionTheme(section: string): SectionTheme {
  return SECTION_THEME[section] ?? DEFAULT_THEME;
}

// ── Skill color classes ───────────────────────────────────────────
const SKILL_ACTIVE: Record<SkillColor, string> = {
  reading:   'border-blue-400   bg-blue-50   text-blue-700',
  listening: 'border-violet-400 bg-violet-50 text-violet-700',
  speaking:  'border-orange-400 bg-orange-50 text-orange-700',
  writing:   'border-teal-400   bg-teal-50   text-teal-700',
};
const SKILL_HOVER: Record<SkillColor, string> = {
  reading:   'hover:bg-blue-50/60   hover:text-blue-800',
  listening: 'hover:bg-violet-50/60 hover:text-violet-800',
  speaking:  'hover:bg-orange-50/60 hover:text-orange-800',
  writing:   'hover:bg-teal-50/60   hover:text-teal-800',
};
const SKILL_CHEVRON: Record<SkillColor, string> = {
  reading:   'text-blue-300',
  listening: 'text-violet-300',
  speaking:  'text-orange-300',
  writing:   'text-teal-300',
};
const SKILL_DOT: Record<SkillColor, string> = {
  reading:   'bg-blue-400',
  listening: 'bg-violet-400',
  speaking:  'bg-orange-400',
  writing:   'bg-teal-400',
};


// ── Component ────────────────────────────────────────────────────
export default function SidebarClient({ role, permissions, program = null, hasHiNaesin = false, hasMiddleNaesin = false, collapsed }: Props) {
  const pathnameRaw = usePathname() || '/';
  const pathname    = normalizePath(pathnameRaw);
  const { lang }    = useLang();

  const [legacyOpen, setLegacyOpen] = useState(false);

  // 오늘 복습할 단어 수 → "단어 시험" 메뉴 배지 (학생만). 이동할 때마다 부르되 1분 안에는 다시 부르지 않는다.
  const [reviewDue, setReviewDue] = useState(0);
  const lastReviewFetch = useRef(0);
  // 이동 중 요청이 취소돼도 결과가 사라지지 않게, 언마운트 여부만 추적한다. (실패하면 다음 이동 때 다시 시도)
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (role !== 'student') return;
    const now = Date.now();
    if (lastReviewFetch.current !== 0 && now - lastReviewFetch.current < 60_000) return;
    lastReviewFetch.current = now;
    (async () => {
      try {
        const r = await fetch('/api/vocab/test/review-summary', { cache: 'no-store' });
        if (!r.ok) throw new Error('not ok');
        const d = await r.json();
        if (mountedRef.current) setReviewDue(Number(d?.due_count) || 0);
      } catch {
        lastReviewFetch.current = 0; // 배지는 없어도 되지만, 다음 이동 때 다시 시도
      }
    })();
  }, [role, pathname]);
  const badgeFor = (href?: string): number => (href === '/vocab/test' ? reviewDue : 0);

  // ── Initial open-section state ──────────────────────────────
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (isStaffRole(role)) {
      // 운영 메뉴는 펼치고, 자주 쓰지 않는 콘텐츠 제작·시스템은 접어 둔다 (직원 화면이 너무 길어지지 않게)
      const closed = new Set<string>([...CONTENT_SECTIONS, '시스템']);
      const init: Record<string, boolean> = {};
      for (const it of buildStaffMenu(role, permissions ?? defaultPermissionsForRole(role))) {
        init[it.section] = !closed.has(it.section);
      }
      return init;
    }
    return {
      '내신': true, 'Hi-내신': true, 'Jr.': true, '어휘': true,
      '학습': true, '내 현황': true,
      '내 학습': true, '학습 콘텐츠': true,
      '설정': true,
    };
  });

  // 학생이 접어 둔 섹션을 기억한다 (브라우저별). 저장소를 못 쓰는 환경에서도 동작해야 하므로 전부 try/catch.
  const OPEN_KEY = `lx_sidebar_open_${role}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPEN_KEY);
      if (raw) setOpenSections((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSection = (section: string) =>
    setOpenSections((prev) => {
      const next = { ...prev, [section]: !(prev[section] ?? true) };
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  // ── Active link detection ─────────────────────────────────────
  // 선택 표시는 "가장 구체적으로 일치하는 메뉴 하나"만. (예전엔 /student 가 /student/home 의 앞부분이라
  // "홈"과 "대시보드"가 동시에 켜지고, /hi-naesin 과 /hi-naesin/passages 도 같이 켜졌다)
  // activeHref 는 아래 items 가 만들어진 뒤에 계산한다 — isActive 는 렌더 중에만 호출되므로 안전하다.
  const isActive = (href?: string) => {
    if (!href) return false;
    return normalizePath(href) === activeHrefRef.current;
  };
  const activeHrefRef = { current: '' as string };

  // ── Nav items: per role + per program ────────────────────────
  const items = useMemo<NavItem[]>(() => {

    // ── 직원 계정(Super / 본사직원 / 원장 / 선생님): 권한으로 거른 공용 메뉴 정의 ─────
    if (isStaffRole(role)) {
      return buildStaffMenu(role, permissions ?? defaultPermissionsForRole(role)) as NavItem[];
    }

    // ── Student: LEXiOX ───────────────────────────────────────
    if (program === 'lexiox') {
      return [
        { section: '내 현황', href: '/student/home', label: '홈', icon: Home },
        { section: '내 현황', href: '/student/schedule', label: '스케줄', icon: Calendar },

        { section: 'Hi-내신', href: '/hi-naesin',        label: 'Hi-내신 드릴', icon: Target },
        { section: 'Hi-내신', href: '/hi-naesin/passages', label: 'Reading', skill: 'reading' as SkillColor },
        { section: 'Hi-내신', href: '/hi-naesin/stats',  label: 'Hi-내신 현황', icon: BarChart2 },
        { section: 'Hi-내신', href: '/hi-naesin/review', label: '직전정리', icon: Zap },

        { section: '내신' as NavSection, href: '/naesin/middle', label: '중학 내신 드릴', icon: GraduationCap },

        { section: 'Jr.' as NavSection, href: '/jr/drill', label: 'Jr. 드릴', icon: PlayCircle },
        { section: 'Jr.' as NavSection, href: '/jr',       label: 'Jr. 학습', icon: BookText },

        { section: '학습', href: '/student/grammar', label: '문법', icon: BookText },
        { section: '학습', href: '/updated-listening/study', label: 'Listening', skill: 'listening' as SkillColor },
        { section: '학습', href: '/langgym', label: 'LXGym', icon: Gamepad2 },

        { section: '어휘', href: '/vocab/hub-new', label: '단어 학습', icon: Library },
        { section: '어휘', href: '/vocab/test', label: '단어 시험', icon: FileCheck },
        { section: '어휘', href: '/vocab/exams', label: '선생님 시험', icon: ClipboardList },

        { section: '숙제', href: '/student/exams',    label: '예상문제', icon: CheckSquare },
        { section: '숙제', href: '/student/homework', label: '내 숙제', icon: ClipboardCheck },
        { section: '숙제', href: '/student/deepcheck', label: 'DeepCheck', icon: SearchCheck },
        { section: '숙제', href: '/student/level-test', label: '레벨 테스트', icon: Gauge },
        { section: '숙제', href: '/student/lectures', label: '강의', icon: Video },

        { section: '설정', href: '/student/progress', label: '포인트 히스토리', icon: Trophy },
        { section: '설정', href: '/student/perks',    label: 'Perk 샵', icon: Gift },
        { section: '설정', href: '/settings',         label: '설정', icon: Settings },
      ];
    }

    // ── Student: TOEFL / GAP ─────────────────────────────────
    // 하루 흐름 기준: 오늘 할 것 → 공부 → 시험·복습 → 연습 → 내 기록
    if (program === 'toefl' || program === 'gap') {
      return [
        { section: '오늘', href: '/student/home',     label: '홈',     icon: Home },
        { section: '오늘', href: '/student/schedule', label: '스케줄', icon: Calendar },
        { section: '오늘', href: '/student/homework', label: '내 숙제', icon: ClipboardCheck },

        { section: '공부하기', href: '/vocab/hub-new',     label: '단어 학습', icon: Library },
        { section: '공부하기', href: '/updated-reading',   label: 'Reading',   icon: BookOpen },
        { section: '공부하기', href: '/updated-listening', label: 'Listening', icon: Headphones },
        { section: '공부하기', href: '/speaking-2026',     label: 'Speaking',  icon: Mic },
        { section: '공부하기', href: '/updated-writing',   label: 'Writing',   icon: PenLine },
        { section: '공부하기', href: '/grammar-2026',      label: '문법',      icon: BookText },

        // 예상문제·시험 목록·선생님 단어 시험·Daily Tests 는 "시험" 한 곳에서 (아직 안 본 개수도 표시)
        { section: '시험·복습', href: '/student/test-center', label: '시험', icon: ClipboardList,
          also: ['/student/exams', '/student/tests', '/student/daily-tests', '/vocab/exams'] },
        { section: '시험·복습', href: '/vocab/test',          label: '단어 시험', icon: FileCheck },
        { section: '시험·복습', href: '/student/review',      label: '복습', icon: RotateCcw },
        { section: '시험·복습', href: '/student/deepcheck',   label: 'DeepCheck', icon: SearchCheck },

        { section: '연습·게임', href: '/speaking-2026/drills',    label: 'Speaking 훈련', icon: Dumbbell },
        { section: '연습·게임', href: '/speaking-2026/shadowing', label: '쉐도잉 게임',   icon: Repeat },
        { section: '연습·게임', href: '/langgym',                 label: 'LXGym',         icon: Gamepad2 },

        { section: '내 기록', href: '/student',            label: '학습 현황', icon: LayoutDashboard },
        { section: '내 기록', href: '/student/progress',   label: '진도 현황', icon: TrendingUp },
        { section: '내 기록', href: '/student/level-test', label: '레벨 테스트', icon: Gauge },
        { section: '내 기록', href: '/student/lectures',   label: '강의', icon: Video },

        // program은 'toefl'이지만 Hi-내신 과제를 별도로 배정받은 경우 — program 필드
        // 하나만으로는 복수 배정을 표현 못 해서, 실제 배정 데이터가 있을 때만 보여준다.
        ...(hasHiNaesin ? [
          { section: 'Hi-내신' as NavSection, href: '/hi-naesin',        label: 'Hi-내신 드릴', icon: Target },
          { section: 'Hi-내신' as NavSection, href: '/hi-naesin/passages', label: 'Reading', skill: 'reading' as SkillColor },
          { section: 'Hi-내신' as NavSection, href: '/hi-naesin/stats',  label: 'Hi-내신 현황', icon: BarChart2 },
          { section: 'Hi-내신' as NavSection, href: '/hi-naesin/review', label: '직전정리', icon: Zap },
        ] : []),

        ...(hasMiddleNaesin ? [
          { section: '내신' as NavSection, href: '/naesin/middle', label: '중학 내신 드릴', icon: GraduationCap },
        ] : []),

        { section: '설정', href: '/settings', label: '설정', icon: Settings },
      ];
    }

    // ── Student: 미지정 (기존 계정 / 하위호환) ──────────────
    return [
      { section: '내 학습', href: '/student/home', label: '홈', icon: Home },
      { section: '내 학습', href: '/student',           label: '대시보드', icon: LayoutDashboard },
      { section: '내 학습', href: '/student/exams',     label: '예상문제', icon: CheckSquare },
      { section: '내 학습', href: '/student/tests',     label: '시험 목록', icon: FileText },
      { section: '내 학습', href: '/student/review',    label: '복습', icon: RotateCcw },
      { section: '내 학습', href: '/student/progress',  label: '진도 현황', icon: TrendingUp },
      { section: '내 학습', href: '/student/homework',  label: '숙제', icon: ClipboardCheck },
      { section: '내 학습', href: '/student/deepcheck', label: 'DeepCheck', icon: SearchCheck },
      { section: '내 학습', href: '/student/level-test', label: '레벨 테스트', icon: Gauge },
      { section: '내 학습', href: '/student/lectures',  label: '강의', icon: Video },

      { section: 'Updated TOEFL' as NavSection, href: '/updated-reading',        label: 'Reading',   icon: BookOpen },
      { section: 'Updated TOEFL' as NavSection, href: '/updated-listening',      label: 'Listening', icon: Headphones },
      { section: 'Updated TOEFL' as NavSection, href: '/speaking-2026',          label: 'Speaking',  icon: Mic },
      { section: 'Updated TOEFL' as NavSection, href: '/updated-writing',        label: 'Writing',   icon: PenLine },
      { section: 'Updated TOEFL' as NavSection, href: '/vocab/hub-new',              label: '단어 학습', icon: Library },
      { section: 'Updated TOEFL' as NavSection, href: '/vocab/test',                 label: '단어 시험', icon: FileCheck },
      { section: 'Updated TOEFL' as NavSection, href: '/vocab/exams', label: '선생님 시험', icon: ClipboardList },
      { section: 'Updated TOEFL' as NavSection, href: '/grammar-2026',           label: 'Lexiox Gram', icon: BookText },
      { section: 'Updated TOEFL' as NavSection, href: '/speaking-2026/drills',   label: 'Speaking 훈련', icon: Dumbbell },
      { section: 'Updated TOEFL' as NavSection, href: '/speaking-2026/shadowing', label: '쉐도잉 게임', icon: Repeat },
      { section: 'Updated TOEFL' as NavSection, href: '/langgym',                label: 'LXGym', icon: Gamepad2 },

      ...(hasHiNaesin ? [
        { section: 'Hi-내신' as NavSection, href: '/hi-naesin',        label: 'Hi-내신 드릴', icon: Target },
        { section: 'Hi-내신' as NavSection, href: '/hi-naesin/passages', label: 'Reading', skill: 'reading' as SkillColor },
        { section: 'Hi-내신' as NavSection, href: '/hi-naesin/stats',  label: 'Hi-내신 현황', icon: BarChart2 },
        { section: 'Hi-내신' as NavSection, href: '/hi-naesin/review', label: '직전정리', icon: Zap },
      ] : []),

      ...(hasMiddleNaesin ? [
        { section: '내신' as NavSection, href: '/naesin/middle', label: '중학 내신 드릴', icon: GraduationCap },
      ] : []),

      { section: '설정', href: '/settings', label: '설정', icon: Settings },
    ];
  }, [role, permissions, program, hasHiNaesin, hasMiddleNaesin]);

  // ── 현재 경로에 해당하는 메뉴 하나 결정 (가장 긴 일치) ───────────
  {
    const cur = pathname;
    // 후보: { tgt: 비교할 경로, key: 선택될 메뉴의 href }  — also 는 "이 메뉴의 하위 경로들"
    const cands: { tgt: string; key: string }[] = [];
    for (const it of items) {
      if (!it.href) continue;
      const key = normalizePath(it.href);
      cands.push({ tgt: key, key });
      for (const extra of it.also ?? []) cands.push({ tgt: normalizePath(extra), key });
    }
    if (role !== 'student' || program === null) {
      for (const it of LEGACY_ITEMS) {
        const key = normalizePath(it.href);
        cands.push({ tgt: key, key });
      }
    }

    let best = { tgt: '', key: '' };
    // 1) 정확히 같거나, 하위 경로인 것 중 가장 긴 것
    for (const c of cands) {
      if (c.tgt === '/') continue;
      if ((cur === c.tgt || cur.startsWith(c.tgt + '/')) && c.tgt.length > best.tgt.length) best = c;
    }
    // 2) 못 찾았으면 예전 방식(끝부분 일치: 라우트 그룹/접두사가 붙은 경로 대비)
    if (!best.key) {
      for (const c of cands) {
        if (c.tgt !== '/' && cur !== '/' && cur.endsWith(c.tgt) && c.tgt.length > best.tgt.length) best = c;
      }
    }
    // 3) 루트(/)는 /home 으로 취급
    if (!best.key && (cur === '/' || cur === '') && cands.some((c) => c.key === '/home')) best = { tgt: '/home', key: '/home' };
    activeHrefRef.current = best.key;
  }

  // ── Group items by section (preserves insertion order) ──────
  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const it of items) {
      if (!map.has(it.section)) map.set(it.section, []);
      map.get(it.section)!.push(it);
    }
    return [...map.entries()] as [string, NavItem[]][];
  }, [items]);

  // ── Legacy visibility: hide for program-assigned students ───
  const showLegacy = role === 'admin' || (role === 'student' && program === null);
  // 그룹 머리글(OPERATIONS/CONTENT/…)은 그룹이 둘 이상일 때만 의미가 있다 (선생님·원장 메뉴는 한 그룹)
  const hasManyGroups = new Set(groups.map(([sec]) => SECTION_GROUP[sec]).filter(Boolean)).size > 1;

  // 실제 너비/숨김은 부모(ProtectedLayoutClient)의 <aside>가 결정한다 —
  // 여기서는 collapsed prop에 따라 아이콘 전용 레이아웃으로만 전환한다.
  return (
    <div className="flex flex-col bg-neutral-50 h-full w-full">
      <nav className="flex-1 overflow-y-auto py-3 text-sm">
        {groups.map(([section, list], idx) => {
          const open      = openSections[section] ?? true;
          // 항목이 하나뿐이고 이름이 섹션과 같으면("설정" 안의 "설정") 헤더가 중복이라 숨긴다
          const hideHeader = list.length === 1 && list[0].label === section;
          const showItems = collapsed || open || hideHeader;
          const theme     = getSectionTheme(section);
          const groupLabel = SECTION_GROUP[section];
          const prevGroupLabel = idx > 0 ? SECTION_GROUP[groups[idx - 1][0]] : undefined;
          const showGroupHeader = !collapsed && hasManyGroups && groupLabel && groupLabel !== prevGroupLabel;

          return (
            <div key={section} className={[idx > 0 ? 'mt-1' : '', showGroupHeader ? 'pt-5' : ''].join(' ')}>
              {showGroupHeader && (
                <div className="px-4 pb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    {groupLabel}
                  </span>
                </div>
              )}
              {/* Section header */}
              {!hideHeader && (
              <button
                type="button"
                onClick={() => !collapsed && toggleSection(section)}
                className={[
                  'flex w-full items-center justify-between px-3 py-2 mx-1',
                  !collapsed ? 'hover:bg-neutral-200/50 rounded-lg transition-colors' : 'justify-center',
                ].join(' ')}
                style={!collapsed ? { width: 'calc(100% - 0.5rem)' } : undefined}
              >
                {!collapsed ? (
                  <>
                    <span className={['text-xs font-bold tracking-wide', theme.header].join(' ')}>
                      {lang === 'en' ? (SECTION_EN[section as NavSection] ?? section) : section}
                    </span>
                    <ChevronDown
                      className={[
                        'h-3.5 w-3.5 transition-transform duration-200',
                        theme.header, 'opacity-50',
                        open ? 'rotate-180' : '',
                      ].join(' ')}
                    />
                  </>
                ) : (
                  <span className={['text-[10px] font-bold uppercase tracking-widest', theme.header].join(' ')}>
                    {collapsedLabel(section)}
                  </span>
                )}
              </button>
              )}

              {/* Section items */}
              {showItems && (
                <ul className="mb-1">
                  {list.map((it, itemIdx) => {
                    const active = isActive(it.href);

                    if (it.disabled || !it.href) {
                      return (
                        <li key={`${section}-${it.label}-${itemIdx}`}>
                          <div
                            className={[
                              'flex items-center rounded-lg mx-3 px-3 py-1.5 text-sm',
                              collapsed ? 'justify-center' : 'justify-between',
                              'text-neutral-300',
                            ].join(' ')}
                          >
                            {!collapsed && (
                              <>
                                <span className="truncate text-neutral-300">{it.label.replace(' (soon)', '')}</span>
                                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-400">Soon</span>
                              </>
                            )}
                            {collapsed && (
                              <span aria-hidden className="h-1 w-4 rounded-full bg-neutral-200" />
                            )}
                          </div>
                        </li>
                      );
                    }

                    const skillActive  = active && it.skill ? SKILL_ACTIVE[it.skill]  : '';
                    const skillHover   = !active && it.skill ? SKILL_HOVER[it.skill]   : '';
                    const activeColorClasses = it.skill ? skillActive : theme.active;
                    const linkClasses = [
                      'group flex items-center rounded-lg my-0.5 py-2 text-sm transition-colors',
                      collapsed ? 'mx-2 px-0 justify-center border-l-0' : 'mx-2 pl-[9px] pr-3 border-l-[3px] justify-between',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70',
                      active
                        ? `${activeColorClasses} font-semibold`
                        : [
                            'border-transparent text-neutral-600',
                            it.skill ? skillHover : theme.hover,
                          ].join(' '),
                    ].join(' ');

                    // active일 때는 색을 따로 안 주고 Link의 text-* 색(theme.active)을 그대로 물려받는다
                    // (lucide 아이콘은 stroke="currentColor"라 부모 text color를 그대로 따라감).
                    const iconColorClass = 'text-neutral-500 group-hover:text-neutral-700';

                    return (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          prefetch
                          aria-current={active ? 'page' : undefined}
                          className={linkClasses}
                        >
                          {it.icon ? (
                            <it.icon className={[
                              'shrink-0 transition-colors',
                              active ? '' : iconColorClass,
                              collapsed ? 'h-4 w-4' : 'h-3.5 w-3.5 mr-2.5',
                            ].join(' ')} />
                          ) : !collapsed && (
                            <span className="w-5 shrink-0" />
                          )}
                          {!collapsed && (
                            <>
                              <span className="truncate flex-1">{it.label}</span>
                              {badgeFor(it.href) > 0 && (
                                <span
                                  className="mr-1 min-w-[18px] rounded-full bg-rose-500 px-1.5 text-center text-[10px] font-bold leading-[18px] text-white"
                                  title="오늘 복습할 단어"
                                >
                                  {badgeFor(it.href)}
                                </span>
                              )}
                              <ChevronRight
                                className={[
                                  'h-3.5 w-3.5 shrink-0 transition-colors',
                                  active
                                    ? it.skill ? SKILL_CHEVRON[it.skill] : theme.chevron
                                    : 'text-neutral-200 group-hover:text-neutral-300',
                                ].join(' ')}
                              />
                            </>
                          )}
                          {collapsed && !it.icon && (
                            <span
                              aria-hidden
                              className={[
                                'h-1 w-4 rounded-full',
                                active
                                  ? it.skill ? SKILL_DOT[it.skill] : theme.dot
                                  : 'bg-neutral-200',
                              ].join(' ')}
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        {/* Legacy — admin / teacher / unassigned student만 */}
        {showLegacy && (
          <div className="mt-4 border-t border-neutral-100 pt-3">
            <button
              type="button"
              onClick={() => setLegacyOpen((v) => !v)}
              className={[
                'flex w-full items-center justify-between rounded-lg px-4 py-2',
                'text-[11px] font-bold uppercase tracking-wider text-neutral-400',
                'transition hover:bg-emerald-50/60',
              ].join(' ')}
            >
              <span>{collapsed ? 'L' : 'Legacy'}</span>
              {!collapsed && (
                <span className="text-[10px] text-neutral-300">
                  {legacyOpen ? '▴' : '▾'}
                </span>
              )}
            </button>

            {!collapsed && legacyOpen && (
              <ul className="mt-0.5">
                {LEGACY_ITEMS.map((it) => {
                  const active = isActive(it.href);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        prefetch
                        aria-current={active ? 'page' : undefined}
                        className={[
                          'group flex items-center justify-between rounded-lg px-4 py-2 text-sm transition-colors',
                          'hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70',
                          'border-l-2',
                          active
                            ? 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-700'
                            : 'border-transparent text-neutral-700 hover:text-neutral-900',
                        ].join(' ')}
                      >
                        <span className="truncate">{it.label}</span>
                        <ChevronRight
                          className={[
                            'h-3.5 w-3.5 shrink-0 transition-colors',
                            active ? 'text-emerald-400' : 'text-neutral-200 group-hover:text-emerald-300',
                          ].join(' ')}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
