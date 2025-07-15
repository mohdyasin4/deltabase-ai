"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { useRouter } from "@/hooks/useRouter";
import {
  Layers,
  Edit,
  EllipsisVertical,
  Trash,
  Braces,
  Plug,
  Table,
  FileSpreadsheet,
  ArrowRight,
  Database,
} from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Dropdown,
  DropdownMenu,
  DropdownTrigger,
  DropdownItem,
  Chip,
} from "@heroui/react";
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
  const handleClick = async () => {
    if (type === "database") {
      router.push(`/dashboard/db-details/${id}`);
    } else if (type === "api") {
      // For API connections, fetch database_connection_id and table_name
      // then navigate to the database table URL
      const { data: apiData, error } = await supabaseClient
        .from("api_connections")
        .select("database_connection_id, table_name")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching API connection details:", error);
        toast.error("Failed to load API connection details");
        return;
      }

      if (apiData?.database_connection_id && apiData?.table_name) {
        router.push(`/dashboard/db-details/${apiData.database_connection_id}/tables/${apiData.table_name}`);
      } else {
        // Fallback to API details page if no database connection found
        router.push(`/dashboard/api-details/${id}`);
      }
    } else {
      // CSV connection
      router.push(`/dashboard/csv-details/${id}`);
    }
  };

  const handleDisconnect = async () => {
    const tableName =
      type === "database"
        ? "database_connections"
        : type === "api"
        ? "api_connections"
        : "csvData";

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
          type === "database" ? "Database" : type === "api" ? "API" : "CSV Data"
        } disconnected successfully.`
      );
      console.log(
        `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } with ID: ${id} disconnected.`
      );
      onUpdate(parseInt(id, 10));
    }
  };
  return (
    <Card
      className={`relative flex flex-col w-full group p-3 shadow-sm hover:shadow-xl border border-border/50 hover:border-border/80 gap-3 cursor-pointer bg-card hover:bg-accent/20 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group overflow-hidden rounded-xl ${className}`}
      onClick={handleClick}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Header: Icon, Title and Dropdown */}
      <div className="relative flex items-start justify-between w-full gap-3">        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`relative flex-shrink-0 p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 ${
            type === "database" 
              ? "bg-blue-50 dark:bg-blue-950/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50" 
              : type === "api" 
              ? "bg-green-50 dark:bg-green-950/30 group-hover:bg-green-100 dark:group-hover:bg-green-900/50"
              : "bg-orange-50 dark:bg-orange-950/30 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50"
          }`}>
            {/* Subtle glow effect */}
            <div className={`absolute inset-0 rounded-xl blur-sm opacity-0 group-hover:opacity-30 transition-opacity duration-300 ${
              type === "database" ? "bg-blue-400" : type === "api" ? "bg-green-400" : "bg-orange-400"
            }`} />            {type === "database" ? (
              <Layers size={20} className="relative text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
            ) : type === "api" ? (
              <Braces size={20} className="relative text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors" />
            ) : (
              <FileSpreadsheet size={20} className="relative text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <h2 className="text-base font-semibold truncate leading-tight text-foreground group-hover:text-foreground/90 transition-colors">
              {name}
            </h2>
            <p className="text-xs text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1">
              Click to view details
              <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:translate-x-1" />
            </p>
          </div>
        </div>
        
        {/* Dropdown - Enhanced design */}
        <div className="hidden group-hover:block relative flex-shrink-0">
          <Dropdown placement="bottom-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg opacity-60 hover:opacity-100 group-hover:opacity-100 hover:bg-accent/80 transition-all duration-200 hover:scale-110"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownTrigger>
                <EllipsisVertical className="h-4 w-4" />
              </DropdownTrigger>
            </Button>
            <DropdownMenu>
              <DropdownItem key="edit" startContent={<Edit size={16} />}>
                <span className="font-medium">Edit Connection</span>
              </DropdownItem>
              <DropdownItem
                key="disconnect"
                color="danger"
                onClick={handleDisconnect}
                startContent={<Trash size={16} />}
              >
                <span className="font-medium">Disconnect</span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
      
      {/* Enhanced Status Section */}
      <div className="relative flex items-center justify-between gap-3">        <Chip
          startContent={
            type === "database" ? (
              <Layers size={12} className="flex-shrink-0" />
            ) : type === "api" ? (
              <Plug size={12} className="flex-shrink-0" />
            ) : (
              <Table size={12} className="flex-shrink-0" />
            )
          }
          variant="flat"
          size="sm"
          className={`px-2.5 py-1 border-none font-medium transition-all duration-200 ${
            type === "database"
              ? "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/70"
              : type === "api"
              ? "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-900/70"
              : "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900/70"
          }`}
        >
          <span className="text-xs font-medium">
            {type === "database"
              ? "Database"
              : type === "api"
              ? "API"
              : "CSV Data"}
          </span>
        </Chip>
        
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50" />
            <span className="text-xs text-muted-foreground font-medium">Active</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DbCard;
