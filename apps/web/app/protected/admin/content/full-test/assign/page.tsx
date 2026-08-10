import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getAssignedTestIds } from "@/lib/supabase/assignment-guard";
import { createAssignmentGroup, type AssignmentGroupKind } from "@/lib/supabase/testAssignmentGroups";

export const dynamic = "force-dynamic";

type SearchParamsLike = Promise<Record<string, string | string[] | undefined>>;

function sp(params: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = params[key];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

async function assignGroupAction(formData: FormData) {
  "use server";

  const kind = (formData.get("kind") as string | null) as AssignmentGroupKind | null;
  const studentIds = formData.getAll("student_ids") as string[];
  const readingTestId = formData.get("reading_test_id") as string | null;
  const listeningTestId = formData.get("listening_test_id") as string | null;
  const speakingTestId = formData.get("speaking_test_id") as string | null;
  const writingTestId = formData.get("writing_test_id") as string | null;
  const dueDate = formData.get("due_date") as string | null;

  if (
    !kind ||
    !readingTestId ||
    !listeningTestId ||
    !speakingTestId ||
    !writingTestId ||
    studentIds.length === 0
  ) {
    redirect(
      "/admin/content/full-test/assign?error=" +
        encodeURIComponent("Full/Half Test 종류, 4개 영역 시험, 학생을 모두 선택해주세요.")
    );
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const service = getServiceSupabase();

  // reading/listening은 admin 화면 목록이 _2026 테이블에서 오는데 test_assignments의
  // FK는 레거시 테이블을 향한다 (기존 개별 assign 페이지와 동일한 동기화가 필요).
  const { data: sourceReading, error: sourceReadingError } = await service
    .from("reading_tests_2026")
    .select("id, label, payload")
    .eq("id", readingTestId)
    .maybeSingle();

  if (sourceReadingError || !sourceReading) {
    redirect("/admin/content/full-test/assign?error=" + encodeURIComponent("선택한 Reading 시험을 찾을 수 없습니다."));
  }

  const { error: readingSyncError } = await service.from("reading_tests").upsert(
    {
      id: sourceReading!.id,
      label: sourceReading!.label,
      exam_era: "ibt_2026",
      payload: sourceReading!.payload,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (readingSyncError) {
    redirect("/admin/content/full-test/assign?error=" + encodeURIComponent("Reading 시험 동기화 실패: " + readingSyncError.message));
  }

  const { data: sourceListening, error: sourceListeningError } = await service
    .from("listening_tests_2026")
    .select("id, label, payload")
    .eq("id", listeningTestId)
    .maybeSingle();

  if (sourceListeningError || !sourceListening) {
    redirect("/admin/content/full-test/assign?error=" + encodeURIComponent("선택한 Listening 시험을 찾을 수 없습니다."));
  }

  const { error: listeningSyncError } = await service.from("listening_tests").upsert(
    {
      id: sourceListening!.id,
      label: sourceListening!.label,
      exam_era: "ibt_2026",
      content: sourceListening!.payload,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (listeningSyncError) {
    redirect("/admin/content/full-test/assign?error=" + encodeURIComponent("Listening 시험 동기화 실패: " + listeningSyncError.message));
  }

  try {
    for (const studentId of studentIds) {
      await createAssignmentGroup({
        studentId,
        assignedBy: user?.id ?? null,
        kind,
        dueDate: dueDate && dueDate.trim() ? dueDate : null,
        testIds: {
          reading: readingTestId!,
          listening: listeningTestId!,
          speaking: speakingTestId!,
          writing: writingTestId!,
        },
      });
    }
  } catch (e: any) {
    redirect("/admin/content/full-test/assign?error=" + encodeURIComponent(e?.message ?? "배정 실패"));
  }

  revalidatePath("/admin/content/full-test/assign");
  redirect(
    "/admin/content/full-test/assign?success=" +
      encodeURIComponent(`${studentIds.length}명에게 ${kind === "full" ? "Full Test" : "Half Test"} 배정 완료`)
  );
}

const SECTION_COLOR_CLASSES = {
  sky: {
    label: "flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-sky-50/50 has-[:checked]:border-sky-400 has-[:checked]:bg-sky-50",
    input: "accent-sky-500",
  },
  teal: {
    label: "flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-teal-50/50 has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50",
    input: "accent-teal-500",
  },
  orange: {
    label: "flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-orange-50/50 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50",
    input: "accent-orange-500",
  },
  violet: {
    label: "flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-violet-50/50 has-[:checked]:border-violet-400 has-[:checked]:bg-violet-50",
    input: "accent-violet-500",
  },
} as const;

function SectionPicker({
  title,
  name,
  color,
  tests,
  assignedIds,
  emptyHref,
}: {
  title: string;
  name: string;
  color: keyof typeof SECTION_COLOR_CLASSES;
  tests: { id: string; label: string }[];
  assignedIds: Set<string>;
  emptyHref: string;
}) {
  const classes = SECTION_COLOR_CLASSES[color];
  return (
    <section className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <div className="max-h-56 space-y-2 overflow-y-auto">
        {tests.map((t) => (
          <label key={t.id} className={classes.label}>
            <input type="radio" name={name} value={t.id} required className={classes.input} />
            <span className="flex-1 text-sm font-medium text-slate-800">{t.label}</span>
            {assignedIds.has(t.id) && <span className="text-[10px] text-slate-400">📌 배정됨</span>}
          </label>
        ))}
        {tests.length === 0 && (
          <p className="text-xs text-slate-400">
            시험이 없습니다. <Link href={emptyHref} className="text-blue-500 underline">새로 만들기</Link>
          </p>
        )}
      </div>
    </section>
  );
}

export default async function AssignFullTestPage({ searchParams }: { searchParams: SearchParamsLike }) {
  const params = await searchParams;
  const errorMsg = sp(params, "error");
  const successMsg = sp(params, "success");

  const supabase = await getServerSupabase();

  const [
    { data: readingTests },
    { data: listeningTests },
    { data: speakingTests },
    { data: writingTests },
    { data: students },
    readingAssignedIds,
    listeningAssignedIds,
    speakingAssignedIds,
    writingAssignedIds,
  ] = await Promise.all([
    supabase.from("reading_tests_2026").select("id, label").order("updated_at", { ascending: false }),
    supabase.from("listening_tests_2026").select("id, label").order("updated_at", { ascending: false }),
    supabase.from("speaking_tests").select("id, label").order("created_at", { ascending: false }),
    supabase.from("writing_tests").select("id, label").order("updated_at", { ascending: false }),
    supabase.from("profiles").select("id, name, email").eq("role", "student").order("name"),
    getAssignedTestIds("reading"),
    getAssignedTestIds("listening"),
    getAssignedTestIds("speaking"),
    getAssignedTestIds("writing"),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Admin / Full &amp; Half Test / Assign
        </p>
        <h1 className="text-xl font-bold text-slate-900">통합 시험 배정</h1>
        <p className="text-xs text-slate-500">
          Reading → Listening → Speaking → Writing 순서로 하나의 시험처럼 이어서 배정합니다.
        </p>
      </header>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(errorMsg)}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ {decodeURIComponent(successMsg)}
        </div>
      )}

      <form action={assignGroupAction} className="space-y-6">
        <section className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">종류</h2>
          <div className="flex gap-3">
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 hover:bg-slate-50 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
              <input type="radio" name="kind" value="full" required defaultChecked className="accent-slate-900" />
              <span className="text-sm font-semibold text-slate-800">Full Test</span>
            </label>
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 hover:bg-slate-50 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
              <input type="radio" name="kind" value="half" required className="accent-slate-900" />
              <span className="text-sm font-semibold text-slate-800">Half Test</span>
            </label>
          </div>
        </section>

        <SectionPicker
          title="1. Reading 시험 선택"
          name="reading_test_id"
          color="sky"
          tests={readingTests ?? []}
          assignedIds={readingAssignedIds}
          emptyHref="/admin/content/updated-reading/new"
        />
        <SectionPicker
          title="2. Listening 시험 선택"
          name="listening_test_id"
          color="teal"
          tests={listeningTests ?? []}
          assignedIds={listeningAssignedIds}
          emptyHref="/admin/content/updated-listening/new"
        />
        <SectionPicker
          title="3. Speaking 시험 선택"
          name="speaking_test_id"
          color="orange"
          tests={speakingTests ?? []}
          assignedIds={speakingAssignedIds}
          emptyHref="/admin/content/updated-speaking/new"
        />
        <SectionPicker
          title="4. Writing 시험 선택"
          name="writing_test_id"
          color="violet"
          tests={writingTests ?? []}
          assignedIds={writingAssignedIds}
          emptyHref="/admin/content/updated-writing/new"
        />

        <section className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            학생 선택 <span className="text-xs font-normal text-slate-400">(복수 선택 가능)</span>
          </h2>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {(students ?? []).map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 hover:bg-slate-50 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50"
              >
                <input type="checkbox" name="student_ids" value={s.id} className="accent-slate-900" />
                <span className="text-sm text-slate-800">{s.name ?? s.email}</span>
                {s.name && <span className="text-xs text-slate-400">{s.email}</span>}
              </label>
            ))}
            {(students ?? []).length === 0 && (
              <p className="text-xs text-slate-400">등록된 학생이 없습니다.</p>
            )}
          </div>
        </section>

        <section className="space-y-2 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            마감일 <span className="text-xs font-normal text-slate-400">(선택)</span>
          </h2>
          <input
            type="date"
            name="due_date"
            className="rounded-lg border px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </section>

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 active:scale-[0.99]"
        >
          배정하기
        </button>
      </form>
    </main>
  );
}
