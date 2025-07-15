"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Papa from "papaparse";
import { cn } from "@/lib/utils";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "@heroui/react";
import { FileUploader } from "./file-uploader";
import { useParseCsv } from "@/hooks/use-parse-csv";
import { useUser } from "@clerk/nextjs";
import { useUploadFile } from "@/hooks/use-upload-file";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { supabaseClient } from "@/lib/supabaseClient";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

// Use Shadcn's Select components
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface CsvImporterProps extends React.ComponentPropsWithoutRef<typeof DialogTrigger> {
  onImport: (data: Record<string, unknown>[]) => void;
  onClose: () => void;
  className?: string;
}

interface CsvMappingDialogProps {
  csvFields: string[];
  csvData: any[];
  selectedColumns: string[];
  fieldMappings: Record<string, string>;
  connectionName: string;
  onColumnSelection: (field: string) => void;
  onFieldChange: (oldField: string, newField: string) => void;
  onConnectionNameChange: (name: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBack: () => void;
  onNext: () => void;
  className?: string;
}

function CsvMappingDialog({
  csvFields,
  csvData,
  selectedColumns,
  fieldMappings,
  connectionName,
  onColumnSelection,
  onFieldChange,
  onConnectionNameChange,
  onSelectAll,
  onDeselectAll,
  onBack,
  onNext,
  className,
}: CsvMappingDialogProps) {
  return (
    <DialogContent className="overflow-hidden p-8 sm:max-w-6xl" showOverlay={false}>
      <DialogHeader>
        <DialogTitle>Select Fields</DialogTitle>
        <DialogDescription>
          Select the fields you want to import from the CSV file.
        </DialogDescription>
      </DialogHeader>
      <div className="mb-4">
        <Label htmlFor="connection_name" className="block text-sm font-medium">
          Connection Name
        </Label>
        <Input
          type="text"
          id="connection_name"
          value={connectionName}
          required
          onChange={(e) => onConnectionNameChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div className="grid h-[26.25rem] w-full overflow-hidden rounded-md border">
        <ScrollArea>
          <Table>
            <TableHeader>
              <TableRow>
                {csvFields.map((field) => (
                  <TableHead
                    key={field}
                    className={cn("bg-gray-300/5 items-center gap-2 whitespace-nowrap py-2 border-r px-2", className)}
                  >
                    <div className="flex items-center gap-2 pl-2">
                      <Checkbox
                        isSelected={selectedColumns.includes(field)}
                        onChange={() => onColumnSelection(field)}
                      />
                      <div className="flex items-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-48 justify-between">
                              {fieldMappings[field] || field}
                              <span className="opacity-50">▾</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Search field..." />
                              <CommandEmpty>No field found.</CommandEmpty>
                              <CommandList>
                                <CommandGroup>
                                  {csvFields.map((fm) => (
                                    <CommandItem key={fm} value={fm} onSelect={() => onFieldChange(field, fm)}>
                                      <span className="line-clamp-1">{fm}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {csvData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {csvFields.map((field) => {
                    const value = row[fieldMappings[field] || field];
                    return (
                      <TableCell key={field} className="border-r px-2">
                        {value === null || value === undefined ? (
                          <span className="text-gray-500 italic">NULL</span>
                        ) : typeof value === "string" && value.startsWith("_") ? (
                          <span className="text-gray-500 italic">NULL</span>
                        ) : (
                          value
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      <DialogFooter className="flex items-center lg:justify-between w-full gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onSelectAll}>
            Select All
          </Button>
          <Button variant="outline" onClick={onDeselectAll}>
            Deselect All
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            onClick={onNext}
            disabled={selectedColumns.length === 0 || connectionName === ""}
          >
            Next: Database
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

interface CsvDatabaseDialogProps {
  databaseConnections: any[];
  selectedDatabaseId: string;
  tableName: string;
  onDatabaseSelect: (id: string) => void;
  onTableNameChange: (name: string) => void;
  onBack: () => void;
  onUpload: () => void;
  className?: string;
}

function CsvDatabaseDialog({
  databaseConnections,
  selectedDatabaseId,
  tableName,
  onDatabaseSelect,
  onTableNameChange,
  onBack,
  onUpload,
  className,
}: CsvDatabaseDialogProps) {
  console.log("Database Connections:", databaseConnections);
  return (
    <DialogContent className="overflow-hidden p-8 sm:max-w-2xl" showOverlay={false}>
      <DialogHeader>
        <DialogTitle>Select Database & Table</DialogTitle>
        <DialogDescription>
          Choose which database to upload the CSV data as a table and specify the table name.
        </DialogDescription>
      </DialogHeader>
      <div className="mb-4">
        <Label htmlFor="database_connection" className="block text-sm font-medium">
          Database Connection
        </Label>
        <Select value={selectedDatabaseId} onValueChange={onDatabaseSelect}>
          <SelectTrigger className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            <SelectValue placeholder="Select Database Connection..." />
          </SelectTrigger>
          <SelectContent>
            {databaseConnections.map((connection) => (
              <SelectItem key={connection.id} value={connection.id}>
                {connection.connection_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mb-4">
        <Label htmlFor="table_name" className="block text-sm font-medium">
          Table Name
        </Label>
        <Input
          type="text"
          id="table_name"
          value={tableName}
          onChange={(e) => onTableNameChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <DialogFooter className="flex items-center justify-end gap-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onUpload} disabled={!selectedDatabaseId || tableName === ""}>
          Upload CSV
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function CsvImporter({ onImport, onClose, className, ...props }: CsvImporterProps) {
  const [open, setOpen] = useState(true);
  // Three steps: "upload", "map", and "database"
  const [step, setStep] = useState<"upload" | "map" | "database">("upload");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvFields, setCsvFields] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [connectionName, setConnectionName] = useState<string>("");

  // New state for database upload
  const [databaseConnections, setDatabaseConnections] = useState<any[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>("");
  const [tableName, setTableName] = useState<string>("");

  const { data: parsedData, error, onParse, onFieldChange, onFieldsReset } = useParseCsv({
    fields: [],
    onSuccess: (results) => {
      const fields = Object.keys(results[0]);
      setCsvData(results);
      setCsvFields(fields);
      setStep("map");
    },
    onError: (message) => {
      console.error("Error parsing CSV:", message);
    },
  });
  const authUserId = useUser().user?.id;
  const bucketName = `user-${authUserId}`;

  const { onUpload, uploadedFiles, isUploading } = useUploadFile(bucketName);
  const uploadedFile = uploadedFiles[0];

  // Fetch available database connections from Supabase
  useEffect(() => {
    async function fetchDatabaseConnections() {
      if (!authUserId) return;
      const { data, error } = await supabaseClient
        .from("database_connections")
        .select("*")
        .eq("user_id", authUserId);
      if (error) {
        console.error("Error fetching database connections:", error.message);
      } else {
        setDatabaseConnections(data || []);
      }
    }
    fetchDatabaseConnections();
  }, [authUserId]);

  // Set up initial field mappings whenever csvFields change
  useEffect(() => {
    const initialMappings: Record<string, string> = {};
    csvFields.forEach((field, index) => {
      initialMappings[field] = csvFields[index] || csvFields[0];
    });
    setFieldMappings(initialMappings);
  }, [csvFields]);

  const handleFieldChange = (oldField: string, newField: string) => {
    setFieldMappings((prev) => ({ ...prev, [oldField]: newField }));
  };

  const handleColumnSelection = (field: string) => {
    setSelectedColumns((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]));
  };

  // Function to upload CSV data into the selected external database.
  // This function calls an API route that uses your databaseUtils functions.
  const uploadCsvToDatabase = async () => {
    try {
      const payload = {
        connectionId: selectedDatabaseId,
        tableName,
        data: csvData.map((row) => {
          const formattedRow: Record<string, string | number> = {};
          selectedColumns.forEach((column) => {
            const mappedField = fieldMappings[column];
            formattedRow[mappedField] = row[column];
          });
          return formattedRow;
        }),
      };
      const res = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Failed to upload CSV data");
      }
      // Optionally call onImport if needed
      onImport(payload.data);
    } catch (error: any) {
      console.error("Error uploading CSV data:", error.message);
    }
  };

  // Transition handlers for the steps
  const handleMappingNext = () => setStep("database");
  const handleDatabaseBack = () => setStep("map");

  // Reset states and close dialog after finishing
  const handleFinish = async () => {
    await uploadCsvToDatabase();
    setOpen(false);
    setStep("upload");
    setCsvData([]);
    setCsvFields([]);
    setSelectedColumns([]);
    setFieldMappings({});
    setConnectionName("");
    setSelectedDatabaseId("");
    setTableName("");
  };

  if (!open) {
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {step === "upload" ? (
        <FileUploader
          accept={{ "text/csv": [] }}
          multiple={false}
          maxSize={4 * 1024 * 1024}
          maxFileCount={1}
          onUpload={async (files) => {
            const file = files[0];
            if (!file) return;
            await onUpload(files);
            onParse({ file, limit: 1001 });
          }}
          disabled={isUploading}
        />
      ) : step === "map" ? (
        <CsvMappingDialog
          csvFields={csvFields}
          csvData={csvData}
          selectedColumns={selectedColumns}
          fieldMappings={fieldMappings}
          connectionName={connectionName}
          onColumnSelection={handleColumnSelection}
          onFieldChange={handleFieldChange}
          onConnectionNameChange={setConnectionName}
          onSelectAll={() => setSelectedColumns([...csvFields])}
          onDeselectAll={() => setSelectedColumns([])}
          onBack={() => setStep("upload")}
          onNext={handleMappingNext}
          className={className}
        />
      ) : (
        <CsvDatabaseDialog
          databaseConnections={databaseConnections}
          selectedDatabaseId={selectedDatabaseId}
          tableName={tableName}
          onDatabaseSelect={setSelectedDatabaseId}
          onTableNameChange={setTableName}
          onBack={handleDatabaseBack}
          onUpload={handleFinish}
          className={className}
        />
      )}
    </Dialog>
  );
}
