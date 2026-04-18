"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/lib/constants";
import { Menu, Leaf } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  role: "resident" | "collector" | "recycler" | "admin";
  isOpen?: boolean;
}

export function Sidebar({ className, role }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          {/* Logo */}
          <div className="flex items-center px-4 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mr-2.5">
              <Leaf className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">NHS</h2>
          </div>

          {/* Nav Items */}
          <div className="space-y-1">
            {items.map((item) => {
              // @ts-ignore - Lucide icon lookup
              const Icon = LucideIcons[item.icon];
              const isActive =
                pathname === item.href ||
                (item.href !== `/${role}` && pathname.startsWith(item.href));

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                    )}
                    {Icon && (
                      <Icon
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                    )}
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileSidebar({
  role,
}: {
  role: "resident" | "collector" | "recycler" | "admin";
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-[260px]">
        <Sidebar role={role} className="w-full h-full" />
      </SheetContent>
    </Sheet>
  );
}
