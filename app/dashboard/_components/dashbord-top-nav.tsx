import { Profile } from "@/components/Profile";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  BreadcrumbItem,
  Breadcrumbs,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from "@nextui-org/react";
import { Button } from "@/components/ui/button";
import {
  EnvelopeClosedIcon,
  FaceIcon,
  GearIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import {
  Asterisk,
  Box,
  CalendarIcon,
  Database,
  Inbox,
  LayoutDashboard,
  LucideAppWindowMac,
  Plus,
  RocketIcon,
  Slash,
  Terminal,
} from "lucide-react";
import React from "react";
import { FaSearch } from "react-icons/fa";

export default function Topbar() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  return (
    <div className="flex h-12 max-h-12 min-h-12 items-center fixed w-[calc(100vw-3.5rem)] justify-between py-2 px-4 border-b  text-sm">
      <div>
        <>
          <Tooltip content="Search here...(CTRL + K)" placement="bottom">
            <p
              onClick={() => setOpen(true)}
              className="border-none group hover:text-foreground cursor-pointer transition-all ease-in-out rounded-md text-sm text-muted-foreground"
            >
              <FaSearch className="inline-block mr-2" />
              Search
              <kbd className="pointer-events-none group-hover:bg-zinc-800 transition-all ease-in-out group-hover:border-none inline-flex h-5 ml-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">CTRL</span>K
              </kbd>
            </p>
          </Tooltip>
          <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span>Calendar</span>
                </CommandItem>
                <CommandItem>
                  <FaceIcon className="mr-2 h-4 w-4" />
                  <span>Search Emoji</span>
                </CommandItem>
                <CommandItem>
                  <RocketIcon className="mr-2 h-4 w-4" />
                  <span>Launch</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Settings">
                <CommandItem>
                  <PersonIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <EnvelopeClosedIcon className="mr-2 h-4 w-4" />
                  <span>Mail</span>
                  <CommandShortcut>⌘B</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <GearIcon className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                  <CommandShortcut>⌘S</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </>
      </div>
      <div className="flex items-center gap-4">
        <Popover placement="bottom-end" color="secondary" offset={15} >
          <PopoverTrigger>
            <Button
              size="sm"
              variant="default"
              className="flex items-center h-6 justify-center text-sm p-2 rounded-[0.5rem]"
            >
              <Plus className="h-4 w-4 mr-2 " />
              New
            </Button>
          </PopoverTrigger>
          <PopoverContent className="bg-background border shadow-lg  rounded-md p-2">
            <div className="flex flex-col w-44 gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-foreground w-full justify-start text-sm h-8 px-2 rounded-sm"
              >
                <Asterisk className="mr-2 h-4 w-4" />
                Question
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className=" text-sm justify-start w-full h-8 px-2 rounded-sm"
              >
                <Terminal className="mr-2 h-4 w-4" />
                SQL Query
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className=" text-sm justify-start h-8 px-2 w-full rounded-sm"
              >
                <LucideAppWindowMac className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className=" text-sm justify-start h-8 px-2 w-full rounded-sm"
              >
                <Box className="mr-2 h-4 w-4" />
                Model
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Inbox className="h-4 w-4 text-muted-foreground hover:text-white cursor-pointer transition-all ease-out" />
      </div>
    </div>
  );
}
