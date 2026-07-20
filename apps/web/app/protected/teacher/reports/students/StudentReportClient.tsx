'use client';

import Link from "next/link";
import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

type StudentSummary = {
  id: string;
  name: string;
  email: string;
  school: string | null;
  grade: string | null;
  program: string | null;
  hiNaeSin: { total: number; completed: number; inProgress: number; lastAt: string | null };
  jrNaesin: { total: number; avgScore: number | null; lastAt: string | null };
  vocab: { total: number; correct: number; lastAt: string | null };
  vocabLearning: { attempts: number; weakWords: Array<{ id: string; text: string }> };
};

type SchoolLevel = "all" | "elementary" | "middle" | "high" | "unset";

function getSchoolLevel(grade: string | null): SchoolLevel {
  if (!grade) return "unset";
  const g = grade.trim();
  if (g.startsWith("초")) return "elementary";
  if (g.startsWith("중")) return "middle";
  if (g.startsWith("고")) return "high";
  return "unset";
}

function getActiveModules(program: string | null) {
  if (program === "lexiox") return { hiNaesin: true, jr: true, vocab: true };
  if (program === "toefl") return { hiNaesin: false, jr: false, vocab: true };
  if (program === "gap")   return { hiNaesin: true, jr: true, vocab: true };
  return { hiNaesin: false, jr: false, vocab: false };
}

function programLabel(program: string | null) {
  if (program === "lexiox") return { text: "LEXiOX-내신", color: "bg-emerald-100 text-emerald-700" };
  if (program === "toefl") return { text: "TOEFL", color: "bg-blue-100 text-blue-700" };
  if (program === "gap")   return { text: "GAP", color: "bg-orange-100 text-orange-700" };
  return { text: "미지정", color: "bg-neutral-100 text-neutral-500" };
}

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function pct(a: number, b: number) {
  if (b === 0) return "-";
  return `${Math.round((a / b) * 100)}%`;
}

const FILTER_BUTTONS: { key: SchoolLevel; label: string; emoji: string }[] = [
  { key: "all",        label: "전체",   emoji: "👥" },
  { key: "elementary", label: "초등",   emoji: "🟡" },
  { key: "middle",     label: "중학생", emoji: "🟢" },
  { key: "high",       label: "고등학생", emoji: "🔵" },
  { key: "unset",      label: "미설정", emoji: "⚪" },
];

export default function StudentReportClient({
  summaries,
  hiSessionTotal,
  vocabTotal,
}: {
  summaries: StudentSummary[];
  hiSessionTotal: number;
  vocabTotal: number;
}) {
  const supabase = createBrowserClient();
  const [filter, setFilter] = useState<SchoolLevel>("all");
  const [warningStudent, setWarningStudent] = useState<StudentSummary | null>(null);
  const [warningReason, setWarningReason] = useState("");
  const [warningLoading, setWarningLoading] = useState(false);

  const handleIssueWarning = async () => {
    if (!warningStudent || !warningReason.trim()) return;

    setWarningLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.id) return;

      await supabase.from("teacher_warnings").insert({
        student_id: warningStudent.id,
        teacher_id: user.id,
        reason: warningReason,
        severity: "yellow",
        status: "active",
      });

      setWarningStudent(null);
      setWarningReason("");
      alert(`${warningStudent.name}에게 Yellow Card를 발급했습니다.`);
    } catch (e) {
      console.error("Failed to issue warning:", e);
      alert("경고 발급에 실패했습니다.");
    } finally {
      setWarningLoading(false);
    }
  };

  const filtered = filter === "all"
    ? summaries
    : summaries.filter((s) => getSchoolLevel(s.grade) === filter);

  // 필터별 카운트
  const counts: Record<SchoolLevel, number> = {
    all: summaries.length,
    elementary: summaries.filter((s) => getSchoolLevel(s.grade) === "elementary").length,
    middle:     summaries.filter((s) => getSchoolLevel(s.grade) === "middle").length,
    high:       summaries.filter((s) => getSchoolLevel(s.grade) === "high").length,
    unset:      summaries.filter((s) => getSchoolLevel(s.grade) === "unset").length,
  };

  const dim = "bg-neutral-50 text-neutral-300 select-none";

  return (
    <div className="space-y-4">
      {/* 필터 버튼 */}
      <div className="flex flex-wrap gap-2">
        {FILTER_BUTTONS.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === key
                ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <span>{emoji}</span>
            <span>{label}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
              filter === key ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold text-neutral-900">학생별 현황</span>
          <span className="text-xs text-neutral-400">{filtered.length}명 표시 중</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium [&>th]:whitespace-nowrap">
                <th>학생</th>
                <th>프로그램</th>
                <th className="border-l border-emerald-100 bg-emerald-50/60 text-emerald-700">Hi-내신 세션</th>
                <th className="bg-emerald-50/60 text-emerald-700">완료</th>
                <th className="bg-emerald-50/60 text-emerald-700">마지막</th>
                <th className="border-l border-orange-100 bg-orange-50/60 text-orange-700">JR. 드릴</th>
                <th className="bg-orange-50/60 text-orange-700">평균점수</th>
                <th className="bg-orange-50/60 text-orange-700">마지막</th>
                <th className="border-l border-violet-100 bg-violet-50/60 text-violet-700">어휘 시도</th>
                <th className="bg-violet-50/60 text-violet-700">정답률</th>
                <th className="bg-violet-50/60 text-violet-700">마지막</th>
                <th className="border-l border-red-100 bg-red-50/60 text-red-700">약한 단어</th>
                <th className="border-l border-yellow-100 bg-yellow-50/60 text-yellow-700">경고</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-neutral-400">
                    해당 학생이 없습니다
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const mods = getActiveModules(s.program);
                  const pl = programLabel(s.program);
                  return (
                    <tr key={s.id} className="border-t hover:bg-neutral-50 [&>td]:px-4 [&>td]:py-3">
                      <td>
                        <div className="font-medium text-neutral-900">{s.name}</div>
                        <div className="text-xs text-neutral-400">{s.email}</div>
                        {(s.school || s.grade) && (
                          <div className="mt-0.5 text-xs font-medium text-neutral-500">
                            {[s.school, s.grade].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pl.color}`}>
                          {pl.text}
                        </span>
                      </td>

                      {/* Hi-내신 */}
                      <td className={`border-l border-emerald-100 ${mods.hiNaesin ? "" : dim}`}>
                        {mods.hiNaesin ? s.hiNaeSin.total : "—"}
                      </td>
                      <td className={mods.hiNaesin ? "" : dim}>
                        {mods.hiNaesin ? (
                          <div className="flex items-center gap-1">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              s.hiNaeSin.completed > 0 ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                            }`}>{s.hiNaeSin.completed}완료</span>
                            {s.hiNaeSin.inProgress > 0 && (
                              <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-600">
                                {s.hiNaeSin.inProgress}진행중
                              </span>
                            )}
                          </div>
                        ) : "—"}
                      </td>
                      <td className={`text-xs ${mods.hiNaesin ? "text-neutral-500" : dim}`}>
                        {mods.hiNaesin ? fmtDate(s.hiNaeSin.lastAt) : "—"}
                      </td>

                      {/* JR */}
                      <td className={`border-l border-orange-100 ${mods.jr ? "" : dim}`}>
                        {mods.jr ? s.jrNaesin.total : "—"}
                      </td>
                      <td className={mods.jr ? "" : dim}>
                        {mods.jr ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.jrNaesin.avgScore !== null ? "bg-orange-50 text-orange-700" : "bg-neutral-100 text-neutral-500"
                          }`}>{s.jrNaesin.avgScore !== null ? `${s.jrNaesin.avgScore}%` : "-"}</span>
                        ) : "—"}
                      </td>
                      <td className={`text-xs ${mods.jr ? "text-neutral-500" : dim}`}>
                        {mods.jr ? fmtDate(s.jrNaesin.lastAt) : "—"}
                      </td>

                      {/* 어휘 */}
                      <td className={`border-l border-violet-100 ${mods.vocab ? "" : dim}`}>
                        {mods.vocab ? s.vocab.total : "—"}
                      </td>
                      <td className={mods.vocab ? "" : dim}>
                        {mods.vocab ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            s.vocab.total > 0 ? "bg-violet-50 text-violet-700" : "bg-neutral-100 text-neutral-500"
                          }`}>{pct(s.vocab.correct, s.vocab.total)}</span>
                        ) : "—"}
                      </td>
                      <td className={`text-xs ${mods.vocab ? "text-neutral-500" : dim}`}>
                        {mods.vocab ? fmtDate(s.vocab.lastAt) : "—"}
                      </td>

                      {/* 약한 단어 */}
                      <td className="text-xs">
                        {s.vocabLearning.weakWords.length > 0 ? (
                          <button
                            onClick={() => {
                              const wordList = s.vocabLearning.weakWords.map((w) => w.text).join(", ");
                              alert(`${s.name}의 약한 단어:\n${wordList}`);
                            }}
                            className="rounded-lg bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100"
                          >
                            📋 {s.vocabLearning.weakWords.length}개
                          </button>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      {/* Yellow Card */}
                      <td>
                        <button
                          onClick={() => setWarningStudent(s)}
                          className="rounded-lg bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-100 transition"
                        >
                          ⚠️ 경고
                        </button>
                      </td>

                      <td>
                        <Link href={`/teacher/students/${s.id}`}
                          className="rounded-lg border px-3 py-1 text-xs hover:bg-neutral-50">
                          상세
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Yellow Card Modal */}
      {warningStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
            <div className="mb-6 text-center">
              <div className="text-6xl mb-3">⚠️</div>
              <h2 className="text-xl font-bold text-slate-900">Yellow Card 발급</h2>
              <p className="mt-2 text-sm text-slate-600">{warningStudent.name}</p>
            </div>

            <div className="mb-6 space-y-3">
              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                <strong>학습 저조 경고</strong>
                <p className="mt-1">부모님에게 안내될 수 있습니다.</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700">경고 사유</label>
                <textarea
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="예: 최근 1주간 어휘 학습 없음, 약한 단어 50개 이상"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setWarningStudent(null)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                취소
              </button>
              <button
                onClick={handleIssueWarning}
                disabled={!warningReason.trim() || warningLoading}
                className="flex-1 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600 transition disabled:opacity-50"
              >
                {warningLoading ? "발급 중..." : "Yellow Card 발급"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
