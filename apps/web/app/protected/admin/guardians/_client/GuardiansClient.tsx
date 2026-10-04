"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addGuardianAction,
  deleteGuardianAction,
  importLegacyParentPhonesAction,
  listStudentsWithGuardiansAction,
  setPrimaryGuardianAction,
  updateGuardianAction,
  type ImportReport,
  type StudentWithGuardians,
} from "../actions";

export default function GuardiansClient() {
  const [students, setStudents] = useState<StudentWithGuardians[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await listStudentsWithGuardiansAction();
    if (res.ok) setStudents(res.students ?? []);
    else setMsg(`❌ ${res.error}`);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    setBusy(true);
    const res = await fn();
    if (res.ok) {
      setMsg(okMsg ? `✅ ${okMsg}` : "");
      await load();
    } else setMsg(`❌ ${res.error ?? "실패"}`);
    setBusy(false);
    return res.ok;
  }

  async function handleImport() {
    setBusy(true);
    const res = await importLegacyParentPhonesAction();
    if (res.ok && res.report) {
      setReport(res.report);
      setMsg(`✅ 기존 번호 ${res.report.imported}개를 가져왔습니다`);
      await load();
    } else setMsg(`❌ ${res.error ?? "가져오기 실패"}`);
    setBusy(false);
  }

  const withContact = useMemo(() => students.filter((s) => s.guardians.length > 0).length, [students]);
  const missing = students.length - withContact;
  const shown = useMemo(() => (onlyMissing ? students.filter((s) => s.guardians.length === 0) : students), [students, onlyMissing]);

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-lg p-3 text-sm ${msg.startsWith("✅") ? "bg-green-100 text-green-800" : msg.startsWith("❌") ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"}`}>
          {msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div className="text-sm">
          <b>연락처 등록 {withContact}/{students.length}명</b>
          {missing > 0 ? <span className="ml-2 text-red-600">— 연락처 없는 학생 {missing}명</span> : <span className="ml-2 text-green-700">모두 등록됨</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
            연락처 없는 학생만
          </label>
          <button
            className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-50"
            disabled={busy}
            onClick={handleImport}
            title="학생 정보에 이미 적혀 있던 학부모 번호를 이곳으로 가져옵니다. 여러 번 눌러도 중복되지 않습니다."
          >
            기존 학부모 번호 가져오기
          </button>
        </div>
      </div>

      {report && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <div className="font-semibold">가져오기 결과</div>
          <ul className="mt-1 list-inside list-disc text-xs">
            <li>새로 가져옴: {report.imported}명</li>
            <li>이미 있어서 건너뜀: {report.alreadyExisted}명</li>
            {report.noAccount > 0 && <li>로그인 계정이 없어 건너뜀: {report.noAccount}명</li>}
            {report.invalid.length > 0 && (
              <li className="text-red-700">
                번호 형식이 올바르지 않아 건너뜀: {report.invalid.length}명 —{" "}
                {report.invalid.map((i) => `${i.studentName}(${i.raw})`).join(", ")} → 아래에서 직접 입력하세요
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        {shown.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-400">표시할 학생이 없습니다.</div>}
        {shown.map((s) => {
          const open = openId === s.student_id;
          return (
            <div key={s.student_id} className="rounded-xl border bg-white">
              <button className="flex w-full items-center justify-between gap-3 p-3 text-left" onClick={() => setOpenId(open ? null : s.student_id)}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  {s.guardians.length === 0 ? (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">연락처 없음</span>
                  ) : (
                    s.guardians.map((g) => (
                      <span key={g.id} className={`rounded px-2 py-0.5 text-xs ${g.is_primary ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"} ${g.notice_ok ? "" : "line-through opacity-60"}`}>
                        {g.relation ? `${g.relation} ` : ""}
                        {g.phone_display}
                      </span>
                    ))
                  )}
                </div>
                <span className="text-gray-400">{open ? "▲" : "▼"}</span>
              </button>

              {open && (
                <div className="space-y-4 border-t p-3">
                  {s.guardians.map((g) => (
                    <GuardianRow key={g.id} g={g} busy={busy} run={run} />
                  ))}
                  <AddForm studentId={s.student_id} busy={busy} run={run} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Runner = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) => Promise<boolean>;

function GuardianRow({ g, busy, run }: { g: StudentWithGuardians["guardians"][number]; busy: boolean; run: Runner }) {
  const [name, setName] = useState(g.name ?? "");
  const [relation, setRelation] = useState(g.relation ?? "");
  const [phone, setPhone] = useState(g.phone_display);
  const dirty = name !== (g.name ?? "") || relation !== (g.relation ?? "") || phone !== g.phone_display;

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2">
      <Field label="관계">
        <input className="w-24 rounded border px-2 py-1.5 text-sm" placeholder="어머니" value={relation} onChange={(e) => setRelation(e.target.value)} />
      </Field>
      <Field label="이름">
        <input className="w-28 rounded border px-2 py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="휴대폰">
        <input className="w-40 rounded border px-2 py-1.5 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <button
        className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        disabled={busy || !dirty}
        onClick={() => run(() => updateGuardianAction({ id: g.id, name, relation, phone }), "저장했습니다")}
      >
        저장
      </button>
      {g.is_primary ? (
        <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">주 연락처</span>
      ) : (
        <button className="rounded border px-2 py-1 text-xs disabled:opacity-40" disabled={busy} onClick={() => run(() => setPrimaryGuardianAction({ id: g.id }), "주 연락처로 지정했습니다")}>
          주 연락처로
        </button>
      )}
      <label className="flex items-center gap-1 text-xs text-gray-600" title="끄면 이 번호로는 안내 문구를 만들지 않습니다">
        <input type="checkbox" checked={g.notice_ok} disabled={busy} onChange={(e) => run(() => updateGuardianAction({ id: g.id, noticeOk: e.target.checked }))} />
        안내 받음
      </label>
      <button
        className="ml-auto rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-40"
        disabled={busy}
        onClick={() => {
          if (!confirm("이 연락처를 삭제할까요? (이미 보낸 안내 기록은 남습니다)")) return;
          run(() => deleteGuardianAction({ id: g.id }), "삭제했습니다");
        }}
      >
        삭제
      </button>
    </div>
  );
}

function AddForm({ studentId, busy, run }: { studentId: string; busy: boolean; run: Runner }) {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="flex flex-wrap items-end gap-2 border-t pt-3">
      <Field label="관계">
        <input className="w-24 rounded border px-2 py-1.5 text-sm" placeholder="어머니" value={relation} onChange={(e) => setRelation(e.target.value)} />
      </Field>
      <Field label="이름 (선택)">
        <input className="w-28 rounded border px-2 py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="휴대폰">
        <input className="w-40 rounded border px-2 py-1.5 text-sm" placeholder="010-1234-5678" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <button
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        disabled={busy || !phone.trim()}
        onClick={async () => {
          const ok = await run(() => addGuardianAction({ studentId, name, relation, phone }), "연락처를 추가했습니다");
          if (ok) {
            setName("");
            setRelation("");
            setPhone("");
          }
        }}
      >
        + 연락처 추가
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs text-gray-500">{label}</span>
      {children}
    </label>
  );
}
