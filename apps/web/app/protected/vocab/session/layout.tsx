// apps/web/app/(protected)/vocab/session/layout.tsx

import FocusGuard from "@/components/common/FocusGuard";

export default function VocabSessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <FocusGuard context="vocab-session">{children}</FocusGuard>
    </div>
  );
}
