// apps/web/app/(protected)/admin/vocab/sets/_client/SetsTableClient.tsx
"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateTracksUrl } from "../actions";

type VocabSet = {
  id: string;
  title: string;
  description: string | null;
  grade_band: string | null;
  level: string | null;
  source_label: string | null;
  word_count: number | null;
  item_count: number | null;
  created_at: string | null;
  track_id: string | null;
};

type Student = {
  id: string;
  auth_user_id: string | null;
  login_id: string | null;
  full_name: string | null;
  grade: string | null;
  school: string | null;
};

type Props = {
  rows: VocabSet[];
  students: Student[];
};

export default function SetsTableClient({ rows, students }: Props) {
  const router = useRouter();
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const selectedSetCount = selectedSetIds.size;
  const selectedStudentCount = selectedStudentIds.size;
  const allSetsSelected = selectedSetCount === rows.length && rows.length > 0;
  const someSetsSelected = selectedSetCount > 0 && !allSetsSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSetsSelected;
    }
  }, [someSetsSelected]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const k = studentSearch.trim().toLowerCase();
    return students.filter(
      (s) =>
        String(s.full_name ?? "").toLowerCase().includes(k) ||
        String(s.login_id ?? "").toLowerCase().includes(k) ||
        String(s.grade ?? "").toLowerCase().includes(k)
    );
  }, [students, studentSearch]);

  function toggleSet(id: string) {
    setSelectedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllSets() {
    if (allSetsSelected) {
      setSelectedSetIds(new Set());
    } else {
      setSelectedSetIds(new Set(rows.map((r) => r.id)));
    }
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllStudents() {
    setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
  }

  function deselectAllStudents() {
    setSelectedStudentIds(new Set());
  }

  async function handleAssign() {
    if (selectedSetCount === 0 || selectedStudentCount === 0) {
      setAssignMsg("❌ 세트와 학생을 선택하세요");
      return;
    }

    setAssignBusy(true);

    try {
      const { url } = await generateTracksUrl({
        setIds: Array.from(selectedSetIds),
        studentIds: Array.from(selectedStudentIds),
      });

      router.push(url);
    } catch (e: any) {
      setAssignMsg(`❌ ${e?.message ?? "오류 발생"}`);
      setAssignBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 배정 섹션 */}
      {(selectedSetCount > 0 || selectedStudentCount > 0) && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <div className="text-sm font-bold text-violet-900 mb-4">
            📚 세트 {selectedSetCount}개 → 👥 학생 {selectedStudentCount}명
          </div>

          <button
            onClick={handleAssign}
            disabled={assignBusy || selectedSetCount === 0 || selectedStudentCount === 0}
            className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {assignBusy ? "배정 중..." : "선택 완료 → 배정"}
          </button>

          {assignMsg && (
            <div className={`mt-3 text-sm font-semibold ${assignMsg.startsWith("✅") ? "text-emerald-700" : "text-rose-700"}`}>
              {assignMsg}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 세트 선택 */}
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-base font-extrabold text-slate-900 mb-4">
            📚 세트 선택 ({selectedSetCount}/{rows.length})
          </div>
          <div className="max-h-96 overflow-y-auto rounded-xl border divide-y">
            {rows.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">세트가 없습니다.</div>
            ) : (
              <>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={allSetsSelected}
                    onChange={toggleAllSets}
                    className="h-4 w-4 rounded"
                  />
                  <span className="flex-1 text-sm font-semibold text-slate-800">
                    {allSetsSelected ? "전체 해제" : "전체 선택"}
                  </span>
                </label>
                {rows.map((set) => (
                  <label
                    key={set.id}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${
                      selectedSetIds.has(set.id) ? "bg-violet-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSetIds.has(set.id)}
                      onChange={() => toggleSet(set.id)}
                      className="h-4 w-4 rounded"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800">{set.title}</div>
                      {set.description && (
                        <div className="text-xs text-slate-500 truncate">{set.description}</div>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">
                      {set.word_count?.toLocaleString() ?? "0"}단어
                    </div>
                  </label>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 학생 선택 */}
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-base font-extrabold text-slate-900 mb-4">
            👥 학생 선택 ({selectedStudentCount}/{students.length})
          </div>

          <input
            type="text"
            placeholder="이름 / 아이디 / 학년 검색"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm mb-3"
          />

          <div className="flex gap-2 mb-3">
            <button
              onClick={selectAllStudents}
              className="flex-1 rounded-lg border py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              필터된 전체 선택 ({filteredStudents.length})
            </button>
            <button
              onClick={deselectAllStudents}
              className="flex-1 rounded-lg border py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              전체 해제
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-xl border divide-y">
            {filteredStudents.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">학생이 없습니다.</div>
            ) : (
              filteredStudents.map((student) => (
                <label
                  key={student.id}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${
                    selectedStudentIds.has(student.id) ? "bg-violet-50" : "hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.has(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="h-4 w-4 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800">
                      {student.full_name ?? "(이름없음)"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {student.login_id && <span>{student.login_id}</span>}
                      {student.grade && <span className="ml-2">{student.grade}</span>}
                      {student.school && <span className="ml-2 text-slate-400">{student.school}</span>}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 기존 배포 버튼 */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-sm text-slate-600 mb-4">또는 기존 방식으로 배포</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium [&>th]:text-left [&>th]:text-slate-600">
                <th>제목</th>
                <th>단어 수</th>
                <th>등록일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-slate-50 [&>td]:px-4 [&>td]:py-3">
                  <td>
                    <div className="font-medium text-slate-900">{row.title}</div>
                    {row.description && (
                      <div className="text-xs text-slate-400 truncate max-w-xs">{row.description}</div>
                    )}
                  </td>
                  <td className="text-slate-600">{row.word_count?.toLocaleString() ?? "—"}</td>
                  <td className="text-xs text-slate-400">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td>
                    <Link
                      href={`/admin/vocab/Tracks?set=${row.id}${row.track_id ? `&track_id=${row.track_id}` : ""}`}
                      className="rounded-lg border px-3 py-1 text-xs hover:bg-slate-100"
                    >
                      배포
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
