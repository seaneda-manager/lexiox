"use client";

import { useEffect, useState } from "react";
import { listExamModeRequestsAction, cancelOrRevertExamModeAction, type ExamModeRequestRow } from "../actions";

const STATUS_LABEL: Record<ExamModeRequestRow["status"], { label: string; className: string }> = {
  scheduled: { label: "예정 (자동 실행 대기)", className: "bg-amber-100 text-amber-800" },
  held: { label: "홀드 중", className: "bg-blue-100 text-blue-800" },
  canceled: { label: "취소됨", className: "bg-gray-100 text-gray-600" },
  resumed: { label: "완료 (재개됨)", className: "bg-green-100 text-green-800" },
};

export default function ExamModeClient() {
  const [rows, setRows] = useState<ExamModeRequestRow[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await listExamModeRequestsAction();
    if (res.ok) setRows(res.rows);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(periodId: string, wasHeld: boolean) {
    if (!confirm(wasHeld ? "이미 걸린 홀드를 지금 바로 되돌릴까요?" : "예정된 홀드를 취소할까요?")) return;
    setLoading(true);
    const res = await cancelOrRevertExamModeAction({ schoolExamPeriodId: periodId });
    if (res.ok) {
      setMsg("✅ 처리 완료");
      load();
    } else {
      setMsg(`❌ ${res.error}`);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {msg}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-600">
              <th className="py-2 px-4">학교</th>
              <th className="py-2 px-4">시험</th>
              <th className="py-2 px-4">준비기간 시작</th>
              <th className="py-2 px-4">시험 기간</th>
              <th className="py-2 px-4">상태</th>
              <th className="py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = STATUS_LABEL[r.status];
              const canAct = r.status === "scheduled" || r.status === "held";
              return (
                <tr key={r.id} className="border-b">
                  <td className="py-2 px-4 font-semibold">{r.school_name}</td>
                  <td className="py-2 px-4">
                    {r.year} · {r.semester}학기 {r.exam_type === "midterm" ? "중간" : "기말"}
                  </td>
                  <td className="py-2 px-4 text-gray-600">{r.prep_start_date}</td>
                  <td className="py-2 px-4">{r.start_date} ~ {r.end_date}</td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${s.className}`}>{s.label}</span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    {canAct && (
                      <button
                        onClick={() => handleCancel(r.school_exam_period_id, r.status === "held")}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50"
                      >
                        {r.status === "held" ? "되돌리기" : "취소"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  아직 예정된 시험모드가 없습니다. (준비기간 시작 3일 전에 자동으로 여기 뜹니다)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
