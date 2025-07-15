"use client";
import { useEffect, useState, useCallback, memo } from "react";
import {
  Breadcrumbs,
  BreadcrumbItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import { useParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Inbox,
  Asterisk,
  Terminal,
  LucideAppWindowMac,
  Box,
  Sparkle,
  Sparkles,
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { fetchConnectionData } from "@/app/dashboard/db-details/[id]/page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModeToggle } from "@/components/ModeToggle";
import AIButton from "@/app/dashboard/_components/ai-button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { useSidePanelStore } from "@/store/sidePanelStates";
import { useShallow } from "zustand/shallow";

// Helper function to capitalize first letter
export const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const Topbar = memo(() => {
  const [open, setOpen] = useState(false);
  const [connectionName, setConnectionName] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState<string | null>(null); // State for dataset name
  const { id, tableName, dataset_name } = useParams();
  const { isAiSidePanelOpen, setIsAiSidePanelOpen } = useSidePanelStore(
    useShallow((state) => ({
      isAiSidePanelOpen: state.isAiSidePanelOpen,
      setIsAiSidePanelOpen: state.setIsAiSidePanelOpen,
    }))
  );

  console.log(dataset_name);
  // Check if user is on /dashboard page
  const isDashboardPage = id && !tableName && !dataset_name;
  // Toggle search bar with Ctrl/Cmd + K
  const toggleSearchBar = useCallback((e: KeyboardEvent) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  // Add keyboard event listener on mount
  useEffect(() => {
    document.addEventListener("keydown", toggleSearchBar);
    return () => document.removeEventListener("keydown", toggleSearchBar);
  }, [toggleSearchBar]);

  // Inside Topbar:
  const pathname = usePathname(); 
  useEffect(() => {
    // Fetch connection name when id changes
    if (id) {
      fetchConnectionData(id)
        .then((data) => setConnectionName(data.connection_name))
        .catch((error) =>
          console.error("Failed to fetch connection name:", error)
        );
    }
  }, [id]);

  // ✅ Update dataset name based on route change
  useEffect(() => {
    if (dataset_name) {
      const decodedName = Array.isArray(dataset_name)
        ? decodeURIComponent(dataset_name[0])
        : decodeURIComponent(dataset_name);

      setDatasetName(decodedName);
    } else {
      setDatasetName(null); // clear if not in route
    }
  }, [pathname]); // ← watch full route instead of just dataset_name

  console.log("Topbar re-rendered");

  const handleAiButtonClick = useCallback(() => {
    setIsAiSidePanelOpen(true);
  }, [setIsAiSidePanelOpen]);

  const formatDatasetName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  return (
    <div className="fixed flex h-12 items-center  w-[calc(100vw-3.5rem)] z-50 justify-between py-2 pl-4 border-b text-sm bg-background">
      {/* Breadcrumb Section */}
      <Breadcrumbs separator="/" itemClasses={{ separator: "px-2" }}>
        <BreadcrumbItem href="/dashboard">Refract</BreadcrumbItem>
        {id && connectionName && (
          <BreadcrumbItem href={`/dashboard/db-details/${id}`}>
            {capitalizeFirstLetter(connectionName)}
          </BreadcrumbItem>
        )}
        {tableName && (
          <BreadcrumbItem href={`/dashboard/${id}/tables/${tableName}`}>
            {typeof tableName === "string"
              ? capitalizeFirstLetter(
                  decodeURIComponent(tableName).replace(/_/g, " ")
                )
              : ""}
          </BreadcrumbItem>
        )}
        {datasetName && (
          <BreadcrumbItem href={`/dashboard/datasets/`}>
            Datasets
          </BreadcrumbItem>
        )}
        {datasetName && (
          <BreadcrumbItem href={`/dashboard/datasets/${id}/${dataset_name}`}>
            {typeof datasetName === "string"
              ? capitalizeFirstLetter(
                  decodeURIComponent(datasetName).replace(/_/g, " ")
                )
              : ""}
          </BreadcrumbItem>
        )}
      </Breadcrumbs>
      {/* Right Section with Search Bar and Popover */}
      <div className="flex items-center gap-4">
        <SearchBar />
        {((id && tableName) || dataset_name) && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex gap-2 items-center"
          >
            <AIButton handleAiButtonClick={handleAiButtonClick} />
          </motion.div>
        )}

        <Inbox className="h-4 w-4 text-muted-foreground hover:text-white cursor-pointer transition-all ease-out" />

        <div className="flex m-0 px-2 items-center h-full gap-4"></div>
      </div>
    </div>
  );
});
