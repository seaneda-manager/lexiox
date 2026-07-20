import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabaseServer";

export default async function FocusLayout({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="focus-root">
      <div className="focus-outside" />
      <div className="focus-stage-wrap">
        <div className="focus-stage" data-theme="vocab">
          <div className="focus-stage-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}
