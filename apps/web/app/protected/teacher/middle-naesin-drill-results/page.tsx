import MiddleNaesinDrillResultsReport from '@/components/middle-naesin/MiddleNaesinDrillResultsReport';

export const dynamic = 'force-dynamic';

export default function TeacherMiddleNaesinDrillResultsPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">중학내신 드릴 결과</h1>
        <p className="mt-1 text-sm text-neutral-500">
          학생이 번역/작문/단어/문법 드릴을 풀고 "결과 저장"을 누르면 여기에 기록됩니다.
        </p>
      </header>

      <MiddleNaesinDrillResultsReport />
    </main>
  );
}
