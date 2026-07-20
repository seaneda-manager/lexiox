"use client";

import Link from "next/link";

const STATS = [
  { label: "전체 가맹점", value: "42", sub: "전국 운영 중", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { label: "이번 달 신규", value: "3", sub: "신규 계약", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { label: "미처리 Q&A", value: "7", sub: "답변 대기 중", color: "bg-amber-50 border-amber-200 text-amber-700" },
  { label: "교육 이수율", value: "81%", sub: "신규 온보딩 기준", color: "bg-violet-50 border-violet-200 text-violet-700" },
];

const RECENT_ANNOUNCEMENTS = [
  { id: 1, title: "2026년 하반기 TOEFL 커리큘럼 업데이트 안내", urgency: "중요", date: "2026-06-05", pinned: true },
  { id: 2, title: "6월 마케팅 자료 배포 완료 – 자료실 확인 요망", urgency: "일반", date: "2026-06-04", pinned: false },
  { id: 3, title: "[긴급] 플랫폼 점검 예고 – 6/8 새벽 2~4시", urgency: "긴급", date: "2026-06-03", pinned: true },
];

const RECENT_QNA = [
  { id: 1, q: "학생 계정 일괄 등록 시 CSV 형식은 어떻게 되나요?", status: "답변 완료", date: "2026-06-05" },
  { id: 2, q: "월별 리포트를 학부모에게 자동 발송할 수 있나요?", status: "검토 중", date: "2026-06-04" },
  { id: 3, q: "가맹 2년차 갱신 절차가 궁금합니다.", status: "미답변", date: "2026-06-03" },
];

const MODULES = [
  { title: "신규 가맹점 온보딩 A", progress: 100, total: 8, done: 8 },
  { title: "TOEFL 커리큘럼 심화 과정", progress: 62, total: 13, done: 8 },
  { title: "학원 운영 & 마케팅 기초", progress: 45, total: 10, done: 4 },
];

const urgencyBadge: Record<string, string> = {
  긴급: "bg-red-100 text-red-700",
  중요: "bg-amber-100 text-amber-700",
  일반: "bg-slate-100 text-slate-600",
};

const statusBadge: Record<string, string> = {
  "답변 완료": "bg-emerald-100 text-emerald-700",
  "검토 중": "bg-blue-100 text-blue-700",
  미답변: "bg-red-100 text-red-700",
};

export default function FranchiseHubPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">프랜차이즈 허브</h1>
          <p className="mt-1 text-sm text-neutral-500">
            가맹점 공지, 교육, Q&A, 자료 배포를 관리하는 본사 전용 운영 센터입니다.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
            <p className="text-[11px] opacity-70 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Nav tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/franchise/announcements", icon: "📢", label: "공지사항", desc: "긴급·중요·일반 공지 발행 및 관리" },
          { href: "/admin/franchise/training", icon: "🎓", label: "교육 센터", desc: "온보딩 모듈, 이수 현황, 자격 배지" },
          { href: "/admin/franchise/qna", icon: "💬", label: "Q&A / 지식베이스", desc: "FAQ 관리 및 가맹점 문의 처리" },
          { href: "/admin/franchise/resources", icon: "📁", label: "자료실", desc: "마케팅·커리큘럼·브랜드 자료 배포" },
        ].map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="flex flex-col gap-2 rounded-xl border bg-white p-5 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <span className="text-2xl">{tile.icon}</span>
            <p className="font-semibold text-sm text-slate-900">{tile.label}</p>
            <p className="text-xs text-slate-500">{tile.desc}</p>
            <span className="mt-auto text-xs text-emerald-700 font-semibold">바로가기 →</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Announcements */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">최근 공지사항</h2>
            <Link href="/admin/franchise/announcements" className="text-xs text-emerald-700 hover:underline">전체 보기 →</Link>
          </div>
          <ul className="divide-y">
            {RECENT_ANNOUNCEMENTS.map((a) => (
              <li key={a.id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {a.pinned && <span className="text-[10px] text-emerald-700">📌</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgencyBadge[a.urgency]}`}>{a.urgency}</span>
                  </div>
                  <p className="text-sm text-slate-800 leading-snug truncate">{a.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{a.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Recent Q&A */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">최근 Q&A</h2>
            <Link href="/admin/franchise/qna" className="text-xs text-emerald-700 hover:underline">전체 보기 →</Link>
          </div>
          <ul className="divide-y">
            {RECENT_QNA.map((q) => (
              <li key={q.id} className="py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[q.status]}`}>{q.status}</span>
                  <span className="text-[11px] text-slate-400">{q.date}</span>
                </div>
                <p className="text-sm text-slate-700 leading-snug">{q.q}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Training overview */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">교육 모듈 이수 현황</h2>
          <Link href="/admin/franchise/training" className="text-xs text-emerald-700 hover:underline">전체 보기 →</Link>
        </div>
        <div className="space-y-4">
          {MODULES.map((m) => (
            <div key={m.title}>
              <div className="flex justify-between text-xs text-slate-700 mb-1.5">
                <span className="font-medium">{m.title}</span>
                <span className="text-slate-500">{m.done}/{m.total} 모듈 완료</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${m.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
