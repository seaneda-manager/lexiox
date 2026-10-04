import ClassesClient from "./_client/ClassesClient";

export const dynamic = "force-dynamic";

export default function AdminClassesPage() {
  return (
    <div className="mx-auto max-w-5xl px-2 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">🏫 반 관리</h1>
        <p className="mt-1 text-sm text-gray-600">
          반(수업 시간대)을 만들고, 담당 교사·주간 시간표·학생을 배정합니다. 시간표를 등록한 뒤 &quot;수업 회차 만들기&quot;를 누르면
          앞으로 2주치 수업이 생성되어 출석 체크에 쓰입니다.
        </p>
      </div>
      <ClassesClient />
    </div>
  );
}
