"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Database, 
  Globe, 
  FileSpreadsheet, 
  Plus, 
  ArrowRight,
  Server,
  Cloud,
  Upload,
  ExternalLink,
  Link
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { supabaseClient } from "@/lib/supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";

interface DatasetConnectionPopoverProps {
  children: React.ReactNode;
}

interface Connection {
  id: string | number;
  name: string;
  type: "database" | "api" | "csv";
  details?: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
  // Additional fields for API connections
  database_connection_id?: string | number;
  table_name?: string;
}

export default function DatasetConnectionPopover({
  children,
}: DatasetConnectionPopoverProps) {
  const [open, setOpen] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useUser();

  // Fetch user's existing connections
  const fetchConnections = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Fetch database connections
      const { data: dbConnections, error: dbError } = await supabaseClient
        .from("database_connections")
        .select("id, connection_name, database_type, host")
        .eq("user_id", user.id);      // Fetch API connections
      const { data: apiConnections, error: apiError } = await supabaseClient
        .from("api_connections")
        .select("id, connection_name, api_url, database_connection_id, table_name")
        .eq("user_id", user.id);

      // Fetch CSV data
      const { data: csvData, error: csvError } = await supabaseClient
        .from("csvData")
        .select("id, connection_name, file_name")
        .eq("user_id", user.id);

      if (dbError) console.error("Error fetching database connections:", dbError);
      if (apiError) console.error("Error fetching API connections:", apiError);
      if (csvError) console.error("Error fetching CSV data:", csvError);

      const allConnections: Connection[] = [];

      // Add database connections
      if (dbConnections) {
        allConnections.push(...dbConnections.map(conn => ({
          id: conn.id,
          name: conn.connection_name,
          type: "database" as const,
          details: `${conn.database_type} • ${conn.host}`,
          icon: Database,
          color: "text-blue-500",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-200 dark:border-blue-800",
        })));
      }      // Add API connections
      if (apiConnections) {
        allConnections.push(...apiConnections.map(conn => {
          let hostname;
          try {
            hostname = new URL(conn.api_url).hostname;
          } catch (error) {
            hostname = conn.api_url;
          }
          
          return {
            id: conn.id,
            name: conn.connection_name,
            type: "api" as const,
            details: conn.table_name 
              ? `${conn.table_name} • ${hostname}`
              : hostname,
            icon: Globe,
            color: "text-green-500",
            bgColor: "bg-green-50 dark:bg-green-950/20",
            borderColor: "border-green-200 dark:border-green-800",
            database_connection_id: conn.database_connection_id,
            table_name: conn.table_name,
          };
        }));
      }

      // Add CSV connections
      if (csvData) {
        allConnections.push(...csvData.map(conn => ({
          id: conn.id,
          name: conn.connection_name || conn.file_name,
          type: "csv" as const,
          details: conn.file_name,
          icon: FileSpreadsheet,
          color: "text-orange-500",
          bgColor: "bg-orange-50 dark:bg-orange-950/20",
          borderColor: "border-orange-200 dark:border-orange-800",
        })));
      }

      setConnections(allConnections);
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch connections when popover opens
  useEffect(() => {
    if (open && user?.id) {
      fetchConnections();
    }
  }, [open, user?.id]);
  const handleConnectionSelect = (connection: Connection) => {
    setOpen(false);
    // Navigate to dataset creation for the specific connection
    if (connection.type === "database") {
      router.push(`/dashboard/db-details/${connection.id}`);
    } else if (connection.type === "api") {
      // For API connections, navigate to the database table view
      if (connection.database_connection_id && connection.table_name) {
        router.push(`/dashboard/db-details/${connection.database_connection_id}/tables/${connection.table_name}`);
      } else {
        // Fallback to API details if database info is missing
        router.push(`/dashboard/api-details/${connection.id}`);
      }
    } else if (connection.type === "csv") {
      router.push(`/dashboard/csv-details/${connection.id}`);
    }
  };

  const handleAddNewConnection = () => {
    setOpen(false);
    // Navigate to main dashboard to add new connection
    router.push("/dashboard");
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0 overflow-hidden border-0 shadow-xl" 
        align="end"
        sideOffset={8}
      >
        <div className="bg-gradient-to-br from-background to-muted/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Create Dataset</h3>
              <p className="text-sm text-muted-foreground">
                Choose from your connected data sources
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {loading ? (
              // Loading skeleton
              <>
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-8 w-8 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : connections.length > 0 ? (
              // Display existing connections
              <>
                {connections.map((connection) => {
                  const Icon = connection.icon;
                  return (
                    <Card
                      key={`${connection.type}-${connection.id}`}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border ${connection.borderColor} ${connection.bgColor}`}
                      onClick={() => handleConnectionSelect(connection)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg bg-background shadow-sm`}>
                            <Icon className={`h-5 w-5 ${connection.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm truncate">{connection.name}</h4>
                              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {connection.details && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {connection.details}
                              </p>
                            )}                            <div className="flex items-center gap-1 mt-2">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-background/60 text-muted-foreground capitalize">
                                {connection.type}
                              </span>
                              {connection.type === "api" && connection.database_connection_id && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                  <Link className="h-3 w-3" />
                                  Linked to DB
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {/* Add new connection button */}
                <Card
                  className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border-dashed border-2 border-muted-foreground/30 hover:border-primary/50"
                  onClick={handleAddNewConnection}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-muted-foreground">Add New Connection</h4>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          Connect database, API, or upload CSV
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              // Empty state - no connections
              <div className="text-center py-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Database className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-medium text-sm mb-2">No connections yet</h4>
                <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                  Get started by connecting your first data source
                </p>
                <Button 
                  size="sm"
                  onClick={handleAddNewConnection}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Connection
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Server className="h-3 w-3" />
              <span>Secure connections with encryption</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
