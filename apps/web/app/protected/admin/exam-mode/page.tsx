import ExamModeClient from "./_client/ExamModeClient";

export const dynamic = "force-dynamic";

export default function AdminExamModePage() {
  return (
    <div className="mx-auto max-w-5xl px-2 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">📅 시험모드 현황</h1>
        <p className="mt-1 text-sm text-gray-600">
          학교별 시험 준비기간 홀드 예정/진행 현황. 시험 1개월 전(=준비기간 시작) 3일 전에 통지되고,
          별도 취소가 없으면 자동으로 레귤러 스케줄(단어·숙제)이 홀드됩니다.
        </p>
      </div>
      <ExamModeClient />
    </div>
  );
}
