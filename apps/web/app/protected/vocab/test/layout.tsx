import FocusGuard from "@/components/common/FocusGuard";

export default function VocabTestLayout({ children }: { children: React.ReactNode }) {
  return <FocusGuard context="vocab-test">{children}</FocusGuard>;
}
