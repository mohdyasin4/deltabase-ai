"use client";

import React, { useState, useEffect } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  XIcon,
  BarChart2,
  PieChart,
  LineChart,
  Table2,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MultiSelectSelectProps {
  columns: string[];
  rows: string[];
  allColumns: string[];
  connectionId: string;
  tableName: string;
  allColumsn: string[];
  columnMetadata: any[];
  selectedAggregate: string | null;
  selectedValues: string[];
  aggregateOptions: any[];
  currentOptions: any[];
  groupByValue: any[];
  isSelectedMap: { [key: string]: boolean };
  setSelectedAggregate: (val: string | null) => void;
  setSelectedValues: (val: string[]) => void;
  setCurrentOptions: (val: any[]) => void;
  setAllColumns: (columns: string[]) => void;
  setSelectedGroupBy: (val: string | []) => void;
  setIsSelectedMap: (val: { [key: string]: boolean }) => void;
  setSqlQuery: (query: string) => void;
  fetchDefaultQuery: () => void;
  setColumnType: (column: string, type: string) => void;
  setVisualizationType: (type: string) => void;
  setRows: (rows: string[]) => void;
  setColumns: (columns: string[]) => void;
  setGroupByValue: (val: any[]) => void;
  setQueryLoading: (val: boolean) => void;
  setPrimaryKeys: (keys: string) => void;
  fetchDbData: ({aggregate, column}: {aggregate: string, column?: string}) => void;
}

const MultiSelectSelect = ({
  setRows,
  setColumns,
  setQueryLoading,
  allColumns,
  setAllColumns,
  setColumnType,
  connectionId,
  tableName,
  setSqlQuery,
  setPrimaryKeys,
  selectedAggregate,
  selectedValues,
  aggregateOptions,
  currentOptions,
  setSelectedGroupBy,
  setIsSelectedMap,
  groupByValue,
  setGroupByValue,
  isSelectedMap,
  setSelectedAggregate,
  setSelectedValues,
  setCurrentOptions,
  setVisualizationType,
  columns,
  columnMetadata,
  rows,
  fetchDefaultQuery,
  fetchDbData,
}: MultiSelectSelectProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  const getNumericColumns = () => {
    if (columnMetadata.length > 0) {
      return columnMetadata
        .filter((col) =>
          ["integer", "float", "double", "decimal", "numeric"].includes(
            col.type.toLowerCase()
          )
        )
        .map((col) => ({
          value: col.name,
          label: col.name,
          icon: <BarChart2 size={16} />,
        }));
    } else {
      return columns
        .filter((col) => rows.every((row) => !isNaN(Number(row[col]))))
        .map((col) => ({
          value: col,
          label: col,
          icon: <BarChart2 size={16} />,
        }));
    }
  };

  const handleSelect = (currentValue: string) => {
    console.log("Step:", step, "Selected:", currentValue);

    if (step === 1) {
      setSelectedValues([]); // Clear previous selections
      if (currentValue === "count") {
        setSelectedAggregate("count");
        setOpen(false);
        setStep(1);
        setCurrentOptions(aggregateOptions);
        fetchDbData({aggregate:"count"}); // Fetch count directly
      } else {
        setSelectedAggregate(currentValue);
        setCurrentOptions(getNumericColumns());
        setStep(2);
      }
    } else if (step === 2) {
      if (!selectedAggregate) return; // Prevent errors if no aggregate function is set

      console.log("Selected column:", currentValue);
      setSelectedValues([currentValue]); // Ensure array format

      setOpen(false);
      setStep(1);
      setCurrentOptions(aggregateOptions);
      fetchDbData({aggregate: selectedAggregate, column: currentValue}); // Fetch data with correct values
    }
  };

  const handleClearSelection = () => {
    setSelectedAggregate(null);
    setSelectedValues([]); // Clear selected values to ensure isAggregateComplete becomes false
    setStep(1);
    setCurrentOptions(aggregateOptions);
    setGroupByValue([]);
    fetchDefaultQuery();
    setVisualizationType("table");
  };  

  return (
    <div className="w-64">
      {selectedAggregate && step === 1 ? (
        <div className="flex items-center">
          <Button
            size="sm"
            onClick={handleClearSelection}
            className="hover:bg-yellow-300 gap-2 flex items-center"
          >
            {selectedAggregate === "count" 
              ? selectedAggregate.toUpperCase()
              : `${selectedAggregate.toUpperCase()} (${
                  selectedValues[0] || "?"
                })`}
            <XIcon size={18} />
          </Button>
        </div>
      ) : (
        <Popover
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              // If popover closes, reset to step 1 and clear temporary selection (but not the stored aggregate)
              setStep(1);
              setSelectedValues([]);
              setCurrentOptions(aggregateOptions);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="dashed"
              role="combobox"
              size="sm"
              aria-expanded={open}
              className="w-[180px] h-10 justify-between"
              onClick={() => setOpen(true)}
            >
              {selectedAggregate
                ? `Aggregate: ${selectedAggregate.toUpperCase()}`
                : "Add a function..."}
              <span
                className={`transition-transform duration-200 ${
                  open ? "-rotate-180" : "rotate-0"
                }`}
              >
                <ChevronDown size={16} />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[300px] mt-1 p-0 shadow-sm"
            align="start"
          >
            <Command>
              <CommandGroup>
                <div className="w-full flex items-center gap-2 text-sm font-semibold p-2">
                  <Table2 color="#ffcc19" height={16} width={16} />
                  {step === 2 ? "Select Column" : "Aggregate Functions"}
                </div>
              </CommandGroup>
              <div className="border-t border-b border-accent">
                <CommandInput placeholder="Search..." className="w-full p-2" />
              </div>
              <CommandList>
                <ScrollArea className="w-full h-48 p-0 overflow-auto">
                  <CommandEmpty>No option found.</CommandEmpty>
                  <CommandGroup>
                    {currentOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => handleSelect(option.value)}
                        className="flex items-center p-2 cursor-pointer"
                      >
                        <span className="ml-2">{option.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ScrollArea>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default MultiSelectSelect;
