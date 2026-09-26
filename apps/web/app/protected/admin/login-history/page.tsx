// apps/web/app/(protected)/admin/login-history/page.tsx
import LoginHistoryManager from '@/app/protected/admin/login-history/LoginHistoryManager';

export const dynamic = 'force-dynamic';

export default async function AdminLoginHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">로그인 기록</h1>
        <p className="text-sm text-neutral-600">
          회원들의 로그인 시각, IP, 기기 정보를 확인할 수 있습니다.
        </p>
      </div>
      <LoginHistoryManager />
    </div>
  );
}
