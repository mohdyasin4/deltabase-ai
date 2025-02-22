"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { NavItem } from "@/types";
import { Profile } from "./Profile";
import { Separator } from "./ui/separator";
import { Tooltip } from "@heroui/react"; // Import tooltip components

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
      <Tooltip className="rounded-sm text-xs" color="warning" placement="right" key={item.href} content={item.title}>
          <Link
            href={item.disabled ? "/" : item.href}
            className={cn(
              "flex items-center w-10 justify-center  gap-1 rounded-sm p-2 text-sm text-muted-foreground font-medium hover:bg-accent hover:text-accent-foreground transition-all duration-300",
              path === item.href ? "bg-accent text-foreground" : "transparent",
              item.disabled && "cursor-not-allowed opacity-80"
            )}
          >
            <Icon className="size-5" />
          </Link>
      </Tooltip>
    );
  };

  return (
    <div className="flex flex-col h-full w-full transition-all ease-in-out duration-100 justify-between">
      <nav className="flex flex-col items-center gap-2">
        {topItems.map(renderNavItem)}
      </nav>
      <div className="mt-auto">
        <nav className="flex flex-col items-center gap-2">
          {bottomItems.map(renderNavItem)}
        </nav>
      </div>
    </div>
  );
}
