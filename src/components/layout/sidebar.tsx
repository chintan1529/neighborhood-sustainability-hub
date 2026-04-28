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

  // Group items by section
  const sections: Record<string, typeof items> = {};
  items.forEach((item) => {
    const section = item.section || "Main";
    if (!sections[section]) sections[section] = [];
    sections[section].push(item);
  });

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
          <Leaf className="h-3.5 w-3.5 text-background" />
        </div>
        <span className="font-semibold text-sm tracking-tight">NHS</span>
      </div>

      {/* Nav Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {Object.entries(sections).map(([section, sectionItems]) => (
          <div key={section}>
            <p className="px-3 mb-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {section}
            </p>
            <div className="space-y-0.5">
              {sectionItems.map((item) => {
                // @ts-ignore - Lucide icon lookup
                const Icon = LucideIcons[item.icon];
                const isActive =
                  pathname === item.href ||
                  (item.href !== `/${role}` && pathname.startsWith(item.href));

                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150",
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                      )}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground",
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
        ))}
      </nav>
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
