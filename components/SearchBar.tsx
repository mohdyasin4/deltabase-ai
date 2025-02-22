import React from "react";
import {
  Command,
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
  EnvelopeClosedIcon,
  FaceIcon,
  GearIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { CalendarHeart, CalendarIcon, Divide, FacebookIcon, RocketIcon } from "lucide-react";
import { FaSearch } from "react-icons/fa";
import { Tooltip } from "@heroui/react";

export function SearchBar() {
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
  );
}
