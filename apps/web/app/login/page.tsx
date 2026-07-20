// apps/web/app/login/page.tsx
import TopBar from "@/components/layout/TopBar";
import LoginForm from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* TopBar: 테스트 모드로 렌더링 (필요 시 제거 가능) */}
      <TopBar mode="test" section="reading" qIndex={0} total={0} />

      <main className="container mx-auto px-4">
        {/* 상단 제목 영역 */}
        <div className="pt-8 pb-2">
          <h1 className="text-[30px] font-bold leading-tight">로그인</h1>
        </div>

        {/* 로그인 폼 (가운데 정렬 레이아웃) */}
        <section className="grid place-items-center py-10 md:py-12">
          <div className="w-full max-w-[720px]">
            <h2 className="mb-5 text-center text-2xl font-semibold">Student Login</h2>
            <div className="flex justify-center">
              <LoginForm />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
