import GuardiansClient from "./_client/GuardiansClient";

export const dynamic = "force-dynamic";

export default function AdminGuardiansPage() {
  return (
    <div className="mx-auto max-w-5xl px-2 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">📞 학부모 연락처</h1>
        <p className="mt-1 text-sm text-gray-600">
          학생별 학부모 휴대폰 번호를 관리합니다. 결석·지각 안내 문구를 만들 때 이 번호를 씁니다. 번호는 숫자만 저장되고, 휴대폰 번호(010 등)만 받습니다.
        </p>
      </div>
      <GuardiansClient />
    </div>
  );
}
