import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { updateUILabelAction } from "../actions";

type Params = Promise<{ labelId: string }>;

type UILabelRow = {
  id: string;
  domain: string;
  key: string;
  track: string | null;
  section: string | null;
  school_level: string | null;
  audience: string | null;
  label_ko: string;
  label_en: string | null;
  short_description_ko: string | null;
  long_description_ko: string | null;
  student_message_ko: string | null;
  parent_message_ko: string | null;
  teacher_message_ko: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

export const dynamic = "force-dynamic";

export default async function AdminSystemLabelDetailPage({
  params,
}: {
  params: Params;
}) {
  const { labelId } = await params;
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("ui_label_catalog")
    .select(
      "id, domain, key, track, section, school_level, audience, label_ko, label_en, short_description_ko, long_description_ko, student_message_ko, parent_message_ko, teacher_message_ko, sort_order, is_active",
    )
    .eq("id", labelId)
    .single();

  if (error || !data) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          label을 찾지 못했습니다.
          <div className="mt-2 text-xs">{error?.message ?? "Not found"}</div>
        </div>
      </main>
    );
  }

  const row = data as UILabelRow;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Admin / System / Labels
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            라벨 편집
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            key는 고정, 표시 텍스트만 수정
          </p>
        </div>

        <Link
          href="/admin/system/labels"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          목록으로
        </Link>
      </header>

      <form action={updateUILabelAction} className="space-y-6 rounded-2xl border bg-white p-5">
        <input type="hidden" name="id" value={row.id} />

        <section className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="domain" value={row.domain} />
          <ReadOnlyField label="key" value={row.key} />
          <ReadOnlyField label="track" value={row.track ?? "-"} />
          <ReadOnlyField label="section" value={row.section ?? "-"} />
          <ReadOnlyField label="school_level" value={row.school_level ?? "-"} />
          <ReadOnlyField label="audience" value={row.audience ?? "-"} />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Field label="label_ko" name="label_ko" required defaultValue={row.label_ko} />
          <Field label="label_en" name="label_en" defaultValue={row.label_en ?? ""} />
          <TextAreaField
            label="short_description_ko"
            name="short_description_ko"
            defaultValue={row.short_description_ko ?? ""}
          />
          <TextAreaField
            label="long_description_ko"
            name="long_description_ko"
            defaultValue={row.long_description_ko ?? ""}
          />
          <TextAreaField
            label="student_message_ko"
            name="student_message_ko"
            defaultValue={row.student_message_ko ?? ""}
          />
          <TextAreaField
            label="parent_message_ko"
            name="parent_message_ko"
            defaultValue={row.parent_message_ko ?? ""}
          />
          <TextAreaField
            label="teacher_message_ko"
            name="teacher_message_ko"
            defaultValue={row.teacher_message_ko ?? ""}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Field
            label="sort_order"
            name="sort_order"
            defaultValue={String(row.sort_order ?? 100)}
          />
          <SelectField
            label="is_active"
            name="is_active"
            defaultValue={String(row.is_active ?? true)}
            options={[
              { value: "true", label: "true" },
              { value: "false", label: "false" },
            ]}
          />
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            저장
          </button>
        </div>
      </form>
    </main>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="rounded-xl border bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="space-y-1 md:col-span-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <textarea
        name={name}
        defaultValue={defaultValue}
        className="min-h-[96px] w-full rounded-xl border px-3 py-2 text-sm outline-none"
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
    <label className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
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
