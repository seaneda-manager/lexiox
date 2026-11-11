import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { planPromotion } from "@/lib/students/gradePromotion";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;

async function requireAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me || me.role !== "admin") redirect("/admin/students?error=" + encodeURIComponent("Admin only."));
  return { supabase };
}

async function promoteAction(formData: FormData) {
  "use server";
  const { supabase } = await requireAdmin();

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) redirect("/admin/students/promote?error=" + encodeURIComponent("선택된 학생이 없습니다."));

  // 화면 값을 믿지 않고 서버에서 현재 학년을 다시 읽어 계산한다 (이중 클릭·중복 적용 방지).
  const { data: rows, error } = await supabase
    .from("academy_students")
    .select("id, grade")
    .in("id", ids);
  if (error) redirect("/admin/students/promote?error=" + encodeURIComponent(error.message));

  const expected = new Map<string, string>();
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("from_")) expected.set(k.slice(5), String(v));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) redirect("/admin/students/promote?error=" + encodeURIComponent("서버 설정 오류"));
  const admin = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });

  let done = 0;
  let skipped = 0;
  for (const r of (rows ?? []) as { id: string; grade: string | null }[]) {
    // 화면에서 본 학년과 DB 현재 값이 다르면(이미 바뀜) 건너뜀
    if ((expected.get(r.id) ?? "") !== String(r.grade ?? "").trim()) {
      skipped++;
      continue;
    }
    // 개별 수정값(to_<id>)이 있으면 그 값을, 없으면 자동 계산값을 쓴다.
    const typed = String(formData.get(`to_${r.id}`) ?? "").trim();
    const target = typed || planPromotion(r.grade).next || "";
    if (!target || target === String(r.grade ?? "").trim()) {
      skipped++;
      continue;
    }
    const { error: upErr } = await admin
      .from("academy_students")
      .update({ grade: target, updated_at: new Date().toISOString() })
      .eq("id", r.id);
    if (upErr) skipped++;
    else done++;
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/students/promote");
  redirect(`/admin/students/promote?done=${done}&skipped=${skipped}`);
}

function pick(p: Record<string, string | string[] | undefined>, k: string) {
  const v = p[k];
  return Array.isArray(v) ? v[0] : v;
}

export default async function PromotePage({ searchParams }: { searchParams?: SP }) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("academy_students")
    .select("id, full_name, display_name, school, grade, is_active, deactivated_at")
    .order("grade", { ascending: true })
    .order("full_name", { ascending: true })
    .limit(1000);

  const all = ((data ?? []) as any[])
    .filter((r) => r.is_active !== false && !r.deactivated_at)
    .map((r) => ({
      id: String(r.id),
      name: String(r.full_name || r.display_name || "(이름 없음)"),
      school: (r.school as string | null) ?? "",
      plan: planPromotion(r.grade),
    }));

  const targets = all.filter((r) => r.plan.next);
  const others = all.filter((r) => !r.plan.next);
  const GRADE_OPTIONS = ["초1", "초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"];

  const done = pick(sp, "done");
  const skipped = pick(sp, "skipped");
  const err = pick(sp, "error");

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <header className="space-y-1">
        <Link href="/admin/students" className="text-sm text-neutral-500 hover:underline">
          ← Students
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">🎓 학년 일괄 진급</h1>
        <p className="text-sm text-neutral-500">
          체크한 학생의 학년을 한 단계 올립니다 (고1→고2, 중3→고1 …). 새 학기(보통 1~2월)에 한 번 실행하세요.
          유급·월반 같은 예외는 체크를 풀고 Students에서 개별 수정하세요.
        </p>
      </header>

      {done ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {done}명 진급 완료{skipped && skipped !== "0" ? ` (건너뜀 ${skipped}명: 이미 바뀌었거나 오류)` : ""}.
        </div>
      ) : null}
      {err ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{err}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error.message}</div> : null}

      <form action={promoteAction} className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="w-10 px-3 py-2"> </th>
                <th className="px-3 py-2">이름</th>
                <th className="px-3 py-2">학교</th>
                <th className="px-3 py-2">현재 → 진급 후</th>
                <th className="px-3 py-2">비고</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((r) => (
                <tr key={r.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">
                    <input type="checkbox" name="ids" value={r.id} defaultChecked />
                    <input type="hidden" name={`from_${r.id}`} value={r.plan.current ?? ""} />
                  </td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-neutral-600">{r.school || "-"}</td>
                  <td className="px-3 py-2">
                    {r.plan.current} →{" "}
                    <input
                      name={`to_${r.id}`}
                      defaultValue={r.plan.next ?? ""}
                      list="grade-options"
                      className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm font-bold"
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-amber-700">
                    {r.plan.kind === "school_change" ? "학교급 변경 — 학교도 수정 필요" : ""}
                  </td>
                </tr>
              ))}
              {targets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-neutral-500">
                    진급 대상이 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <datalist id="grade-options">
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>

        {others.length > 0 ? (
          <details className="rounded-2xl border border-neutral-200 p-4 text-sm">
            <summary className="cursor-pointer font-semibold">
              진급 제외 {others.length}명 (고3 · 학년 미입력 · 해석 불가) — 개별 지정하려면 펼치기
            </summary>
            <p className="mt-1 text-xs text-neutral-500">체크하고 학년을 입력하면 이 학생도 한 번에 적용됩니다.</p>
            <ul className="mt-2 space-y-1.5">
              {others.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <input type="checkbox" name="ids" value={r.id} />
                  <input type="hidden" name={`from_${r.id}`} value={r.plan.current ?? ""} />
                  <span className="font-medium">{r.name}</span>
                  <span className="text-neutral-500">
                    {r.plan.current ?? "학년 없음"} ({r.plan.kind === "graduate" ? "고3: 졸업은 비활성화로" : "해석 불가"}) →
                  </span>
                  <input
                    name={`to_${r.id}`}
                    list="grade-options"
                    placeholder="학년"
                    className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-sm font-bold"
                  />
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <button
          type="submit"
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          체크한 학생 진급 적용
        </button>
        <p className="text-xs text-neutral-500">적용 후 되돌리기 기능은 없습니다. 잘못 올린 학생은 Students에서 학년을 직접 고쳐 주세요.</p>
      </form>
    </main>
  );
}
