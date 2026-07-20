import { getUserAndProfile } from "@/lib/getUserAndProfile";
import { redirect } from "next/navigation";
import AvatarEditor from "@/components/AvatarEditor";
import Avatar from "@/components/Avatar";

export default async function ProfilePage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");

  const name = profile?.full_name ?? user.email ?? null;

  return (
    <main className="max-w-lg mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 프로필</h1>
        <p className="text-sm text-gray-500 mt-1">{user.email}</p>
      </div>

      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-700 mb-4">아바타</h2>
        <AvatarEditor name={name} avatarUrl={profile?.avatar_url ?? null} />
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="text-base font-semibold text-gray-700">계정 정보</h2>
        <div className="flex items-center gap-3">
          <Avatar name={name} avatarUrl={profile?.avatar_url ?? null} size="md" />
          <div>
            <p className="font-medium text-gray-900">{name ?? "이름 없음"}</p>
            <p className="text-sm text-gray-500 capitalize">{profile?.role ?? "student"}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
