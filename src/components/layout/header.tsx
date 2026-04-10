'use client';

import { MobileSidebar } from '@/components/layout/sidebar';
import { UserNav } from '@/components/layout/user-nav';
import { NotificationBell } from '@/components/layout/notification-bell';

interface HeaderProps {
    role: 'resident' | 'collector' | 'admin';
    user: {
        full_name: string | null;
        email: string | null;
        avatar_url: string | null;
    };
}

export default function Header({ role, user }: HeaderProps) {
    return (
        <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
            <div className="flex h-14 items-center px-4">
                <MobileSidebar role={role} />
                <div className="ml-auto flex items-center space-x-3">
                    <NotificationBell />
                    <UserNav user={user} />
                </div>
            </div>
        </div>
    );
}
