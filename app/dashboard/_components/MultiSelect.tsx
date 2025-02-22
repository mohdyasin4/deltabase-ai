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
  setVisualizationType: (type: string) => void;
  setRows: (rows: string[]) => void;
  setColumns: (columns: string[]) => void;
  columns: string[];
  rows: string[];
  setQueryLoading: (val: boolean) => void;
  connectionId: string;
  setSqlQuery: (query: string) => void;
  tableName: string;
}

type Option = {
  value: string;
  label: string;
};

const aggregateOptions: Option[] = [
  { value: "count", label: "Count of ..." },
  { value: "sum", label: "Sum of ..." },
  { value: "avg", label: "Average of ..." },
  { value: "min", label: "Minimum of ..." },
  { value: "max", label: "Maximum of ..." },
];

const MultiSelectSelect = ({
  setVisualizationType,
  setRows,
  setColumns,
  setQueryLoading,
  columns,
  rows,
  connectionId,
  setSqlQuery,
  tableName,
}: MultiSelectSelectProps) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [currentOptions, setCurrentOptions] =
    useState<Option[]>(aggregateOptions);
  const [columnMetadata, setColumnMetadata] = useState<
    { name: string; type: string }[]
  >([]);
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

  const fetchDbData = async (aggregate: string, column?: string) => {
    try {
      setQueryLoading(true);
      const params = new URLSearchParams();
      params.append("aggregate", aggregate);
      if (column) params.append("column", column);

      const response = await fetch(
        `/api/database/${connectionId}/tables/${tableName}?${params.toString()}`,
        { method: "GET" }
      );
      if (!response.ok) throw new Error("Failed to fetch data");
      const data = await response.json();
      setRows(data.rows);
      setColumns(data.columns);
      setSqlQuery(data.query);
      setQueryLoading(false);
      if (data.rows.length === 1) {
        setVisualizationType("number");
      } else {
        setVisualizationType("table");
      }
    } catch (error) {
      console.error("Error fetching database details:", error);
      setQueryLoading(false);
    }
  };

  const fetchDefaultQuery = async () => {
    try {
      setQueryLoading(true);
      const response = await fetch(
        `/api/database/${connectionId}/tables/${tableName}`,
        { method: "GET" }
      );
      if (!response.ok) throw new Error("Failed to fetch default query");
      const data = await response.json();

      setRows(data.rows);
      setColumns(data.columns);
      setColumnMetadata(data.columnMetadata || []);
      setSqlQuery(data.query);
      setQueryLoading(false);
    } catch (error) {
      console.error("Error fetching default query:", error);
      setQueryLoading(false);
    }
  };

  const handleSelect = (currentValue: string) => {
    if (step === 1) {
      setSelectedValues([currentValue]);

      if (currentValue === "count") {
        setCurrentOptions([
          { value: "", label: "All rows", icon: <Table2 size={16} /> },
          ...columns.map((col) => ({
            value: col,
            label: col,
            icon: <BarChart2 size={16} />,
          })),
        ]);
      } else {
        setCurrentOptions(getNumericColumns());
      }

      setStep(2);
    } else {
      const aggregate = selectedValues[0];
      const column = currentValue === "*" ? "*" : currentValue;
      setSelectedValues((prev) => [...prev, currentValue]);
      setOpen(false);
      setStep(1);
      setCurrentOptions(aggregateOptions);
      fetchDbData(aggregate, column);
    }
  };

  const handleClearSelection = () => {
    setSelectedValues([]);
    setStep(1);
    setCurrentOptions(aggregateOptions);
    fetchDefaultQuery();
    setVisualizationType("table");
  };

  useEffect(() => {
    fetchDefaultQuery();
  }, [connectionId, tableName]);

  return (
    <div className="w-64">
      {selectedValues.length === 2 ? (
        <div className="flex items-center">
          <Button
            value={"default"}
            size={"sm"}
            onClick={handleClearSelection}
            className="hover:bg-yellow-300 gap-2 flex items-center"
          >
            {selectedValues[0].toUpperCase()}
            <ChevronRight size={"16"} />
            {selectedValues[1].toUpperCase()}
            <XIcon size={"18"} />
          </Button>
        </div>
      ) : (
        <Popover
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              setStep(1);
              setSelectedValues([]);
              setCurrentOptions(aggregateOptions);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="default"
              role="combobox"
              size="sm"
              aria-expanded={open}
              className="w-[180px] h-10 justify-between"
            >
              {"Select an option..."}
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
                  {step == 2 ? "Select Column" : "Aggregate Functions"}
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
