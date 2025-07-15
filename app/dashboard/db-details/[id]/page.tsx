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
  BarChart3,
  Table2,
  TerminalSquare,
  Search,
  Zap,
  Grid3X3,
  List,
  Rows3,
  ArrowRight,
} from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Modal,
  ModalContent,
  useDisclosure,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import twilight from "./themes/Twilight.json";
import EnhancedSQLEditor from "../../_components/EnhancedSQLEditor";
import toast from "react-hot-toast";
import NProgress from "nprogress";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";

export async function fetchConnectionData(id: string | string[]) {
  if (Array.isArray(id)) {
    id = id[0]; // Use the first element if it's an array
  }

  try {
    // First check if it's a database connection
    const { data: dbData, error: dbError } = await supabaseClient
      .from("database_connections")
      .select("connection_name, database_type")
      .eq("id", id)
      .single();

    if (dbData && !dbError) {
      return {
        connection_name: dbData.connection_name,
        type: "database",
        database_type: dbData.database_type,
      };
    }

    // If not found, it might be sample data - return placeholder
    return {
      connection_name: "Sample Database",
      type: "database",
      database_type: "sample",
    };
  } catch (error) {
    console.error("Error in fetchConnectionData:", error);
    // Return default values if there's an error
    return {
      connection_name: "Unknown Connection",
      type: "database",
      database_type: "unknown",
    };
  }
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
      base: "vs-dark", // Ensure the base is a valid BuiltinTheme
    });
    monaco.editor.setTheme("twilight");
  };
  useEffect(() => {
    if (id) {
      fetchConnectionData(id)
        .then((data) => {
          if (data) {
            setConnectionName(data.connection_name);
            setConnectionType(data.type);
          }
        })
        .catch((error) => {
          console.error("Error fetching connection data:", error);
          // Set default values on error
          setConnectionName("Unknown Connection");
          setConnectionType("database");
        });
    }
  }, [id, isSample]);
  useEffect(() => {
    async function fetchTables() {
      if (!id) return;

      try {
        // Fetch only database tables - no API or CSV connections
        const dbTables = await fetch(`/api/database/${id}`)
          .then((res) => (res.ok ? res.json() : []))
          .catch((error) => {
            console.error("Error fetching tables:", error);
            return [];
          });

        // Only show database tables - ensure dbTables is an array
        const tablesArray = Array.isArray(dbTables) ? dbTables : [];
        const tables = tablesArray.map((tableName: string) => ({
          name: tableName || "unknown_table",
          type: "database",
          id: tableName || `unknown_${Date.now()}`,
          displayName: tableName
            ? tableName.charAt(0).toUpperCase() +
              tableName.slice(1).replace(/_/g, " ")
            : "Unknown Table",
        }));

        setTables(tables);
        setFilteredTables(tables);
      } catch (error) {
        console.error("Error fetching tables", error);
        setTables([]);
        setFilteredTables([]);
      }

      setLoading(false);
    }

    fetchTables();
  }, [id]);
  // Filter tables based on search query
  useEffect(() => {
    if (searchQuery && tables) {
      const filtered = tables.filter(
        (table) =>
          table &&
          table.displayName &&
          table.name &&
          (table.displayName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
            table.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredTables(filtered);
    } else {
      setFilteredTables(tables || []);
    }
  }, [searchQuery, tables]);

  const handleClick = (table: any) => {
    NProgress.start();

    // Only handle database tables since we're no longer showing API/CSV connections
    router.push(`/dashboard/db-details/${id}/tables/${table.name}`);

    NProgress.done();
  };

  const handleSqlChange = (value: string | undefined) => {
    setSqlQuery(value || "");
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
          `/dashboard/db-details/${id}/query-result?query=${encodeURIComponent(
            sqlQuery
          )}`
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
  // Helper function for database tables only
  const getTableIcon = () => Rows3;

  // Clean, professional styling for database tables
  const getTableConfig = () => ({
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50/80 dark:bg-blue-950/40",
    hoverIconBg: "group-hover:bg-blue-100/90 dark:group-hover:bg-blue-900/60",
  });

  return (
    <main className="flex flex-col gap-4 px-4 py-4 lg:px-6 min-h-screen max-h-screen overflow-hidden w-full">
      {" "}
      {/* Clean Professional Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Database Explorer
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span className="font-medium">{connectionName}</span>
                </span>
                <span className="text-muted-foreground/60">•</span>
                <span>
                  {filteredTables.length}{" "}
                  {filteredTables.length === 1 ? "table" : "tables"}
                </span>
              </p>
            </div>
          </div>        </div>
        <div className="flex items-center gap-3">          
          {/* Clean View Toggle */}
          <div className="flex rounded-lg border border-border bg-muted/50">
            <UIButton
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none h-9 w-9 p-0"
            >
              <Grid3X3 className="h-4 w-4" />
            </UIButton>
            <UIButton
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none h-9 w-9 p-0"
            >
              <List className="h-4 w-4" />
            </UIButton>
          </div>

          <UIButton onClick={onOpen} className="h-9 px-4">
            <TerminalSquare className="w-4 h-4 mr-2" />
            SQL Query
          </UIButton>
        </div>
      </div>
      {/* Content Section */}
      <div className="flex-1 overflow-auto min-h-0">
        {" "}
        {filteredTables.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-muted/50 rounded-xl mb-4 border border-border">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No matches found
            </h3>
            <p className="text-muted-foreground max-w-sm">
              No tables match "
              <span className="font-medium text-foreground">{searchQuery}</span>
              ". Try adjusting your search terms.
            </p>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-muted/50 rounded-xl mb-4 border border-border">
              <Table2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No tables available
            </h3>
            <p className="text-muted-foreground max-w-sm">
              This database connection doesn't have any accessible tables yet.
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-1.5 ${
              viewMode === "grid"
                ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 2xl:grid-cols-10"
                : "grid-cols-1"
            } overflow-hidden`}
          >
            {filteredTables.map((table, index) => {
              const TableIcon = getTableIcon();
              const config = getTableConfig();

              return (
                <motion.div
                  key={`table-${table.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.15,
                    delay: index * 0.01,
                    ease: "easeOut",
                  }}
                  whileHover={{
                    scale: 1.005,
                    transition: { duration: 0.12, ease: "easeInOut" },
                  }}
                  whileTap={{ scale: 0.995, transition: { duration: 0.08 } }}
                  className="w-full"
                >
                  {" "}
                  <Card
                    className={`group relative cursor-pointer bg-card hover:bg-card/80 border border-border/50 hover:border-border/80 transition-all duration-300 rounded-xl ${
                      viewMode === "list"
                        ? "flex items-center gap-3 p-3 min-h-[50px]"
                        : "flex items-center gap-3 p-2.5 min-h-[45px]"
                    }`}
                    onClick={() => handleClick(table)}
                    tabIndex={0}
                    aria-label={`View table ${table.displayName}`}
                  >
                    {/* Icon container - simplified to match DatasetCard */}{" "}
                    <div
                      className={`flex-shrink-0 ${
                        viewMode === "list" ? "p-2.5" : "p-2"
                      } bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-300`}
                    >
                      <TableIcon
                        className={`text-primary transition-colors ${
                          viewMode === "list" ? "w-4 h-4" : "w-3.5 h-3.5"
                        }`}
                      />
                    </div>
                    {/* Table name */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold text-foreground group-hover:text-foreground/90 transition-colors truncate leading-tight ${
                          viewMode === "list" ? "text-base" : "text-sm"
                        }`}
                      >
                        {table.displayName}
                      </p>
                    </div>
                    {/* Action indicator for list view */}
                    {viewMode === "list" && (
                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>{" "}
      {/* Clean SQL Modal */}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className="flex w-full max-w-4xl"
        backdrop="blur"
      >
        <ModalContent className="flex w-full max-w-4xl">
          {(onClose) => (
            <>              <ModalHeader className="flex flex-col gap-2 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                    <TerminalSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Enhanced SQL Editor</h2>
                    <p className="text-sm text-muted-foreground">
                      Write and execute SQL queries with advanced features
                    </p>
                  </div>
                </div>
              </ModalHeader>
              <ModalBody className="h-full p-6">
                <EnhancedSQLEditor
                  value={sqlQuery}
                  onChange={handleSqlChange}
                  onExecute={handleSqlSubmit}
                  loading={queryLoading}
                  height="400px"
                  theme="dark"
                  showMinimap={false}
                />
              </ModalBody>              <ModalFooter className="border-t border-border p-6">
                <div className="flex gap-3 w-full justify-end">
                  <Button
                    variant="flat"
                    color="danger"
                    onPress={onClose}
                    className="px-6"
                  >
                    Close Editor
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
