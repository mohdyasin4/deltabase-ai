"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Icon } from "@iconify-icon/react";
import { EllipsisVertical, BarChart3, ArrowRight } from "lucide-react";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import { supabaseClient } from "@/lib/supabaseClient";

interface DashboardCardProps {
  dashboard: any;
  id: string;
  name: string;
  dataset_id: string;
  description?: string;
  createdAt: string;
  onDelete: (id: string) => void; // Add an onDelete prop to handle dashboard removal in the parent
}

export default function DashboardCard({
  dashboard,
  id,
  name,
  dataset_id,
  description,
  createdAt,
  onDelete,
}: DashboardCardProps) {
  const [isDeleting, setIsDeleting] = useState(false); // Add state to handle loading during deletion

  // Prevent dropdown button from navigating
  const handleDropdownClick = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation(); // Prevents the card click event
  };

  // Handle the deletion of the dashboard
  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await supabaseClient
      .from("dashboards")
      .delete()
      .eq("id", id);

    setIsDeleting(false);

    if (!error) {
      onDelete(id); // Call the onDelete callback to update the UI
    } else {
      console.error("Error deleting dashboard:", error);
    }
  };
  return (
    <Card className="relative flex flex-col w-full group p-3 shadow-sm hover:shadow-xl border border-border/50 hover:border-border/80 gap-3 cursor-pointer bg-card hover:bg-accent/20 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 overflow-hidden rounded-xl">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative flex items-start justify-between w-full gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0 p-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/50 transition-all duration-300 group-hover:scale-110">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-xl blur-sm opacity-0 group-hover:opacity-30 transition-opacity duration-300 bg-yellow-400" />
            <BarChart3 
              size={20}
              className="relative text-yellow-600 dark:text-yellow-400 group-hover:text-yellow-700 dark:group-hover:text-yellow-300 transition-colors"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <Link
              href={`/dashboard/my-dashboards/${dashboard.id}?name=${encodeURIComponent(
                dashboard.name
              )}`}
              className="hover:text-primary transition-all ease-in-out duration-200"
            >
              <CardTitle className="cursor-pointer text-base font-semibold truncate leading-tight text-foreground group-hover:text-foreground/90 transition-colors">{dashboard.name}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1">
                Created on {new Date(dashboard.createdAt).toLocaleDateString()}
                <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:translate-x-1" />
              </CardDescription>
            </Link>
          </div>
        </div>

        {/* Dropdown - Enhanced design */}
        <div className="hidden group-hover:block relative flex-shrink-0" onClick={handleDropdownClick}>
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="p-0 text-sm hover:bg-accent/50 transition-colors"
                disabled={isDeleting}
              >
                <EllipsisVertical size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu variant="faded" aria-label="Dashboard options">
              <DropdownItem key="edit" shortcut="⌘⇧E">
                Edit Dashboard
              </DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                onClick={handleDelete}
                shortcut="⌘⇧D"
              >
                {isDeleting ? "Deleting..." : "Delete Dashboard"}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>        </div>
      </div>
    </Card>
  );
}
