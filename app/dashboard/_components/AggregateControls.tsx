import React from 'react';
import { Select, SelectItem, Button } from "@heroui/react";

interface AggregateControlsProps {
  columns: string[];
  onApplyAggregate: (func: string, column: string) => void;
}

export function AggregateControls({ columns, onApplyAggregate }: AggregateControlsProps) {
  const [selectedFunction, setSelectedFunction] = React.useState<string>("");
  const [selectedColumn, setSelectedColumn] = React.useState<string>("");

  const aggregateFunctions = [
    { label: "Count", value: "COUNT" },
    { label: "Sum", value: "SUM" },
    { label: "Average", value: "AVG" },
    { label: "Maximum", value: "MAX" },
    { label: "Minimum", value: "MIN" }
  ];

  const handleApply = () => {
    if (selectedFunction && selectedColumn) {
      onApplyAggregate(selectedFunction, selectedColumn);
    }
  };

  return (
    <div className="flex gap-4 items-end w-full">
      <div className="flex-1">
        <Select
          label="Aggregate Function"
          placeholder="Select function"
          selectedKeys={selectedFunction ? [selectedFunction] : []}
          onChange={(e) => setSelectedFunction(e.target.value)}
        >
          {aggregateFunctions.map((func) => (
            <SelectItem key={func.value} value={func.value}>
              {func.label}
            </SelectItem>
          ))}
        </Select>
      </div>
      <div className="flex-1">
        <Select
          label="Column"
          placeholder="Select column"
          selectedKeys={selectedColumn ? [selectedColumn] : []}
          onChange={(e) => setSelectedColumn(e.target.value)}
        >
          {columns.map((col) => (
            <SelectItem key={col} value={col}>
              {col}
            </SelectItem>
          ))}
        </Select>
      </div>
      <Button 
        color="primary"
        onClick={handleApply}
        isDisabled={!selectedFunction || !selectedColumn}
      >
        Apply
      </Button>
    </div>
  );
} 