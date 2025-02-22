import { Icons } from '@/components/icons';
import { type ClientUploadedFileData } from "uploadthing/types"

export interface NavItem {
  [x: string]: unknown;
  title: string;
  href?: string;
  disabled?: boolean;
  external?: boolean;
  icon?: keyof typeof Icons;
  label?: string;
  divider?: boolean;
  description?: string;
  bottom?: boolean;
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[];
}

export interface NavItemWithOptionalChildren extends NavItem {
  items?: NavItemWithChildren[];
}

export interface FooterItem {
  title: string;
  items: {
    title: string;
    href: string;
    external?: boolean;
  }[];
}

export type MainNavItem = NavItemWithOptionalChildren;

export type SidebarNavItem = NavItemWithChildren;

export interface RowData {
  id: number;
  name: string;
  email: string;
  age: number;
}

export interface UploadedFile<T = unknown> extends ClientUploadedFileData<T> {
  path: any;
}
