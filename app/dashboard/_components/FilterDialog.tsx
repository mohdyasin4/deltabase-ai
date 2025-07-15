"use client";

import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  useDisclosure,
  ModalContent,
  Select,
  SelectItem,
  Chip,
} from "@heroui/react";
import { Button } from "@/components/ui/button";
import { FilterIcon, Plus, Trash } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import supabaseClient from "@/lib/supabaseClient";

export interface FilterRow {
  id: number;
  column: string;
  type?: string;
  operation: string;
  value: string;
  operator?: string; // AND / OR
  valueOptions?: string[]; // Store unique values for the selected column
}

interface FilterDialogProps {
  setQueryLoading: (loading: boolean) => void;
  setColumns: (columns: string[]) => void;
  setRows: (rows: any[]) => void;
  setSqlQuery: (query: string) => void;
  onFilterChange: (filter: string) => void;
  setFilters: (filter: FilterRow[]) => void;
  datasetId: string;
  filters: FilterRow[];
  sqlQuery: string;
  columns: string[];
  rows: any[]; // Array of objects containing column-value pairs
  connectionId: string;
  type: string;
  tableName: string;
  applyFilters?: (newFilters?: FilterRow[]) => Promise<void>;
  children: React.ReactNode;
  isOpen: boolean;
  onOpen: () => void;
  onOpenChange: (open: boolean) => void;
}

export const operations = [
  { label: "Equal", value: "=" },
  { label: "Not Equal", value: "!=" },
  { label: "Greater Than", value: ">" },
  { label: "Less Than", value: "<" },
  { label: "Greater Than or Equal", value: ">=" },
  { label: "Less Than or Equal", value: "<=" },
  { label: "Contains", value: "LIKE" },
  { label: "Does Not Contain", value: "NOT LIKE" },
  { label: "Starts With", value: "LIKE" },
  { label: "Ends With", value: "LIKE" },
];

// Wrap the component with forwardRef
const FilterDialog = forwardRef<any, FilterDialogProps>(
  (
    {
      setQueryLoading,
      setColumns,
      setRows,
      setSqlQuery,
      onFilterChange,
      setFilters,
      datasetId,
      filters,
      sqlQuery,
      columns,
      rows,
      connectionId,
      tableName,
      type,
      applyFilters,
      children,
      isOpen,
      onOpen,
      onOpenChange,
    },
    ref
  ) => {
    const [value, setValue] = useState("");
    const [originalQuery, setOriginalQuery] = useState("");
    // Use the tableName prop as the default effective table name
    const [effectiveTableName, setEffectiveTableName] = useState(tableName);

     // Ensure there's always at least one filter row (for new filters)
  useEffect(() => {
    if (filters.length === 0) {
      // Create a default filter row without an operator
      setFilters([{ id: Date.now(), column: "", operation: "", value: "", valueOptions: [] }]);
    }
  }, []);

    const addFilter = (operator: string) => {
      const newFilter: FilterRow = {
        id: Date.now(), // Unique id based on timestamp
        column: "",
        operation: "",
        value: "",
        operator,
        valueOptions: [],
      };
      setFilters([...filters, newFilter]);
      setValue(""); // Reset value
    };

    const removeFilter = (id: number) => {
      setFilters((prev: FilterRow[]) =>
        prev.filter((filter) => filter.id !== id)
      );
    };

    const generateSQLQuery = () => {
      if (filters.length === 0) return `SELECT * FROM ${effectiveTableName}`;

      const whereClauses = filters.map((filter, index) => {
        const condition = `${filter.column} ${filter.operation} '${filter.value}'`;
        return index > 0 ? `${filter.operator} ${condition}` : condition;
      });

      return `SELECT * FROM ${effectiveTableName} WHERE ${whereClauses.join(
        " "
      )}`;
    };

    const handleColumnChange = (index: number, column: string) => {
      const updatedFilters = [...filters];
      updatedFilters[index].column = column;

      // Extract unique values for the selected column and convert numbers to strings
      const uniqueValues = Array.from(
        new Set(
          rows.map((row) => {
            const val = row[column];
            return typeof val === "number" ? String(val) : val;
          })
        )
      );

      updatedFilters[index].valueOptions = uniqueValues;
      updatedFilters[index].value = ""; // Reset value when column changes
      setFilters(updatedFilters);
    };

    // Fetch the dataset's table name if type is "dataset".
    // Otherwise, effectiveTableName remains the tableName prop.
    const fetchDatasetTableName = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("datasets")
          .select("table_name")
          .eq("id", datasetId)
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error("Error fetching dataset table name:", error);
      }
    };

    useEffect(() => {
      if (type === "dataset") {
        fetchDatasetTableName().then((data) => {
          // If a valid table name is returned, update effectiveTableName.
          if (data?.table_name) {
            setEffectiveTableName(data.table_name);
          }
        });
      }
    }, [datasetId, type]);

    const clearFilters = async () => {
      setQueryLoading(true);
      try {
        console.log(
          "Connection_Id:",
          connectionId,
          "Effective Table_Name:",
          effectiveTableName
        );

        // Encode the original query if needed
        const encodedQuery = encodeURIComponent(originalQuery);
        const response = await fetch(
          `/api/database/${connectionId}/tables/${effectiveTableName}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        // Update state with the table data returned from the API
        setRows(data.rows);
        setSqlQuery(data.query);
        setColumns(data.columns);
        setFilters([
          { id: 1, column: "", operation: "", value: "", valueOptions: [] },
        ]);
        if (isOpen === true) {
          onOpenChange();
        }
        toast.success("Filters Cleared");
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to execute query");
      } finally {
        setQueryLoading(false);
      }
    };

    const appliedFiltersCount = filters.filter(
      (filter) => filter.column && filter.operation && filter.value
    ).length;

    // Expose applyFilters to the parent via the ref
    useImperativeHandle(ref, () => ({
      applyFilters,
    }));

    return (
      <>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="secondary"
            className="h-8 w-auto p-2 gap-2"
            onClick={onOpen}
          >
            <FilterIcon height={20} width={20} />
            Filter
            {appliedFiltersCount > 0 && (
              <Chip
                size="sm"
                radius="sm"
                color="warning"
                variant="flat"
                className="text-md"
                onClose={clearFilters}
              >
                {appliedFiltersCount}
              </Chip>
            )}
          </Button>
        </motion.div>
        <AnimatePresence>
          <Modal
            backdrop="blur"
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            className="max-w-4xl w-full min-h-[20vh] max-h-[60vh] flex flex-col"
          >
            <ModalContent className="flex flex-col min-h-[20vh] max-h-[60vh] overflow-hidden">
              {(onClose) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <ModalHeader className="flex flex-col items-start space-y-2">
                    <h2 className="text-xl font-bold">Smart Filter</h2>
                    <p className="text-sm text-gray-500">
                      Add and configure your filters.
                    </p>
                  </ModalHeader>
                  <ModalBody className="overflow-auto flex-1">
                    <ScrollArea className="w-full h-72 p-2">
                      <AnimatePresence>
                        {filters.map((filter, index) => (
                          <motion.div
                            key={filter.id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="space-y-4"
                          >
                            {index > 0 && (
                              <Select
                                selectedKeys={
                                  filter.operator ? [filter.operator] : []
                                }
                                label="Operator"
                                fullWidth
                                labelPlacement="inside"
                                onChange={(value) => {
                                  const updatedFilters = [...filters];
                                  updatedFilters[index].operator =
                                    value.target.value;
                                  setFilters(updatedFilters);
                                }}
                              >
                                <SelectItem key="AND" value="AND">
                                  AND
                                </SelectItem>
                                <SelectItem key="OR" value="OR">
                                  OR
                                </SelectItem>
                              </Select>
                            )}
                            <div
                              className={`grid grid-cols-1 gap-2 items-center pb-2 ${
                                index > 0 ? "md:grid-cols-10" : "md:grid-cols-9"
                              }`}
                            >
                              <Select
                                placeholder="Select Field"
                                label="Field"
                                labelPlacement="inside"
                                selectedKeys={
                                  filter.column ? [filter.column] : []
                                }
                                onChange={(value) =>
                                  handleColumnChange(index, value.target.value)
                                }
                                className="w-full col-span-3"
                              >
                                {columns.map((col) => (
                                  <SelectItem key={col} value={col}>
                                    {col}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Select
                                placeholder="Select Operation"
                                label="Operation"
                                labelPlacement="inside"
                                selectedKeys={
                                  filter.operation ? [filter.operation] : []
                                }
                                onChange={(value) => {
                                  const updatedFilters = [...filters];
                                  updatedFilters[index].operation =
                                    value.target.value;
                                  setFilters(updatedFilters);
                                }}
                                className="w-full col-span-3"
                              >
                                {operations.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </Select>
                              <Select
                                placeholder="Select Value"
                                label="Value"
                                labelPlacement="inside"
                                selectedKeys={
                                  filter.value ? [filter.value] : []
                                }
                                onChange={(value) => {
                                  const updatedFilters = [...filters];
                                  updatedFilters[index].value =
                                    value.target.value;
                                  setFilters(updatedFilters);
                                }}
                                className="w-full col-span-3"
                                isDisabled={!filter.valueOptions?.length}
                              >
                                {(filter.valueOptions || []).map((val) => (
                                  <SelectItem key={val} value={val}>
                                    {val}
                                  </SelectItem>
                                ))}
                              </Select>
                              <div className="w-[40px] flex justify-center">
                                {index > 0 && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="text-red-500"
                                    onClick={() => removeFilter(filter.id)}
                                  >
                                    <Trash size={18} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <div>
                        <Select
                          startContent={<Plus size={18} color="#ffcc19" />}
                          placeholder="Add Operator"
                          labelPlacement="inside"
                          className="outline-dashed border-dashed border-[#ffcc19] outline-[#ffcc19]/25 hover:outline-[#ffcc19] hover:outline-2 transition-all duration-300 ease-in-out text-[#ffcc19] font-semibold rounded-md"
                          fullWidth
                          color="warning"
                          variant="flat"
                          value={value}
                          selectedKeys={[]}
                          onChange={(event) => addFilter(event.target.value)}
                        >
                          <SelectItem key="AND" value="AND">
                            AND
                          </SelectItem>
                          <SelectItem key="OR" value="OR">
                            OR
                          </SelectItem>
                        </Select>
                      </div>
                      <ScrollBar />
                    </ScrollArea>
                  </ModalBody>
                  <ModalFooter className="flex justify-end space-x-2 mt-6">
                    <Button variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button variant="outline" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                    <Button
                      variant="default"
                      onClick={async () => {
                        setQueryLoading(true);
                        if (applyFilters) {
                          await applyFilters();
                        }
                        setQueryLoading(false);
                      }}
                    >
                      Apply Filter
                    </Button>
                  </ModalFooter>
                </motion.div>
              )}
            </ModalContent>
          </Modal>
        </AnimatePresence>
      </>
    );
  }
);

export default FilterDialog;
