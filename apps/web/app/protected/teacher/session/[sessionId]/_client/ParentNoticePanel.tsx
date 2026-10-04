"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  cancelNoticeAction,
  createAttendanceDraftsAction,
  listNoticeCandidatesAction,
  markNoticeSentAction,
  updateNoticeBodyAction,
  type NoticeCandidate,
} from "../../notice-actions";

const KIND_LABEL = { absent: "결석", late: "지각" } as const;
const KIND_STYLE = { absent: "bg-red-100 text-red-700", late: "bg-amber-100 text-amber-800" } as const;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * 결석·지각 학부모 안내: 초안 만들기 -> 문구 확인/수정 -> 복사해서 카톡/문자로 직접 전송 -> '보냄 표시'.
 * 자동 발송은 없다. attendanceKey 가 바뀌면(출석 상태 정정) 목록을 다시 불러온다.
 */
export default function ParentNoticePanel({ sessionId, attendanceKey }: { sessionId: string; attendanceKey: string }) {
  const [items, setItems] = useState<NoticeCandidate[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await listNoticeCandidatesAction({ sessionId });
    if (res.ok) setItems(res.candidates ?? []);
    else setMsg(`❌ ${res.error}`);
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load, attendanceKey]);

  if (items === null || items.length === 0) return null;

  const needDraft = items.filter((c) => !c.notice && c.guardian_phone_display);
  const noContact = items.filter((c) => !c.guardian_phone_display && !c.notice);

  async function createAll() {
    setBusy(true);
    const res = await createAttendanceDraftsAction({ sessionId });
    if (res.ok) {
      const parts = [`초안 ${res.created ?? 0}개 만듦`];
      if (res.skippedNoContact) parts.push(`연락처 없음 ${res.skippedNoContact}명 건너뜀`);
      setMsg(`✅ ${parts.join(" · ")}`);
      await load();
    } else setMsg(`❌ ${res.error}`);
    setBusy(false);
  }

  return (
    <section className="mt-5 rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">학부모 안내 ({items.length}명)</h2>
        {needDraft.length > 0 && (
          <button className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={busy} onClick={createAll}>
            안내 초안 만들기 ({needDraft.length}명)
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        문구를 확인하고 복사해서 카톡/문자로 직접 보낸 뒤 &quot;보냄 표시&quot;를 눌러 주세요. 자동으로 발송되지는 않습니다.
      </p>

      {msg && (
        <div className={`mt-2 rounded p-2 text-sm ${msg.startsWith("✅") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{msg}</div>
      )}

      {noContact.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          학부모 번호가 없어 안내를 만들 수 없는 학생: <b>{noContact.map((c) => c.name).join(", ")}</b> —{" "}
          <Link className="underline" href="/admin/guardians">
            학부모 연락처에서 등록
          </Link>
        </div>
      )}

      <div className="mt-3 space-y-3">
        {items
          .filter((c) => c.notice)
          .map((c) => (
            <NoticeCard key={c.student_id} c={c} onChanged={load} setMsg={setMsg} />
          ))}
      </div>
    </section>
  );
}

function NoticeCard({ c, onChanged, setMsg }: { c: NoticeCandidate; onChanged: () => Promise<void>; setMsg: (m: string) => void }) {
  const n = c.notice!;
  const [body, setBody] = useState(n.body);
  const [busy, setBusy] = useState(false);
  const sent = n.status === "sent";
  const cancelled = n.status === "cancelled";
  const dirty = body !== n.body;

  useEffect(() => setBody(n.body), [n.body]);

  async function save(): Promise<boolean> {
    if (!dirty) return true;
    const res = await updateNoticeBodyAction({ id: n.id, body });
    if (!res.ok) setMsg(`❌ ${res.error}`);
    return !!res.ok;
  }

  async function copy(what: "body" | "phone") {
    if (what === "body" && !(await save())) return;
    const ok = await copyText(what === "body" ? body : n.to_phone ?? "");
    setMsg(ok ? `✅ ${what === "body" ? "문구" : "번호"}를 복사했습니다` : "❌ 복사하지 못했습니다. 직접 선택해서 복사해 주세요.");
  }

  async function markSent() {
    setBusy(true);
    if (await save()) {
      const res = await markNoticeSentAction({ id: n.id });
      if (res.ok) {
        setMsg(`✅ ${c.name} 학부모 안내를 보냄으로 표시했습니다`);
        await onChanged();
      } else setMsg(`❌ ${res.error}`);
    }
    setBusy(false);
  }

  async function cancel() {
    if (!confirm("이 안내 초안을 취소할까요? (나중에 다시 만들 수 있습니다)")) return;
    setBusy(true);
    const res = await cancelNoticeAction({ id: n.id });
    if (res.ok) await onChanged();
    else setMsg(`❌ ${res.error}`);
    setBusy(false);
  }

  return (
    <div className={`rounded-lg border p-3 ${sent ? "bg-green-50" : cancelled ? "bg-gray-50 opacity-70" : "bg-white"}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${KIND_STYLE[c.kind]}`}>{KIND_LABEL[c.kind]}</span>
        <b>{c.name}</b>
        <span className="text-gray-500">
          → {c.guardian_relation ? `${c.guardian_relation} ` : ""}
          {n.to_phone_display ?? c.guardian_phone_display ?? "번호 없음"}
        </span>
        {sent && <span className="ml-auto text-xs text-green-700">✅ 보냄 {n.sent_at ? new Date(n.sent_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : ""}</span>}
        {cancelled && <span className="ml-auto text-xs text-gray-500">취소됨</span>}
      </div>

      <textarea
        className="mt-2 w-full rounded border p-2 text-sm disabled:bg-gray-50"
        rows={3}
        value={body}
        disabled={sent || cancelled}
        onChange={(e) => setBody(e.target.value)}
        onBlur={() => !sent && !cancelled && void save()}
      />

      {!sent && !cancelled && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="rounded border px-3 py-1.5 text-sm disabled:opacity-50" disabled={busy} onClick={() => copy("phone")}>
            번호 복사
          </button>
          <button className="rounded border px-3 py-1.5 text-sm disabled:opacity-50" disabled={busy} onClick={() => copy("body")}>
            문구 복사
          </button>
          <button className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50" disabled={busy} onClick={markSent}>
            보냄 표시
          </button>
          <button className="ml-auto rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50" disabled={busy} onClick={cancel}>
            취소
          </button>
        </div>
      )}
    </div>
  );
}
