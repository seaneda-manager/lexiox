import ExamScopeClient from "./_client/ExamScopeClient";

export const dynamic = "force-dynamic";

export default function ExamScopePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold">📘 내신 시험 범위</h1>
      <p className="mt-1 text-sm text-gray-600">
        학교·시험기간·학년별로 시험 범위(문법 개념)를 정하면, 그 학교·학년 학생 전원에게 같은 내신 일정이 배정됩니다. 시험 준비기간에는 정규 일정이 자동으로 보류되고, 끝나면 밀려서 이어집니다.
      </p>
      <ExamScopeClient />
    </div>
  );
}
