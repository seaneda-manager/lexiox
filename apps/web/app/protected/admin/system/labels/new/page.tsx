import Link from "next/link";
import { createUILabelAction } from "../actions";

export const dynamic = "force-dynamic";

export default function AdminSystemLabelsNewPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Admin / System / Labels
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            새 라벨 만들기
          </h1>
        </div>

        <Link
          href="/admin/system/labels"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          목록으로
        </Link>
      </header>

      <form action={createUILabelAction} className="space-y-6 rounded-2xl border bg-white p-5">
        <section className="grid gap-4 md:grid-cols-2">
          <Field label="domain" name="domain" required />
          <Field label="key" name="key" required />
          <Field label="track" name="track" placeholder="naesin / junior / toefl" />
          <Field label="section" name="section" placeholder="reading / ..." />
          <Field label="school_level" name="school_level" placeholder="middle / high" />
          <Field label="audience" name="audience" placeholder="common / student / parent / teacher / admin" />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Field label="label_ko" name="label_ko" required />
          <Field label="label_en" name="label_en" />
          <TextAreaField label="short_description_ko" name="short_description_ko" />
          <TextAreaField label="long_description_ko" name="long_description_ko" />
          <TextAreaField label="student_message_ko" name="student_message_ko" />
          <TextAreaField label="parent_message_ko" name="parent_message_ko" />
          <TextAreaField label="teacher_message_ko" name="teacher_message_ko" />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Field label="sort_order" name="sort_order" defaultValue="100" />
          <SelectField
            label="is_active"
            name="is_active"
            defaultValue="true"
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

function Field({
  label,
  name,
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
}: {
  label: string;
  name: string;
}) {
  return (
    <label className="space-y-1 md:col-span-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <textarea
        name={name}
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
