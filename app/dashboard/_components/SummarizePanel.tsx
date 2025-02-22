"use client";

import React, { useState, useEffect } from "react";
import { Button, Input, Select, SelectItem, Spinner, Tab, Tabs } from "@heroui/react";
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";
import { Label } from "@/components/ui/label";
import MultiSelectPopover from "./MultiSelect";
import { Close } from "@radix-ui/react-toast";
import { XIcon } from "lucide-react";

interface SummarizePanelProps {
  showPanel: boolean;
  setShowPanel: (show: boolean) => void;
  setVisualizationType: (type: string) => void;  
  connectionId: string;
  tableName: string;
  setQueryLoading: (value : boolean) => void;
  setRows: (rows:string) => void;
  setColumns: (columns:string) => void;
  columns: string[];
  rows: string[];
  setSqlQuery: (query:string) => void;
  onResetData: () => void;
  showSidePanel: boolean;
  showSummarizePanel: boolean,
  setShowSummarizePanel: (show: boolean) => void;
}

export default function SummarizePanel({
  showPanel,
  setShowPanel,
  setVisualizationType,
  connectionId,
  tableName,
  setQueryLoading,
  setRows,
  setColumns,
  columns,
  rows,
  setSqlQuery,
  onResetData,
  showSidePanel,
  showSummarizePanel,
  setShowSummarizePanel,
}: SummarizePanelProps) {
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  console.log(setVisualizationType)

  useEffect(() => {
    if (showPanel && showSidePanel) {
      setShowSummarizePanel(false);
    }
  }, [showPanel]);

  return (
    <div
      className={`flex flex-col gap-4 transition-transform transform ease-in-out duration-300 ${
        showSummarizePanel ? "translate-x-0" : "translate-x-full"
      } fixed right-0 bg-background border-l-2 w-[380px] h-[calc(100vh-5vh)] shadow-lg p-4 z-50`}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold text-foreground">Summarize Data</h1>
        <Button size="sm" variant="flat" color="danger" onClick={() => setShowSummarizePanel(false)}>
          <XIcon height={16} width={16} />
          Close
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <Label className="text-xs font-thin">Select Summary Function</Label>
          <MultiSelectPopover 
            setRows={setRows}
            setColumns={setColumns}
            columns={columns}
            rows={rows}
            setSqlQuery={setSqlQuery}
            setQueryLoading={setQueryLoading}
            setVisualizationType={setVisualizationType}
            connectionId={connectionId}
            tableName={tableName}  
          />
        </div>

        <div className="mt-8">
          <h2 className="text-md font-semibold mb-2">Quick Tips</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-foreground/80">
            <li>Use <strong>Count</strong> to get the total number of rows.</li>
            <li><strong>Sum</strong> works only on numeric columns.</li>
            <li><strong>Average</strong> provides the mean value.</li>
            <li><strong>Max/Min</strong> find extreme values in the data.</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 