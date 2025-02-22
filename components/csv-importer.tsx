"use client";

import * as React from "react";
import { ArrowLeftIcon, CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
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
import { useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { create } from "domain";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface CsvImporterProps
  extends React.ComponentPropsWithoutRef<typeof DialogTrigger> {
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
  onImport: () => void;
  className?: string;
}

export function CsvMappingDialog({
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
  onImport,
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
                    className={cn(
                      "bg-gray-300/5 items-center gap-2 whitespace-nowrap py-2 border-r px-2",
                      className
                    )}
                  >
                    <div className="flex items-center gap-2 pl-2">
                      <Checkbox
                        isSelected={selectedColumns.includes(field)}
                        onChange={() => onColumnSelection(field)}
                      />
                      <div className="flex items-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-48 justify-between"
                            >
                              {fieldMappings[field] || field}
                              <CaretSortIcon className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 ">
                            <Command>
                              <CommandInput placeholder="Search field..." />
                              <CommandEmpty>No field found.</CommandEmpty>
                              <CommandList>
                                <CommandGroup>
                                  {csvFields.map((fm) => (
                                    <CommandItem
                                      key={fm}
                                      value={fm}
                                      onSelect={() => onFieldChange(field, fm)}
                                    >
                                      <CheckIcon
                                        className={cn(
                                          "mr-2 size-4",
                                          fieldMappings[field] === fm
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
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
            onClick={onImport}
            disabled={selectedColumns.length === 0 || connectionName === ""}
          >
            Import Selected Fields
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}

export function CsvImporter({
  onImport,
  onClose,
  className,
  ...props
}: CsvImporterProps) {
  const [open, setOpen] = React.useState(true);
  const [step, setStep] = React.useState<"upload" | "map">("upload");
  const [csvData, setCsvData] = React.useState<any[]>([]);
  const [csvFields, setCsvFields] = React.useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = React.useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = React.useState<
    Record<string, string>
  >({});
  const [connectionName, setConnectionName] = React.useState<string>("");

  const {
    data: parsedData,
    error,
    onParse,
    onFieldChange,
    onFieldsReset,
  } = useParseCsv({
    fields: [],
    onSuccess: (results) => {
      // Automatically move to the "map" step after successful parsing
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

  const uploadedFile = uploadedFiles[0]; // Assuming only one file is uploaded

  useEffect(() => {
    const initialMappings: Record<string, string> = {};
    csvFields.forEach((field, index) => {
      // Map each field to a corresponding CSV field by default (or index-based)
      initialMappings[field] = csvFields[index] || csvFields[0];
    });
    setFieldMappings(initialMappings);
  }, [csvFields]);

  const handleFieldChange = (oldField: string, newField: string) => {
    setFieldMappings((prev) => {
      const newMappings = { ...prev };
      newMappings[oldField] = newField;
      return newMappings;
    });
  };

  const handleColumnSelection = (field: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(field)) {
        return prev.filter((f) => f !== field);
      }
      return [...prev, field];
    });
  };

  // Import CSV data with metadata
  const handleImport = async () => {
    if (!authUserId) {
      console.error("User ID not found");
      return;
    }

    try {
      // Save metadata in Supabase
      const { data: userStorageData, error: userStorageError } =
        await supabaseClient.from("users_storage").select("id").eq("user_id", authUserId);

      if (userStorageError || !userStorageData || userStorageData.length === 0) {
        console.error("Error fetching user storage:", userStorageError?.message );
        return;
      }

      const userStorageId = userStorageData[0]?.id;

      if (!userStorageId) {
        console.error("User storage ID is missing");
        return;
      }

      console.log("file path", uploadedFile.path);
      console.log("file name", uploadedFile.name);
      console.log("file url", uploadedFile.url);

      // Save file metadata
      const metadata = uploadedFiles.map((file) => ({
        user_id: authUserId,
        bucket_name: bucketName,
        file_name: file.name,
        selectedFields: selectedColumns,
        connection_name: connectionName,
        createdat: new Date(),
        updatedat: new Date(),
      }));

      const { error: metadataError } = await supabaseClient.from("csvData").insert(metadata);

      if (metadataError) {
        console.error("Error saving metadata:", metadataError.message);
        return;
      }

      // Prepare formatted CSV data for import
      const formattedData = csvData.map((row) => {
        const formattedRow: Record<string, string | number> = {};
        selectedColumns.forEach((column) => {
          const mappedField = fieldMappings[column];
          formattedRow[mappedField] = row[column];
        });
        return formattedRow;
      });

      console.log("Formatted Data:", formattedData);
      onImport(formattedData);
    } catch (error) {
      console.error("Unexpected error during import:", error);
    } finally {
      // Reset dialog and states
      setOpen(false);
      setStep("upload");
      setCsvData([]);
      setCsvFields([]);
      setSelectedColumns([]);
      setFieldMappings({});
      setConnectionName("");
    }
  };

  if (open === false) {
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
          /**
           * alternatively this can be used without uploading the file
           */
          // onValueChange={(files) => {
          //   const file = files[0]
          //   if (!file) return

          //   onParse({ file, limit: 1001 })

          //   setStep("map")
          // }}
          onUpload={async (files) => {
            const file = files[0];
            if (!file) return;
            await onUpload(files);
            onParse({ file, limit: 1001 });
          }}
          disabled={isUploading}
        />
      ) : (
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
          onImport={handleImport}
          className={className}
        />
      )}
    </Dialog>
  );
}
