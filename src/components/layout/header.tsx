"use client";

import { MobileSidebar } from "@/components/layout/sidebar";
import { UserNav } from "@/components/layout/user-nav";
import { NotificationBell } from "@/components/layout/notification-bell";

interface HeaderProps {
  role: "resident" | "collector" | "recycler" | "admin";
  user: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export default function Header({ role, user }: HeaderProps) {
  return (
    <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
      <div className="flex h-14 items-center px-4 gap-4">
        <MobileSidebar role={role} />
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <UserNav user={user} />
        </div>
      </div>
    </div>
  );
}
