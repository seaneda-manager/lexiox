"use client";

import { useState } from "react";

type Urgency = "긴급" | "중요" | "일반";
type Target = "전체" | "수도권" | "비수도권" | "개별 지정";

type Announcement = {
  id: number;
  title: string;
  body: string;
  urgency: Urgency;
  target: Target;
  pinned: boolean;
  date: string;
};

const INITIAL: Announcement[] = [
  { id: 1, title: "[긴급] 플랫폼 점검 예고 – 6/8 새벽 2~4시", body: "6월 8일(일) 새벽 2시~4시 서버 점검이 예정되어 있습니다. 해당 시간 중 플랫폼 이용이 불가합니다. 학생·학부모에게 사전 공지 부탁드립니다.", urgency: "긴급", target: "전체", pinned: true, date: "2026-06-03" },
  { id: 2, title: "2026년 하반기 TOEFL 커리큘럼 업데이트 안내", body: "하반기 신규 커리큘럼이 6월 15일부터 적용됩니다. 교육 센터에서 업데이트 내용을 사전 이수해 주세요.", urgency: "중요", target: "전체", pinned: true, date: "2026-06-05" },
  { id: 3, title: "6월 마케팅 자료 배포 – 자료실 확인 요망", body: "6월 신학기 맞이 마케팅 자료(현수막, SNS 카드뉴스 PSD)가 자료실에 업로드되었습니다.", urgency: "일반", target: "전체", pinned: false, date: "2026-06-04" },
  { id: 4, title: "수도권 원장 간담회 일정 안내 (6/20)", body: "수도권 가맹 원장님들을 대상으로 하반기 운영 전략 간담회가 진행됩니다. 일정 확인 후 참석 의사를 회신해 주세요.", urgency: "중요", target: "수도권", pinned: false, date: "2026-06-01" },
  { id: 5, title: "LEXiOX Jr. 신규 콘텐츠 추가 완료", body: "Junior 리스닝 챕터 3~5와 Grammar 챕터 1~2 콘텐츠가 추가되었습니다.", urgency: "일반", target: "전체", pinned: false, date: "2026-05-28" },
];

const urgencyBadge: Record<Urgency, string> = {
  긴급: "bg-red-100 text-red-700 border-red-200",
  중요: "bg-amber-100 text-amber-700 border-amber-200",
  일반: "bg-slate-100 text-slate-600 border-slate-200",
};

const BLANK: Omit<Announcement, "id" | "date"> = { title: "", body: "", urgency: "일반", target: "전체", pinned: false };

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>(INITIAL);
  const [filter, setFilter] = useState<Urgency | "전체">("전체");
  const [modal, setModal] = useState<null | "new" | Announcement>(null);
  const [form, setForm] = useState<Omit<Announcement, "id" | "date">>(BLANK);

  const filtered = filter === "전체" ? items : items.filter((a) => a.urgency === filter);
  const pinned = filtered.filter((a) => a.pinned);
  const normal = filtered.filter((a) => !a.pinned);

  function openNew() { setForm(BLANK); setModal("new"); }
  function openEdit(a: Announcement) { setForm({ title: a.title, body: a.body, urgency: a.urgency, target: a.target, pinned: a.pinned }); setModal(a); }

  function save() {
    if (!form.title.trim()) return alert("제목을 입력해 주세요.");
    if (modal === "new") {
      setItems((prev) => [{ id: Date.now(), date: new Date().toISOString().slice(0, 10), ...form }, ...prev]);
    } else if (modal && typeof modal === "object") {
      setItems((prev) => prev.map((a) => a.id === modal.id ? { ...a, ...form } : a));
    }
    setModal(null);
  }

  function remove(id: number) {
    if (!confirm("삭제하시겠습니까?")) return;
    setItems((prev) => prev.filter((a) => a.id !== id));
  }

  function togglePin(id: number) {
    setItems((prev) => prev.map((a) => a.id === id ? { ...a, pinned: !a.pinned } : a));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">공지사항 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">가맹점 대상 공지를 작성·발행·핀 고정합니다.</p>
        </div>
        <button onClick={openNew} className="shrink-0 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">+ 새 공지</button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["전체", "긴급", "중요", "일반"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${filter === f ? "bg-emerald-900 text-white border-emerald-900" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}>{f}</button>
        ))}
      </div>

      {/* Pinned */}
      {pinned.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">📌 고정 공지</p>
          {pinned.map((a) => <AnnouncementCard key={a.id} a={a} onEdit={openEdit} onDelete={remove} onTogglePin={togglePin} />)}
        </div>
      )}

      {/* Normal */}
      <div className="space-y-2">
        {pinned.length > 0 && <p className="text-xs font-bold uppercase tracking-widest text-slate-400">일반 공지</p>}
        {normal.map((a) => <AnnouncementCard key={a.id} a={a} onEdit={openEdit} onDelete={remove} onTogglePin={togglePin} />)}
        {filtered.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">공지가 없습니다.</p>}
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold">{modal === "new" ? "새 공지 작성" : "공지 편집"}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">제목</label>
                <input className="w-full rounded border px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">내용</label>
                <textarea rows={4} className="w-full rounded border px-3 py-2 text-sm" value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} />
              </div>
              <div className="flex gap-4 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">긴급도</label>
                  <select className="rounded border px-2 py-1.5 text-sm" value={form.urgency} onChange={(e) => setForm((p) => ({ ...p, urgency: e.target.value as Urgency }))}>
                    <option>일반</option><option>중요</option><option>긴급</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">발송 대상</label>
                  <select className="rounded border px-2 py-1.5 text-sm" value={form.target} onChange={(e) => setForm((p) => ({ ...p, target: e.target.value as Target }))}>
                    <option>전체</option><option>수도권</option><option>비수도권</option><option>개별 지정</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.pinned} onChange={(e) => setForm((p) => ({ ...p, pinned: e.target.checked }))} />
                    상단 고정
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">취소</button>
              <button onClick={save} className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ a, onEdit, onDelete, onTogglePin }: {
  a: Announcement;
  onEdit: (a: Announcement) => void;
  onDelete: (id: number) => void;
  onTogglePin: (id: number) => void;
}) {
  const urgencyBadge: Record<Urgency, string> = {
    긴급: "bg-red-100 text-red-700",
    중요: "bg-amber-100 text-amber-700",
    일반: "bg-slate-100 text-slate-600",
  };
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${a.pinned ? "border-emerald-200" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {a.pinned && <span className="text-sm">📌</span>}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgencyBadge[a.urgency]}`}>{a.urgency}</span>
            <span className="rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-semibold">{a.target}</span>
            <span className="text-[11px] text-slate-400">{a.date}</span>
          </div>
          <p className="text-sm font-semibold text-slate-900">{a.title}</p>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.body}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button onClick={() => onTogglePin(a.id)} className="rounded-lg border px-2 py-1 text-xs text-slate-500 hover:bg-slate-50" title={a.pinned ? "핀 해제" : "핀 고정"}>{a.pinned ? "핀 해제" : "고정"}</button>
          <button onClick={() => onEdit(a)} className="rounded-lg border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">편집</button>
          <button onClick={() => onDelete(a.id)} className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">삭제</button>
        </div>
      </div>
    </div>
  );
}
