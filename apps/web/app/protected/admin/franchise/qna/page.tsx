"use client";

import { useState } from "react";

type Category = "운영" | "기술" | "교육" | "마케팅" | "계약·법무";
type TicketStatus = "미답변" | "검토 중" | "답변 완료";

type FAQ = { id: number; category: Category; question: string; answer: string };
type Ticket = { id: number; category: Category; academy: string; question: string; status: TicketStatus; date: string; answer?: string };

const FAQS: FAQ[] = [
  { id: 1, category: "운영", question: "학생 계정을 일괄 등록할 때 CSV 형식은 어떻게 되나요?", answer: "CSV는 이름, 이메일, 학년, 반 순서로 작성합니다. 자료실 > 운영 가이드에서 템플릿을 다운로드하세요." },
  { id: 2, category: "운영", question: "반(Class)을 여러 개 운영할 때 선생님 계정을 어떻게 분리하나요?", answer: "관리자 > 사용자 관리에서 선생님 계정을 생성한 후, 각 반에 개별 배정할 수 있습니다." },
  { id: 3, category: "기술", question: "앱이 구형 iPad에서 느리게 동작합니다.", answer: "iOS 15 이상, Safari 최신 버전 사용을 권장합니다. 캐시 초기화 후 재접속을 먼저 시도해 주세요." },
  { id: 4, category: "기술", question: "오디오가 재생되지 않는 경우 어떻게 하나요?", answer: "브라우저 음소거 설정을 확인하고, Chrome 또는 Safari 최신 버전에서 다시 시도해 주세요." },
  { id: 5, category: "교육", question: "TOEFL 모의고사 결과 리포트를 학부모에게 자동 발송할 수 있나요?", answer: "학부모 관리 > 연동 설정에서 주간/월간 자동 발송을 켤 수 있습니다. 이메일 템플릿도 커스텀 가능합니다." },
  { id: 6, category: "교육", question: "내신 시험 범위를 교과서별로 설정하려면?", answer: "내신 허브 > 시험 범위 관리에서 교과서, 출판사, 단원 범위를 직접 지정할 수 있습니다." },
  { id: 7, category: "마케팅", question: "공식 로고와 브랜드 자산은 어디서 다운로드하나요?", answer: "자료실 > 브랜드 에셋 카테고리에서 고해상도 로고, 컬러 가이드, 폰트 파일을 다운로드할 수 있습니다." },
  { id: 8, category: "계약·법무", question: "가맹 2년차 갱신 절차는 어떻게 되나요?", answer: "갱신 3개월 전 본사 담당 매니저에게서 갱신 안내 이메일이 발송됩니다. 이후 전자 계약으로 진행됩니다." },
];

const TICKETS: Ticket[] = [
  { id: 101, category: "기술", academy: "강남 LEXiOX 학원", question: "Speaking 과제 AI 피드백이 48시간 넘게 안 나오고 있어요.", status: "검토 중", date: "2026-06-05" },
  { id: 102, category: "운영", academy: "분당 영어나라", question: "월별 리포트 학부모 자동 발송이 갑자기 안 됩니다.", status: "미답변", date: "2026-06-05" },
  { id: 103, category: "교육", academy: "목동 LEXiOX 학원", question: "Grammar 챕터 순서를 커스텀하게 바꿀 수 있나요?", status: "답변 완료", date: "2026-06-04", answer: "현재 챕터 순서 변경 기능은 준비 중입니다. 7월 업데이트 예정입니다." },
  { id: 104, category: "마케팅", academy: "일산 어학원", question: "6월 신학기 현수막 PSD 파일을 못 찾겠어요.", status: "답변 완료", date: "2026-06-03", answer: "자료실 > 마케팅 > 2026 신학기 키트에서 다운로드하실 수 있습니다." },
  { id: 105, category: "계약·법무", academy: "수원 영어센터", question: "가맹 갱신 기간이 다음 달인데 아직 연락이 없어요.", status: "미답변", date: "2026-06-02" },
];

const catBadge: Record<Category, string> = {
  운영: "bg-emerald-100 text-emerald-700",
  기술: "bg-blue-100 text-blue-700",
  교육: "bg-violet-100 text-violet-700",
  마케팅: "bg-pink-100 text-pink-700",
  "계약·법무": "bg-amber-100 text-amber-700",
};

const statusBadge: Record<TicketStatus, string> = {
  미답변: "bg-red-100 text-red-700",
  "검토 중": "bg-blue-100 text-blue-700",
  "답변 완료": "bg-emerald-100 text-emerald-700",
};

const CATS: Category[] = ["운영", "기술", "교육", "마케팅", "계약·법무"];

export default function QnaPage() {
  const [tab, setTab] = useState<"faq" | "tickets">("tickets");
  const [catFilter, setCatFilter] = useState<Category | "전체">("전체");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(TICKETS);
  const [replyModal, setReplyModal] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");

  const filteredFaqs = catFilter === "전체" ? FAQS : FAQS.filter((f) => f.category === catFilter);
  const filteredTickets = catFilter === "전체" ? tickets : tickets.filter((t) => t.category === catFilter);

  function sendReply() {
    if (!replyModal || !replyText.trim()) return;
    setTickets((prev) => prev.map((t) => t.id === replyModal.id ? { ...t, status: "답변 완료", answer: replyText } : t));
    setReplyModal(null); setReplyText("");
  }

  const pendingCount = tickets.filter((t) => t.status !== "답변 완료").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Q&A / 지식베이스</h1>
        <p className="mt-1 text-sm text-neutral-500">가맹점 문의 처리 및 FAQ 관리.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-slate-50 p-1 w-fit">
        <button onClick={() => setTab("tickets")} className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${tab === "tickets" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
          문의 티켓
          {pendingCount > 0 && <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">{pendingCount}</span>}
        </button>
        <button onClick={() => setTab("faq")} className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${tab === "faq" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>FAQ 관리</button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {(["전체", ...CATS] as const).map((c) => (
          <button key={c} onClick={() => setCatFilter(c)} className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${catFilter === c ? "bg-emerald-900 text-white border-emerald-900" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}>{c}</button>
        ))}
      </div>

      {tab === "tickets" && (
        <div className="space-y-3">
          {filteredTickets.map((t) => {
            const isOpen = expandedTicket === t.id;
            return (
              <div key={t.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <button className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors" onClick={() => setExpandedTicket(isOpen ? null : t.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[t.status]}`}>{t.status}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${catBadge[t.category]}`}>{t.category}</span>
                      <span className="text-[11px] text-slate-400">{t.academy}</span>
                      <span className="text-[11px] text-slate-400">· {t.date}</span>
                    </div>
                    <p className="text-sm text-slate-800">{t.question}</p>
                  </div>
                  <span className="text-slate-400 text-xs mt-1">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="border-t px-5 py-4 bg-slate-50 space-y-3">
                    {t.answer && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">답변</p>
                        <p className="text-sm text-emerald-900">{t.answer}</p>
                      </div>
                    )}
                    {t.status !== "답변 완료" && (
                      <button onClick={() => { setReplyModal(t); setReplyText(""); }} className="rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">답변 작성</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredTickets.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">문의가 없습니다.</p>}
        </div>
      )}

      {tab === "faq" && (
        <div className="space-y-2">
          {filteredFaqs.map((f) => {
            const isOpen = expandedFaq === f.id;
            return (
              <div key={f.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <button className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors" onClick={() => setExpandedFaq(isOpen ? null : f.id)}>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${catBadge[f.category]}`}>{f.category}</span>
                  <p className="flex-1 text-sm font-medium text-slate-800">{f.question}</p>
                  <span className="text-slate-400 text-xs">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="border-t px-5 py-4 bg-slate-50">
                    <p className="text-sm text-slate-700">{f.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold">답변 작성</h2>
            <div className="rounded-lg bg-slate-50 border p-3 text-sm text-slate-700">{replyModal.question}</div>
            <textarea rows={5} className="w-full rounded border px-3 py-2 text-sm" placeholder="답변을 입력하세요…" value={replyText} onChange={(e) => setReplyText(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button onClick={() => setReplyModal(null)} className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">취소</button>
              <button onClick={sendReply} className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">답변 발송</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
