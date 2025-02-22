import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dropdown,
  DropdownMenu,
  DropdownTrigger,
  DropdownItem,
  DropdownSection,
  Avatar,
} from "@heroui/react";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { CreditCard, LogOut, Settings, User, UserCircle } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "./ModeToggle";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

interface ProfileProps {
  isExpanded: boolean;
}

export function Profile({ isExpanded }: ProfileProps) {
  const { isSignedIn, user, isLoaded } = useUser();

  return (
    <Dropdown className="ml-2" placement="right-end">
      <DropdownTrigger>
        <Avatar
          isBordered
          size="sm"
          as="button"
          showFallback
          className="transition-transform"
          src={user?.imageUrl} />
      </DropdownTrigger>
      <DropdownMenu aria-label="Profile Actions" variant="flat">
        <DropdownItem key="profile" className="h-14 gap-2">
          <p className="font-semibold">Signed in as</p>
          <p className="font-semibold">{user?.username}</p>
        </DropdownItem>
        <DropdownItem key="settings">
          My Settings
        </DropdownItem>
        <DropdownItem key="team_settings">Team Settings</DropdownItem>
        <DropdownItem key="analytics">
          Analytics
        </DropdownItem>
        <DropdownItem key="system">System</DropdownItem>
        <DropdownItem key="configurations">Configurations</DropdownItem>
        <DropdownItem key="help_and_feedback">
          Help & Feedback
        </DropdownItem>
        <DropdownItem key="logout" color="danger">
          <SignOutButton redirectUrl="/sign-in"/>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
