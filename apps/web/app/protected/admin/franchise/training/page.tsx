"use client";

import { useState } from "react";

type Track = "신규 온보딩" | "심화 과정" | "마케팅 & 운영";
type ModuleStatus = "완료" | "진행 중" | "미시작";

type Module = {
  id: number;
  track: Track;
  title: string;
  desc: string;
  duration: string;
  status: ModuleStatus;
  completedBy: number;
  totalAcademies: number;
  badge?: string;
};

const MODULES: Module[] = [
  { id: 1, track: "신규 온보딩", title: "플랫폼 기본 사용법", desc: "대시보드, 학생 등록, 과제 배정 기본 기능을 익힙니다.", duration: "40분", status: "완료", completedBy: 42, totalAcademies: 42, badge: "🎓 기초 인증" },
  { id: 2, track: "신규 온보딩", title: "TOEFL 세트 구성 및 배정", desc: "Reading/Listening 세트를 선택·배정하는 방법을 배웁니다.", duration: "30분", status: "완료", completedBy: 42, totalAcademies: 42 },
  { id: 3, track: "신규 온보딩", title: "학부모 리포트 발행 방법", desc: "월간 리포트 자동 발행 및 커스텀 설정법을 다룹니다.", duration: "25분", status: "완료", completedBy: 38, totalAcademies: 42 },
  { id: 4, track: "신규 온보딩", title: "내신 허브 운영 가이드", desc: "내신 범위 설정, 시험 일정 연동, 결과 분석을 배웁니다.", duration: "35분", status: "진행 중", completedBy: 29, totalAcademies: 42 },
  { id: 5, track: "심화 과정", title: "Speaking & Writing 심화 운영", desc: "AI 피드백 활용법, 루브릭 커스터마이징, 수업 통합 전략.", duration: "55분", status: "진행 중", completedBy: 18, totalAcademies: 42, badge: "🏆 심화 인증" },
  { id: 6, track: "심화 과정", title: "어휘 트랙 고급 설계", desc: "학년별 어휘 트랙 커스터마이징 및 진도 분석.", duration: "40분", status: "미시작", completedBy: 0, totalAcademies: 42 },
  { id: 7, track: "심화 과정", title: "Grammar 모듈 수업 통합법", desc: "문법 챕터를 오프라인 수업과 연계하는 방법론.", duration: "45분", status: "미시작", completedBy: 0, totalAcademies: 42 },
  { id: 8, track: "마케팅 & 운영", title: "SNS 마케팅 기초 (학원 특화)", desc: "LEXiOX 브랜드 가이드에 맞는 SNS 콘텐츠 제작법.", duration: "35분", status: "완료", completedBy: 35, totalAcademies: 42 },
  { id: 9, track: "마케팅 & 운영", title: "신입생 모집 & 설명회 운영", desc: "체험 수업, 설명회 자료, 상담 스크립트 활용 전략.", duration: "50분", status: "진행 중", completedBy: 22, totalAcademies: 42 },
  { id: 10, track: "마케팅 & 운영", title: "학원 운영 재무 기초", desc: "수강료 설정, 환불 정책, 수익 구조 분석 기초.", duration: "60분", status: "미시작", completedBy: 0, totalAcademies: 42, badge: "💼 운영 인증" },
];

const statusBadge: Record<ModuleStatus, string> = {
  완료: "bg-emerald-100 text-emerald-700",
  "진행 중": "bg-blue-100 text-blue-700",
  미시작: "bg-slate-100 text-slate-500",
};

const TRACKS: Track[] = ["신규 온보딩", "심화 과정", "마케팅 & 운영"];

export default function TrainingPage() {
  const [activeTrack, setActiveTrack] = useState<Track | "전체">("전체");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = activeTrack === "전체" ? MODULES : MODULES.filter((m) => m.track === activeTrack);

  const trackStats = TRACKS.map((t) => {
    const mods = MODULES.filter((m) => m.track === t);
    const avgPct = mods.length ? Math.round(mods.reduce((acc, m) => acc + (m.completedBy / m.totalAcademies) * 100, 0) / mods.length) : 0;
    return { track: t, count: mods.length, avgPct };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">교육 센터</h1>
        <p className="mt-1 text-sm text-neutral-500">가맹점 필수·선택 교육 모듈 이수 현황을 관리합니다.</p>
      </div>

      {/* Track overview cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {trackStats.map((ts) => (
          <div key={ts.track} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500 mb-2">{ts.track}</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-slate-900">{ts.avgPct}%</span>
              <span className="text-xs text-slate-400">{ts.count}개 모듈</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${ts.avgPct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">평균 가맹점 이수율</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["전체", ...TRACKS] as const).map((t) => (
          <button key={t} onClick={() => setActiveTrack(t)} className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${activeTrack === t ? "bg-emerald-900 text-white border-emerald-900" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}>{t}</button>
        ))}
      </div>

      {/* Module list */}
      <div className="space-y-3">
        {filtered.map((m) => {
          const pct = Math.round((m.completedBy / m.totalAcademies) * 100);
          const isOpen = expandedId === m.id;
          return (
            <div key={m.id} className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(isOpen ? null : m.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge[m.status]}`}>{m.status}</span>
                    <span className="text-[10px] text-slate-400">{m.track}</span>
                    <span className="text-[10px] text-slate-400">· {m.duration}</span>
                    {m.badge && <span className="text-[10px] text-violet-700 font-semibold">{m.badge}</span>}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{m.title}</p>
                </div>
                <div className="shrink-0 text-right min-w-[80px]">
                  <p className="text-sm font-bold text-slate-900">{pct}%</p>
                  <p className="text-[11px] text-slate-400">{m.completedBy}/{m.totalAcademies} 원</p>
                </div>
                <span className="text-slate-400 text-xs ml-1">{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <div className="border-t px-5 py-4 bg-slate-50 space-y-3">
                  <p className="text-sm text-slate-600">{m.desc}</p>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex gap-3">
                    <button className="rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">이수 독촉 발송</button>
                    <button className="rounded-lg border px-3 py-1.5 text-xs text-slate-600 hover:bg-white">상세 이수 현황</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
