import Link from "next/link";
import { createNaesinContentAction } from "../actions";

export const dynamic = "force-dynamic";

export default function AdminNaesinContentNewPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Admin / Naesin / Content
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            새 콘텐츠 만들기
          </h1>
        </div>

        <Link
          href="/admin/naesin/content"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          목록으로
        </Link>
      </header>

      <form
        action={createNaesinContentAction}
        className="space-y-6 rounded-2xl border bg-white p-5"
      >
        <section>
          <div className="mb-4 text-sm font-semibold text-neutral-900">
            콘텐츠 기본 정보
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="title" name="title" required />
            <SelectField
              label="section"
              name="section"
              required
              options={["reading", "grammar", "listening", "writing", "vocab"]}
            />
            <SelectField
              label="school_level"
              name="school_level"
              required
              options={["middle", "high"]}
            />
            <SelectField
              label="source_type"
              name="source_type"
              required
              options={[
                "textbook",
                "mock_csat",
                "csat",
                "external_book",
                "school_handout",
                "teacher_made",
              ]}
            />
            <SelectField
              label="content_kind"
              name="content_kind"
              required
              options={["source_material", "question_set", "review_set", "drill_set"]}
            />
            <SelectField
              label="question_origin_type"
              name="question_origin_type"
              options={["", "past_exam", "mock_expected", "teacher_made", "adapted"]}
            />
            <Field label="source_book" name="source_book" />
            <Field label="publisher" name="publisher" />
            <Field label="grade" name="grade" placeholder="예: 고1 / 중2" />
            <Field label="semester" name="semester" placeholder="예: 1학기" />
            <Field label="unit" name="unit" placeholder="예: 3과" />
            <Field label="chapter" name="chapter" placeholder="예: Chapter 2" />
            <Field label="difficulty" name="difficulty" />
            <Field
              label="tags"
              name="tags"
              placeholder="comma separated, 예: 송도고,변형,중간범위"
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="is_active"
            name="is_active"
            required
            options={["true", "false"]}
            defaultValue="true"
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
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
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
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  required,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
      >
        {options.map((option) => (
          <option key={`${name}-${option || "empty"}`} value={option}>
            {option || "-"}
          </option>
        ))}
      </select>
    </label>
  );
}
