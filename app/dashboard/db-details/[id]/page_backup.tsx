// app/dashboard/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "@/hooks/useRouter";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@heroui/button";
import { Button as UIButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  CameraIcon, 
  ChevronDown, 
  Grip, 
  Table,   BarChart3,
  Table2,
  TableOfContents,
  TerminalSquare,
  WandSparkles,
  Database,
  Search,
  Filter,
  Layers,
  Activity,
  Zap,
  Grid3X3,
  List,
  FileText,
  Globe,
  Link,
  Rows3,
  Eye,
  Play,
  ArrowRight
} from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import {
  Modal,
  ModalContent,
  useDisclosure,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import twilight from "./themes/Twilight.json";
import MonacoEditor from "@monaco-editor/react";
import toast from "react-hot-toast";
import NProgress from "nprogress";
import { capitalizeFirstLetter } from "../../_components/dashbord-top-nav";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";

export async function fetchConnectionData(id: string | string[]) {
  if (Array.isArray(id)) {
    id = id[0]; // Use the first element if it's an array
  }
  
  // First check if it's a database connection
  const { data: dbData, error: dbError } = await supabaseClient
    .from("database_connections")
    .select("connection_name, database_type")
    .eq("id", id)
    .single();

  if (dbData) {
    return { 
      connection_name: dbData.connection_name, 
      type: "database",
      database_type: dbData.database_type 
    };
  }

  // If not found, it might be sample data - return placeholder
  return { 
    connection_name: "Sample Database", 
    type: "database",
    database_type: "sample" 
  };
}

export default function DatabasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("sampleId") || useParams().id;
  const isSample = searchParams.has("sampleId");
  const [tables, setTables] = useState<any[]>([]);
  const [filteredTables, setFilteredTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionName, setConnectionName] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<string>("database");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [sqlQuery, setSqlQuery] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);

  const handleEditorDidMount = (
    editor: any,
    monaco: typeof import("monaco-editor")
  ) => {
    const modifiedtwilightTheme = {
      ...twilight,
      colors: {
        ...twilight.colors,
        "editor.background": "#111111",
        "editor.textColor": "#FFFFFF",
      },
      rules: twilight.rules.map((rule: any) => ({
        ...rule,
        background: rule.background === "#111111",
      })),
      base: "vs-dark", // Ensure the base is a valid BuiltinTheme
    };
    monaco.editor.defineTheme("twilight", {
      ...modifiedtwilightTheme,
      base: "vs-dark" // Ensure the base is a valid BuiltinTheme
    });
    monaco.editor.setTheme("twilight");
  };  useEffect(() => {
    if (id) {
      fetchConnectionData(id).then((data) => {
        setConnectionName(data.connection_name);
        setConnectionType(data.type);
      });
    }
  }, [id, isSample]);
  useEffect(() => {
    async function fetchTables() {
      if (!id) return;

      try {
        // Fetch only database tables - no API or CSV connections
        const dbTables = await fetch(`/api/database/${id}`)
          .then(res => res.ok ? res.json() : []);

        // Only show database tables
        const tables = dbTables.map((tableName: string) => ({
          name: tableName,
          type: "database",
          id: tableName,
          displayName: tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g, " ")
        }));

        setTables(tables);
        setFilteredTables(tables);
      } catch (error) {
        console.error("Error fetching tables", error);
      }

      setLoading(false);
    }

    fetchTables();
  }, [id]);
  // Filter tables based on search query
  useEffect(() => {    if (searchQuery) {
      const filtered = tables.filter(table =>
        table.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        table.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTables(filtered);
    } else {
      setFilteredTables(tables);
    }
  }, [searchQuery, tables]);
  const handleClick = (table: any) => {
    NProgress.start();
    
    // Only handle database tables since we're no longer showing API/CSV connections
    router.push(`/dashboard/db-details/${id}/tables/${table.name}`);
    
    NProgress.done();
  };

  const handleSqlChange = (value: string | undefined) => {
    setSqlQuery(value || '');
  };

  const handleSqlSubmit = async () => {
    if (!sqlQuery) {
      toast.error("SQL Query cannot be empty");
      return;
    }
    setQueryLoading(true);
    try {
      const response = await fetch(`/api/database/${id}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sqlQuery }),
      });

      if (response.ok) {
        // Redirect to the query result page with the query as a URL parameter
        router.push(
          `/dashboard/db-details/${id}/query-result?query=${encodeURIComponent(sqlQuery)}`
        );
      } else {
        const data = await response.json();
        console.error("Error executing query", data.error);
      }
    } catch (error) {
      console.error("Error executing query", error);
    }
    setQueryLoading(false);
    onOpenChange(); // Close the modal
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5vh)] w-full gap-3 items-center justify-center">
        <Spinner size={"small"} className="text-primary" />
        <span className="text-muted-foreground">Fetching tables...</span>
      </div>
    );
  }
  const iconClasses = "text-xs text-default-500 pointer-events-none flex-shrink-0";  // Helper function for database tables only
  const getTableIcon = () => Rows3;

  // Simplified styling for database tables only
  const getTableConfig = () => ({
    bgColor: "bg-gradient-to-br from-blue-50/80 to-blue-100/60 dark:from-blue-950/40 dark:to-blue-900/20",
    hoverBgColor: "group-hover:from-blue-100/90 group-hover:to-blue-150/70 dark:group-hover:from-blue-900/60 dark:group-hover:to-blue-800/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    glowColor: "bg-blue-400"
  });
  return (
    <main className="flex flex-col gap-4 px-4 py-4 lg:px-6 min-h-screen max-h-screen overflow-hidden w-full">
      {/* Enhanced Professional Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative p-2.5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 rounded-xl border border-blue-200/50 dark:border-blue-800/50 shadow-sm">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent rounded-xl blur-sm" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                Database Explorer
              </h1>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-sm" />
                  <span className="font-medium">{connectionName}</span>
                </span>
                <span className="text-muted-foreground/60">•</span>
                <span>{filteredTables.length} {filteredTables.length === 1 ? 'table' : 'tables'}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Enhanced Search Bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
            <Input
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-48 bg-background/60 backdrop-blur-sm border-border/40 focus:border-primary/60 transition-all duration-200 text-sm placeholder:text-muted-foreground/70 shadow-sm"
            />
          </div>

          {/* Enhanced View Toggle */}
          <div className="flex rounded-lg border border-border/40 bg-muted/30 backdrop-blur-sm shadow-sm">
            <UIButton
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none h-8 w-8 p-0 hover:bg-muted/60 transition-all duration-200"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </UIButton>
            <UIButton
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none h-8 w-8 p-0 hover:bg-muted/60 transition-all duration-200"
            >
              <List className="h-3.5 w-3.5" />
            </UIButton>
          </div>

          <UIButton
            onClick={onOpen}
            className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-medium hover:from-primary/90 hover:to-primary/80 transition-all duration-200 h-8 px-3 text-xs shadow-md hover:shadow-lg"
          >
            <TerminalSquare className="w-3.5 h-3.5 mr-1.5" />
            SQL Query
          </UIButton>
        </div>
      </div>      {/* Content Section */}
      <div className="flex-1 overflow-auto min-h-0">
        {filteredTables.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 bg-muted/30 rounded-xl mb-3 backdrop-blur-sm border border-border/40">
              <Search className="w-6 h-6 text-muted-foreground/80" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No matches found</h3>
            <p className="text-sm text-muted-foreground">
              No tables match "<span className="font-medium text-foreground/80">{searchQuery}</span>"
            </p>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 bg-muted/30 rounded-xl mb-3 backdrop-blur-sm border border-border/40">
              <Table2 className="w-6 h-6 text-muted-foreground/80" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No tables available</h3>
            <p className="text-sm text-muted-foreground">
              This database connection doesn't have any accessible tables yet.
            </p>
          </div>
        ) : (          <div className={`grid gap-3 ${
            viewMode === "grid" 
              ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7" 
              : "grid-cols-1 max-w-3xl"
          }`}>
            {filteredTables.map((table, index) => {
              const TableIcon = getTableIcon();
              const config = getTableConfig();
              
              return (
                <motion.div
                  key={`table-${table.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.2, 
                    delay: index * 0.015,
                    ease: "easeOut"
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.15, ease: "easeInOut" }
                  }}
                  whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                >
                  <Card
                    className={`group relative overflow-hidden cursor-pointer bg-white/70 dark:bg-gray-950/70 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-gray-950/90 border border-gray-200/60 dark:border-gray-800/60 hover:border-blue-300/60 dark:hover:border-blue-700/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 rounded-xl ${
                      viewMode === "list" 
                        ? "flex-row items-center p-4 min-h-[60px]" 
                        : "flex-col items-center justify-center p-4 aspect-square min-h-[100px]"
                    }`}
                    onClick={() => handleClick(table)}
                  >
                    {/* Modern gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-blue-100/30 dark:from-blue-950/20 dark:via-transparent dark:to-blue-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Subtle border glow effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-600/20 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300" />
                    
                    <div className={`relative z-10 flex ${
                      viewMode === "list" 
                        ? "items-center gap-4 w-full" 
                        : "flex-col items-center justify-center w-full h-full gap-2.5"
                    }`}>
                      {/* Enhanced icon container */}
                      <div className="relative flex-shrink-0">
                        <div className={`${config.bgColor} ${config.hoverBgColor} rounded-xl transition-all duration-300 group-hover:scale-105 border border-blue-200/40 dark:border-blue-800/40 group-hover:border-blue-300/60 dark:group-hover:border-blue-600/60 shadow-sm group-hover:shadow-md ${
                          viewMode === "list" 
                            ? "p-2.5" 
                            : "p-3"
                        }`}>
                          {/* Enhanced glow effect */}
                          <div className={`absolute inset-0 rounded-xl blur-sm opacity-0 group-hover:opacity-40 transition-opacity duration-300 ${config.glowColor}`} />
                          <TableIcon className={`relative ${config.iconColor} transition-all duration-300 group-hover:scale-110 drop-shadow-sm ${
                            viewMode === "list" ? "w-4 h-4" : "w-5 h-5"
                          }`} />
                        </div>
                      </div>
                      
                      {/* Enhanced content section */}
                      <div className={`${
                        viewMode === "list" ? "flex-1 min-w-0" : "text-center w-full"
                      }`}>
                        <h3 className={`font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-200 ${
                          viewMode === "list" 
                            ? "text-sm truncate" 
                            : "text-xs leading-tight truncate px-1"
                        }`} title={table.displayName}>
                          {table.displayName}
                        </h3>
                        {viewMode === "list" && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Database table
                          </p>
                        )}
                      </div>
                      
                      {/* Subtle action indicator for list view */}
                      {viewMode === "list" && (
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-1 group-hover:translate-x-0">
                          <ArrowRight className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div></div>
        )}
      </div>

      {/* Enhanced SQL Modal */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className="flex w-full max-w-4xl"
        backdrop="blur"
      >
        <ModalContent className="flex w-full max-w-4xl bg-card/95 backdrop-blur-md border border-border/50">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TerminalSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">SQL Query Editor</h2>
                    <p className="text-sm text-muted-foreground">Write and execute custom SQL queries</p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="h-full p-6">
                <div className="rounded-lg overflow-hidden border border-border/50">
                  <MonacoEditor
                    height="350px"
                    defaultLanguage="sql"
                    defaultValue=""
                    onChange={handleSqlChange}
                    onMount={handleEditorDidMount}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      wordWrap: "on",
                      overviewRulerBorder: false,
                      overviewRulerLanes: 0,
                      wrappingIndent: "indent",
                      wrappingStrategy: "advanced",
                      fontSize: 14,
                      lineHeight: 1.5,
                      padding: { top: 16, bottom: 16 },
                    }}
                  />
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-border/50 p-6">
                <div className="flex gap-3 w-full justify-end">
                  <Button 
                    variant="flat" 
                    color="danger" 
                    onPress={onClose}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <Button 
                    color="primary" 
                    onPress={handleSqlSubmit}
                    className="px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    disabled={queryLoading}
                  >
                    {queryLoading ? (
                      <div className="flex items-center gap-2">
                        <Spinner className="text-white" size={"small"} />
                        <span>Executing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span>Run Query</span>
                      </div>
                    )}
                  </Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  );
}
