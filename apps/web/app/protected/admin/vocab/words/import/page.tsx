// apps/web/app/(protected)/admin/vocab/words/import/page.tsx
import { redirect } from "next/navigation";
import { importWordsFromJsonForm } from "./actions";

export const dynamic = "force-dynamic";

export default function AdminVocabWordsImportPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">단어 Bulk Import</h1>
        <p className="text-sm text-gray-600">
          JSON 업로드(파일/붙여넣기) 또는 Raw list로 단어를 등록합니다.
        </p>
      </header>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <form
          action={async (formData) => {
            "use server";
            const result = await importWordsFromJsonForm(formData);

            console.log("VOCAB IMPORT RESULT", result);

            if (!result?.ok) {
              throw new Error("Import 실패 (result.ok=false)");
            }

            // result shape: { ok, batchId, total, inserted, updated, skipped, ... }
            // 필요하면 querystring에 batchId 달아도 됨
            redirect("/admin/vocab/words");
          }}
          className="space-y-5"
        >
          {/* meta fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">sourceLabel</span>
              <input
                name="sourceLabel"
                placeholder="e.g. 능률보카_어원편"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">maxItems</span>
              <input
                name="maxItems"
                type="number"
                min={1}
                max={5000}
                defaultValue={500}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">note</span>
              <input
                name="note"
                placeholder="optional"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </label>
          </div>

          {/* clear existing option */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <label className="flex items-center gap-3">
              <input
                name="clearExisting"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  기존 데이터 삭제 후 업로드
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  체크하면 같은 sourceLabel의 기존 단어들을 모두 삭제한 후 새 데이터를 업로드합니다.
                  (최종 버전 교재 업로드 시 권장)
                </p>
              </div>
            </label>
          </div>

          {/* file upload */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              JSON file (optional)
            </label>
            <input
              name="file"
              type="file"
              accept="application/json,.json"
              className="block w-full text-sm"
            />
            <p className="text-xs text-gray-500">
              파일이 있으면 파일이 1순위로 처리됩니다.
            </p>
          </div>

          {/* json textarea */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              JSON 배열 (optional)
            </label>
            <textarea
              name="json"
              rows={14}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
              placeholder={`예시:

[
  {
    "text": "abandon",
    "meanings_ko": ["버리다", "포기하다"],
    "meanings_en_simple": ["to leave completely", "to give up completely"],
    "examples_easy": ["He abandoned the car on the road."],
    "derived_terms": ["abandonment"],
    "synonyms_en_simple": ["leave", "quit"]
  }
]`}
            />
            <p className="text-xs text-gray-500">
              ⚠️ JSON이 유효하지 않으면 Raw list로 자동 fallback 처리됩니다.
            </p>
          </div>

          {/* raw fallback */}
          <details className="rounded-md border bg-gray-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              Raw list (optional, fallback)
            </summary>
            <div className="mt-3 space-y-1">
              <label className="block text-sm font-medium text-gray-700">raw</label>
              <textarea
                name="raw"
                rows={10}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
                placeholder={`예:
abandon - 버리다, 포기하다
complete - 완성하다, 마무리하다
...`}
              />
              <p className="text-xs text-gray-500">
                parseRawToWordEntries 규칙에 맞춰 파싱됩니다.
              </p>
            </div>
          </details>

          <div className="flex justify-end gap-3 pt-2">
            <button type="reset" className="rounded-md border px-4 py-2 text-sm text-gray-700">
              초기화
            </button>
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Import 실행
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
