"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Breadcrumbs,
  BreadcrumbItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Inbox,
  Asterisk,
  Terminal,
  LucideAppWindowMac,
  Box,
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { fetchConnectionName } from "@/app/dashboard/db-details/[id]/page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModeToggle } from "@/components/ModeToggle";

// Helper function to capitalize first letter
export const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const [connectionName, setConnectionName] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState<string | null>(null); // State for dataset name
  const { id, tableName, dataset_name } = useParams();
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

  // Fetch connection name when id changes
  useEffect(() => {
    if (id) {
      fetchConnectionName(id).then(setConnectionName);
    }
  }, [id]);

  // Set dataset name if it exists in the URL
  useEffect(() => {
    if (dataset_name) {
      if (typeof dataset_name === "string") {
        setDatasetName((decodeURIComponent(dataset_name)));
      }
    }
  }, [dataset_name]);

  return (
    <div className="fixed flex h-12 items-center  w-[calc(100vw-3.5rem)] z-50 justify-between py-2 px-4 border-b text-sm bg-background">
      {/* Breadcrumb Section */}
      <Breadcrumbs separator="/" itemClasses={{ separator: "px-2" }}>
        <BreadcrumbItem href="/dashboard">Deltabase</BreadcrumbItem>
        {id && connectionName && (
          <BreadcrumbItem href={`/dashboard/${id}`}>
            {capitalizeFirstLetter(connectionName)}
          </BreadcrumbItem>
        )}
        {tableName && (
          <BreadcrumbItem href={`/dashboard/${id}/tables/${tableName}`}>
            {typeof tableName === "string"
              ? capitalizeFirstLetter(tableName.replace(/_/g, " "))
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
            {datasetName}
          </BreadcrumbItem>
        )}
      </Breadcrumbs>
      {/* Right Section with Search Bar and Popover */}
      <div className="flex items-center gap-4">
        <SearchBar />
        <Popover placement="bottom-end" color="secondary" offset={15}>
          <PopoverTrigger>
            <Button
              size="sm"
              variant="default"
              className="flex items-center h-6 justify-center text-sm p-2 rounded-[0.5rem]"
            >
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </PopoverTrigger>
          <PopoverContent className="bg-background border shadow-lg rounded-md p-2">
            <div className="flex flex-col w-44 gap-2">
              {[
                { label: "Question", icon: Asterisk },
                { label: "SQL Query", icon: Terminal },
                { label: "Dashboard", icon: LucideAppWindowMac },
                { label: "Model", icon: Box },
              ].map(({ label, icon: Icon }) => (
                <Button
                  key={label}
                  size="sm"
                  variant="ghost"
                  className="text-sm justify-start w-full h-8 px-2 rounded-sm"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Inbox className="h-4 w-4 text-muted-foreground hover:text-white cursor-pointer transition-all ease-out" />
      </div>
    </div>
  );
}
