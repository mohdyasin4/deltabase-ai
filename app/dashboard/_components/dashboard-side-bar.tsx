// components/Sidebar.tsx
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {DashboardNav} from '@/components/dashboard-nav';
import { navItems } from '@/constants/data';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type SidebarProps = {
  className?: string;
};

export default function DashboardSideBar({ className }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMouseEnter = () => {
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
  };

  return (
    <nav
      className={cn(
        'absolute bg-background h-screen flex-none border-r z-30 pt-3 md:block transition-all duration-600 flex flex-col',
        isExpanded ? 'w-60' : 'w-14',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={cn("flex items-center")}>
        <Link href="/" className="flex items-center">
          <Image
            className='mx-4'
            src="/images/yellowi.svg"
            alt="Logo"
            width={25}
            height={25}
          />
        </Link>
      </div>
      <div className="flex-grow py-2">
        <div className="p-2 h-[calc(100vh-5vh)] ">
            <DashboardNav items={navItems} isExpanded={isExpanded} />
        </div>
      </div>
    </nav>
  );
}
