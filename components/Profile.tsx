import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild className=" h-[3.25rem]">
        <Card className={cn("h-[3.25rem] w-full flex  items-center gap-2 hover:bg-card hover:cursor-pointer bg-transparent border-none transition-all ease-in-out duration-75 pl-2")}>
          <UserCircle className="h-6 p-1 w-6 bg-foreground text-background rounded-full" />
          {isExpanded && (
            <div>
              <span
                className={cn(
                  "flex w-full justify-start text-sm break-normal text-foreground transition-all ease-in-out",
                  isExpanded ? "opacity-100" : "opacity-0 hidden"
                )}
              >
                {user?.username}
              </span>
              <span
                className={cn(
                  "flex w-full justify-start text-xs text-muted-foreground break-normal transition-all ease-in-out",
                  isExpanded ? "opacity-100" : "opacity-0 hidden"
                )}
              >
                {user?.emailAddresses[0].emailAddress}
              </span>
            </div>
          )}
        </Card>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <ModeToggle />
        <DropdownMenuGroup>
          <Link href="/user-profile">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
          <Link href="/dashboard/settings">
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <SignOutButton>
          <DropdownMenuItem>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </SignOutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
