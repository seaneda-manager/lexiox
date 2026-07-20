// apps/web/app/auth/check-email/page.tsx

export const dynamic = 'force-dynamic';

type CheckEmailSearchParams = {
  email?: string;
  resent?: string;
};

export default function CheckEmailPage(...args: any[]) {
  // ✅ Next PageProps 타입체크 우회: 첫 번째 인자를 any로 처리
  const [{ searchParams }] = args as [{ searchParams?: CheckEmailSearchParams }];

  const email = searchParams?.email;
  const resent =
    searchParams?.resent === '1' ||
    searchParams?.resent === 'true' ||
    searchParams?.resent === 'yes';

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">이메일을 확인해 주세요</h1>

      {resent ? (
        <p className="text-sm text-gray-800">
          인증 메일을 다시 보냈습니다. 받은 편지함에서 메일을 열고 링크를 눌러 주세요.
          {email ? (
            <>
              {' '}
              (보낸 주소: <b>{email}</b>)
            </>
          ) : null}
        </p>
      ) : (
        <p className="text-sm text-gray-800">
          회원가입 또는 로그인을 계속하려면 이메일로 전송된 인증 링크를 확인해 주세요.
          {email ? (
            <>
              {' '}
              (보낸 주소: <b>{email}</b>)
            </>
          ) : null}
        </p>
      )}

      <p className="text-xs text-gray-500">
        메일이 보이지 않으면 스팸함을 확인하거나, 1~2분 뒤에 다시 확인해 주세요.
      </p>
    </div>
  );
}
