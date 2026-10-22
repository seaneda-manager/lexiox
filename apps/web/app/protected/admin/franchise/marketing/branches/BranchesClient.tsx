"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBranchMember, assignStudents, createBranch, refreshSnapshotNow, removeBranchMember, renameBranch } from "../actions";

export type BranchView = {
  id: string;
  name: string;
  students: number;
  members: { userId: string; role: string; label: string; email: string }[];
};
export type StudentView = { id: string; full_name: string | null; display_name: string | null; grade: string | null; school: string | null; org_id: string | null };

const input = "rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none";
const btn = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:border-emerald-600 disabled:opacity-50";
const pri = "rounded-lg bg-emerald-900 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50";

export function BranchesClient({ branches, students, query }: { branches: BranchView[]; students: StudentView[]; query: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [target, setTarget] = useState(branches[0]?.id ?? "");
  const [q, setQ] = useState(query);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, okMsg = "저장했어요.") =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? r.message ?? okMsg : r.error ?? "처리하지 못했어요.");
      if (r.ok) router.refresh();
    });

  return (
    <>
      {msg && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{msg}</p>}

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">새 가맹점</h2>
        <div className="flex flex-wrap gap-2">
          <input id="b_new" className={`${input} min-w-[220px] flex-1`} placeholder="예) LEXiOX 분당정자캠퍼스" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button
            className={pri}
            disabled={pending || !newName.trim()}
            onClick={() => run(async () => { const r = await createBranch(newName); if (r.ok) setNewName(""); return r; }, "가맹점을 만들었어요.")}
          >
            만들기
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {branches.map((b) => (
          <BranchCard key={b.id} b={b} pending={pending} run={run} />
        ))}
      </div>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">학생 배정</h2>
            <p className="text-xs text-slate-500">
              학습 통계는 가맹점에 배정된 학생으로 집계돼요. 반(academy_classes)에 가맹점이 지정돼 있으면 그 반 학생도 자동으로 포함돼요.
            </p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`?q=${encodeURIComponent(q)}`);
            }}
          >
            <input id="s_q" className={input} placeholder="이름·학교 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className={btn}>검색</button>
          </form>
        </div>
        <p className="mb-2 text-xs text-slate-500">{query ? `'${query}' 검색 결과` : "미배정 학생"} {students.length}명 (최대 300명 표시)</p>
        <div className="max-h-80 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="w-8 px-3 py-1.5">
                    <input
                      type="checkbox"
                      aria-label={`${s.full_name ?? s.display_name} 선택`}
                      checked={sel.includes(s.id)}
                      onChange={(e) => setSel(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))}
                    />
                  </td>
                  <td className="px-2 py-1.5">{s.full_name || s.display_name}</td>
                  <td className="px-2 py-1.5 text-slate-500">{s.grade}</td>
                  <td className="px-2 py-1.5 text-slate-500">{s.school}</td>
                  <td className="px-2 py-1.5 text-right text-xs text-slate-400">{s.org_id ? branches.find((b) => b.id === s.org_id)?.name ?? "다른 가맹점" : "미배정"}</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-slate-500">해당하는 학생이 없어요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className={btn} onClick={() => setSel(sel.length === students.length ? [] : students.map((s) => s.id))}>
            {sel.length === students.length && students.length ? "선택 해제" : "모두 선택"}
          </button>
          <select id="s_target" className={input} value={target} onChange={(e) => setTarget(e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className={pri} disabled={pending || !sel.length || !target} onClick={() => run(async () => { const r = await assignStudents(target, sel); if (r.ok) setSel([]); return r; })}>
            선택 {sel.length}명 배정
          </button>
          <button className={btn} disabled={pending || !sel.length} onClick={() => run(async () => { const r = await assignStudents(null, sel); if (r.ok) setSel([]); return r; })}>
            배정 해제
          </button>
        </div>
      </section>
    </>
  );
}

function BranchCard({
  b,
  pending,
  run,
}: {
  b: BranchView;
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, okMsg?: string) => void;
}) {
  const [name, setName] = useState(b.name);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "manager">("owner");
  return (
    <section className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <input id={`bn_${b.id}`} aria-label="가맹점 이름" className={`${input} min-w-0 flex-1 font-semibold`} value={name} onChange={(e) => setName(e.target.value)} />
        {name !== b.name && (
          <button className={btn} disabled={pending} onClick={() => run(() => renameBranch(b.id, name))}>이름 저장</button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>배정 학생 {b.students}명</span>
        <button className="font-semibold text-emerald-700 hover:underline" disabled={pending} onClick={() => run(() => refreshSnapshotNow(b.id))}>
          이번 달 학습 통계 지금 갱신
        </button>
      </div>
      <div>
        <h3 className="mb-1 text-xs font-semibold text-slate-500">운영자</h3>
        <ul className="divide-y text-sm">
          {b.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1 truncate">
                {m.label} <span className="text-xs text-slate-400">{m.email}</span>
              </span>
              <span className="text-xs text-slate-500">{m.role === "owner" ? "원장" : "실장"}</span>
              <button className="text-xs text-rose-600 hover:underline" disabled={pending} onClick={() => run(() => removeBranchMember(b.id, m.userId), "연결을 해제했어요.")}>
                해제
              </button>
            </li>
          ))}
          {b.members.length === 0 && <li className="py-1.5 text-slate-400">아직 연결된 운영자가 없어요.</li>}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <input id={`be_${b.id}`} type="email" className={`${input} min-w-[180px] flex-1`} placeholder="원장님 가입 이메일" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select id={`br_${b.id}`} aria-label="역할" className={input} value={role} onChange={(e) => setRole(e.target.value as "owner" | "manager")}>
          <option value="owner">원장</option>
          <option value="manager">실장</option>
        </select>
        <button className={btn} disabled={pending || !email} onClick={() => run(async () => { const r = await addBranchMember(b.id, email, role); if (r.ok) setEmail(""); return r; }, "운영자를 연결했어요.")}>
          연결
        </button>
      </div>
    </section>
  );
}
