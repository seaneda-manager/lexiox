import type { Metadata } from "next";
import { loadReportByToken } from "@/lib/parentReport/loadReport";
import { formatKoreanDate } from "@/lib/classes/dates";
import { ATTENDANCE_LABEL, type AttendanceStatus } from "@/lib/classes/sessionBoard";

// 로그인 없는 공개 페이지: 검색엔진 색인 금지, 항상 서버에서 새로 렌더링(캐시 금지), 이동 시 주소를 외부로 넘기지 않음.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "학습 리포트",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

const STYLE: Record<AttendanceStatus, string> = {
  present: "bg-green-100 text-green-700",
  late: "bg-amber-100 text-amber-800",
  absent: "bg-red-100 text-red-700",
  excused: "bg-slate-200 text-slate-700",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-white px-4 py-8 text-gray-900">
      {children}
    </main>
  );
}

export default async function ParentReportPage({ params }: { params: { token: string } }) {
  const report = await loadReportByToken(params.token);

  if (report.state === "invalid") {
    return (
      <Shell>
        <h1 className="text-xl font-bold">열 수 없는 링크입니다</h1>
        <p className="mt-3 text-sm text-gray-600">주소가 올바르지 않습니다. 선생님께 받은 링크를 다시 확인해 주세요.</p>
      </Shell>
    );
  }

  if (report.state === "expired") {
    return (
      <Shell>
        <h1 className="text-xl font-bold">만료된 링크입니다</h1>
        <p className="mt-3 text-sm text-gray-600">이 링크는 사용 기간이 지났습니다. 선생님께 새 링크를 요청해 주세요.</p>
      </Shell>
    );
  }

  const { studentName, summary: s } = report;

  return (
    <Shell>
      <h1 className="text-xl font-bold">{studentName} 학생 출석 리포트</h1>
      <p className="mt-1 text-xs text-gray-500">
        {formatKoreanDate(s.from)} ~ {formatKoreanDate(s.to)} (최근 4주)
      </p>

      <section className="mt-5 rounded-2xl border bg-gray-50 p-4 text-center">
        <div className="text-xs text-gray-500">출석률</div>
        <div className="mt-1 text-4xl font-bold">{s.rate === null ? "-" : `${s.rate}%`}</div>
        <div className="mt-1 text-xs text-gray-500">출석·지각 ÷ (출석·지각·결석), 사유결석은 제외</div>
      </section>

      <section className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
        <Count label="출석" value={s.present} />
        <Count label="지각" value={s.late} />
        <Count label="결석" value={s.absent} />
        <Count label="사유결석" value={s.excused} />
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold">최근 수업</h2>
        {s.recent.length === 0 ? (
          <p className="text-sm text-gray-500">이 기간에 기록된 수업이 없습니다.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {s.recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div>
                  <div>{formatKoreanDate(r.session_date)}</div>
                  <div className="text-xs text-gray-500">
                    {r.start_time.slice(0, 5)}
                    {r.class_name ? ` · ${r.class_name}` : ""}
                  </div>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${STYLE[r.status]}`}>{ATTENDANCE_LABEL[r.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-xs text-gray-400">
        이 페이지는 선생님이 보내드린 링크로만 열 수 있고 일정 기간이 지나면 만료됩니다. 링크를 다른 사람과 공유하지 마세요.
      </p>
    </Shell>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
