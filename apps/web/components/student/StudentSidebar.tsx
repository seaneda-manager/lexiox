// apps/web/components/student/StudentSidebar.tsx
import Link from "next/link";

export default function StudentSidebar({ active = "Dashboard" }: { active?: string }) {
  const items = [
    { name: "Dashboard", href: "/student" },
    { name: "TPO (TEST)", href: "/reading/test" },
    { name: "TPO (STUDY)", href: "/reading/study" },
    { name: "VOCAB", href: "/vocab" },
    { name: "GRAMMAR", href: "/grammar" },
    { name: "ESSAY", href: "/essay" },
    { name: "DAILY TASKS", href: "/tasks" },
  ];
  return (
    <aside className="h-[calc(100vh-3rem)] sticky top-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-4 text-sm font-semibold opacity-60">TOEFL Menu</div>
      <nav className="space-y-1">
        {items.map((it) => (
          <Link
            key={it.name}
            href={it.href}
            className={`block rounded-xl px-3 py-2 text-sm hover:bg-white/10 ${
              active === it.name ? "bg-white/10 font-semibold" : "opacity-90"
            }`}
          >
            {it.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}




