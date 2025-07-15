import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getPaginationRowModel,
  ColumnSizingState,
  getSortedRowModel,
  useReactTable,
  Column,
} from "@tanstack/react-table";
import { ColumnResizer } from "./column-resizer";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DataTablePagination } from "@/app/dashboard/_components/data-table-pagination";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dropdown,
  DropdownMenu,
  DropdownItem,
  DropdownTrigger,
  Skeleton,
  RadioGroup,
  Radio,
  useDisclosure,
  Input,
} from "@heroui/react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Expand,
  EyeOff,
  Maximize2,
} from "lucide-react";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { generateColumns } from "@/utils/generateColumns";
import { cn } from "@/utils/cn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatHeader } from "../db-details/[id]/tables/[tableName]/columns";
import { getCellDropdownItems } from "@/utils/getCellDropdownItems";
import { getCellType } from "@/utils/getCellType";
import {
  FaEquals,
  FaGreaterThan,
  FaLessThan,
  FaNotEqual,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { FilterRow, operations } from "./FilterDialog";

interface DataTableProps<T> {
  rows: T[];
  searchTerm?: string;
  pagination?: boolean;
  filters: FilterRow[];
  primaryKeys: string;
  loading: boolean;
  setFilters: (filters: FilterRow[]) => void;
  setSearchTerm?: (value: string) => void;
  fetchDbData: (aggregate?: string, column?: string, limit?: string) => void;
  applyFilters: (newFilters?: FilterRow[]) => Promise<void>;
}

const renderIcon = (iconName: string) => {
  switch (iconName) {
    case "arrowUp":
      return <ArrowUp className="h-4 w-4 " />;
    case "arrowDown":
      return <ArrowDown className="h-4 w-4" />;
    case "eyeOff":
      return <EyeOff className="h-4 w-4" />;
    case "less-than":
      return <FaLessThan className="h-4 w-4" />;
    case "greater-than":
      return <FaGreaterThan className="h-4 w-4" />;
    case "equal-to":
      return <FaEquals className="h-4 w-4" />;
    case "not-equal":
      return <FaNotEqual className="h-4 w-4" />;
    case "maximize2":
      return <Maximize2 className="h-4 w-4" />;
    default:
      return null;
  }
};

const renderNestedValues = (obj: any, parentKey = ""): JSX.Element[] => {
  return Object.entries(obj).map(([key, value]) => {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      return (
        <React.Fragment key={fullKey}>
          <li className="font-bold">{formatHeader(fullKey)}</li>
          <ul className="pl-4">{renderNestedValues(value, fullKey)}</ul>
        </React.Fragment>
      );
    } else {
      return (
        <li key={fullKey} className="flex gap-6">
          {formatHeader(fullKey)} : {String(value)}
        </li>
      );
    }
  });
};

export const formatToDBDate = (dateString: string): string => {
  console.log("Raw dateString before parsing:", dateString);

  const normalizedDateString = dateString.replace(" at ", ", ");
  const date = new Date(Date.parse(normalizedDateString));

  if (isNaN(date.getTime())) {
    console.error("Invalid date format:", normalizedDateString);
    return "";
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const originalSeconds = date.getSeconds() || 30;
  const seconds = pad(originalSeconds);

  console.log("Formatted DB Date:", `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

export const DataTable = forwardRef<any, DataTableProps<any>>(
  (
    {
      rows,
      setFilters,
      primaryKeys,
      applyFilters,
      filters,
      loading,
      fetchDbData,
      searchTerm,
      setSearchTerm,
      pagination,
    },
    ref
  ) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [dialogRow, setDialogRow] = React.useState<any | null>(null);
    const [isOpen, setIsOpen] = React.useState(false);
    const [colSizing, setColSizing] = React.useState<ColumnSizingState>({});
    const [columnVisibility, setColumnVisibility] =
      React.useState<VisibilityState>({});
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const handleSortingChange = React.useCallback(setSorting, []);
    const handleColumnVisibilityChange = React.useCallback(
      setColumnVisibility,
      []
    );
    const handleColumnSizingChange = React.useCallback(setColSizing, []);

    const columns = React.useMemo(
      () => generateColumns(rows, setDialogRow, setIsDialogOpen, primaryKeys),
      [rows, primaryKeys]
    );

    const defaultColumn = React.useMemo(
      () => ({
        size: 250,
        minWidth: 50,
        maxWidth: 1200,
      }),
      []
    );

    const table = useReactTable({
      data: rows,
      columns,
      defaultColumn,
      enableColumnResizing: true,
      columnResizeMode: "onChange",
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      onSortingChange: handleSortingChange,
      onColumnVisibilityChange: handleColumnVisibilityChange,
      onColumnSizingChange: handleColumnSizingChange,
      state: {
        sorting,
        columnVisibility,
        columnSizing: colSizing,
      },
    });

    const tableRows = table.getRowModel().rows;

    const columnSizeVars = React.useMemo(() => {
      const headers = table.getFlatHeaders();
      const colSizes: { [key: string]: number } = {};
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i]!;
        colSizes[`--header-${header.id}-size`] = header.getSize();
        colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
      }
      return colSizes;
    }, [table.getState().columnSizingInfo, table.getState().columnSizing]);

    const convertToDBColumn = React.useCallback((header: string): string =>
      header.replace(/\s+/g, "_").toLowerCase(),
    []);

    const handleStringFilter = React.useCallback((
      cell: any,
      cellValue: any,
      opLabel: "Equal" | "Not Equal"
    ) => {
      const opObj = operations.find(
        (op) => op.label.toLowerCase() === opLabel.toLowerCase()
      );
      const opValue = opObj ? opObj.value : opLabel;
      const dbColumnName = convertToDBColumn(
        cell.column.columnDef.header as string
      );

      setFilters((prev: FilterRow[]) => {
        const newFilters = [
          ...prev.filter((filter) => filter.column !== dbColumnName),
          {
            type: "string",
            value: String(cellValue),
            id: Date.now(),
            column: dbColumnName,
            operation: opValue,
          },
        ];
        applyFilters(newFilters);
        return newFilters;
      });
    }, [applyFilters, convertToDBColumn, setFilters]);

    const handleDateFilter = React.useCallback((
      cell: any,
      cellValue: any,
      operation: "before" | "after" | "on" | "not-on"
    ) => {
      const dbColumnName = convertToDBColumn(cell.column.columnDef.header as string);

      const sqlOperation =
        operation === "on"
          ? "="
          : operation === "not-on"
          ? "!="
          : operation === "before"
          ? "<"
          : operation === "after"
          ? ">"
          : "=";

      const rawValue =
        cell.row.original._rawData && cell.row.original._rawData[cell.column.id]
          ? cell.row.original._rawData[cell.column.id]
          : cellValue;

      const formattedDate = formatToDBDate(rawValue);

      setFilters((prev: FilterRow[]) => {
        const newFilters = [
          ...prev.filter((filter) => filter.column !== dbColumnName),
          {
            type: operation,
            value: formattedDate,
            id: Date.now(),
            column: dbColumnName,
            operation: sqlOperation,
          },
        ];
        applyFilters(newFilters);
        return newFilters;
      });
    }, [applyFilters, convertToDBColumn, setFilters]);

    const handleNumberFilter = React.useCallback((
      cell: any,
      cellValue: any,
      opLabel: "Equal" | "Less Than" | "Greater Than" | "Not Equal"
    ) => {
      const opObj = operations.find(
        (op) => op.label.toLowerCase() === opLabel.toLowerCase()
      );
      const opValue = opObj ? opObj.value : opLabel;
      const dbColumnName = convertToDBColumn(
        cell.column.columnDef.header as string
      );
      setFilters((prev: FilterRow[]) => {
        const filtered = prev.filter(
          (filter) => filter.column !== dbColumnName
        );
        const newFilter: FilterRow = {
          type: "number",
          value: cellValue,
          id: Date.now(),
          column: dbColumnName,
          operation: opValue,
        };
        const newFilters = [...filtered, newFilter];
        applyFilters(newFilters);
        return newFilters;
      });
    }, [applyFilters, convertToDBColumn, setFilters]);

    const handleBooleanFilter = React.useCallback((cell: any, cellValue: any) => {
      const dbColumnName = convertToDBColumn(
        cell.column.columnDef.header as string
      );
      setFilters((prev: FilterRow[]) => {
        const filtered = prev.filter(
          (filter) => filter.column !== dbColumnName
        );
        const newFilter: FilterRow = {
          type: "equals",
          value: cellValue,
          id: Date.now(),
          column: dbColumnName,
          operation: "equals",
        };
        const newFilters = [...filtered, newFilter];
        applyFilters(newFilters);
        return newFilters;
      });
    }, [applyFilters, convertToDBColumn, setFilters]);

    useImperativeHandle(ref, () => ({
      applyFilters,
    }), [applyFilters]);

    const renderRow = React.useCallback((row: any) => {
      return (
        <TableRow
          key={row.id}
          className="group max-h-10 h-10 transition-colors duration-300 ease-in-out"
        >
          {row.getVisibleCells().map((cell: any) => (
            <TableCell
              key={cell.id}
              className={cn(
                "relative z-0 border max-h-12 p-2 text-sm transition-colors duration-400 ease-in-out hover:bg-primary/15"
              )}
            >
              <Popover>
                <PopoverTrigger
                  className={cn(
                    "block w-full h-full overflow-hidden rounded-sm transition-transform duration-200 hover:scale-[0.95] ease-in-out"
                  )}
                >
                  <div className={`text-justify w-full max-w-86 overflow-hidden text-ellipsis whitespace-nowrap rounded-sm transition-all duration-100 ease-in-out h-full`}>
                    {typeof cell.getValue() === "boolean"
                      ? cell.getValue()
                        ? "True"
                        : "False"
                        : flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                  </div>
                </PopoverTrigger>

                <PopoverContent
                  className="flex flex-col gap-2 w-46"
                  align="center"
                >
                  {(() => {
                    const cellType = getCellType(cell.getValue());
                    const columnName = cell.column.columnDef
                      .header as string;
                    const cellValue = cell.getValue();

                    if (cellType === "date") {
                      return (
                        <>
                          <div className="font-regular text-sx">
                            Filter this by {columnName}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              onClick={() =>
                                handleDateFilter(
                                  cell,
                                  cellValue,
                                  "before"
                                )
                              }
                            >
                              Before
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                handleDateFilter(
                                  cell,
                                  cellValue,
                                  "after"
                                )
                              }
                            >
                              After
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                handleDateFilter(
                                  cell,
                                  cellValue,
                                  "on"
                                )
                              }
                            >
                              On
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                handleDateFilter(
                                  cell,
                                  cellValue,
                                  "not-on"
                                )
                              }
                            >
                              Not On
                            </Button>
                          </div>
                          <div className="border-t my-2" />
                          <Button
                            variant="outline"
                            className="flex items-center"
                            onClick={() => {
                              setDialogRow(cell.row.original);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Expand className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </>
                      );
                    } else if (cellType === "string") {
                      return (
                        <>
                          <div className="font-regular text-sx">
                            Filter this by {columnName}
                          </div>
                          <Button
                            variant="outline"
                            className="w-56 flex items-center justify-start gap-4 truncate"
                            onClick={() =>
                              handleStringFilter(
                                cell,
                                cellValue,
                                "Equal"
                              )
                            }
                          >
                            {renderIcon("equal-to")}
                            <span className="text-start overflow-hidden text-ellipsis">
                              Is {String(cellValue)}
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            className="w-56 flex items-center justify-start gap-4 truncate"
                            onClick={() =>
                              handleStringFilter(
                                cell,
                                cellValue,
                                "Not Equal"
                              )
                            }
                          >
                            {renderIcon("not-equal")}
                            <span className="text-start overflow-hidden text-ellipsis">
                              Is not {String(cellValue)}
                            </span>
                          </Button>
                          <div className="border-t my-2" />
                          <Button
                            variant="outline"
                            className="flex items-center"
                            onClick={() => {
                              setDialogRow(cell.row.original);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Expand className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </>
                      );
                    } else if (cellType === "number") {
                      return (
                        <>
                          <div className="font-regular text-sx">
                            Filter this by {columnName}
                          </div>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleNumberFilter(
                                cell,
                                cellValue,
                                "Equal"
                              )
                            }
                          >
                            Is {cellValue}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleNumberFilter(
                                cell,
                                cellValue,
                                "Less Than"
                              )
                            }
                          >
                            Less than {cellValue}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleNumberFilter(
                                cell,
                                cellValue,
                                "Greater Than"
                              )
                            }
                          >
                            Greater than {cellValue}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleNumberFilter(
                                cell,
                                cellValue,
                                "Not Equal"
                              )
                            }
                          >
                            Not equal {cellValue}
                          </Button>
                          <div className="border-t my-2" />
                          <Button
                            variant="outline"
                            className="flex items-center"
                            onClick={() => {
                              setDialogRow(cell.row.original);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Expand className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </>
                      );
                    } else if (cellType === "boolean") {
                      return (
                        <>
                          <div className="font-regular text-sx">
                            Filter this by {columnName}
                          </div>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleBooleanFilter(cell, true)
                            }
                            className="w-56 flex items-center justify-start gap-4 truncate"
                          >
                            {renderIcon("check-circle")}
                            <span className="text-start overflow-hidden text-ellipsis">
                              Is True
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              handleBooleanFilter(cell, false)
                            }
                            className="w-56 flex items-center justify-start gap-4 truncate"
                          >
                            {renderIcon("x-circle")}
                            <span className="text-start overflow-hidden text-ellipsis">
                              Is False
                            </span>
                          </Button>
                          <div className="border-t my-2" />
                          <Button
                            variant="outline"
                            className="flex items-center"
                            onClick={() => {
                              setDialogRow(cell.row.original);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Expand className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </>
                      );
                    } else {
                      return null;
                    }
                  })()}
                </PopoverContent>
              </Popover>
            </TableCell>
          ))}
        </TableRow>
      );
    }, []);

    const tableBodyContent = React.useMemo(() => {
      return tableRows.length > 0 ? (
        tableRows.map(renderRow)
      ) : (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center">
            No results.
          </TableCell>
        </TableRow>
      );    }, [tableRows, columns.length, renderRow]);    return (
      <div className="h-full w-full max-h-full flex flex-col overflow-hidden">
        {rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center w-full">
              <div className="">
                <Skeleton className="w-full h-14" />
              </div>
              <div className="flex flex-col mt-1 gap-1 items-center justify-center">
                <Skeleton className="w-full h-14" />
                <Skeleton className="w-full h-14" />
                <Skeleton className="w-full h-14" />
                <Skeleton className="w-full h-14" />
              </div>
            </div>
          </div>
        ) : (
          <div 
            ref={tableContainerRef}
            className="flex-1 w-full bg-white/5 overflow-hidden"
          >
            <ScrollArea className="h-full w-full" type="always">
              <Table
                style={{
                  ...columnSizeVars,
                  tableLayout: "auto",
                  width: "100%",
                }}
              >
                <TableHeader className="sticky z-10 top-0">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead
                            key={header.id}
                            className="relative justify-start items-start text-start border border-l-0 px-2 bg-primary/5 "
                            style={{
                              width: header.getSize(),
                            }}
                          >
                            <Dropdown placement="bottom-start">
                              <DropdownTrigger>
                                <Button
                                  variant="ghost"
                                  color="primary"
                                  className="text-start dark:text-primary border-none bg-yellow-400/20 hover:bg-amber-950/40 text-yellow-500 h-6 border-1 rounded-sm px-2 py-0 capitalize text-sm font-medium"
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownTrigger>
                              <DropdownMenu>
                                {(
                                  header.column.columnDef.dropdownItems || []
                                ).map(
                                  (item, index) => (
                                    <DropdownItem
                                      key={index}
                                      startContent={renderIcon(item.icon)}
                                      onPress={() => item.action(header.column)}
                                    >
                                      {item.label}
                                    </DropdownItem>
                                  )
                                )}
                              </DropdownMenu>
                            </Dropdown>
                            <ColumnResizer header={header} />
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                
                <TableBody>
                  {tableBodyContent}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />            </ScrollArea>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="h-[60vh] w-[120vw]">
            <DialogHeader>
              <DialogTitle>Row Details</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[50vh] p-2">
              {dialogRow && (
                <ul className="space-y-3">{renderNestedValues(dialogRow)}</ul>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

DataTable.displayName = "DataTable";
