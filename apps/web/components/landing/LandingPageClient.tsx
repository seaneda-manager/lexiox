"use client";

import Link from "next/link";
import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────
export type HeroConfig = {
  subtitle: string;
  title: string;
  body: string;
  fontFamily: "serif" | "sans";
};
export type ProgramItem = { id: string; title: string; desc: string };
export type RoleSection = { title: string; heading: string; body: string; bullets: string[] };
export type StorySection = { quote: string; author: string };
export type JoinSection = { heading: string; body: string };

export type LandingContent = {
  hero: HeroConfig;
  programs: ProgramItem[];
  programsHeading: string;
  programsSubheading: string;
  teachers: RoleSection;
  learners: RoleSection;
  story: StorySection;
  join: JoinSection;
  nav: { programs: string; teachers: string; learners: string; stories: string; login: string; signup: string };
  cta: { student: string; teacher: string; parent: string };
  learnMore: string;
  classSnapshot: string;
  todayMission: string;
  todayMissionBody: string;
  streakLabel: string;
  streakDays: string;
  footer: { tagline: string; about: string; ourStory: string; forAcademies: string; programs: string; contact: string; helpCenter: string; partnerships: string; copyright: string };
};

// ── 한국어 콘텐츠 ──────────────────────────────────────────────
export const KO_CONTENT: LandingContent = {
  hero: {
    subtitle: "LEXiOX · 토플 · 아카데미 플랫폼",
    title: "모든 언어 학습자를,\n모든 교실에서.\n진짜 실력 향상.\n눈에 보이는 결과.",
    body: "LEXiOX는 토플·SAT·ACT 준비, 학원 관리, 실시간 피드백을 하나로 연결하는 적응형 영어 학습 플랫폼입니다. 학생, 선생님, 학부모 모두가 학습 성장을 정확히 확인할 수 있습니다.",
    fontFamily: "serif",
  },
  programs: [
    { id: "p1", title: "토플 대비 & 모의고사", desc: "적응형 Reading·Listening, Speaking·Writing 연습 세트와 실시간 AI 피드백 리포트를 제공합니다." },
    { id: "p2", title: "LEXiOX Jr. · 내신 · LEXiOX", desc: "중·고등학생을 위한 전용 모듈로 내신과 영어 기초를 동시에 잡습니다." },
    { id: "p3", title: "GAP (글로벌 아트 패스웨이) 커리큘럼", desc: "2개월 집중 과정으로 학생의 잠재력을 최대로 끌어냅니다." },
  ],
  programsHeading: "모든 학습자를 위한 프로그램",
  programsSubheading: "두 프로그램, 하나의 계정. 원하는 과정을 선택하거나 둘 다 수강하세요.",
  teachers: {
    title: "선생님",
    heading: "수업을 차별화하고 모든 학생을 집중시키세요.",
    body: "토플 세트를 배정하고, 실시간 결과를 확인하고, 수업 시간을 서류 작업이 아닌 코칭에 집중하세요. LEXiOX는 한눈에 파악이 필요한 학원 선생님을 위해 만들어졌습니다.",
    bullets: [
      "스킬·지문·문제 유형별 즉각 리포트",
      "Reading·Listening 자동 채점 및 상세 해설",
      "숙제 관리 및 학급 대시보드",
    ],
  },
  learners: {
    title: "학습자 & 학생",
    heading: "무엇이든 배울 수 있습니다.",
    body: "읽기, 듣기, 말하기, 쓰기 전 영역을 탄탄히 다지세요. 내가 푼 모든 문제가 시스템을 학습시켜 더 맞춤화된 도움을 줍니다.",
    bullets: [
      "실력 바로 위를 유지하는 적응형 난이도",
      "학생 친화적인 한국어·영어 즉각 해설",
      "매일 연습을 즐겁게 만드는 포인트 시스템",
    ],
  },
  story: {
    quote: "전에는 토플 리딩을 감으로 풀었어요. LEXiOX 덕분에 왜 틀렸는지, 무엇을 고쳐야 하는지 드디어 보이기 시작했어요.",
    author: "지호 · 고등학생",
  },
  join: {
    heading: "오늘 LEXiOX를 시작하세요",
    body: "단 하나의 학급으로 시작하거나, 학원 전체에 도입하세요. LEXiOX는 학습자와 함께 성장합니다.",
  },
  nav: { programs: "프로그램", teachers: "선생님용", learners: "학생용", stories: "후기", login: "로그인", signup: "가입하기" },
  cta: { student: "학생으로 시작하기 →", teacher: "선생님으로 시작하기", parent: "학부모로 시작하기" },
  learnMore: "자세히 보기 →",
  classSnapshot: "학급 현황",
  todayMission: "오늘의 미션",
  todayMissionBody: "토플 세트 1개와 LEXiOX 미션 1개를 완료하세요.",
  streakLabel: "연속 학습 유지하며 실력을 쌓아가세요.",
  streakDays: "3일 연속",
  footer: {
    tagline: "진실을 탐구하고, 학습을 완성하고, 열정 있는 모든 학습자에게 수준 높은 영어 교육을 제공합니다.",
    about: "소개",
    ourStory: "우리 이야기",
    forAcademies: "학원을 위한 LEXiOX",
    programs: "프로그램",
    contact: "문의",
    helpCenter: "도움말 센터",
    partnerships: "제휴 문의",
    copyright: "모든 권리 보유.",
  },
};

// ── 영어 콘텐츠 ────────────────────────────────────────────────
export const EN_CONTENT: LandingContent = {
  hero: {
    subtitle: "LEXIOX · TOEFL · ACADEMY PLATFORM",
    title: "For every Language learner,\nevery classroom.\nReal progress.\nMeasurable results.",
    body: "LEXiOX connects adaptive Language Learning platform specializing in TOEFL, SAT, ACT Prep, academy management, and real-time feedback into one place, so students, teachers, and parents can see exactly how learning grows.",
    fontFamily: "serif",
  },
  programs: [
    { id: "p1", title: "TOEFL Prep & Mock TEST", desc: "Adaptive Reading & Listening, plus Speaking & Writing practice sets with real-time AI feedback reports." },
    { id: "p2", title: "LEXiOX English Jr. · Naesin · LEXiOX", desc: "A dedicated module for middle & high school learners." },
    { id: "p3", title: "GAP (Global Art Pathway) Curriculum", desc: "Two-month intensive to help students reach their full potential." },
  ],
  programsHeading: "Programs for every learner",
  programsSubheading: "Two programs, one account. Pick a lane, or run both.",
  teachers: {
    title: "TEACHERS",
    heading: "Differentiate your classroom and engage every student.",
    body: "Assign TOEFL sets, see real-time results, and focus your class time on coaching—not paperwork. LEXiOX is built for academy teachers who need clarity at a glance.",
    bullets: [
      "Instant reports by skill, passage, and question type",
      "Auto-graded Reading & Listening with detailed explanations",
      "Homework tracking and class dashboards",
    ],
  },
  learners: {
    title: "LEARNERS AND STUDENTS",
    heading: "You can learn anything.",
    body: "Build solid understanding in reading, listening, speaking, and writing. Every question you answer teaches the system how to help you more.",
    bullets: [
      "Adaptive difficulty that stays just above your comfort zone",
      "Instant explanations in clear, student-friendly English",
      "Point system to keep daily practice fun and continuity",
    ],
  },
  story: {
    quote: "I used to guess my way through TOEFL Reading. With LEXiOX, I can finally see why I got each question wrong—and what to fix next.",
    author: "JIHO · HIGH SCHOOL STUDENT",
  },
  join: {
    heading: "Join LEXiOX today",
    body: "Start with a single class, or roll out to your whole Academy. LEXiOX grows with your learners.",
  },
  nav: { programs: "Programs", teachers: "For Teachers", learners: "For Students", stories: "Stories", login: "Login", signup: "Sign up" },
  cta: { student: "Start as Student →", teacher: "Start as Teacher", parent: "Start as Parent" },
  learnMore: "Learn more →",
  classSnapshot: "CLASS SNAPSHOT",
  todayMission: "TODAY'S MISSION",
  todayMissionBody: "Complete 1 set in TOEFL and 1 mission in LEXiOX.",
  streakLabel: "Keep your streak alive and build momentum.",
  streakDays: "3-day streak",
  footer: {
    tagline: "To seek truth, master learning, and make high-quality English education accessible for every motivated learner.",
    about: "About",
    ourStory: "Our story",
    forAcademies: "For academies",
    programs: "Programs",
    contact: "Contact",
    helpCenter: "Help center",
    partnerships: "Partnerships",
    copyright: "All rights reserved.",
  },
};

// ── Saved config shape (from admin editor) ─────────────────────
type SavedConfig = Record<string, unknown>;

function mergeContent(base: LandingContent, saved: SavedConfig | undefined, koKey: boolean): LandingContent {
  if (!saved) return base;
  const src = koKey ? (saved.ko as SavedConfig | undefined) : saved;
  if (!src) return base;

  const hero = src.hero as Partial<HeroConfig> | undefined;
  const programs = src.programs as ProgramItem[] | undefined;
  const teachers = src.teachers as Partial<RoleSection> | undefined;
  const learners = src.learners as Partial<RoleSection> | undefined;
  const story = src.story as Partial<StorySection> | undefined;
  const join = src.join as Partial<JoinSection> | undefined;

  return {
    ...base,
    hero: hero ? { ...base.hero, ...hero } : base.hero,
    programs: programs?.length ? programs : base.programs,
    programsHeading: (src.programsHeading as string) || base.programsHeading,
    programsSubheading: (src.programsSubheading as string) || base.programsSubheading,
    teachers: teachers ? { ...base.teachers, ...teachers } : base.teachers,
    learners: learners ? { ...base.learners, ...learners } : base.learners,
    story: story ? { ...base.story, ...story } : base.story,
    join: join ? { ...base.join, ...join } : base.join,
  };
}

// ── Component ──────────────────────────────────────────────────
export default function LandingPageClient({ savedConfig }: { savedConfig?: SavedConfig }) {
  const [lang, setLang] = useState<"ko" | "en">("ko");

  const c = lang === "ko"
    ? mergeContent(KO_CONTENT, savedConfig, true)
    : mergeContent(EN_CONTENT, savedConfig, false);

  const titleLines = c.hero.title.split("\n");

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/LEXiOX.png" alt="LEXiOX" className="h-10 w-auto" />

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#programs" className="hover:text-emerald-800 transition-colors">{c.nav.programs}</a>
            <a href="#teachers" className="hover:text-emerald-800 transition-colors">{c.nav.teachers}</a>
            <a href="#learners" className="hover:text-emerald-800 transition-colors">{c.nav.learners}</a>
            <a href="#stories" className="hover:text-emerald-800 transition-colors">{c.nav.stories}</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "ko" ? "en" : "ko")}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-800 transition-colors"
            >
              <span className="text-base leading-none">{lang === "ko" ? "🇺🇸" : "🇰🇷"}</span>
              {lang === "ko" ? "EN" : "한국어"}
            </button>
            <Link href="/auth/login" className="hidden text-sm font-medium text-slate-600 hover:text-emerald-800 transition-colors md:inline-block">
              {c.nav.login}
            </Link>
            <Link href="/auth/signup" className="rounded-full bg-emerald-900 px-5 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-800 transition-colors">
              {c.nav.signup}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative min-h-screen bg-white flex flex-col justify-end pb-24 overflow-hidden border-b border-slate-200">
        <div className="relative mx-auto w-full max-w-7xl px-8">
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">
            {c.hero.subtitle}
          </p>
          <h1
            className={[
              "text-5xl font-extrabold leading-[1.08] tracking-tight text-emerald-950 md:text-7xl lg:text-8xl",
              c.hero.fontFamily === "serif" ? "font-serif" : "font-sans",
            ].join(" ")}
          >
            {titleLines.map((line, i) => (
              <span key={i} className="block">
                {i === 2 ? <span className="text-emerald-700">{line}</span> : line}
              </span>
            ))}
          </h1>

          <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className="max-w-lg text-base leading-relaxed text-slate-600 md:text-lg">
              {c.hero.body}
            </p>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/auth/signup?role=student"
                className="rounded-full bg-emerald-900 px-7 py-3.5 text-sm font-semibold text-emerald-50 hover:bg-emerald-800 transition-colors"
              >
                {c.cta.student}
              </Link>
              <Link
                href="/auth/signup?role=teacher"
                className="rounded-full border border-slate-300 px-7 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
              >
                {c.cta.teacher}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Programs ───────────────────────────────────────── */}
      <section id="programs" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">{c.nav.programs}</p>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">{c.programsHeading}</h2>
            <p className="text-sm text-slate-500">{c.programsSubheading}</p>
          </div>

          <div className="mt-12 grid gap-px bg-slate-200 md:grid-cols-3">
            {c.programs.map((item, i) => (
              <div key={item.id} className="group flex flex-col justify-between bg-white p-8 hover:bg-emerald-50 transition-colors">
                <div>
                  <span className="text-xs font-bold text-slate-400">0{i + 1}</span>
                  <h3 className="mt-3 text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
                <div className="mt-8">
                  <span className="text-xs font-semibold text-emerald-700 group-hover:underline">{c.learnMore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Teachers ───────────────────────────────────────── */}
      <section id="teachers" className="bg-white py-28">
        <div className="mx-auto max-w-7xl px-8">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            <div className="space-y-6">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-600">{c.teachers.title}</p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
                {c.teachers.heading}
              </h2>
              <p className="text-base leading-relaxed text-slate-600">{c.teachers.body}</p>
              <ul className="space-y-3">
                {c.teachers.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="h-3 w-3 text-emerald-700" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-600">{c.classSnapshot}</p>
              <div className="mt-6 space-y-5">
                {[
                  { label: "Reading – Inference", pct: 68, color: "bg-emerald-500" },
                  { label: "Listening – Detail",  pct: 74, color: "bg-emerald-400" },
                  { label: "Writing – Coherence", pct: 55, color: "bg-teal-500" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                      <span>{row.label}</span><span className="font-semibold">{row.pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200">
                      <div className={`h-1.5 rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Learners ───────────────────────────────────────── */}
      <section id="learners" className="bg-slate-50 py-28">
        <div className="mx-auto max-w-7xl px-8">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            <div className="order-2 md:order-1 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-700">{c.todayMission}</p>
              <p className="mt-4 text-sm leading-relaxed text-slate-700">{c.todayMissionBody}</p>
              <p className="mt-4 text-xs text-slate-500">{c.streakLabel}</p>
              <div className="mt-6 flex gap-2">
                {[1,2,3,4,5].map((d) => (
                  <div key={d} className={`h-2 flex-1 rounded-full ${d <= 3 ? "bg-emerald-500" : "bg-slate-200"}`} />
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">{c.streakDays}</p>
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">{c.learners.title}</p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
                {c.learners.heading}
              </h2>
              <p className="text-base leading-relaxed text-slate-600">{c.learners.body}</p>
              <ul className="space-y-3">
                {c.learners.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="h-3 w-3 text-emerald-700" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Story / Testimonial ────────────────────────────── */}
      <section id="stories" className="bg-emerald-900 py-28">
        <div className="mx-auto max-w-4xl px-8 text-center">
          <p className="mb-10 text-4xl font-bold italic leading-snug text-emerald-50 md:text-5xl">
            &ldquo;{c.story.quote}&rdquo;
          </p>
          <div className="mx-auto h-px w-16 bg-emerald-400 mb-6" />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-200">{c.story.author}</p>
        </div>
      </section>

      {/* ── Join CTA ───────────────────────────────────────── */}
      <section id="join" className="bg-white py-28">
        <div className="mx-auto max-w-7xl px-8">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                {c.join.heading}
              </h2>
              <p className="text-base leading-relaxed text-slate-600">{c.join.body}</p>
            </div>
            <div className="flex flex-col gap-3 md:pl-12">
              <Link href="/auth/signup?role=student" className="flex items-center justify-between rounded-xl bg-emerald-900 px-7 py-4 text-sm font-semibold text-emerald-50 hover:bg-emerald-800 transition-colors">
                <span>{lang === "ko" ? "학생" : "Student"}</span><span>→</span>
              </Link>
              <Link href="/auth/signup?role=teacher" className="flex items-center justify-between rounded-xl border-2 border-emerald-200 px-7 py-4 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 transition-colors">
                <span>{lang === "ko" ? "선생님" : "Teacher"}</span><span>→</span>
              </Link>
              <Link href="/auth/signup?role=parent" className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-7 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                <span>{lang === "ko" ? "학부모" : "Parent"}</span><span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="bg-emerald-950 py-16 text-emerald-100">
        <div className="mx-auto max-w-7xl px-8">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="space-y-3 max-w-xs">
              <span className="text-2xl font-extrabold tracking-tight text-white" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", letterSpacing: '-0.02em' }}>
                LEX<span style={{ fontWeight: 400 }}>i</span>OX
              </span>
              <p className="text-sm leading-relaxed text-emerald-100/70">{c.footer.tagline}</p>
            </div>
            <div className="grid grid-cols-2 gap-10 text-sm md:grid-cols-3">
              <div>
                <p className="mb-3 font-semibold text-emerald-100">{c.footer.about}</p>
                <ul className="space-y-2 text-emerald-100/60">
                  <li>{c.footer.ourStory}</li>
                  <li>{c.footer.forAcademies}</li>
                </ul>
              </div>
              <div>
                <p className="mb-3 font-semibold text-emerald-100">{c.footer.programs}</p>
                <ul className="space-y-2 text-emerald-100/60">
                  <li>LEXiOX-TOEFL</li><li>LEXiOX-Jr.</li>
                  <li>LEXiOX-Hi-내신</li><li>LEXiOX-내신</li>
                </ul>
              </div>
              <div>
                <p className="mb-3 font-semibold text-emerald-100">{c.footer.contact}</p>
                <ul className="space-y-2 text-emerald-100/60">
                  <li>{c.footer.helpCenter}</li>
                  <li>{c.footer.partnerships}</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-emerald-800 pt-6 text-xs text-emerald-200/50">
            © {new Date().getFullYear()} LEXiOX. {c.footer.copyright}
          </div>
        </div>
      </footer>

    </main>
  );
}
