// apps/web/app/(protected)/admin/users/page.tsx
import UsersManager from '@/app/protected/admin/users/UsersManager';

export const dynamic = 'force-dynamic'; // 항상 최신 목록을 불러오기

export default async function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-sm text-neutral-600">
          여기에서 사용자 목록을 조회하고 역할(권한)을 변경할 수 있습니다.
        </p>
      </div>
      <UsersManager />
    </div>
  );
}
