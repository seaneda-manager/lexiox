import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type SearchParamsLike = Promise<Record<string, string | string[] | undefined>>;

function sp(params: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = params[key];
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

async function assignAction(formData: FormData) {
  "use server";
  const studentIds = formData.getAll("student_ids") as string[];
  const speakingTestId = formData.get("speaking_test_id") as string | null;
  const dueDate = formData.get("due_date") as string | null;

  if (!speakingTestId || studentIds.length === 0) {
    redirect("/admin/content/updated-speaking/assign?error=" + encodeURIComponent("시험과 학생을 선택해주세요."));
  }

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const service = getServiceSupabase();
  const rows = studentIds.map((sid) => ({
    student_id: sid,
    assigned_by: user?.id ?? null,
    sections: ["speaking"],
    speaking_test_id: speakingTestId,
    due_date: dueDate || null,
    status: "pending",
  }));

  const { error } = await service.from("test_assignments").insert(rows);

  if (error) {
    redirect("/admin/content/updated-speaking/assign?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/admin/content/updated-speaking/assign");
  redirect("/admin/content/updated-speaking/assign?success=" + encodeURIComponent(`${studentIds.length}명에게 assign 완료`));
}

export default async function AssignSpeakingPage({ searchParams }: { searchParams: SearchParamsLike }) {
  const params = await searchParams;
  const errorMsg = sp(params, "error");
  const successMsg = sp(params, "success");

  const supabase = await getServerSupabase();

  const [{ data: tests }, { data: students }] = await Promise.all([
    supabase
      .from("speaking_tests")
      .select("id, label, is_locked")
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, name, email")
      .eq("role", "student")
      .order("name"),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Admin / Updated Speaking / Assign
        </p>
        <h1 className="text-xl font-bold text-slate-900">시험 배정</h1>
      </header>

      {errorMsg && (
        <div className="fixed inset-x-0 top-4 z-50 mx-auto max-w-md rounded-lg border border-red-300 bg-red-100 px-4 py-3 shadow-lg">
          <p className="text-sm font-semibold text-red-800">❌ {decodeURIComponent(errorMsg)}</p>
        </div>
      )}
      {successMsg && (
        <div className="fixed inset-x-0 top-4 z-50 mx-auto max-w-md rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-3 shadow-lg">
          <p className="text-sm font-semibold text-emerald-800">✓ {decodeURIComponent(successMsg)}</p>
        </div>
      )}

      <form action={assignAction} className="space-y-6">

        {/* 시험 선택 */}
        <section className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">시험 선택</h2>
          <div className="space-y-2">
            {(tests ?? []).map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-orange-50/50 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50">
                <input type="radio" name="speaking_test_id" value={t.id} required className="accent-orange-500" />
                <span className="flex-1 text-sm font-medium text-slate-800">{t.label}</span>
                {t.is_locked && <span className="text-[10px] text-slate-400">🔒</span>}
              </label>
            ))}
            {(tests ?? []).length === 0 && (
              <p className="text-xs text-slate-400">시험이 없습니다. <Link href="/admin/content/updated-speaking/new" className="text-orange-500 underline">새로 만들기</Link></p>
            )}
          </div>
        </section>

        {/* 학생 선택 */}
        <section className="space-y-3 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">학생 선택 <span className="text-xs font-normal text-slate-400">(복수 선택 가능)</span></h2>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {(students ?? []).map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 hover:bg-orange-50/50 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50">
                <input type="checkbox" name="student_ids" value={s.id} className="accent-orange-500" />
                <span className="text-sm text-slate-800">{s.name ?? s.email}</span>
                {s.name && <span className="text-xs text-slate-400">{s.email}</span>}
              </label>
            ))}
            {(students ?? []).length === 0 && (
              <p className="text-xs text-slate-400">등록된 학생이 없습니다.</p>
            )}
          </div>
        </section>

        {/* 마감일 (선택) */}
        <section className="space-y-2 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">마감일 <span className="text-xs font-normal text-slate-400">(선택)</span></h2>
          <input
            type="date"
            name="due_date"
            className="rounded-lg border px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </section>

        <button
          type="submit"
          className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.99]"
        >
          배정하기
        </button>
      </form>
    </main>
  );
}
