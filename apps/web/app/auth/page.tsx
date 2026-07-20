import Link from 'next/link';

export default function AuthIndexPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-semibold">계정</h1>
        <p className="text-sm text-gray-600">로그인 또는 회원가입을 선택하세요.</p>
        <div className="grid grid-cols-2 gap-3">
          <Link className="block border rounded-xl px-4 py-3 text-center" href="/auth/login">로그인</Link>
          <Link className="block border rounded-xl px-4 py-3 text-center" href="/auth/signup">회원가입</Link>
        </div>
        <div>
          <Link className="underline text-sm" href="/auth/forgot-password">비밀번호 재설정</Link>
        </div>
      </div>
    </div>
  );
}




