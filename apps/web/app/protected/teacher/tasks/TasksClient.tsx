"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2, Circle, RefreshCcw, Plus, Trash2, Loader2,
} from "lucide-react";

export type TaskStatus = "pending" | "done" | "overdue";
export type TaskCategory = "상담" | "채점" | "과제" | "관리" | "기타";

export type Task = {
  id: string;
  label: string;
  status: TaskStatus;
  category: TaskCategory;
  student_name?: string | null;
  due_display?: string | null;
  created_at: string;
};

const CATEGORIES: TaskCategory[] = ["상담", "채점", "과제", "관리", "기타"];
const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  pending: "done",
  done: "pending",
  overdue: "pending",
};

export default function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ── Form state ────────────────────────────────────────────────
  const [form, setForm] = useState({
    label: "", category: "기타" as TaskCategory,
    studentName: "", dueDisplay: "",
  });

  async function addTask() {
    if (!form.label.trim()) return;
    const res = await fetch("/api/teacher/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label,
        category: form.category,
        studentName: form.studentName || null,
        dueDisplay: form.dueDisplay || null,
      }),
    });
    const data = await res.json();
    if (data.task) {
      setTasks((prev) => [data.task, ...prev]);
      setForm({ label: "", category: "기타", studentName: "", dueDisplay: "" });
      setShowForm(false);
    }
  }

  async function toggleStatus(task: Task) {
    const next = STATUS_CYCLE[task.status];
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: next } : t));
    await fetch("/api/teacher/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: next }),
    });
  }

  async function setOverdue(task: Task) {
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: "overdue" } : t));
    await fetch("/api/teacher/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: "overdue" }),
    });
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch("/api/teacher/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  const pending = tasks.filter((t) => t.status === "pending");
  const overdue = tasks.filter((t) => t.status === "overdue");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* 헤더 */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">할 일 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            학부모 상담, 채점, 과제, 수업 준비 등 선생님 업무를 한 곳에서 관리합니다.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          새 할 일
        </button>
      </header>

      {/* 새 할 일 폼 */}
      {showForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-800">새 할 일 추가</p>
          <input
            type="text"
            placeholder="할 일 내용 *"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TaskCategory }))}
              className="rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-blue-400"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input
              type="text"
              placeholder="학생 이름 (선택)"
              value={form.studentName}
              onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
              className="flex-1 min-w-28 rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-blue-400"
            />
            <input
              type="text"
              placeholder="기한 (예: 오늘 14:00)"
              value={form.dueDisplay}
              onChange={(e) => setForm((f) => ({ ...f, dueDisplay: e.target.value }))}
              className="flex-1 min-w-28 rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addTask}
              disabled={!form.label.trim()}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              추가
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 요약 카드 */}
      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="진행 중" value={`${pending.length}개`} description="처리해야 할 일" />
        <SummaryCard label="지연됨" value={`${overdue.length}개`} description="기한 초과" tone="warning" />
        <SummaryCard label="완료" value={`${done.length}개`} description="최근 완료 업무" tone="success" />
      </section>

      {/* 메인 그리드 */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <TaskSection title="오늘/이번 주 할 일" tasks={pending} onToggle={toggleStatus} onOverdue={setOverdue} onDelete={deleteTask} />
          <TaskSection title="지연 · 재스케줄 필요" tasks={overdue} variant="warning" onToggle={toggleStatus} onOverdue={setOverdue} onDelete={deleteTask} />
          <TaskSection title="최근 완료" tasks={done} variant="success" compact onToggle={toggleStatus} onOverdue={setOverdue} onDelete={deleteTask} />
        </div>

        <div className="space-y-4 lg:col-span-2">
          <AllTasksTable tasks={tasks} onToggle={toggleStatus} onOverdue={setOverdue} onDelete={deleteTask} />
          <div className="grid gap-4 md:grid-cols-2">
            {["채점", "상담"].map((cat) => (
              <TaskGroupCard
                key={cat}
                title={`${cat} 관련 할 일`}
                tasks={tasks.filter((t) => t.category === cat)}
                onToggle={toggleStatus}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────

function SummaryCard({ label, value, description, tone = "default" }: {
  label: string; value: string; description?: string;
  tone?: "default" | "warning" | "success";
}) {
  const cls = tone === "warning" ? "border-amber-300 bg-amber-50"
    : tone === "success" ? "border-emerald-300 bg-emerald-50"
    : "border-gray-200 bg-white";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${cls}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TaskStatus }) {
  if (status === "done") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />완료
    </span>
  );
  if (status === "overdue") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
      <RefreshCcw className="h-3 w-3" />지연
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
      <Circle className="h-3 w-3" />진행 중
    </span>
  );
}

// ── Task section (left column) ────────────────────────────────────────

function TaskSection({ title, tasks, variant = "default", compact, onToggle, onOverdue, onDelete }: {
  title: string; tasks: Task[]; variant?: "default" | "warning" | "success";
  compact?: boolean;
  onToggle: (t: Task) => void; onOverdue: (t: Task) => void; onDelete: (id: string) => void;
}) {
  const headerCls = variant === "warning" ? "text-amber-700" : variant === "success" ? "text-emerald-700" : "text-gray-900";
  const icon = variant === "warning" ? <RefreshCcw className="h-4 w-4 text-amber-600" />
    : variant === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    : <Circle className="h-4 w-4 text-gray-500" />;
  const itemCls = variant === "warning" ? "border-amber-200 bg-amber-50"
    : variant === "success" ? "border-emerald-200 bg-emerald-50"
    : "border-gray-200 bg-gray-50";

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${headerCls}`}>
        {icon}{title}
      </div>
      {tasks.length === 0 ? (
        <p className="text-xs text-gray-500">해당되는 할 일이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className={`flex items-start justify-between rounded-lg border px-3 py-2 ${itemCls}`}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{t.label}</p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  {t.student_name ? `학생: ${t.student_name} · ` : ""}{t.category}{t.due_display ? ` · ${t.due_display}` : ""}
                </p>
              </div>
              {!compact && (
                <div className="ml-2 flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onToggle(t)}
                    className="rounded-full border bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600 hover:bg-gray-50"
                  >
                    {t.status === "done" ? "↩ 되돌리기" : "✓ 완료"}
                  </button>
                  <button onClick={() => onDelete(t.id)} className="text-gray-300 hover:text-red-500 p-0.5">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── All tasks table ───────────────────────────────────────────────────

function AllTasksTable({ tasks, onToggle, onOverdue, onDelete }: {
  tasks: Task[];
  onToggle: (t: Task) => void; onOverdue: (t: Task) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold">전체 할 일 목록</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-[11px] text-gray-500">
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">할 일</th>
              <th className="px-3 py-2">카테고리</th>
              <th className="px-3 py-2">학생</th>
              <th className="px-3 py-2">기한</th>
              <th className="px-3 py-2 text-right">작업</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-gray-400">할 일이 없습니다. 위 "새 할 일"로 추가하세요.</td></tr>
            ) : tasks.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 align-middle"><StatusBadge status={t.status} /></td>
                <td className="px-3 py-2 align-middle text-[11px] text-gray-800">{t.label}</td>
                <td className="px-3 py-2 align-middle text-[11px] text-gray-600">{t.category}</td>
                <td className="px-3 py-2 align-middle text-[11px] text-gray-600">{t.student_name ?? "-"}</td>
                <td className="px-3 py-2 align-middle text-[11px] text-gray-600">{t.due_display ?? "-"}</td>
                <td className="px-3 py-2 align-middle text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onToggle(t)}
                      className="rounded border px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-100"
                    >
                      {t.status === "done" ? "↩" : "✓"}
                    </button>
                    {t.status === "pending" && (
                      <button
                        onClick={() => onOverdue(t)}
                        className="rounded border px-2 py-0.5 text-[10px] text-amber-600 hover:bg-amber-50"
                      >
                        지연
                      </button>
                    )}
                    <button onClick={() => onDelete(t.id)} className="text-gray-300 hover:text-red-500 p-0.5">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Task group card ───────────────────────────────────────────────────

function TaskGroupCard({ title, tasks, onToggle }: {
  title: string; tasks: Task[]; onToggle: (t: Task) => void;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {tasks.length === 0 ? (
        <p className="text-xs text-gray-500">해당 카테고리의 할 일이 없습니다.</p>
      ) : (
        <ul className="space-y-1.5">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 text-[11px]">
              <span className={`flex-1 truncate ${t.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>
                {t.label}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-gray-400">{t.due_display ?? ""}</span>
                <button onClick={() => onToggle(t)} className="text-gray-400 hover:text-emerald-600">
                  {t.status === "done" ? <Circle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
