"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { useRouter } from "@/hooks/useRouter";
import { Database, Edit, EllipsisVertical, Trash, Braces, Plug, Table, FileSpreadsheet } from "lucide-react"; // Added `Table` icon
import { supabaseClient } from "@/lib/supabaseClient";
import { Dropdown, DropdownMenu, DropdownTrigger, DropdownItem, Chip } from "@heroui/react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";

interface DbCardProps {
  id: string;
  name: string;
  onUpdate: (id: number) => Promise<void>;
  type: string; // 'database', 'api', or 'csvData'
  className?: string;
}

const DbCard = ({ id, name, onUpdate, type, className }: DbCardProps) => {
  const router = useRouter();

  // Navigate to the appropriate details page based on the type
  const handleClick = () => {
    const path =
      type === "database"
        ? `/dashboard/db-details/${id}`
        : type === "api"
        ? `/dashboard/api-details/${id}`
        : `/dashboard/csv-details/${id}`; // Handle `csvData` type
    router.push(path);
  };

  const handleDisconnect = async () => {
    const tableName =
      type === "database"
        ? "database_connections"
        : type === "api"
        ? "api_connections"
        : "csvData"; // Handle `csvData` type

    const { error } = await supabaseClient
      .from(tableName)
      .delete()
      .eq("id", id);

    if (error) {
      console.error(`Error disconnecting ${type}:`, error.message);
      alert(`Failed to disconnect the ${type}. Please try again.`);
    } else {
      toast.success(
        `${
          type === "database"
            ? "Database"
            : type === "api"
            ? "API"
            : "CSV Data"
        } disconnected successfully.`
      );
      console.log(`${type.charAt(0).toUpperCase() + type.slice(1)} with ID: ${id} disconnected.`);
      onUpdate(parseInt(id, 10)); // Refresh the list after disconnecting
    }
  };

  return (
    <Card
      className={`flex items-center p-6 shadow-xl gap-4 cursor-pointer hover:bg-white/10 transition-all ease-linear duration-100 hover:scale-105 ${className}`}
      onClick={handleClick}
    >
      {/* Icon based on type */}
      {type === "database" ? (
        <Database size={32} />
      ) : type === "api" ? (
        <Braces size={32} />
      ) : (
        <FileSpreadsheet size={32} /> // Icon for `csvData`
      )}

      {/* Data Source Name */}
      <div className="flex flex-col w-full">
        <h2 className="text-xl font-semibold">{name}</h2>

        {/* Data Source Type Label */}
        <Chip
          startContent={
            type === "database" ? (
              <Database size={16} className="mr-2" />
            ) : type === "api" ? (
              <Plug size={16} className="mr-2" />
            ) : (
              <Table size={16} className="mr-2" />
            )
          }
          variant="faded"
          size="sm"
          className={`text-xs p-2 mt-2 border-none ${
            type === "database"
              ? "text-blue-500 bg-blue-300/50 dark:bg-blue-950/50"
              : type === "api"
              ? "text-green-500 bg-green-300/50 dark:bg-green-900/50"
              : "text-orange-500 bg-orange-300/50 dark:bg-orange-900/50" // Styling for `csvData`
          }`}
        >
          {type === "database"
            ? "Database Connection"
            : type === "api"
            ? "API Connection"
            : "CSV Data"}
        </Chip>
      </div>

      <Dropdown placement="bottom-end">
        <Button variant="ghost" size="icon">
          <DropdownTrigger>
            <EllipsisVertical className="hover:text-white" />
          </DropdownTrigger>
        </Button>
        <DropdownMenu>
          <DropdownItem startContent={<Edit size={16} />}>Edit</DropdownItem>
          <DropdownItem
            color="danger"
            onClick={handleDisconnect}
            startContent={<Trash size={16} />}
          >
            Disconnect
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </Card>
  );
};

export default DbCard;
