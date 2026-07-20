"use client";

import Link from "next/link";
import Avatar from "@/components/Avatar";

interface Props {
  name: string;
  avatarUrl: string | null;
}

export default function SidebarProfile({ name, avatarUrl }: Props) {
  return (
    <Link
      href="/profile"
      className="flex items-center gap-2.5 px-3 py-3 border-t border-neutral-100 hover:bg-neutral-50 transition-colors group"
    >
      <Avatar name={name} avatarUrl={avatarUrl} size="sm" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-sm font-medium text-neutral-700 truncate group-hover:text-neutral-900">
          {name}
        </p>
        <p className="text-xs text-neutral-400">프로필 편집</p>
      </div>
    </Link>
  );
}
