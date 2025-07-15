"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Play, 
  Copy, 
  Download,
  Maximize2,
  RotateCcw,
  Settings,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  onExecute?: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
  onFullscreen?: () => void;
  onReset?: () => void;
  onSettings?: () => void;
  loading?: boolean;
  visible?: boolean;
  className?: string;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onExecute,
  onCopy,
  onDownload,
  onFullscreen,
  onReset,
  onSettings,
  loading = false,
  visible = true,
  className = "",
}) => {
  const toolbarItems = [
    {
      icon: loading ? Loader2 : Play,
      label: loading ? "Executing..." : "Run Query",
      onClick: onExecute,
      variant: "default" as const,
      disabled: loading,
      className: loading ? "animate-spin" : "",
    },
    {
      icon: Copy,
      label: "Copy to Clipboard",
      onClick: onCopy,
      variant: "ghost" as const,
    },
    {
      icon: Download,
      label: "Download Query",
      onClick: onDownload,
      variant: "ghost" as const,
    },
    {
      icon: Maximize2,
      label: "Fullscreen",
      onClick: onFullscreen,
      variant: "ghost" as const,
    },
    {
      icon: RotateCcw,
      label: "Reset",
      onClick: onReset,
      variant: "ghost" as const,
    },
    {
      icon: Settings,
      label: "Settings",
      onClick: onSettings,
      variant: "ghost" as const,
    },
  ].filter(item => item.onClick); // Only show items with handlers

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "absolute top-4 right-4 z-10 flex items-center gap-2 p-2 bg-background/80 backdrop-blur-xl border border-border/30 rounded-xl shadow-lg",
            className
          )}
        >
          <TooltipProvider>
            {toolbarItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Button
                        size="sm"
                        variant={item.variant}
                        onClick={item.onClick}
                        disabled={item.disabled}
                        className={cn(
                          "h-8 w-8 p-0 transition-all duration-200",
                          item.variant === "default" && "bg-primary hover:bg-primary/90 text-primary-foreground",
                          item.className
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingToolbar;
