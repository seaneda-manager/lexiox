import { getServerSupabase } from "@/lib/supabase/server";
import { formatKoreanDate } from "@/lib/classes/dates";
import { ATTENDANCE_LABEL, attendanceRate, type AttendanceStatus } from "@/lib/classes/sessionBoard";

type Row = {
  status: AttendanceStatus;
  note: string | null;
  class_sessions: {
    session_date: string;
    start_time: string;
    academy_classes: { name: string } | { name: string }[] | null;
  } | null;
};

const STYLE: Record<AttendanceStatus, string> = {
  present: "bg-green-100 text-green-700",
  late: "bg-amber-100 text-amber-800",
  absent: "bg-red-100 text-red-700",
  excused: "bg-slate-200 text-slate-700",
};

/** 학생 상세용 출석 이력: 최근 수업 기록 + 출석률. 교사/관리자 화면에서만 쓴다(RLS 도 교사/관리자 전용). */
export default async function StudentAttendanceCard({ authUserId }: { authUserId: string | null }) {
  let rows: Row[] = [];
  let loadError = false;

  if (authUserId) {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("attendance_records")
      .select("status, note, class_sessions(session_date, start_time, academy_classes(name))")
      .eq("student_id", authUserId)
      .order("marked_at", { ascending: false })
      .limit(60);
    if (error) loadError = true;
    rows = ((data ?? []) as unknown as Row[]).filter((r) => r.class_sessions);
  }

  // 수업 날짜 기준 최신순
  rows.sort((a, b) => {
    const da = `${a.class_sessions!.session_date} ${a.class_sessions!.start_time}`;
    const db = `${b.class_sessions!.session_date} ${b.class_sessions!.start_time}`;
    return db.localeCompare(da);
  });

  const stat = attendanceRate(rows);
  const recent = rows.slice(0, 10);
  const className = (r: Row) => {
    const c = r.class_sessions?.academy_classes;
    return (Array.isArray(c) ? c[0]?.name : c?.name) ?? "(반)";
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">출석</h2>
        {stat.rate !== null && (
          <span className="text-sm text-slate-600">
            최근 {stat.counted}회 출석률 <b className="text-slate-900">{stat.rate}%</b>
          </span>
        )}
      </div>

      {loadError ? (
        <p className="text-sm text-red-500">출석 기록을 불러오지 못했습니다.</p>
      ) : recent.length === 0 ? (
        <p className="text-sm text-slate-400">아직 출석 기록이 없습니다.</p>
      ) : (
        <ul className="divide-y">
          {recent.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${STYLE[r.status]}`}>{ATTENDANCE_LABEL[r.status]}</span>
              <span className="text-slate-700">{formatKoreanDate(r.class_sessions!.session_date)}</span>
              <span className="text-slate-400">
                {className(r)} · {r.class_sessions!.start_time.slice(0, 5)}
              </span>
              {r.note && <span className="text-xs text-slate-400">— {r.note}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
