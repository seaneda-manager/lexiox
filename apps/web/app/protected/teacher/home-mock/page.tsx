// apps/web/app/(protected)/teacher/home/page.tsx
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Mic2,
  Headphones,
  ListChecks,
  StickyNote,
} from "lucide-react";

export const dynamic = "force-dynamic";

type TaskStatus = "pending" | "done" | "overdue";

type Task = {
  id: string;
  label: string;
  dueDisplay: string;
  status: TaskStatus;
};

type SchoolEvent = {
  id: string;
  schoolName: string;
  title: string;
  dateDisplay: string;
};

type StudentTrend = {
  id: string;
  name: string;
  school: string;
  grade: string;
  recentScores: number[]; // 최근 3~5회 점수
  mainWeakness: string;
};

type SkillLevel = "strong" | "ok" | "weak";

type SkillSummary = {
  area: "grammar" | "syntax" | "listening" | "speaking";
  label: string;
  items: { name: string; level: SkillLevel }[];
};

type Note = {
  id: string;
  createdAtDisplay: string;
  content: string;
};

type StudentComment = {
  id: string;
  studentName: string;
  content: string;
  createdAtDisplay: string;
};

const mockTasks: Task[] = [
  {
    id: "t1",
    label: "○○중 2학년 학부모 상담 (김민수)",
    dueDisplay: "오늘 14:00",
    status: "pending",
  },
  {
    id: "t2",
    label: "Reading 2026 테스트 리뷰 2개",
    dueDisplay: "오늘",
    status: "pending",
  },
  {
    id: "t3",
    label: "리스닝 과제 채점 - 3명",
    dueDisplay: "어제",
    status: "overdue",
  },
  {
    id: "t4",
    label: "스피킹 과제 피드백 (이서연)",
    dueDisplay: "어제",
    status: "done",
  },
];

const mockSchoolEvents: SchoolEvent[] = [
  {
    id: "e1",
    schoolName: "○○중",
    title: "2학년 기말고사",
    dateDisplay: "11/30 (토)",
  },
  {
    id: "e2",
    schoolName: "△△고",
    title: "1학년 영어 수행평가",
    dateDisplay: "12/02 (월)",
  },
  {
    id: "e3",
    schoolName: "□□중",
    title: "영어 듣기평가",
    dateDisplay: "12/10 (수)",
  },
];

const mockStudentTrends: StudentTrend[] = [
  {
    id: "s1",
    name: "김민수",
    school: "○○중",
    grade: "2학년",
    recentScores: [68, 72, 75],
    mainWeakness: "Reading – Detail / Inference",
  },
  {
    id: "s2",
    name: "이서연",
    school: "△△고",
    grade: "1학년",
    recentScores: [82, 85, 88],
    mainWeakness: "Speaking – 심화 토픽에서 발화량 감소",
  },
  {
    id: "s3",
    name: "박지호",
    school: "□□중",
    grade: "3학년",
    recentScores: [54, 61, 59],
    mainWeakness: "Grammar – 관계사 / 분사구문",
  },
];

const mockSkillSummaries: SkillSummary[] = [
  {
    area: "grammar",
    label: "문법 지도 한눈에 보기",
    items: [
      { name: "시제", level: "ok" },
      { name: "조동사", level: "strong" },
      { name: "관계사", level: "weak" },
      { name: "분사구문", level: "weak" },
    ],
  },
  {
    area: "syntax",
    label: "구문 지도 한눈에 보기",
    items: [
      { name: "도치 구문", level: "weak" },
      { name: "긴 수식 관계사절", level: "weak" },
      { name: "삽입구 / 동격절", level: "ok" },
    ],
  },
  {
    area: "listening",
    label: "리스닝 지도 한눈에 보기",
    items: [
      { name: "Detail", level: "ok" },
      { name: "Inference", level: "weak" },
      { name: "Function / Attitude", level: "ok" },
    ],
  },
  {
    area: "speaking",
    label: "스피킹 지도 한눈에 보기",
    items: [
      { name: "의견 제시 + 이유 2개", level: "ok" },
      { name: "심화 토픽(사회, 기술)", level: "weak" },
      { name: "템플릿 활용", level: "strong" },
    ],
  },
];

const mockNotes: Note[] = [
  {
    id: "n1",
    createdAtDisplay: "11/25",
    content: "○○중 2학년 이번 시험 범위가 예상보다 좁게 나옴. 다음 진도 계획 조정 필요.",
  },
  {
    id: "n2",
    createdAtDisplay: "11/27",
    content: "△△고 1학년 반 분위기가 예민해짐. 과제량보다 시험 스트레스가 큰 듯.",
  },
];

const mockStudentComments: StudentComment[] = [
  {
    id: "c1",
    studentName: "김민수",
    createdAtDisplay: "11/26",
    content: "말은 적지만 글로 표현하는 능력이 좋음. Writing 쪽으로 자신감 키워주기.",
  },
  {
    id: "c2",
    studentName: "이서연",
    createdAtDisplay: "11/24",
    content: "발음에 자신감 있음. 난이도 있는 토픽에서도 말 수 줄지 않도록 질문 설계 필요.",
  },
];

export default function TeacherHomePage() {
  const teacherName = "션"; // TODO: 실제 로그인 정보에서 가져오기

  const totalStudents = 23; // TODO: DB 연동
  const testsThisWeek = 12;
  const upcomingEventsCount = mockSchoolEvents.length;

  const pendingTasks = mockTasks.filter((t) => t.status === "pending");
  const overdueTasks = mockTasks.filter((t) => t.status === "overdue");
  const doneToday = mockTasks.filter((t) => t.status === "done");

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* 헤더 */}
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {teacherName ? `${teacherName} 선생님 Dashboard 👋` : "선생님 Dashboard 👋"}
        </h1>
        <p className="text-sm text-gray-600">
          학생들의 학사일정, 성적 추이, 진도, 상담/할 일을 한눈에 확인할 수 있는 홈 화면입니다.
        </p>
      </header>

      {/* 요약 카드 */}
      <TeacherSummaryCards
        totalStudents={totalStudents}
        testsThisWeek={testsThisWeek}
        upcomingEventsCount={upcomingEventsCount}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 좌측: 오늘 할 일 + 메모 */}
        <div className="space-y-6">
          <TeacherTodoPanel
            pendingTasks={pendingTasks}
            overdueTasks={overdueTasks}
            doneToday={doneToday}
          />
          <TeacherNotesPanel notes={mockNotes} />
        </div>

        {/* 중앙: 캘린더 + 학교별 일정 */}
        <div className="space-y-6 lg:col-span-1">
          <TeacherCalendarPanel schoolEvents={mockSchoolEvents} />
          <TeacherNearbySchoolEvents schoolEvents={mockSchoolEvents} />
        </div>

        {/* 우측: 학생 성적 추이 + 강약점 + 코멘트 */}
        <div className="space-y-6 lg:col-span-1">
          <TeacherStudentTrends trends={mockStudentTrends} />
          <TeacherStudentComments comments={mockStudentComments} />
        </div>
      </div>

      {/* 하단: 문법/구문/리스닝/스피킹 지도 한눈에 */}
      <TeacherSkillOverview skillSummaries={mockSkillSummaries} />
    </main>
  );
}

/* =========================
 *  요약 카드
 * =======================*/

function TeacherSummaryCards(props: {
  totalStudents: number;
  testsThisWeek: number;
  upcomingEventsCount: number;
}) {
  const { totalStudents, testsThisWeek, upcomingEventsCount } = props;

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <SummaryCard label="내 학생 수" value={`${totalStudents}명`} subtitle="현재 관리 중인 전체 학생" />
      <SummaryCard
        label="이번 주 응시 시험"
        value={`${testsThisWeek}회`}
        subtitle="Reading / Listening / 모의고사 포함"
      />
      <SummaryCard
        label="다가오는 일정"
        value={`${upcomingEventsCount}개`}
        subtitle="학교 학사일정 + 학원 일정"
      />
    </section>
  );
}

function SummaryCard(props: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{props.label}</p>
      <p className="mt-1 text-xl font-bold">{props.value}</p>
      {props.subtitle && <p className="mt-1 text-xs text-gray-400">{props.subtitle}</p>}
    </div>
  );
}

/* =========================
 *  오늘 할 일 / 할 일 상태
 * =======================*/

function TeacherTodoPanel(props: {
  pendingTasks: Task[];
  overdueTasks: Task[];
  doneToday: Task[];
}) {
  const { pendingTasks, overdueTasks, doneToday } = props;

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ListChecks className="h-5 w-5" />
          오늘 할 일
        </h2>
        <span className="text-xs text-gray-500">완벽하지 않아도, 흐름이 보이면 충분합니다.</span>
      </div>

      {/* 미완료 / 오늘 해야 할 것 */}
      <div className="space-y-2">
        {pendingTasks.length === 0 ? (
          <p className="text-sm text-gray-500">오늘 예정된 할 일이 없습니다.</p>
        ) : (
          pendingTasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2 text-sm"
            >
              <span>{t.label}</span>
              <span className="text-xs text-gray-500">{t.dueDisplay}</span>
            </div>
          ))
        )}
      </div>

      {/* 미비 / 재스케줄 필요 */}
      {overdueTasks.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-red-500">
            <AlertTriangle className="h-4 w-4" />
            미비 · 재스케줄 필요
          </div>
          {overdueTasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs"
            >
              <span>{t.label}</span>
              <button className="text-[11px] font-medium text-red-600 underline">
                다시 일정 잡기
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 오늘 완료한 일 */}
      {doneToday.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            오늘 완료한 일
          </div>
          <ul className="space-y-1 text-xs text-gray-600">
            {doneToday.map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <span>{t.label}</span>
                <span className="text-[11px] text-gray-400">{t.dueDisplay}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* =========================
 *  캘린더 / 학교별 일정
 * =======================*/

function TeacherCalendarPanel(props: { schoolEvents: SchoolEvent[] }) {
  const { schoolEvents } = props;

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-5 w-5" />
          캘린더
        </h2>
        <span className="text-xs text-gray-500">
          (V1: 개요 표시, 추후 실제 달력 컴포넌트 연동 예정)
        </span>
      </div>

      <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
        오늘 기준으로 2주 이내 주요 일정만 요약해서 보여줍니다.
      </div>

      <ul className="mt-3 space-y-2 text-sm">
        {schoolEvents.map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2"
          >
            <div>
              <p className="font-medium">{e.title}</p>
              <p className="text-xs text-gray-500">{e.schoolName}</p>
            </div>
            <p className="text-xs text-gray-500">{e.dateDisplay}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeacherNearbySchoolEvents(props: { schoolEvents: SchoolEvent[] }) {
  const { schoolEvents } = props;

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">주변 학교별 일정 정리</h2>
      <div className="space-y-2 text-sm">
        {schoolEvents.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
          >
            <div>
              <p className="font-medium">{e.schoolName}</p>
              <p className="text-xs text-gray-500">{e.title}</p>
            </div>
            <p className="text-xs text-gray-500">{e.dateDisplay}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        각 학생의 재학 학교 정보와 연결하면, 학생별 페이지에서도 자동으로 보이게 됩니다.
      </p>
    </section>
  );
}

/* =========================
 *  학생별 성적 추이 / 코멘트
 * =======================*/

function TeacherStudentTrends(props: { trends: StudentTrend[] }) {
  const { trends } = props;

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">학생별 성적 추이 & 강·약점</h2>
      <div className="space-y-3">
        {trends.map((s) => (
          <div
            key={s.id}
            className="space-y-1 rounded-lg border bg-gray-50 px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-gray-500">
                  {s.school} · {s.grade}
                </p>
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>최근 점수</p>
                <p className="font-mono text-sm">
                  {s.recentScores.join(" → ")}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600">
              주요 약점: <span className="font-medium">{s.mainWeakness}</span>
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        그래프/차트는 추후 성적 데이터 연동 후 라인 차트로 교체할 수 있습니다.
      </p>
    </section>
  );
}

function TeacherStudentComments(props: { comments: StudentComment[] }) {
  const { comments } = props;

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">최근 학생 코멘트</h2>
      <div className="space-y-2 text-sm">
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-medium">{c.studentName}</span>
              <span>{c.createdAtDisplay}</span>
            </div>
            <p className="mt-1 text-xs text-gray-700">{c.content}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        학생 상세 페이지에서 코멘트를 추가/편집하면, 최근 7일 코멘트가 여기 자동으로 모입니다.
      </p>
    </section>
  );
}

/* =========================
 *  문법/구문/리스닝/스피킹 지도 한눈에
 * =======================*/

function TeacherSkillOverview(props: { skillSummaries: SkillSummary[] }) {
  const { skillSummaries } = props;

  const iconForArea = (area: SkillSummary["area"]) => {
    switch (area) {
      case "grammar":
        return <BookOpen className="h-4 w-4" />;
      case "syntax":
        return <ListChecks className="h-4 w-4" />;
      case "listening":
        return <Headphones className="h-4 w-4" />;
      case "speaking":
        return <Mic2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const pillClassForLevel = (level: SkillLevel) => {
    if (level === "strong") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (level === "ok") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    return "border-red-200 bg-red-50 text-red-700";
  };

  const labelForLevel = (level: SkillLevel) => {
    if (level === "strong") return "강점";
    if (level === "ok") return "보통";
    return "약점";
  };

  return (
    <section className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">문법 · 구문 · 리스닝 · 스피킹 지도 한눈에</h2>
        <span className="text-xs text-gray-500">
          반 전체 기준 약점이 많이 모인 항목부터 순서대로 지도 우선순위를 잡을 수 있습니다.
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {skillSummaries.map((s) => (
          <div key={s.area} className="space-y-2 rounded-lg border bg-gray-50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              {iconForArea(s.area)}
              <span>{s.label}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {s.items.map((item, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${pillClassForLevel(
                    item.level,
                  )}`}
                >
                  <span>{item.name}</span>
                  <span className="text-[10px] opacity-80">
                    {labelForLevel(item.level)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================
 *  특이사항 메모
 * =======================*/

function TeacherNotesPanel(props: { notes: Note[] }) {
  const { notes } = props;

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <StickyNote className="h-5 w-5" />
          특이사항 메모
        </h2>
        <span className="text-xs text-gray-500">
          학교/반 분위기, 학부모 관련, 진학 관련 등 자유 메모.
        </span>
      </div>

      <textarea
        className="h-20 w-full rounded-lg border px-2 py-1 text-sm"
        placeholder="예) ○○중 2학년 전체 수행평가 기준 변경됨. 다음 주 수업에서 안내 필요."
      />

      <div className="mt-3 space-y-2 text-xs">
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="mb-0.5 text-[11px] text-gray-500">{n.createdAtDisplay}</div>
            <p className="text-gray-700">{n.content}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-gray-400">
        메모 저장/동기화는 추후 Supabase 연동 시 구현합니다.
      </p>
    </section>
  );
}
