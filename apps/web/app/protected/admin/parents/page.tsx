// apps/web/app/(protected)/admin/parents/page.tsx

const parentRows = [
  {
    name: "Parent A",
    linkedStudent: "Student A",
    relation: "mother",
    summary: "시험 범위 진행률 확인 필요",
  },
  {
    name: "Parent B",
    linkedStudent: "Student B",
    relation: "father",
    summary: "주간 복습 리포트 예정",
  },
];

export default function AdminParentsPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Parents</h1>
        <p className="mt-1 text-sm text-neutral-500">
          학생-학부모 연결과 부모용 요약 리포트의 기반 화면.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Parent Links</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-medium">Parent</th>
                <th className="px-4 py-3 font-medium">Linked Student</th>
                <th className="px-4 py-3 font-medium">Relation</th>
                <th className="px-4 py-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {parentRows.map((row) => (
                <tr key={`${row.name}-${row.linkedStudent}`} className="border-t">
                  <td className="px-4 py-3 font-medium text-neutral-900">{row.name}</td>
                  <td className="px-4 py-3 text-neutral-700">{row.linkedStudent}</td>
                  <td className="px-4 py-3 text-neutral-700">{row.relation}</td>
                  <td className="px-4 py-3 text-neutral-700">{row.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
