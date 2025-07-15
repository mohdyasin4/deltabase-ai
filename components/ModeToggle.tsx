"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // After mounting, we have access to the theme
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Render nothing on the server and until the theme is mounted
    return null;
  }

  return (
    <ToggleGroup
      type="single"
      value={theme || "system"}
      onValueChange={(value) => {
        if (value) setTheme(value);
      }}
      className="rounded-lg border border-border/50 p-1 bg-muted/30"
    >
      <ToggleGroupItem
        value="light"
        aria-label="Light theme"
        className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm h-8 px-3 text-xs font-medium transition-all hover:bg-background/50"
      >
        <Sun className="h-3.5 w-3.5 mr-1.5" />
        Light
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        aria-label="Dark theme"
        className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm h-8 px-3 text-xs font-medium transition-all hover:bg-background/50"
      >
        <Moon className="h-3.5 w-3.5 mr-1.5" />
        Dark
      </ToggleGroupItem>
      <ToggleGroupItem
        value="system"
        aria-label="System theme"
        className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm h-8 px-3 text-xs font-medium transition-all hover:bg-background/50"
      >
        <Monitor className="h-3.5 w-3.5 mr-1.5" />
        System
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
