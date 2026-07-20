// apps/web/app/(protected)/admin/students/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParamsLike =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>;

type StudentLevel = "beginner" | "intermediate" | "advanced";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const value = params[key];
  if (Array.isArray(value)) return asString(value[0]);
  return asString(value);
}

function sanitizeRedirectMessage(value: string) {
  return encodeURIComponent(value.slice(0, 240));
}

function buildStudentsRedirect(params: {
  created?: string | null;
  updated?: string | null;
  reset?: string | null;
  toggled?: string | null;
  error?: string | null;
  edit?: string | null;
}) {
  const search = new URLSearchParams();

  if (params.created) search.set("created", params.created);
  if (params.updated) search.set("updated", params.updated);
  if (params.reset) search.set("reset", params.reset);
  if (params.toggled) search.set("toggled", params.toggled);
  if (params.error) search.set("error", params.error);
  if (params.edit) search.set("edit", params.edit);

  const query = search.toString();
  return `/admin/students${query ? `?${query}` : ""}`;
}

function buildStudentLabel(row: Record<string, unknown>) {
  return (
    asString(row.full_name) ||
    asString(row.display_name) ||
    asString(row.email) ||
    asString(row.login_id) ||
    `학생 ${String(row.id ?? "").slice(0, 8)}`
  );
}

function buildStudentMeta(row: Record<string, unknown>) {
  const parts = [
    asString(row.school),
    asString(row.grade),
    asString(row.email),
    asString(row.login_id),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function normalizeLevel(value: string | null) {
  if (value === "beginner") return "Beginner";
  if (value === "intermediate") return "Intermediate";
  if (value === "advanced") return "Advanced";
  return value || "-";
}

function parseLevel(value: string | null): StudentLevel {
  if (value === "intermediate") return "intermediate";
  if (value === "advanced") return "advanced";
  return "beginner";
}

function cleanNullableText(value: FormDataEntryValue | null) {
  return asString(value);
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function requireAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: me, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    redirect(
      buildStudentsRedirect({
        error: sanitizeRedirectMessage(error.message || "Failed to verify admin role."),
      })
    );
  }

  if (!me || me.role !== "admin") {
    redirect(
      buildStudentsRedirect({
        error: sanitizeRedirectMessage("Admin only."),
      })
    );
  }

  return { supabase, user };
}

async function createAcademyStudentAction(formData: FormData) {
  "use server";

  const { supabase, user } = await requireAdmin();

  const fullName = cleanNullableText(formData.get("full_name"));
  const displayName = cleanNullableText(formData.get("display_name")) || fullName;
  const email = cleanNullableText(formData.get("email"));
  const password = cleanNullableText(formData.get("password"));
  const loginId = cleanNullableText(formData.get("login_id"));
  const school = cleanNullableText(formData.get("school"));
  const grade = cleanNullableText(formData.get("grade"));
  const phone = cleanNullableText(formData.get("phone"));
  const parentPhone = cleanNullableText(formData.get("parent_phone"));
  const memo = cleanNullableText(formData.get("memo"));
  const notes = cleanNullableText(formData.get("notes"));
  const level = parseLevel(cleanNullableText(formData.get("level")));

  if (!fullName) {
    redirect(
      buildStudentsRedirect({
        error: sanitizeRedirectMessage("학생 이름(full_name)은 필수입니다."),
      })
    );
  }

  const wantsAuthAccount = !!email || !!password;

  if (wantsAuthAccount && !email) {
    redirect(
      buildStudentsRedirect({
        error: sanitizeRedirectMessage("로그인 계정을 만들려면 이메일이 필요합니다."),
      })
    );
  }

  if (wantsAuthAccount && (!password || password.length < 6)) {
    redirect(
      buildStudentsRedirect({
        error: sanitizeRedirectMessage(
          "로그인 계정을 만들려면 6자 이상의 임시 비밀번호가 필요합니다."
        ),
      })
    );
  }

  let authUserId: string | null = null;
  let profileId: string | null = null;
  let actionError: string | null = null;

  try {
    if (wantsAuthAccount) {
      const admin = getServiceSupabase();

      const { data: createdAuth, error: authError } =
        await admin.auth.admin.createUser({
          email: email!,
          password: password!,
          email_confirm: true,
          user_metadata: {
            role: "student",
            full_name: fullName,
            display_name: displayName,
          },
        });

      if (authError) throw new Error(authError.message || "Auth user create failed.");

      authUserId = createdAuth.user?.id ?? null;
      profileId = authUserId;

      if (!authUserId) throw new Error("Auth user id was not returned.");

      const { error: profileError } = await admin
        .from("profiles")
        .upsert(
          {
            id: authUserId,
            email,
            full_name: fullName,
            role: "student",
          } as never,
          { onConflict: "id" }
        );

      if (profileError) {
        await admin.auth.admin.deleteUser(authUserId).catch(() => {});
        throw new Error(profileError.message || "profiles upsert failed.");
      }
    }

    const academyPayload = {
      full_name: fullName,
      display_name: displayName,
      email,
      login_id: loginId,
      school,
      grade,
      level,
      phone,
      parent_phone: parentPhone,
      memo,
      notes,
      created_by: user.id,
      is_active: true,
      must_change_password: wantsAuthAccount ? true : false,
      auth_user_id: authUserId,
      profile_id: profileId,
      user_id: authUserId,
    };

    const cleanedPayload = Object.fromEntries(
      Object.entries(academyPayload).filter(([, value]) => value !== null && value !== "")
    );

    const { error: academyError } = await supabase
      .from("academy_students")
      .insert(cleanedPayload as never);

    if (academyError) {
      if (authUserId) {
        const admin = getServiceSupabase();
        await admin.auth.admin.deleteUser(authUserId).catch(() => {});
      }
      throw new Error(academyError.message || "academy_students insert failed.");
    }
  } catch (error) {
    actionError = error instanceof Error ? error.message : "Unknown error during student create.";
  }

  if (actionError) {
    redirect(buildStudentsRedirect({ error: sanitizeRedirectMessage(actionError) }));
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/assignments/new");
  revalidatePath("/admin/results");
  revalidatePath("/student");
  revalidatePath("/home/student");

  redirect(
    buildStudentsRedirect({
      created: "1",
    })
  );
}

async function updateAcademyStudentAction(formData: FormData) {
  "use server";

  const { supabase } = await requireAdmin();

  const studentId = cleanNullableText(formData.get("student_id"));
  const fullName = cleanNullableText(formData.get("full_name"));
  const displayName = cleanNullableText(formData.get("display_name")) || fullName;
  const email = cleanNullableText(formData.get("email"));
  const loginId = cleanNullableText(formData.get("login_id"));
  const school = cleanNullableText(formData.get("school"));
  const grade = cleanNullableText(formData.get("grade"));
  const phone = cleanNullableText(formData.get("phone"));
  const parentPhone = cleanNullableText(formData.get("parent_phone"));
  const memo = cleanNullableText(formData.get("memo"));
  const notes = cleanNullableText(formData.get("notes"));
  const level = parseLevel(cleanNullableText(formData.get("level")));

  if (!studentId) {
    redirect(
      buildStudentsRedirect({
        error: sanitizeRedirectMessage("student_id is required."),
      })
    );
  }

  if (!fullName) {
    redirect(
      buildStudentsRedirect({
        edit: studentId,
        error: sanitizeRedirectMessage("학생 이름(full_name)은 필수입니다."),
      })
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("academy_students")
    .select("id, auth_user_id, profile_id, email")
    .eq("id", studentId)
    .maybeSingle();

  if (existingError) {
    redirect(
      buildStudentsRedirect({
        edit: studentId,
        error: sanitizeRedirectMessage(existingError.message || "Student lookup failed."),
      })
    );
  }

  if (!existing) {
    redirect(
      buildStudentsRedirect({
        error: sanitizeRedirectMessage("Student not found."),
      })
    );
  }

  const authUserId = asString((existing as Record<string, unknown>).auth_user_id);
  const profileId = asString((existing as Record<string, unknown>).profile_id) || authUserId;

  let updateError: string | null = null;

  try {
    if (authUserId) {
      const admin = getServiceSupabase();

      const authUpdatePayload: Record<string, unknown> = {
        user_metadata: {
          role: "student",
          full_name: fullName,
          display_name: displayName,
        },
      };

      if (email) {
        authUpdatePayload.email = email;
        authUpdatePayload.email_confirm = true;
      }

      const { error: authError } = await admin.auth.admin.updateUserById(
        authUserId,
        authUpdatePayload
      );

      if (authError) throw new Error(authError.message || "Auth update failed.");

      if (profileId) {
        const { error: profileError } = await admin
          .from("profiles")
          .upsert(
            {
              id: profileId,
              email: email || asString((existing as Record<string, unknown>).email),
              full_name: fullName,
              role: "student",
            } as never,
            { onConflict: "id" }
          );

        if (profileError) throw new Error(profileError.message || "profiles upsert failed.");
      }
    }

    const updatePayload = {
      full_name: fullName,
      display_name: displayName,
      email,
      login_id: loginId,
      school,
      grade,
      level,
      phone,
      parent_phone: parentPhone,
      memo,
      notes,
    };

    const { error: dbError } = await supabase
      .from("academy_students")
      .update(updatePayload as never)
      .eq("id", studentId);

    if (dbError) throw new Error(dbError.message || "Student update failed.");
  } catch (error) {
    updateError = error instanceof Error ? error.message : "Unknown error during student update.";
  }

  if (updateError) {
    redirect(buildStudentsRedirect({ edit: studentId, error: sanitizeRedirectMessage(updateError) }));
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/assignments/new");
  revalidatePath("/admin/results");

  redirect(
    buildStudentsRedirect({
      updated: "1",
      edit: studentId,
    })
  );
}

async function resetAcademyStudentPasswordAction(formData: FormData) {
  "use server";

  const { supabase } = await requireAdmin();

  const studentId = cleanNullableText(formData.get("student_id"));
  const tempPassword = cleanNullableText(formData.get("temp_password"));

  if (!studentId) {
    redirect(
      buildStudentsRedirect({
        error: sanitizeRedirectMessage("student_id is required."),
      })
    );
  }

  if (!tempPassword || tempPassword.length < 6) {
    redirect(
      buildStudentsRedirect({
        edit: studentId,
        error: sanitizeRedirectMessage("임시 비밀번호는 6자 이상이어야 합니다."),
      })
    );
  }

  const { data: row, error: rowError } = await supabase
    .from("academy_students")
    .select("id, auth_user_id")
    .eq("id", studentId)
    .maybeSingle();

  if (rowError) {
    redirect(
      buildStudentsRedirect({
        edit: studentId,
        error: sanitizeRedirectMessage(rowError.message || "Student lookup failed."),
      })
    );
  }

  const authUserId = asString((row as Record<string, unknown> | null)?.auth_user_id);

  if (!authUserId) {
    redirect(
      buildStudentsRedirect({
        edit: studentId,
        error: sanitizeRedirectMessage("이 학생은 로그인 계정이 연결되어 있지 않습니다."),
      })
    );
  }

  let resetError: string | null = null;

  try {
    const admin = getServiceSupabase();

    const { error: pwError } = await admin.auth.admin.updateUserById(authUserId, {
      password: tempPassword,
    });

    if (pwError) throw new Error(pwError.message || "Password reset failed.");

    const { error: flagError } = await supabase
      .from("academy_students")
      .update({ must_change_password: true } as never)
      .eq("id", studentId);

    if (flagError) throw new Error(flagError.message || "Failed to mark must_change_password.");
  } catch (error) {
    resetError = error instanceof Error ? error.message : "Unknown error during password reset.";
  }

  if (resetError) {
    redirect(buildStudentsRedirect({ edit: studentId, error: sanitizeRedirectMessage(resetError) }));
  }

  revalidatePath("/admin/students");

  redirect(
    buildStudentsRedirect({
      reset: "1",
      edit: studentId,
    })
  );
}

async function toggleAcademyStudentActiveAction(formData: FormData) {
  "use server";

  const { supabase } = await requireAdmin();

  const studentId = cleanNullableText(formData.get("student_id"));
  const currentActive = cleanNullableText(formData.get("current_active")) === "true";

  if (!studentId) {
    redirect(
      buildStudentsRedirect({
        error: sanitizeRedirectMessage("student_id is required."),
      })
    );
  }

  const nextActive = !currentActive;

  const updatePayload = nextActive
    ? {
        is_active: true,
        deactivated_at: null,
        deactivated_reason: null,
      }
    : {
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_reason: "admin_toggle",
      };

  const { error } = await supabase
    .from("academy_students")
    .update(updatePayload as never)
    .eq("id", studentId);

  if (error) {
    redirect(
      buildStudentsRedirect({
        edit: studentId,
        error: sanitizeRedirectMessage(error.message || "Failed to toggle active status."),
      })
    );
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/results");

  redirect(
    buildStudentsRedirect({
      toggled: "1",
      edit: studentId,
    })
  );
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams?: SearchParamsLike;
}) {
  const params = searchParams ? await searchParams : {};

  const created = pickSearchParam(params, "created");
  const updated = pickSearchParam(params, "updated");
  const reset = pickSearchParam(params, "reset");
  const toggled = pickSearchParam(params, "toggled");
  const errorMessage = pickSearchParam(params, "error");
  const editId = pickSearchParam(params, "edit");

  const PAGE_SIZE = 30;
  const pageParam = pickSearchParam(params, "page");
  const page = Math.max(0, parseInt(pageParam ?? "0", 10) || 0);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { supabase } = await requireAdmin();

  const { data, error, count } = await supabase
    .from("academy_students")
    .select(
      "id, full_name, display_name, email, login_id, school, grade, level, phone, parent_phone, memo, notes, is_active, deactivated_at, deactivated_reason, must_change_password, auth_user_id, profile_id, created_at, updated_at",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(from, to)
    .limit(PAGE_SIZE);

  const rows = (data ?? []) as Record<string, unknown>[];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const editingRow =
    rows.find((row) => asString(row.id) === editId) ?? null;

  const activeCount = rows.filter(
    (row) => row.is_active !== false && !asString(row.deactivated_at)
  ).length;

  const linkedCount = rows.filter(
    (row) => !!asString(row.auth_user_id) || !!asString(row.profile_id)
  ).length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
        <p className="text-sm text-neutral-500">
          학생 생성, 수정, 임시비밀번호 재설정, 활성/비활성 토글까지 한 화면에서 관리합니다.
        </p>
      </header>

      {created ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          학생이 생성되었습니다.
        </div>
      ) : null}

      {updated ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          학생 정보가 수정되었습니다.
        </div>
      ) : null}

      {reset ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          임시 비밀번호가 재설정되었습니다. 다음 로그인 때 비밀번호 변경을 유도합니다.
        </div>
      ) : null}

      {toggled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          활성 상태가 변경되었습니다.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          처리 실패: {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-xs font-semibold text-neutral-500">전체 학생</div>
          <div className="mt-2 text-3xl font-bold text-neutral-900">
            {totalCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="text-xs font-semibold text-neutral-500">활성 학생</div>
          <div className="mt-2 text-3xl font-bold text-neutral-900">
            {activeCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="text-xs font-semibold text-neutral-500">계정 연결 완료</div>
          <div className="mt-2 text-3xl font-bold text-neutral-900">
            {linkedCount}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-neutral-900">새 학생 추가</h2>
          <p className="mt-1 text-xs text-neutral-500">
            이메일과 임시 비밀번호를 입력하면 Auth 계정까지 같이 생성됩니다. 비우면 roster-only 학생으로 생성됩니다.
          </p>
        </div>

        <form action={createAcademyStudentAction} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TextField
              label="학생 이름"
              name="full_name"
              placeholder="예: 김태윤"
              required
            />
            <TextField
              label="표시 이름"
              name="display_name"
              placeholder="비우면 학생 이름과 동일"
            />
            <SelectField
              label="레벨"
              name="level"
              defaultValue="beginner"
              options={[
                { value: "beginner", label: "Beginner" },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced", label: "Advanced" },
              ]}
            />
            <TextField label="학교" name="school" placeholder="예: 송도고" />
            <TextField label="학년" name="grade" placeholder="예: 고1" />
            <TextField label="로그인 이메일" name="email" placeholder="예: student@x.com" />
            <TextField
              label="임시 비밀번호"
              name="password"
              type="password"
              placeholder="계정 생성 시에만 입력"
            />
            <TextField label="로그인 ID" name="login_id" placeholder="예: kimty01" />
            <TextField label="학생 연락처" name="phone" placeholder="010-0000-0000" />
            <TextField label="학부모 연락처" name="parent_phone" placeholder="010-0000-0000" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField
              label="메모"
              name="memo"
              placeholder="간단한 내부 메모"
              rows={3}
            />
            <TextAreaField
              label="노트"
              name="notes"
              placeholder="상담/운영용 notes"
              rows={3}
            />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            계정 생성 모드에서는 Auth user + profiles + academy_students가 함께 생성됩니다. 비밀번호는 academy_students에 저장되지 않고 Auth에만 저장됩니다.
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              학생 생성
            </button>
          </div>
        </form>
      </section>

      {editingRow ? (
        <section className="rounded-2xl border bg-white p-5">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">학생 수정</h2>
              <p className="mt-1 text-xs text-neutral-500">
                {buildStudentLabel(editingRow)} · ID {String(editingRow.id ?? "").slice(0, 8)}
              </p>
            </div>

            <Link
              href="/admin/students"
              className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              수정 닫기
            </Link>
          </div>

          <form action={updateAcademyStudentAction} className="space-y-5">
            <input type="hidden" name="student_id" defaultValue={String(editingRow.id ?? "")} />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField
                label="학생 이름"
                name="full_name"
                defaultValue={asString(editingRow.full_name) ?? ""}
                required
              />
              <TextField
                label="표시 이름"
                name="display_name"
                defaultValue={asString(editingRow.display_name) ?? ""}
              />
              <SelectField
                label="레벨"
                name="level"
                defaultValue={asString(editingRow.level) ?? "beginner"}
                options={[
                  { value: "beginner", label: "Beginner" },
                  { value: "intermediate", label: "Intermediate" },
                  { value: "advanced", label: "Advanced" },
                ]}
              />
              <TextField
                label="학교"
                name="school"
                defaultValue={asString(editingRow.school) ?? ""}
              />
              <TextField
                label="학년"
                name="grade"
                defaultValue={asString(editingRow.grade) ?? ""}
              />
              <TextField
                label="로그인 이메일"
                name="email"
                defaultValue={asString(editingRow.email) ?? ""}
              />
              <TextField
                label="로그인 ID"
                name="login_id"
                defaultValue={asString(editingRow.login_id) ?? ""}
              />
              <TextField
                label="학생 연락처"
                name="phone"
                defaultValue={asString(editingRow.phone) ?? ""}
              />
              <TextField
                label="학부모 연락처"
                name="parent_phone"
                defaultValue={asString(editingRow.parent_phone) ?? ""}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextAreaField
                label="메모"
                name="memo"
                defaultValue={asString(editingRow.memo) ?? ""}
                rows={3}
              />
              <TextAreaField
                label="노트"
                name="notes"
                defaultValue={asString(editingRow.notes) ?? ""}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard
                label="Auth Link"
                value={asString(editingRow.auth_user_id) ? "linked" : "none"}
                subValue={asString(editingRow.auth_user_id)}
              />
              <InfoCard
                label="Profile Link"
                value={asString(editingRow.profile_id) ? "linked" : "none"}
                subValue={asString(editingRow.profile_id)}
              />
              <InfoCard
                label="비밀번호 변경 강제"
                value={editingRow.must_change_password ? "true" : "false"}
                subValue={null}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                수정 저장
              </button>
            </div>
          </form>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border p-4">
              <div className="text-sm font-semibold text-neutral-900">임시 비밀번호 재설정</div>
              <p className="mt-1 text-xs text-neutral-500">
                로그인 계정이 연결된 학생만 가능합니다.
              </p>

              <form action={resetAcademyStudentPasswordAction} className="mt-4 space-y-3">
                <input type="hidden" name="student_id" defaultValue={String(editingRow.id ?? "")} />
                <TextField
                  label="새 임시 비밀번호"
                  name="temp_password"
                  type="password"
                  placeholder="6자 이상"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
                >
                  임시 비밀번호 재설정
                </button>
              </form>
            </section>

            <section className="rounded-2xl border p-4">
              <div className="text-sm font-semibold text-neutral-900">활성 상태 토글</div>
              <p className="mt-1 text-xs text-neutral-500">
                현재 상태:{" "}
                <span className="font-medium text-neutral-700">
                  {editingRow.is_active !== false && !asString(editingRow.deactivated_at)
                    ? "active"
                    : "inactive"}
                </span>
              </p>

              <form action={toggleAcademyStudentActiveAction} className="mt-4 space-y-3">
                <input type="hidden" name="student_id" defaultValue={String(editingRow.id ?? "")} />
                <input
                  type="hidden"
                  name="current_active"
                  defaultValue={
                    editingRow.is_active !== false && !asString(editingRow.deactivated_at)
                      ? "true"
                      : "false"
                  }
                />
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
                >
                  {editingRow.is_active !== false && !asString(editingRow.deactivated_at)
                    ? "비활성화"
                    : "활성화"}
                </button>
              </form>
            </section>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Student List</h2>
        </div>

        {error ? (
          <div className="px-5 py-4 text-sm text-rose-700">
            academy_students 조회 실패: {error.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-8 text-sm text-neutral-500">
            등록된 학생이 아직 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-left text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">School / Grade</th>
                  <th className="px-4 py-3 font-medium">Level</th>
                  <th className="px-4 py-3 font-medium">Account Link</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const id = String(row.id ?? "");
                  const label = buildStudentLabel(row);
                  const meta = buildStudentMeta(row);
                  const hasLink =
                    !!asString(row.auth_user_id) || !!asString(row.profile_id);
                  const active =
                    row.is_active !== false && !asString(row.deactivated_at);

                  return (
                    <tr key={id} className="border-t align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">{label}</div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {meta || `ID ${id.slice(0, 8)}`}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-neutral-700">
                        {[asString(row.school), asString(row.grade)]
                          .filter(Boolean)
                          .join(" · ") || "-"}
                      </td>

                      <td className="px-4 py-3 text-neutral-700">
                        {normalizeLevel(asString(row.level))}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            hasLink
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {hasLink ? "linked" : "roster only"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-neutral-700">
                        {[asString(row.phone), asString(row.parent_phone)]
                          .filter(Boolean)
                          .join(" / ") || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            active
                              ? "border-sky-200 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {active ? "active" : "inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-neutral-700">
                        {formatDateTime(asString(row.updated_at))}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/students/${encodeURIComponent(id)}`}
                            className="inline-flex rounded-xl border px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                          >
                            분석
                          </Link>
                          <Link
                            href={`/admin/students?edit=${encodeURIComponent(id)}`}
                            className="inline-flex rounded-xl border px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-5 py-4">
            <p className="text-xs text-neutral-500">
              {from + 1}–{Math.min(to + 1, totalCount)} / {totalCount}명
            </p>
            <div className="flex gap-2">
              {page > 0 ? (
                <Link
                  href={`/admin/students?page=${page - 1}${editId ? `&edit=${editId}` : ""}`}
                  className="rounded-xl border px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  ← 이전
                </Link>
              ) : null}
              <span className="flex items-center px-2 text-xs text-neutral-500">
                {page + 1} / {totalPages}
              </span>
              {page + 1 < totalPages ? (
                <Link
                  href={`/admin/students?page=${page + 1}${editId ? `&edit=${editId}` : ""}`}
                  className="rounded-xl border px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  다음 →
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function TextField({
  label,
  name,
  placeholder,
  required,
  type,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="space-y-1.5">
      <div className="text-sm font-medium text-neutral-800">{label}</div>
      <input
        name={name}
        type={type ?? "text"}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  placeholder,
  rows,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  rows?: number;
  defaultValue?: string;
}) {
  return (
    <label className="space-y-1.5">
      <div className="text-sm font-medium text-neutral-800">{label}</div>
      <textarea
        name={name}
        rows={rows ?? 4}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="space-y-1.5">
      <div className="text-sm font-medium text-neutral-800">{label}</div>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
      >
        {options.map((option) => (
          <option key={`${name}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue: string | null;
}) {
  return (
    <div className="rounded-2xl border bg-neutral-50 p-4">
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-neutral-900">{value}</div>
      {subValue ? (
        <div className="mt-1 break-all text-[11px] text-neutral-500">{subValue}</div>
      ) : null}
    </div>
  );
}
