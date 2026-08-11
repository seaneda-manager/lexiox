"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import Avatar from "@/components/Avatar";

interface Props {
  name: string;
  avatarUrl: string | null;
}

export default function SidebarProfile({ name, avatarUrl }: Props) {
  return (
    <div className="mx-2 mb-2 flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm">
      <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-2.5 group">
        <Avatar name={name} avatarUrl={avatarUrl} size="sm" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-xs font-semibold text-neutral-800 truncate group-hover:text-neutral-900">
            {name}
          </p>
          <p className="text-[11px] text-neutral-400">프로필 편집</p>
        </div>
      </Link>
      <Link
        href="/settings"
        className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
        aria-label="설정"
      >
        <Settings className="h-4 w-4" />
      </Link>
    </div>
  );
}
