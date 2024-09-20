// components/dashboard-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { NavItem } from "@/types";
import { Profile } from "./Profile";
import { Separator } from "./ui/separator";

interface DashboardNavProps {
  items: NavItem[];
  isMobileNav?: boolean;
  isExpanded: boolean;
}

export function DashboardNav({
  items,
  isMobileNav = false,
  isExpanded,
}: DashboardNavProps) {
  const path = usePathname();

  if (!items?.length) {
    return null;
  }

  const topItems = items.filter((item) => !item.bottom);
  const bottomItems = items.filter((item) => item.bottom);
  const renderNavItem = (item: NavItem) => {
    const Icon = Icons[item.icon || "arrowRight"];
    if (item.title === "Account") {
      return <Profile isExpanded={isExpanded} />;
    }
    return (
      <div key={item.href}>
        {item.href && (
          <Link
            href={item.disabled ? "/" : item.href}
            className={cn(
              "flex items-center gap-1 rounded-[5px] py-2 text-sm text-muted-foreground font-medium hover:bg-accent hover:text-accent-foreground transition-all duration-300",
              path === item.href ? "bg-accent text-foreground" : "transparent",
              item.disabled && "cursor-not-allowed opacity-80"
            )}
          >
            <Icon className="mx-2 size-5" />
            <span
              className={cn(
                "truncate",
                isExpanded ? "opacity-100" : "opacity-0 hidden"
              )}
            >
              {item.title}
            </span>
          </Link>
        )}
        {item.divider && <Separator className="my-2" />}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full transition-all ease-in-out duration-100 justify-between">
      <nav className="grid items-start gap-2">
        {topItems.map(renderNavItem)}
      </nav>
      <div className="mt-auto">
        <nav className="grid items-start gap-2">
          {bottomItems.map(renderNavItem)}
        </nav>
      </div>
    </div>
  );
}
