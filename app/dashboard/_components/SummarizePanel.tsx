"use client";

import React, { useState, useEffect } from "react";
import {
  Input,
  Select,
  SelectItem,
  Spinner,
  Tab,
  Switch,
  Tabs,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";
import { Label } from "@/components/ui/label";
import MultiSelectPopover from "./MultiSelect";
import {
  XIcon,
  CalendarIcon,
  DatabaseIcon,
  PlusIcon,
  Type,
  Tag,
  ToggleLeft,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { detectDatetimeColumns, formatRowData } from "@/utils/datetimeUtils";
import { date } from "zod";
import { useStore } from "@/store/useStatesStore";
import { useShallow } from "zustand/shallow";

interface SummarizePanelProps {
  showPanel: boolean;
  connectionId: string;
  tableName: string;
  columns: string[];
  rows: string[];
  primaryKeys: string;
  showSidePanel: boolean;
  showSummarizePanel: boolean;
  datetimeColumns: string[];
  allColumns: string[];
  columnTypes: any[];
  selectedAggregate: string;
  selectedValues: string[];
  selectedDateBy: string;
  sqlQuery: string;
  groupByValue: string[];
  setGroupByValue: (value: string[]) => void;
  setSelectedAggregate: (value: string) => void;
  setSelectedColumn: (value: string) => void;
  setSelectedValues: (val: string[]) => void;
  setColumnType: (column: string, type: string) => void;
  setDatetimeColumns: (columns: string[]) => void;
  setAllColumns: (columns: string[]) => void;
  setQueryLoading: (value: boolean) => void;
  setRows: (rows: string[]) => void;
  setColumns: (columns: string) => void;
  setSqlQuery: (query: string) => void;
  onResetData: () => void;
  setPrimaryKeys: (keys: string) => void;
  setShowPanel: (show: boolean) => void;
  setVisualizationType: (type: string) => void;
  setShowSummarizePanel: (show: boolean) => void;
  fetchDbData: (params: any) => void;
}

export const getColumnIcon = (columnType: string, isPrimaryKey: boolean) => {
  if (isPrimaryKey) return <Tag width={16} height={16} />;
  if (columnType.startsWith("enum(")) return <Type width={16} height={16} />;
  if (/^varchar\(\d+\)$/i.test(columnType) || columnType === "text") {
    return <Type width={16} height={16} />;
  }
  if (["timestamp", "datetime"].includes(columnType)) {
    return <CalendarIcon height={16} width={16} />;
  }
  if (/^tinyint\(\s*1\s*\)$/i.test(columnType)) {
    return <ToggleLeft width={16} height={16} />;
  }
  if (
    /^(int|bigint|smallint|mediumint|tinyint)(\s+unsigned)?$/i.test(columnType)
  ) {
    return <Type width={16} height={16} />;
  }
  return <DatabaseIcon height={16} width={16} />;
};

type Option = {
  value: string;
  label: string;
};

const aggregateOptions: Option[] = [
  { value: "count", label: "Count" },
  { value: "sum", label: "Sum of ..." },
  { value: "avg", label: "Average of ..." },
  { value: "min", label: "Minimum of ..." },
  { value: "max", label: "Maximum of ..." },
];

export default function SummarizePanel({
  showPanel,
  setShowPanel,
  setVisualizationType,
  connectionId,
  tableName,
  setQueryLoading,
  setRows,
  primaryKeys,
  setColumns,
  allColumns,
  datetimeColumns,
  setDatetimeColumns,
  selectedDateBy,
  selectedAggregate,
  setSelectedAggregate,
  selectedValues,
  sqlQuery,
  setSelectedColumn,
  setSelectedValues,
  groupByValue,
  setGroupByValue,
  setAllColumns,
  columns,
  columnTypes,
  setColumnType,
  rows,
  setSqlQuery,
  onResetData,
  showSidePanel,
  setPrimaryKeys,
  showSummarizePanel,
  setShowSummarizePanel,
  fetchDbData,
}: SummarizePanelProps) {
  const [currentOptions, setCurrentOptions] =
    useState<Option[]>(aggregateOptions);
  const { columnMetadata, setColumnMetadata } = useStore(
    useShallow((state) => ({
      columnMetadata: state.columnMetadata,
      setColumnMetadata: state.setColumnMetadata,
    }))
  );

  const dateFilters = [
    "Minute",
    "Hour",
    "Day",
    "Week",
    "Month",
    "Quarter",
    "Year",
  ];

  // Only show Group By section after both steps are complete:
  // 1. An aggregate function is selected
  // 2. At least one column is selected
  // 3. Aggregate is count

  const isAggregateComplete =
    selectedAggregate === "count" || selectedValues.length > 0;

  useEffect(() => {
    if (showPanel && showSidePanel) {
      setShowSummarizePanel(false);
    }
  }, [showPanel]);

  const fetchDefaultQuery = async () => {
    try {
      setQueryLoading(true);
      const response = await fetch(
        `/api/database/${connectionId}/tables/${tableName}`,
        { method: "GET" }
      );
      if (!response.ok) throw new Error("Failed to fetch default query");
      const data = await response.json();

      // Detect datetime columns from the first row
      const datetimeColumns = detectDatetimeColumns(data.rows);

      const colTypes = data.columnTypes;
      console.log("Column Types:", colTypes);
      console.log("Detected Datetime Columns:", datetimeColumns);

      // Format datetime columns for display
      const formattedRows = data.rows.map((row: any) =>
        formatRowData(row, datetimeColumns)
      );

      setRows(formattedRows);
      setColumns(data.columns);
      setAllColumns(data.columns);
      setColumnType(data.columnTypes.columnName, data.columnTypes.dataType);
      setColumnMetadata(data.columnMetadata || []);
      setPrimaryKeys(data.primaryKeys);
      setSqlQuery(data.query);
      setQueryLoading(false);
      // Reset group by toggles when clearing
      setGroupByValue([]);
    } catch (error) {
      console.error("Error fetching default query:", error);
      setQueryLoading(false);
    }
  };

  // Handler passed to MultiSelectPopover for aggregate selection
  // (Assume MultiSelectPopover updates selectedAggregate and selectedValues)
  // — No changes here, as that component handles its own steps.

  // Group By ToggleGroup onValueChange handler
  const onGroupByChange = (values: string[]) => {
    console.log("values", values);
    setGroupByValue(values);
    setSelectedValues(values);
    // If there's a raw query already stored, pass it along; otherwise, omit.
    const params: any = {
      aggregate: selectedAggregate,
      column: values.join(","),
      groupBy: values.join(","),
      dateBy: selectedDateBy,
      if(sqlQuery: any) {
        params.rawQuery = "true";
        params.query = sqlQuery;
      },
    };

    fetchDbData(params);
  };
  

  useEffect(() => {
    if (groupByValue.length > 0) {
      fetchDbData({
        aggregate: selectedAggregate,
        column: groupByValue.join(","),
        groupBy: groupByValue.join(","),
        dateBy: selectedDateBy,
      });
    }
  }, [groupByValue, selectedAggregate, selectedDateBy]);  

  return (
    <div
      className={`flex flex-col h-[calc(100vh-5vh)] fixed right-0 bg-background border-l-2 w-[380px] shadow-lg p-4 z-50 transition-transform duration-300 ease-in-out`}
      style={{
        transform: showSummarizePanel ? "translateX(0)" : "translateX(100%)",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold text-foreground">Summarize Data</h1>
        <Button
          size="sm"
          variant="destructive"
          color="danger"
          className="h-6 rounded-sm gap-2"
          onClick={() => setShowSummarizePanel(false)}
        >
          <XIcon height={16} width={16} />
          Close
        </Button>
      </div>

      {/* Scrollable Content */}
      <ScrollShadow>
        <ScrollArea className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-4">
            {/* Select Summary Function */}
            <div>
              <MultiSelectPopover
                setRows={setRows}
                setColumns={setColumns}
                fetchDefaultQuery={fetchDefaultQuery}
                fetchDbData={fetchDbData}
                selectedAggregate={selectedAggregate}
                setSelectedAggregate={setSelectedAggregate}
                selectedValues={selectedValues}
                setSelectedValues={setSelectedValues}
                currentOptions={currentOptions}
                setGroupByValue={setGroupByValue}
                aggregateOptions={aggregateOptions}
                setCurrentOptions={setCurrentOptions}
                columnMetadata={columnMetadata}
                columns={columns}
                setColumnType={setColumnType}
                setPrimaryKeys={setPrimaryKeys}
                rows={rows}
                setSqlQuery={setSqlQuery}
                setQueryLoading={setQueryLoading}
                setVisualizationType={setVisualizationType}
                connectionId={connectionId}
                tableName={tableName}
              />
            </div>

            {/* Group By Section */}
            {isAggregateComplete && (
              <div className="mt-4">
                <h2 className="text-md font-semibold mb-2 flex items-center gap-2">
                  Group By
                </h2>
                {allColumns.length === 0 ? (
                  <Spinner />
                ) : (
                  <ToggleGroup
                    type="multiple"
                    value={groupByValue}
                    onValueChange={onGroupByChange}
                    className="flex flex-col gap-2"
                  >
                    {allColumns.map((column) => {
                      const colType =
                        columnTypes.find((col) => col.columnName === column)
                          ?.dataType || "";
                      const primaryKeysArray = Array.isArray(primaryKeys)
                        ? primaryKeys
                        : [primaryKeys];
                      const isPrimaryKey = primaryKeysArray.includes(column);
                      return (
                        <ToggleGroupItem
                          key={column}
                          value={column}
                          className="w-full border rounded-md shadow-sm flex items-center justify-start gap-2"
                        >
                          {getColumnIcon(colType, isPrimaryKey)}
                          <span className="text-sm">{column}</span>
                        </ToggleGroupItem>
                      );
                    })}
                  </ToggleGroup>
                )}
              </div>
            )}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </ScrollShadow>

      {/* Fixed Footer */}
      <div className="mt-auto">
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setSelectedValues([]);
            setGroupByValue([]);
            fetchDefaultQuery();
          }}
        >
          Clear Filters
        </Button>
        <Button
          size="sm"
          variant="default"
          color="primary"
          className="w-full"
          onClick={() =>
            fetchDbData({
              aggregate: selectedAggregate,
              column: selectedValues.join(","),
              groupBy: groupByValue.join(","),
              dateBy: selectedDateBy || "",
            })
          }
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
