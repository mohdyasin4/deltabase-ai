// @/constants/data.ts
import { Icons } from '@/components/icons';
import { NavItem, SidebarNavItem } from '@/types';

export const navItems: NavItem[] = [
  {
    title: 'Home',
    href: '/dashboard',
    icon: 'home',
    label: 'Home'
  },
  {
    title: 'Dashboards',
    href: '/dashboard/userDash',
    icon: 'dashboard',
    label: 'Databases',
    separator: true,
  },
  {
    title: 'Datasets',
    href: '/dashboard/datasets',
    icon: 'folder',
    label: 'Datasets',
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: 'settings',
    label: 'settings',
    bottom: true
  },
  {
    title: 'Account',
    href: '/search',
    icon: 'user',
    label: 'Search',
    bottom: true
  }
];
