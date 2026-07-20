"use client";

import { useState } from "react";

type ResourceCategory = "마케팅" | "교육 자료" | "브랜드 에셋" | "운영 가이드" | "계약·법무";
type FileType = "PDF" | "ZIP" | "PSD" | "XLSX" | "PPTX" | "DOCX";

type Resource = {
  id: number;
  category: ResourceCategory;
  title: string;
  desc: string;
  fileType: FileType;
  fileSize: string;
  uploadedAt: string;
  downloadCount: number;
  isNew?: boolean;
};

const RESOURCES: Resource[] = [
  { id: 1, category: "마케팅", title: "2026 신학기 마케팅 키트", desc: "현수막, 전단지, SNS 카드뉴스 PSD 파일 포함. 편집 가능한 벡터 소스.", fileType: "ZIP", fileSize: "48 MB", uploadedAt: "2026-06-04", downloadCount: 31, isNew: true },
  { id: 2, category: "마케팅", title: "원장 인터뷰 카드뉴스 템플릿", desc: "인스타그램·카카오 채널용 스토리 카드 템플릿 (1:1, 9:16 비율).", fileType: "PSD", fileSize: "12 MB", uploadedAt: "2026-05-20", downloadCount: 24 },
  { id: 3, category: "마케팅", title: "학부모 상담 스크립트 (2026 버전)", desc: "첫 상담 흐름, 반론 대응, 등록 마감 유도 스크립트.", fileType: "DOCX", fileSize: "180 KB", uploadedAt: "2026-05-15", downloadCount: 38 },
  { id: 4, category: "교육 자료", title: "TOEFL 2026 커리큘럼 가이드북", desc: "파트별 교육 목표, 수업 설계 원칙, 학생 레벨 분류 기준.", fileType: "PDF", fileSize: "3.2 MB", uploadedAt: "2026-06-01", downloadCount: 41, isNew: true },
  { id: 5, category: "교육 자료", title: "LEXiOX Jr. 교사 매뉴얼 v2", desc: "Junior 리스닝·Grammar 수업 지도서 및 Q&A 가이드.", fileType: "PDF", fileSize: "5.6 MB", uploadedAt: "2026-05-10", downloadCount: 29 },
  { id: 6, category: "교육 자료", title: "학기 별 어휘 트랙 배정표 (2026)", desc: "학년별 권장 어휘 트랙, 진도 기준 및 평가 루브릭.", fileType: "XLSX", fileSize: "640 KB", uploadedAt: "2026-04-28", downloadCount: 35 },
  { id: 7, category: "브랜드 에셋", title: "LEXiOX 공식 로고 패키지", desc: "SVG/PNG/AI 고해상도 로고, 다크·라이트·컬러 버전.", fileType: "ZIP", fileSize: "8 MB", uploadedAt: "2026-01-10", downloadCount: 42 },
  { id: 8, category: "브랜드 에셋", title: "브랜드 컬러 & 타이포그래피 가이드", desc: "공식 HEX 코드, 폰트 파일, 사용 금지 사례 포함.", fileType: "PDF", fileSize: "2.1 MB", uploadedAt: "2026-01-10", downloadCount: 40 },
  { id: 9, category: "운영 가이드", title: "학생 일괄 등록 CSV 템플릿", desc: "이름·이메일·학년·반 형식. 가이드 포함.", fileType: "XLSX", fileSize: "28 KB", uploadedAt: "2026-03-05", downloadCount: 39 },
  { id: 10, category: "운영 가이드", title: "가맹점 운영 바이블 (2026 개정)", desc: "개원 절차, 강사 채용, CS 대응, 비상 연락망 포함.", fileType: "PDF", fileSize: "9.4 MB", uploadedAt: "2026-02-20", downloadCount: 42 },
  { id: 11, category: "계약·법무", title: "가맹 표준 계약서 (2026 버전)", desc: "최신 개정된 가맹 계약서 양식. 법무팀 검토 완료.", fileType: "PDF", fileSize: "1.1 MB", uploadedAt: "2026-01-05", downloadCount: 42 },
  { id: 12, category: "계약·법무", title: "개인정보처리방침 안내문 템플릿", desc: "학원용 개인정보처리방침 안내문 (편집 가능 버전).", fileType: "DOCX", fileSize: "95 KB", uploadedAt: "2026-01-05", downloadCount: 36 },
];

const CATS: ResourceCategory[] = ["마케팅", "교육 자료", "브랜드 에셋", "운영 가이드", "계약·법무"];

const catColor: Record<ResourceCategory, string> = {
  마케팅: "bg-pink-100 text-pink-700",
  "교육 자료": "bg-violet-100 text-violet-700",
  "브랜드 에셋": "bg-blue-100 text-blue-700",
  "운영 가이드": "bg-emerald-100 text-emerald-700",
  "계약·법무": "bg-amber-100 text-amber-700",
};

const fileTypeColor: Record<FileType, string> = {
  PDF: "bg-red-50 text-red-600 border-red-200",
  ZIP: "bg-slate-100 text-slate-600 border-slate-200",
  PSD: "bg-blue-50 text-blue-600 border-blue-200",
  XLSX: "bg-emerald-50 text-emerald-600 border-emerald-200",
  PPTX: "bg-orange-50 text-orange-600 border-orange-200",
  DOCX: "bg-indigo-50 text-indigo-600 border-indigo-200",
};

const catStats = CATS.map((c) => ({
  cat: c,
  count: RESOURCES.filter((r) => r.category === c).length,
  downloads: RESOURCES.filter((r) => r.category === c).reduce((acc, r) => acc + r.downloadCount, 0),
}));

export default function ResourcesPage() {
  const [catFilter, setCatFilter] = useState<ResourceCategory | "전체">("전체");
  const [search, setSearch] = useState("");

  const filtered = RESOURCES.filter((r) => {
    const matchCat = catFilter === "전체" || r.category === catFilter;
    const matchSearch = !search || r.title.includes(search) || r.desc.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">자료실</h1>
        <p className="mt-1 text-sm text-neutral-500">마케팅, 교육, 브랜드, 운영 자료를 가맹점에 배포합니다.</p>
      </div>

      {/* Category overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {catStats.map((cs) => (
          <button key={cs.cat} onClick={() => setCatFilter(cs.cat === catFilter ? "전체" : cs.cat as ResourceCategory)}
            className={`rounded-xl border p-3 text-left transition-all ${catFilter === cs.cat ? "border-emerald-400 bg-emerald-50 shadow-sm" : "bg-white hover:border-emerald-200"}`}>
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold mb-1.5 ${catColor[cs.cat as ResourceCategory]}`}>{cs.cat}</span>
            <p className="text-lg font-bold text-slate-900">{cs.count}</p>
            <p className="text-[11px] text-slate-400">{cs.downloads} 다운로드</p>
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          className="rounded-lg border px-3 py-2 text-sm w-64"
          placeholder="자료 검색…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2 flex-wrap">
          {(["전체", ...CATS] as const).map((c) => (
            <button key={c} onClick={() => setCatFilter(c)} className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${catFilter === c ? "bg-emerald-900 text-white border-emerald-900" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Resource grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${catColor[r.category]}`}>{r.category}</span>
                {r.isNew && <span className="rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-bold">NEW</span>}
              </div>
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${fileTypeColor[r.fileType]}`}>{r.fileType}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{r.title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-snug">{r.desc}</p>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{r.fileSize} · {r.uploadedAt}</span>
              <span>{r.downloadCount}회 다운로드</span>
            </div>
            <button className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors">
              다운로드 ↓
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 py-16 text-center text-sm text-slate-400">검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
