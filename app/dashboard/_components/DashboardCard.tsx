"use client";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Icon } from "@iconify-icon/react";
import { EllipsisVertical, LayoutDashboard } from "lucide-react";
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
    <Card className="relative flex flex-col items-start p-4 gap-2 hover:bg-white/10 transition-all ease-linear duration-100 hover:scale-105">
      <div className="flex justify-between items-start w-full">
        <div className="flex items-start gap-2 w-full">
          {/* Icon */}
          <LayoutDashboard 
            className="w-8 h-8"
            style={{ minWidth: "32px", minHeight: "32px" }}
          />
          {/* Title and Date */}
          <div className="flex-grow">
            <Link
              href={`/dashboard/my-dashboards/${dashboard.id}?name=${encodeURIComponent(
                dashboard.name
              )}`}
              className="hover:text-[#ffcc19] transition-all ease-in-out duration-200"
            >
              <CardTitle className="cursor-pointer">{dashboard.name}</CardTitle>
              <CardDescription>
                Created on {new Date(dashboard.createdAt).toLocaleDateString()}
              </CardDescription>
            </Link>
          </div>

          {/* Dropdown */}
          <div className="ml-auto" onClick={handleDropdownClick}>
            <Dropdown>
              <DropdownTrigger>
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  className="p-0 text-sm"
                  disabled={isDeleting} // Disable button while deleting
                >
                  <EllipsisVertical />
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
                  onClick={handleDelete} // Trigger delete on click
                  shortcut="⌘⇧D"
                >
                  {isDeleting ? "Deleting..." : "Delete Dashboard"}
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>
    </Card>
  );
}
