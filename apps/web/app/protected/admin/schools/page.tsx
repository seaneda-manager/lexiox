import SchoolsClient from "./_client/SchoolsClient";

export const dynamic = "force-dynamic";

export default function AdminSchoolsPage() {
  return (
    <div className="mx-auto max-w-5xl px-2 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">🏫 학교 관리</h1>
        <p className="mt-1 text-sm text-gray-600">
          학교를 등록하면 학생 배정 화면에서 select로 고를 수 있고, 학교별 시험기간을 여기서 입력합니다.
        </p>
      </div>
      <SchoolsClient />
    </div>
  );
}
