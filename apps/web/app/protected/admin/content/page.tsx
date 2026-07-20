// apps/web/app/(protected)/admin/content/page.tsx

import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{
  q?: string;
  track?: string;
  section?: string;
  school_level?: string;
  source_type?: string;
  status?: string;
}>;

type Track = "naesin" | "junior" | "toefl" | "voca";
type Section = "reading" | "listening" | "speaking" | "writing" | "grammar" | "vocab";
type Status = "draft" | "published" | "archived";
type SourceType = "textbook" | "mock_exam" | "external" | "teacher_made";
type SchoolLevel = "elementary" | "middle" | "high";

type ReadingTestDbRow = {
  id: string;
  label: string;
  exam_era: string | null;
  updated_at: string | null;
  payload: unknown | null;
};

type ContentRow = {
  id: string;
  title: string;
  track: Track;
  section: Section;
  schoolLevel: SchoolLevel;
  sourceType: SourceType;
  publisher?: string;
  sourceBook?: string;
  grade?: string;
  semester?: string;
  unitChapter?: string;
  questionCount: number;
  linkedScopes: number;
  status: Status;
  updatedAt: string;
  editorHref: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function formatUpdatedAt(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function inferTrack(label: string, payload: unknown): Track {
  const meta = asRecord(asRecord(payload)?.meta);
  const track = asString(meta?.track)?.toLowerCase();

  if (track === "naesin" || track === "junior" || track === "toefl" || track === "voca") {
    return track;
  }

  const lower = label.toLowerCase();
  if (lower.includes("junior") || label.includes("주니어")) return "junior";
  if (lower.includes("toefl")) return "toefl";
  if (lower.includes("voca") || lower.includes("vocab") || label.includes("보카")) return "voca";
  return "naesin";
}

function inferSchoolLevel(label: string, payload: unknown): SchoolLevel {
  const meta = asRecord(asRecord(payload)?.meta);
  const schoolLevel = asString(meta?.schoolLevel)?.toLowerCase();

  if (schoolLevel === "elementary" || schoolLevel === "middle" || schoolLevel === "high") {
    return schoolLevel;
  }

  const grade = asString(meta?.grade) ?? "";
  const source = `${label} ${grade}`;

  if (source.includes("초") || source.toLowerCase().includes("elementary")) return "elementary";
  if (source.includes("중") || source.toLowerCase().includes("middle")) return "middle";
  return "high";
}

function inferSourceType(payload: unknown): SourceType {
  const meta = asRecord(asRecord(payload)?.meta);
  const sourceType = asString(meta?.sourceType)?.toLowerCase();

  if (
    sourceType === "textbook" ||
    sourceType === "mock_exam" ||
    sourceType === "external" ||
    sourceType === "teacher_made"
  ) {
    return sourceType;
  }

  return "teacher_made";
}

function inferStatus(payload: unknown): Status {
  const meta = asRecord(asRecord(payload)?.meta);
  const status = asString(meta?.status)?.toLowerCase();

  if (status === "draft" || status === "published" || status === "archived") {
    return status;
  }

  return "draft";
}

function countQuestionsDeep(node: unknown): number {
  if (!node) return 0;

  if (Array.isArray(node)) {
    return node.reduce((sum, item) => sum + countQuestionsDeep(item), 0);
  }

  const obj = asRecord(node);
  if (!obj) return 0;

  if (Array.isArray(obj.questions)) {
    return obj.questions.length;
  }

  const keysToScan = [
    "passages",
    "sections",
    "modules",
    "testlets",
    "sets",
    "parts",
    "items",
  ] as const;

  return keysToScan.reduce((sum, key) => sum + countQuestionsDeep(obj[key]), 0);
}

function extractQuestionCount(payload: unknown): number {
  const count = countQuestionsDeep(payload);
  return count > 0 ? count : 0;
}

function extractMetaText(payload: unknown, key: string): string | undefined {
  const meta = asRecord(asRecord(payload)?.meta);
  return asString(meta?.[key]);
}

function normalizeText(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function contentMatchesQuery(row: ContentRow, q: string) {
  const needle = normalizeText(q);
  if (!needle) return true;

  const haystack = [
    row.title,
    row.publisher,
    row.sourceBook,
    row.grade,
    row.semester,
    row.unitChapter,
    trackLabel(row.track),
    sectionLabel(row.section),
    schoolLevelLabel(row.schoolLevel),
    sourceTypeLabel(row.sourceType),
    statusLabel(row.status),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

function trackLabel(track: Track) {
  switch (track) {
    case "naesin":
      return "내신";
    case "junior":
      return "주니어";
    case "toefl":
      return "TOEFL";
    case "voca":
      return "VOCA";
    default:
      return track;
  }
}

function sectionLabel(section: Section) {
  switch (section) {
    case "reading":
      return "리딩";
    case "listening":
      return "리스닝";
    case "speaking":
      return "스피킹";
    case "writing":
      return "라이팅";
    case "grammar":
      return "문법";
    case "vocab":
      return "보카";
    default:
      return section;
  }
}

function schoolLevelLabel(level: SchoolLevel) {
  switch (level) {
    case "elementary":
      return "초등";
    case "middle":
      return "중등";
    case "high":
      return "고등";
    default:
      return level;
  }
}

function sourceTypeLabel(type: SourceType) {
  switch (type) {
    case "textbook":
      return "교과서";
    case "mock_exam":
      return "모의고사";
    case "external":
      return "외부교재";
    case "teacher_made":
      return "자체제작";
    default:
      return type;
  }
}

function statusLabel(status: Status) {
  switch (status) {
    case "draft":
      return "초안";
    case "published":
      return "운영중";
    case "archived":
      return "보관";
    default:
      return status;
  }
}

function statusBadgeClass(status: Status) {
  switch (status) {
    case "draft":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "archived":
      return "border-neutral-200 bg-neutral-100 text-neutral-600";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

function mapReadingTestToContentRow(row: ReadingTestDbRow): ContentRow {
  const payload = row.payload;
  const track = inferTrack(row.label, payload);

  return {
    id: row.id,
    title: row.label,
    track,
    section: "reading",
    schoolLevel: inferSchoolLevel(row.label, payload),
    sourceType: inferSourceType(payload),
    publisher: extractMetaText(payload, "publisher"),
    sourceBook: extractMetaText(payload, "sourceBook"),
    grade: extractMetaText(payload, "grade"),
    semester: extractMetaText(payload, "semester"),
    unitChapter: extractMetaText(payload, "unitChapter"),
    questionCount: extractQuestionCount(payload),
    linkedScopes: 0,
    status: inferStatus(payload),
    updatedAt: formatUpdatedAt(row.updated_at),
    editorHref: `/admin/content/updated-reading/${row.id}`,
  };
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const q = sp.q?.trim() ?? "";
  const trackFilter = sp.track?.trim() ?? "";
  const sectionFilter = sp.section?.trim() ?? "";
  const schoolLevelFilter = sp.school_level?.trim() ?? "";
  const sourceTypeFilter = sp.source_type?.trim() ?? "";
  const statusFilter = sp.status?.trim() ?? "";

  let rows: ContentRow[] = [];
  let loadError: string | null = null;

  try {
    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from("reading_tests_2026")
      .select("id,label,exam_era,updated_at,payload")
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (error) {
      loadError = error.message ?? "Unknown Supabase error";
    } else {
      const readingRows = (data ?? []) as ReadingTestDbRow[];
      rows = readingRows.map(mapReadingTestToContentRow);
    }
  } catch (e: unknown) {
    loadError = e instanceof Error ? e.message : "Unknown server error";
  }

  const filteredRows = rows.filter((row) => {
    if (!contentMatchesQuery(row, q)) return false;
    if (trackFilter && row.track !== trackFilter) return false;
    if (sectionFilter && row.section !== sectionFilter) return false;
    if (schoolLevelFilter && row.schoolLevel !== schoolLevelFilter) return false;
    if (sourceTypeFilter && row.sourceType !== sourceTypeFilter) return false;
    if (statusFilter && row.status !== statusFilter) return false;
    return true;
  });

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Admin / Content
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">콘텐츠 매니저</h1>
          <p className="text-sm text-neutral-500">
            공통 콘텐츠 허브. 이번 스프린트에서는 Reading 실데이터를 우선 연결한다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/content/new"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            새 콘텐츠
          </Link>
          <Link
            href="/admin/content/updated-reading"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Reading 2026 전용 목록
          </Link>
          <Link
            href="/admin/content/updated-listening"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-blue-700 border-blue-200 hover:bg-blue-50"
          >
            🎧 Listening 2026 전용 목록
          </Link>
          <Link
            href="/admin/content/grammar-2026"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          >
            LEXiOX-Gram 편집기
          </Link>
          <Link
            href="/admin/assignments/new"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            과제 배정
          </Link>
        </div>
      </header>

      {loadError ? (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          <p className="font-semibold">콘텐츠 목록을 불러오지 못했습니다.</p>
          <p className="mt-1 text-xs">{loadError}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-5">
        <form className="grid gap-3 md:grid-cols-6">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="제목, 교재명, 출처 검색"
            className="rounded-xl border px-3 py-2 text-sm outline-none placeholder:text-neutral-400"
          />

          <select
            name="track"
            defaultValue={sp.track ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 트랙</option>
            <option value="naesin">내신</option>
            <option value="junior">주니어</option>
            <option value="toefl">TOEFL</option>
            <option value="voca">VOCA</option>
          </select>

          <select
            name="section"
            defaultValue={sp.section ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 영역</option>
            <option value="reading">리딩</option>
            <option value="listening">리스닝</option>
            <option value="speaking">스피킹</option>
            <option value="writing">라이팅</option>
            <option value="grammar">문법</option>
            <option value="vocab">보카</option>
          </select>

          <select
            name="school_level"
            defaultValue={sp.school_level ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 학교급</option>
            <option value="elementary">초등</option>
            <option value="middle">중등</option>
            <option value="high">고등</option>
          </select>

          <select
            name="source_type"
            defaultValue={sp.source_type ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 출처 유형</option>
            <option value="textbook">교과서</option>
            <option value="mock_exam">모의고사</option>
            <option value="external">외부교재</option>
            <option value="teacher_made">자체제작</option>
          </select>

          <div className="flex gap-2">
            <select
              name="status"
              defaultValue={sp.status ?? ""}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            >
              <option value="">전체 상태</option>
              <option value="draft">초안</option>
              <option value="published">운영중</option>
              <option value="archived">보관</option>
            </select>

            <button
              type="submit"
              className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              적용
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-white">
        <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">콘텐츠 목록</h2>
            <p className="mt-1 text-xs text-neutral-500">
              총 {rows.length}개 중 {filteredRows.length}개 표시. 현재는 Reading 2026 실데이터 우선 연결 상태.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
            <span className="rounded-full border px-3 py-1">
              내신 {filteredRows.filter((r) => r.track === "naesin").length}
            </span>
            <span className="rounded-full border px-3 py-1">
              주니어 {filteredRows.filter((r) => r.track === "junior").length}
            </span>
            <span className="rounded-full border px-3 py-1">
              TOEFL {filteredRows.filter((r) => r.track === "toefl").length}
            </span>
            <span className="rounded-full border px-3 py-1">
              VOCA {filteredRows.filter((r) => r.track === "voca").length}
            </span>
            <span className="rounded-full border px-3 py-1">
              리딩 {filteredRows.filter((r) => r.section === "reading").length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">트랙</th>
                <th className="px-4 py-3 font-medium">영역</th>
                <th className="px-4 py-3 font-medium">학교급</th>
                <th className="px-4 py-3 font-medium">출처</th>
                <th className="px-4 py-3 font-medium">교재 / 단원</th>
                <th className="px-4 py-3 font-medium">문항</th>
                <th className="px-4 py-3 font-medium">연결 Scope</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">수정일</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-t align-top">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <Link
                        href={row.editorHref}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {row.title}
                      </Link>
                      <p className="text-xs text-neutral-500">
                        {row.grade ?? "-"} / {row.semester ?? "-"}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-neutral-700">{trackLabel(row.track)}</td>
                  <td className="px-4 py-3 text-neutral-700">{sectionLabel(row.section)}</td>
                  <td className="px-4 py-3 text-neutral-700">
                    {schoolLevelLabel(row.schoolLevel)}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{sourceTypeLabel(row.sourceType)}</td>

                  <td className="px-4 py-3 text-neutral-700">
                    <div className="space-y-1">
                      <p>{row.sourceBook ?? "-"}</p>
                      <p className="text-xs text-neutral-500">
                        {row.publisher ?? "-"} {row.unitChapter ? `· ${row.unitChapter}` : ""}
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-neutral-700">{row.questionCount}</td>
                  <td className="px-4 py-3 text-neutral-700">{row.linkedScopes}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                        row.status,
                      )}`}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-neutral-700">{row.updatedAt}</td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-2">
                      <Link
                        href={row.editorHref}
                        className="text-xs font-medium text-neutral-700 hover:underline"
                      >
                        수정
                      </Link>

                      {row.track === "naesin" ? (
                        <Link
                          href="/admin/naesin/scopes"
                          className="text-xs text-neutral-500 hover:text-neutral-700 hover:underline"
                        >
                          Scope 연결
                        </Link>
                      ) : (
                        <Link
                          href="/admin/assignments/new"
                          className="text-xs text-neutral-500 hover:text-neutral-700 hover:underline"
                        >
                          바로 배정
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-neutral-500">
                    조건에 맞는 콘텐츠가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
