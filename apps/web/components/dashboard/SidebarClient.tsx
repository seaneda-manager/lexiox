'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  LayoutDashboard, BookOpen, Headphones, Mic, PenLine, BookText,
  ClipboardList, FileText, GraduationCap, Library, List, Download,
  Upload, Send, BarChart2, Home, UserPlus, CheckSquare, Users,
  ClipboardCheck, PlayCircle, Gift, ShieldCheck, Globe, Settings,
  type LucideProps,
} from 'lucide-react';
import { useLang } from '@/contexts/LangContext';

type Icon = React.ComponentType<LucideProps>;

type Role    = 'student' | 'teacher' | 'admin';
type Program = 'gap' | 'toefl' | 'lexiox' | null;
type Props   = { role: Role; program?: Program };

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
function normalizePath(s: string | null | undefined) {
  if (!s) return '/';
  let clean = s.split('?')[0];
  if (!clean.startsWith('/')) clean = '/' + clean;
  clean = clean.replace(/\/\([^/]+\)/g, '');
  clean = clean.replace(/\/+$/, '');
  if (!clean) clean = '/';
  return clean;
}

function collapsedLabel(section: string) {
  const map: Record<string, string> = {
    '대시보드': 'D', 'Updated TOEFL': 'UT', 'Updated-Speaking': 'US', '내신관리': 'N',
    'Jr.': 'Jr', '어휘관리': 'V', '콘텐츠 허브': '콘', '선생님 도구': 'T', '시스템': 'S',
    '학생 관리': '관',
    '내신': '내', 'Hi-내신': 'Hi', '어휘': '어', '숙제': '숙', '학습': '학', '내 현황': '현',
    '내 학습': '나', '학습 콘텐츠': '콘',
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
export default function SidebarClient({ role, program = null }: Props) {
  const pathnameRaw = usePathname() || '/';
  const pathname    = normalizePath(pathnameRaw);
  const { lang }    = useLang();

  const [collapsed, setCollapsed]   = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);

  // ── Initial open-section state ──────────────────────────────
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (role === 'admin') {
      return {
        '대시보드': true, 'Updated TOEFL': true, 'Updated-Speaking': true, '내신관리': true,
        'Jr.': true, '어휘관리': true,
        '콘텐츠 허브': true, '선생님 도구': true, '시스템': true,
      };
    }
    if (role === 'teacher') {
      return { '콘텐츠': true, '학생 관리': true, '설정': true };
    }
    return {
      '내신': true, 'Hi-내신': true, 'Jr.': true, '어휘': true,
      '학습': true, '내 현황': true,
      '내 학습': true, '학습 콘텐츠': true,
      '설정': true,
    };
  });

  const toggleSection = (section: string) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));

  // ── Active link detection ─────────────────────────────────────
  const isActive = (href?: string) => {
    if (!href) return false;
    const cur = pathname;
    const tgt = normalizePath(href);
    if ((cur === '/' || cur === '') && tgt === '/home') return true;
    if (cur === tgt) return true;
    if (cur.startsWith(tgt + '/')) return true;
    if (cur !== '/' && tgt !== '/' && cur.endsWith(tgt)) return true;
    return false;
  };

  // ── Exam-route auto-collapse ─────────────────────────────────
  const isExamRoute = useMemo(() => {
    const p = normalizePath(pathnameRaw);
    const exam = /(study|test|adaptive-demo|demo)/;
    return (
      (/\/updated-reading\//.test(p)  && exam.test(p)) ||
      (/\/updated-listening\//.test(p) && exam.test(p)) ||
      (/\/speaking-2026\//.test(p) && exam.test(p)) ||
      (/\/writing-2026\//.test(p)  && exam.test(p)) ||
      (/\/voca\//.test(p)          && exam.test(p)) ||
      /\/hi-naesin\/drill\//.test(p)
    );
  }, [pathnameRaw]);

  // ── Nav items: per role + per program ────────────────────────
  const items = useMemo<NavItem[]>(() => {

    // ── Admin ─────────────────────────────────────────────────
    if (role === 'admin') {
      return [
        { section: '대시보드' as NavSection, href: '/admin', label: '대시보드', icon: LayoutDashboard },

        { section: 'Updated TOEFL' as NavSection, href: '/admin/content/updated-reading',   label: 'Reading',   icon: BookOpen },
        { section: 'Updated TOEFL' as NavSection, href: '/admin/content/updated-listening', label: 'Listening', icon: Headphones },
        { section: 'Updated TOEFL' as NavSection, href: '/admin/content/updated-writing',   label: 'Writing',   icon: PenLine },
        { section: 'Updated TOEFL' as NavSection, href: '/admin/content/grammar-2026',      label: 'Grammar',   icon: BookText },

        { section: 'Updated-Speaking' as NavSection, href: '/admin/content/updated-speaking',  label: 'Speaking',  icon: Mic },
        { section: 'Updated-Speaking' as NavSection, href: '/admin/speaking-drills',           label: '🎮 Speaking 훈련',  icon: PlayCircle },

        { section: '내신관리' as NavSection, href: '/admin/naesin',              label: '고등 드릴 관리', icon: ClipboardList },
        { section: '내신관리' as NavSection, href: '/admin/hi-naesin/passages',  label: '고등 지문',      icon: FileText },
        { section: '내신관리' as NavSection, href: '/admin/middle-naesin/units', label: '중학 단원·드릴', icon: GraduationCap },

        { section: 'Jr.' as NavSection, href: '/admin/jr/content/generate',              label: 'AI 콘텐츠 생성', icon: Mic },
        { section: 'Jr.' as NavSection, href: '/admin/jr/content/review',               label: 'AI 검토',        icon: ClipboardCheck },
        { section: 'Jr.' as NavSection, href: '/admin/jr/content/reading',              label: '📖 읽기',         icon: FileText },
        { section: 'Jr.' as NavSection, href: '/admin/jr/content/grammar',              label: '📚 문법',         icon: BookOpen },
        { section: 'Jr.' as NavSection, href: '/admin/jr/content/listening',            label: '🎧 청취',         icon: Headphones },
        { section: 'Jr.' as NavSection, href: '/admin/jr/content/speaking-writing',     label: '🎤 말하기/쓰기', icon: Mic },

        { section: '어휘관리' as NavSection, href: '/admin/vocab/assign',      label: '단어 배정',       icon: UserPlus },
        { section: '어휘관리' as NavSection, href: '/admin/vocab/sets',        label: '단어 책 관리',    icon: Library },
        { section: '어휘관리' as NavSection, href: '/admin/vocab/words',        label: '단어 목록',       icon: List },
        { section: '어휘관리' as NavSection, href: '/admin/vocab/words/import', label: '단어 가져오기',   icon: Download },
        { section: '어휘관리' as NavSection, href: '/admin/vocab/import',       label: 'CSV 업로드',      icon: Upload },
        { section: '어휘관리' as NavSection, href: '/admin/vocab/Tracks',       label: '트랙 배포',       icon: Send },
        { section: '어휘관리' as NavSection, href: '/admin/vocab/progress',     label: '학생 진행 현황',  icon: BarChart2 },

        { section: '선생님 도구' as NavSection, href: '/teacher/home',             label: '선생님 홈',    icon: Home },
        { section: '선생님 도구' as NavSection, href: '/admin/students',           label: '학생 추가/관리', icon: UserPlus },
        { section: '선생님 도구' as NavSection, href: '/teacher/tasks',            label: '할 일 관리',   icon: CheckSquare },
        { section: '선생님 도구' as NavSection, href: '/teacher/students',         label: '학생 현황',    icon: Users },
        { section: '선생님 도구' as NavSection, href: '/teacher/reports/students', label: '활동 리포트',  icon: BarChart2 },
        { section: '선생님 도구' as NavSection, href: '/admin/homework',           label: '숙제 채점',    icon: ClipboardCheck },
        { section: '선생님 도구' as NavSection, href: '/admin/lectures',           label: '강의 관리',    icon: PlayCircle },
        { section: '선생님 도구' as NavSection, href: '/admin/toefl/curriculum',     label: 'TOEFL 커리',     icon: PlayCircle },
        { section: '선생님 도구' as NavSection, href: '/admin/toefl/content/practice', label: 'Practice 지문', icon: PlayCircle },

        { section: '시스템' as NavSection, href: '/admin/perks',    label: 'Perk 관리',  icon: Gift },
        { section: '시스템' as NavSection, href: '/admin/users',    label: '사용자/권한', icon: ShieldCheck },
        { section: '시스템' as NavSection, href: '/admin/landing',  label: '랜딩 페이지', icon: Globe },
        { section: '시스템' as NavSection, href: '/admin/settings', label: '설정',       icon: Settings },
      ];
    }

    // ── Teacher ───────────────────────────────────────────────
    if (role === 'teacher') {
      return [
        { section: '콘텐츠',  href: '/home',  label: '홈', icon: Home },
        { section: '콘텐츠',  href: '/vocab/hub-new', label: '단어 학습', icon: Library },
        { section: '콘텐츠',  href: '/teacher/speaking-drills', label: '🎮 Speaking 훈련', icon: PlayCircle },

        { section: '학생 관리', href: '/teacher/home',     label: '선생님 홈', icon: Home },
        { section: '학생 관리', href: '/teacher/tasks',    label: '할 일 관리', icon: CheckSquare },
        { section: '학생 관리', href: '/teacher/students', label: '학생 현황', icon: Users },

        { section: '설정', href: '/settings', label: '설정', icon: Settings },
      ];
    }

    // ── Student: LEXiOX ───────────────────────────────────────
    if (program === 'lexiox') {
      return [
        { section: '내 현황', href: '/student/home', label: '홈', icon: Home },

        { section: 'Hi-내신', href: '/hi-naesin',        label: 'Hi-내신 드릴', icon: PlayCircle },
        { section: 'Hi-내신', href: '/hi-naesin/passages', label: 'Reading', skill: 'reading' as SkillColor },
        { section: 'Hi-내신', href: '/hi-naesin/stats',  label: '학습 현황', icon: BarChart2 },
        { section: 'Hi-내신', href: '/hi-naesin/review', label: '직전정리', icon: BookOpen },

        { section: '내신' as NavSection, href: '/naesin/middle', label: '중학 내신 드릴', icon: ClipboardList },

        { section: 'Jr.' as NavSection, href: '/jr/drill', label: 'Jr. 드릴', icon: PlayCircle },

        { section: '학습', href: '/updated-listening/study', label: 'Listening', skill: 'listening' as SkillColor },
        { section: '학습', href: '/grammar-2026',          label: 'Grammar', icon: BookText },

        { section: '어휘', href: '/vocab/hub-new', label: '단어 학습', icon: Library },

        { section: '숙제', href: '/student/exams',    label: '📋 예상문제', icon: CheckSquare },
        { section: '숙제', href: '/student/homework', label: '숙제 채점', icon: ClipboardCheck },
        { section: '숙제', href: '/student/lectures', label: '🎬 강의', icon: PlayCircle },

        { section: '설정', href: '/student/progress', label: '포인트 히스토리', icon: BarChart2 },
        { section: '설정', href: '/student/perks',    label: 'Perk 샵', icon: Gift },
        { section: '설정', href: '/settings',         label: '설정', icon: Settings },
      ];
    }

    // ── Student: TOEFL / GAP ─────────────────────────────────
    if (program === 'toefl' || program === 'gap') {
      return [
        { section: '내 현황', href: '/student/home', label: '홈', icon: Home },

        { section: '학습', href: '/updated-reading',        label: 'Reading',   icon: BookOpen },
        { section: '학습', href: '/updated-listening',      label: 'Listening', icon: Headphones },
        { section: '학습', href: '/speaking-2026',          label: 'Speaking',  icon: Mic },
        { section: '학습', href: '/updated-writing',        label: 'Writing',   icon: PenLine },
        { section: '학습', href: '/vocab/hub-new',              label: '단어 학습', icon: Library },
        { section: '학습', href: '/grammar-2026',           label: 'Lexiox Gram', icon: BookText },
        { section: '학습', href: '/speaking-2026/drills',   label: 'Speaking 훈련', icon: PlayCircle },
        { section: '학습', href: '/speaking-2026/shadowing', label: '쉐도잉 게임', icon: PlayCircle },

        { section: '내 현황', href: '/student',            label: '대시보드', icon: LayoutDashboard },
        { section: '내 현황', href: '/student/exams',       label: '📋 예상문제', icon: CheckSquare },
        { section: '내 현황', href: '/student/homework',   label: '숙제 채점', icon: ClipboardCheck },
        { section: '내 현황', href: '/student/lectures',  label: '🎬 강의', icon: PlayCircle },
        { section: '내 현황', href: '/student/tests',      label: '시험 목록', icon: FileText },
        { section: '내 현황', href: '/student/review',     label: '복습', icon: BookOpen },
        { section: '내 현황', href: '/student/progress',   label: '진도 현황', icon: BarChart2 },

        { section: '설정', href: '/settings', label: '설정', icon: Settings },
      ];
    }

    // ── Student: 미지정 (기존 계정 / 하위호환) ──────────────
    return [
      { section: '내 학습', href: '/student/home', label: '홈', icon: Home },
      { section: '내 학습', href: '/student',           label: '대시보드', icon: LayoutDashboard },
      { section: '내 학습', href: '/student/exams',     label: '📋 예상문제', icon: CheckSquare },
      { section: '내 학습', href: '/student/tests',     label: '시험 목록', icon: FileText },
      { section: '내 학습', href: '/student/review',    label: '복습', icon: BookOpen },
      { section: '내 학습', href: '/student/progress',  label: '진도 현황', icon: BarChart2 },
      { section: '내 학습', href: '/student/homework',  label: '숙제', icon: ClipboardCheck },
      { section: '내 학습', href: '/student/lectures',  label: '🎬 강의', icon: PlayCircle },

      { section: 'Updated TOEFL' as NavSection, href: '/updated-reading',        label: 'Reading',   icon: BookOpen },
      { section: 'Updated TOEFL' as NavSection, href: '/updated-listening',      label: 'Listening', icon: Headphones },
      { section: 'Updated TOEFL' as NavSection, href: '/speaking-2026',          label: 'Speaking',  icon: Mic },
      { section: 'Updated TOEFL' as NavSection, href: '/updated-writing',        label: 'Writing',   icon: PenLine },
      { section: 'Updated TOEFL' as NavSection, href: '/vocab/hub-new',              label: '단어 학습', icon: Library },
      { section: 'Updated TOEFL' as NavSection, href: '/grammar-2026',           label: 'Lexiox Gram', icon: BookText },
      { section: 'Updated TOEFL' as NavSection, href: '/speaking-2026/drills',   label: 'Speaking 훈련', icon: PlayCircle },
      { section: 'Updated TOEFL' as NavSection, href: '/speaking-2026/shadowing', label: '쉐도잉 게임', icon: PlayCircle },

      { section: '설정', href: '/settings', label: '설정', icon: Settings },
    ];
  }, [role, program]);

  // ── Group items by section (preserves insertion order) ──────
  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const it of items) {
      if (!map.has(it.section)) map.set(it.section, []);
      map.get(it.section)!.push(it);
    }
    return [...map.entries()] as [string, NavItem[]][];
  }, [items]);

  // ── Sidebar events ────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setCollapsed((v) => !v);
    document.addEventListener('toggle-sidebar', handler);
    return () => document.removeEventListener('toggle-sidebar', handler);
  }, []);

  useEffect(() => {
    if (isExamRoute) setCollapsed(true);
  }, [isExamRoute]);

  // ── Legacy visibility: hide for program-assigned students ───
  const showLegacy = role !== 'student' || program === null;

  // ── Width ─────────────────────────────────────────────────────
  const widthClass = collapsed
    ? isExamRoute ? 'w-0 border-0' : 'w-14'
    : 'w-60';

  return (
    <div
      className={[
        'flex flex-col bg-white transition-all duration-300 h-full',
        widthClass,
        !collapsed || !isExamRoute ? '' : '',
      ].join(' ')}
    >
      <nav className="flex-1 overflow-y-auto py-2 text-sm">
        {groups.map(([section, list], idx) => {
          const open      = openSections[section] ?? true;
          const showItems = collapsed || open;
          const theme     = getSectionTheme(section);
          const groupLabel = SECTION_GROUP[section];
          const prevGroupLabel = idx > 0 ? SECTION_GROUP[groups[idx - 1][0]] : undefined;
          const showGroupHeader = !collapsed && groupLabel && groupLabel !== prevGroupLabel;

          return (
            <div key={section} className={['', idx > 0 ? 'mt-1 border-t border-neutral-100 pt-1' : ''].join(' ')}>
              {showGroupHeader && (
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    {groupLabel}
                  </span>
                </div>
              )}
              {/* Section header */}
              <button
                type="button"
                onClick={() => !collapsed && toggleSection(section)}
                className={[
                  'flex w-full items-center justify-between px-3 py-2',
                  !collapsed ? 'hover:bg-neutral-50 rounded-lg' : 'justify-center',
                ].join(' ')}
              >
                {!collapsed ? (
                  <>
                    <span className={['text-xs font-bold tracking-wide', theme.header].join(' ')}>
                      {lang === 'en' ? (SECTION_EN[section as NavSection] ?? section) : section}
                    </span>
                    <span className={['text-xs font-medium', theme.header, 'opacity-50'].join(' ')}>
                      {open ? '▴' : '▾'}
                    </span>
                  </>
                ) : (
                  <span className={['text-[10px] font-bold uppercase tracking-widest', theme.header].join(' ')}>
                    {collapsedLabel(section)}
                  </span>
                )}
              </button>

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
                    const linkClasses = [
                      'group flex items-center rounded-lg mx-3 py-1.5 text-sm transition-colors',
                      'px-3',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70',
                      collapsed ? 'justify-center' : 'justify-between',
                      active
                        ? it.skill
                          ? `${skillActive} font-semibold`
                          : `${theme.active} font-semibold`
                        : it.skill
                          ? `text-neutral-600 ${skillHover}`
                          : `text-neutral-600 ${theme.hover}`,
                    ].join(' ');

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
                              'shrink-0 transition-colors text-neutral-600',
                              collapsed ? 'h-4 w-4' : 'h-3.5 w-3.5 mr-2',
                            ].join(' ')} />
                          ) : !collapsed && (
                            <span className="w-5 shrink-0" />
                          )}
                          {!collapsed && (
                            <>
                              <span className="truncate flex-1">{it.label}</span>
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
