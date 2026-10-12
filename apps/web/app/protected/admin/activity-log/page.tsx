// apps/web/app/protected/admin/activity-log/page.tsx
import ActivityLogManager from './ActivityLogManager';

export const dynamic = 'force-dynamic';

export default async function AdminActivityLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">활동 로그</h1>
        <p className="text-sm text-neutral-600">
          회원들의 로그인과 페이지 이동 등 모든 활동을 시간순으로 확인할 수 있습니다.
        </p>
      </div>
      <ActivityLogManager />
    </div>
  );
}
