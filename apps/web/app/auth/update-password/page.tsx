import { updatePassword } from "@/actions/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function UpdatePasswordPage() {
  async function onSubmit(formData: FormData) {
    "use server";
    const res = await updatePassword(formData);
    if (res.ok) redirect("/auth/login?m=password-updated");
    redirect(
      `/auth/update-password?error=${encodeURIComponent(res.error ?? "Failed")}`
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Update Password</h1>
      <form action={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">New Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded border px-3 py-2 mt-1"
          />
        </div>
        <button type="submit" className="rounded border px-4 py-2">
          Update
        </button>
      </form>
    </main>
  );
}
