// app/dashboard/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/hooks/useRouter";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@nextui-org/button";
import { Card } from "@/components/ui/card";
import { CameraIcon, ChevronDown, Table, TerminalSquare, WandSparkles } from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@nextui-org/dropdown";
import {
  Modal,
  ModalContent,
  useDisclosure,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/modal";
import twilight from "./themes/Twilight.json";
import MonacoEditor from "@monaco-editor/react";
import toast from "react-hot-toast";
import NProgress from "nprogress";

export default function DatabasePage() {
  async function fetchConnectionName(id: string) {
    const { data, error } = await supabaseClient
      .from("database_connections")
      .select("connection_name")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching connection name:", error);
      return null;
    }
    return data ? data.connection_name : null;
  }

  const router = useRouter();
  const { id } = useParams();
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionName, setConnectionName] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [sqlQuery, setSqlQuery] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);

  const handleEditorDidMount = (
    editor: any,
    monaco: {
      editor: {
        defineTheme: (
          arg0: string,
          arg1: {
            base: string;
            inherit: boolean;
            rules?: any[];
            colors?: {
              [key: string]: string;
            };
          }
        ) => void;
        setTheme: (arg0: string) => void;
      };
    }
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
    };
    monaco.editor.defineTheme("twilight", modifiedtwilightTheme);
    monaco.editor.setTheme("twilight");
  };

  useEffect(() => {
    if (id) {
      fetchConnectionName(id).then((name) => setConnectionName(name));
    }
  }, [id]);

  useEffect(() => {
    async function fetchTables() {
      if (!id) return;

      const response = await fetch(`/api/database/${id}`);
      const data = await response.json();

      if (response.ok) {
        setTables(data);
      } else {
        console.error("Error fetching tables", data.error);
      }

      setLoading(false);
    }

    fetchTables();
  }, [id]);

  const handleClick = (tableName: string) => {
    NProgress.start();
    router.push(`/dashboard/${id}/tables/${tableName}`);
    NProgress.done();
  };

  const handleSqlChange = (value: string) => {
    setSqlQuery(value);
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
          `/dashboard/${id}/query-result?query=${encodeURIComponent(sqlQuery)}`
        );
      } else {
        const data = await response.json();
        console.error("Error executing query", data.error);
      }
    } catch (error) {
      console.error("Error executing query", error);
    }
    setQueryLoading(false);
    onOpenChange(false); // Close the modal
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5vh)] w-full gap-2 items-center justify-center">
        <Spinner size={"small"} className="text-primary" />
        Fetching Tables...
      </div>
    );
  }

  const iconClasses =
    "text-xs text-default-500 pointer-events-none flex-shrink-0";

  return (
    <main className="flex flex-col gap-2 px-8 py-4 lg:gap-2 w-full h-[calc(100vh-5vh)]">
      <div className="flex justify-between gap-2 items-center">
        <h1 className="text-2xl font-bold">{connectionName}</h1>
        <div className="flex gap-2">
        <Button onClick={onOpen} size="sm" color="default" startContent={<TerminalSquare/>}>
        SQL Query
      </Button>
        <Button
          variant="faded"
          size="sm"
          startContent={<WandSparkles className={iconClasses} />}
        >
          AI Assistance
        </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {tables.map((table, index) => (
          <Card
            key={index}
            className="flex items-center p-6 gap-4 cursor-pointer hover:bg-white/10 transition-all ease-linear duration-100 hover:scale-105"
            onClick={() => handleClick(table)}
          >
            <Table className="h-6 w-6" />
            {table.charAt(0).toUpperCase() + table.slice(1).replace(/_/g, " ")}
          </Card>
        ))}
      </div>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className="flex w-full max-w-screen-lg"
      >
        <ModalContent className="flex w-full max-w-screen-lg">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                SQL Query Editor
              </ModalHeader>
              <ModalBody className="h-full">
                <MonacoEditor
                  height="300px"
                  defaultLanguage="sql"
                  defaultValue=""
                  onChange={handleSqlChange}
                  onMount={handleEditorDidMount}
                  theme={"vs-dark"}
                  options={{
                    minimap: { enabled: false },
                    wordWrap: "on",
                    overviewRulerBorder: false,
                    overviewRulerLanes: 0,
                    wrappingIndent: "indent",
                    wrappingStrategy: "advanced",
                  }}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" color="danger" onPress={onClose}>
                  Close
                </Button>

                <Button color="primary" onPress={handleSqlSubmit}>
                  {queryLoading ? (
                    <>
                      <Spinner className="text-black" size={"small"} />
                      Executing query...
                    </>
                  ) : (
                    "Run Query"
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </main>
  );
}
