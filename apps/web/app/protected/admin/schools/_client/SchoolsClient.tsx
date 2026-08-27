"use client";

import { useEffect, useState } from "react";
import {
  listSchoolsAction,
  createSchoolAction,
  deleteSchoolAction,
  listUnmatchedSchoolTextsAction,
  normalizeSchoolTextAction,
  listExamPeriodsAction,
  createExamPeriodAction,
  deleteExamPeriodAction,
  type School,
  type ExamPeriod,
} from "../actions";

export default function SchoolsClient() {
  const [schools, setSchools] = useState<School[]>([]);
  const [unmatched, setUnmatched] = useState<{ name: string; count: number }[]>([]);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [periods, setPeriods] = useState<ExamPeriod[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const thisYear = new Date().getFullYear();
  const [form, setForm] = useState({
    year: thisYear,
    semester: 2,
    examType: "midterm" as "midterm" | "final",
    startDate: "",
    endDate: "",
    note: "",
  });

  async function loadAll() {
    const [sRes, uRes] = await Promise.all([listSchoolsAction(), listUnmatchedSchoolTextsAction()]);
    if (sRes.ok) setSchools(sRes.schools);
    if (uRes.ok) setUnmatched(uRes.names);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedSchool) {
      setPeriods([]);
      return;
    }
    listExamPeriodsAction({ schoolId: selectedSchool }).then((res) => {
      if (res.ok) setPeriods(res.periods);
    });
  }, [selectedSchool]);

  async function handleCreateSchool() {
    if (!newSchoolName.trim()) return;
    setLoading(true);
    const res = await createSchoolAction({ name: newSchoolName.trim() });
    if (res.ok) {
      setMsg("✅ 학교 등록 완료");
      setNewSchoolName("");
      loadAll();
    } else {
      setMsg(`❌ ${res.error}`);
    }
    setLoading(false);
  }

  async function handleDeleteSchool(id: string) {
    if (!confirm("이 학교를 삭제할까요? (연결된 학생의 school_id는 비워집니다)")) return;
    const res = await deleteSchoolAction({ id });
    if (res.ok) {
      if (selectedSchool === id) setSelectedSchool("");
      loadAll();
    } else {
      setMsg(`❌ ${res.error}`);
    }
  }

  async function handleNormalize(name: string) {
    setLoading(true);
    const res = await normalizeSchoolTextAction({ name });
    if (res.ok) {
      setMsg(`✅ "${name}" → 학교 등록 및 학생 ${res.updatedCount}명 연결 완료`);
      loadAll();
    } else {
      setMsg(`❌ ${res.error}`);
    }
    setLoading(false);
  }

  async function handleCreatePeriod() {
    if (!selectedSchool) {
      setMsg("❌ 학교를 먼저 선택하세요");
      return;
    }
    setLoading(true);
    const res = await createExamPeriodAction({
      schoolId: selectedSchool,
      year: form.year,
      semester: form.semester,
      examType: form.examType,
      startDate: form.startDate,
      endDate: form.endDate,
      note: form.note,
    });
    if (res.ok) {
      setMsg("✅ 시험기간 등록 완료");
      setForm((f) => ({ ...f, startDate: "", endDate: "", note: "" }));
      listExamPeriodsAction({ schoolId: selectedSchool }).then((r) => r.ok && setPeriods(r.periods));
    } else {
      setMsg(`❌ ${res.error}`);
    }
    setLoading(false);
  }

  async function handleDeletePeriod(id: string) {
    if (!confirm("이 시험기간을 삭제할까요?")) return;
    const res = await deleteExamPeriodAction({ id });
    if (res.ok) {
      listExamPeriodsAction({ schoolId: selectedSchool }).then((r) => r.ok && setPeriods(r.periods));
    }
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`p-3 rounded-lg text-sm ${msg.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {msg}
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-bold text-amber-900 mb-1">미정규화 학교명 ({unmatched.length}개)</h3>
          <p className="text-xs text-amber-800 mb-3">
            학생 정보에 텍스트로만 적혀 있고 아직 학교 등록에 연결 안 된 이름들입니다. 눌러서 정규화하세요.
          </p>
          <div className="flex flex-wrap gap-2">
            {unmatched.map((u) => (
              <button
                key={u.name}
                onClick={() => handleNormalize(u.name)}
                disabled={loading}
                className="bg-white border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {u.name} <span className="text-amber-600">({u.count}명)</span> → 등록
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold mb-3">학교 목록</h2>
        <div className="flex gap-2 mb-4">
          <input
            value={newSchoolName}
            onChange={(e) => setNewSchoolName(e.target.value)}
            placeholder="새 학교명 (예: 송도고)"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleCreateSchool()}
          />
          <button
            onClick={handleCreateSchool}
            disabled={loading || !newSchoolName.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            등록
          </button>
        </div>

        <div className="space-y-1">
          {schools.length === 0 && <p className="text-sm text-gray-500">등록된 학교가 없습니다.</p>}
          {schools.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedSchool(s.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${
                selectedSchool === s.id ? "bg-blue-50 border border-blue-300" : "hover:bg-gray-50 border border-transparent"
              }`}
            >
              <span className="font-semibold">{s.name}</span>
              <span className="flex items-center gap-3">
                <span className="text-gray-500 text-xs">학생 {s.student_count}명</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSchool(s.id);
                  }}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  삭제
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {selectedSchool && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-1">
            {schools.find((s) => s.id === selectedSchool)?.name} — 시험기간
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            시험 1개월 전(수정 가능)부터 시험준비기간 시작 — 레귤러 스케줄 홀드 트리거로 쓰임.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4 items-end">
            <div>
              <label className="block text-xs font-bold mb-1">연도</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">학기</label>
              <select
                value={form.semester}
                onChange={(e) => setForm((f) => ({ ...f, semester: Number(e.target.value) }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value={1}>1학기</option>
                <option value={2}>2학기</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">종류</label>
              <select
                value={form.examType}
                onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value as "midterm" | "final" }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
              >
                <option value="midterm">중간고사</option>
                <option value="final">기말고사</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">시작일</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">종료일</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={handleCreatePeriod}
              disabled={loading || !form.startDate || !form.endDate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded text-sm disabled:opacity-50"
            >
              등록
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-1.5">학기</th>
                <th className="py-1.5">종류</th>
                <th className="py-1.5">준비기간 시작</th>
                <th className="py-1.5">시험 기간</th>
                <th className="py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-1.5">{p.year} · {p.semester}학기</td>
                  <td className="py-1.5">{p.exam_type === "midterm" ? "중간" : "기말"}</td>
                  <td className="py-1.5 text-gray-600">{p.prep_start_date}</td>
                  <td className="py-1.5 font-semibold">{p.start_date} ~ {p.end_date}</td>
                  <td className="py-1.5 text-right">
                    <button onClick={() => handleDeletePeriod(p.id)} className="text-red-600 text-xs hover:text-red-800">
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-gray-500 text-center">
                    등록된 시험기간이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
