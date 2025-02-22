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
  useDisclosure,
} from "@heroui/react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Expand,
  EyeOff,
  Maximize2,
} from "lucide-react"; // Use only necessary icons
import React from "react";
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
import { Button as Button2 } from "@heroui/react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface DataTableProps<T> {
  rows: T[];
  searchTerm?: string;
  setSearchTerm?: (value: string) => void;
  pagination?: boolean;
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

export const DataTable = <T extends object>({
  rows,
  searchTerm,
  setSearchTerm,
  pagination,
}: DataTableProps<T>) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogRow, setDialogRow] = React.useState<T | null>(null);
  const [filters, setFilters] = React.useState<Record<string, any>>({});
  const [isOpen, setIsOpen] = React.useState(false);
  const [colSizing, setColSizing] = React.useState<ColumnSizingState>({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const handleSortingChange = React.useCallback(setSorting, []);
  const handleColumnVisibilityChange = React.useCallback(
    setColumnVisibility,
    []
  );
  const handleColumnSizingChange = React.useCallback(setColSizing, []);
  const filteredRows = React.useMemo(() => {
    if (!rows.length) return [];

    return rows.filter((row) =>
      Object.entries(filters).every(([columnId, filter]) => {
        const cellValue = row[columnId];
        if (cellValue === undefined) return false;

        switch (filter.type) {
          case "before":
            return new Date(cellValue) < new Date(filter.value);
          case "after":
            return new Date(cellValue) > new Date(filter.value);
          case "less-than":
            return cellValue < filter.value;
          case "greater-than":
            return cellValue > filter.value;
          case "equals":
            return (
              String(cellValue).toLowerCase() ===
              String(filter.value).toLowerCase()
            );
          case "not-equals":
            return (
              String(cellValue).toLowerCase() !==
              String(filter.value).toLowerCase()
            );
          default:
            return true;
        }
      })
    );
  }, [rows, filters]);

  const columns = React.useMemo(
    () => generateColumns(rows, setDialogRow, setIsDialogOpen),
    [rows]
  );
  const table = useReactTable({
    data: filteredRows,
    columns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: handleSortingChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onColumnSizingChange: handleColumnSizingChange,
    initialState: {
      pagination: {
        pageSize: 200,
      },
    },
    state: {
      sorting,
      columnVisibility,
      columnSizing: colSizing,
    },
  });

  const columnSizeVars = React.useMemo(() => {
    const headers = table.getFlatHeaders()
    const colSizes: { [key: string]: number } = {}
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!
      colSizes[`--header-${header.id}-size`] = header.getSize()
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize()
    }
    return colSizes
  }, [table.getState().columnSizingInfo, table.getState().columnSizing])

  return (
    <>
      {rows.length === 0 ? (
        <div className="text-center">
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
      ) : (
        <div className="relative h-full overflow-auto bg-white/5 ">
          <ScrollArea className="h-full w-full overflow-x-visible  overflow-y-visible scrollbar-default">
            <Table style={{ 
              ...columnSizeVars,
              width: table.getTotalSize() 
            }}>
              <TableHeader className="sticky z-10 -top-1">
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
                              <Button2
                                variant="flat"
                                color="primary"
                                className="text-left text-primary h-6 border-1 rounded-sm px-2 py-0 capitalize text-sm font-medium"
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {/* Chevron down if dropdownmenu collapsed otherwise chevron up */}
                                {isOpen ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button2>
                            </DropdownTrigger>
                            <DropdownMenu>
                              {(
                                header.column.columnDef.dropdownItems || []
                              ).map(
                                (
                                  item: {
                                    icon: string;
                                    action: (arg0: Column<T, unknown>) => void;
                                    label:
                                      | string
                                      | number
                                      | bigint
                                      | boolean
                                      | React.ReactElement<
                                          any,
                                          | string
                                          | React.JSXElementConstructor<any>
                                        >
                                      | Iterable<React.ReactNode>
                                      | React.ReactPortal
                                      | Promise<React.AwaitedReactNode>
                                      | null
                                      | undefined;
                                    tooltip?: string;
                                  },
                                  index: string | number | undefined
                                ) => (
                                  <DropdownItem
                                    key={index}
                                    startContent={renderIcon(item.icon)}
                                    onClick={() => item.action(header.column)}
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
              <TableBody className="h-full max-h-[calc(100vh-10vh)]">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="group max-h-10 h-10 transition-colors duration-300 ease-in-out"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "relative z-0 border max-h-12 p-2 text-sm rounded-sm transition-colors duration-400 ease-in-out",
                            cell.column.id !== "ID" &&
                              "hover:bg-primary/5  cursor-pointer"
                          )}
                          style={{
                            width:
                              cell.column.id === "ID"
                                ? "80px"
                                : cell.column.getSize(), // Set a specific width for ID column
                            minWidth: cell.column.columnDef.minSize,
                          }}
                        >
                          <Popover>
                            <PopoverTrigger className="w-full h-full">
                              <div
                                style={{
                                  width: cell.column.getSize(),
                                  minWidth: cell.column.columnDef.minSize,
                                }}
                                className="text-left truncate text-ellipsis rounded-sm transition-all duration-100 ease-in-out h-full"
                              >
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
                                          onClick={() => {
                                            setFilters((prev) => ({
                                              ...prev,
                                              [cell.column.id]: {
                                                type: "before",
                                                value: cellValue,
                                              }, // Example for "Before"
                                            }));
                                          }}
                                        >
                                          Before
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            /* Logic for After */
                                          }}
                                        >
                                          After
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            /* Logic for On */
                                          }}
                                        >
                                          On
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            /* Logic for Not On */
                                          }}
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
                                } else if (cellType === "number") {
                                  return (
                                    <>
                                      <div className="font-regular text-sx">
                                        Filter this by {columnName}
                                      </div>
                                      <div className="flex flex-row gap-2">
                                        {getCellDropdownItems(
                                          cellType,
                                          cell,
                                          setDialogRow,
                                          setIsDialogOpen,
                                          (filterType, value) => {
                                            // This is the filterAction function you pass in
                                            setFilters((prev) => ({
                                              ...prev,
                                              [cell.column.id]: {
                                                type: filterType,
                                                value: cell.getValue(),
                                              },
                                            }));
                                          }
                                        ).map((item, index) => (
                                          <Button
                                            key={index}
                                            variant={"outline"}
                                            className="text-center"
                                            size="sm"
                                            onClick={item.action} // Use the action defined in getCellDropdownItems
                                          >
                                            {renderIcon(item.icon)}
                                          </Button>
                                        ))}
                                      </div>
                                      <div className="border-t my-2" />
                                      <Button
                                        variant={"outline"}
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
                                        onClick={() => {
                                          setFilters((prev) => ({
                                            ...prev,
                                            [cell.column.id]: {
                                              type: "equals",
                                              value: String(cellValue),
                                            },
                                          }));
                                        }}
                                      >
                                        {renderIcon("equal-to")}
                                        <span className="text-start  overflow-hidden text-ellipsis">
                                          Is {String(cellValue)}
                                        </span>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        className="w-56 flex items-center justify-start gap-4 truncate"
                                        onClick={() => {
                                          setFilters((prev) => ({
                                            ...prev,
                                            [cell.column.id]: {
                                              type: "not-equals",
                                              value: String(cellValue),
                                            },
                                          }));
                                        }}
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
                                } else if (cellType === "boolean") {
                                  return (
                                    <>
                                      <div className="font-regular text-sx">
                                        Filter this by {columnName}
                                      </div>
                                      <Button
                                        variant="outline"
                                        className="w-56 flex items-center justify-start gap-4 truncate"
                                        onClick={() => {
                                          setFilters((prev) => ({
                                            ...prev,
                                            [cell.column.id]: {
                                              type: "equals",
                                              value: true,
                                            },
                                          }));
                                        }}
                                      >
                                        {renderIcon("check-circle")}
                                        <span className="text-start overflow-hidden text-ellipsis">
                                          Is True
                                        </span>
                                      </Button>
                                      <Button
                                        variant="outline"
                                        className="w-56 flex items-center justify-start gap-4 truncate"
                                        onClick={() => {
                                          setFilters((prev) => ({
                                            ...prev,
                                            [cell.column.id]: {
                                              type: "equals",
                                              value: false,
                                            },
                                          }));
                                        }}
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
                                  return null; // Handle other cases as needed
                                }
                              })()}
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar
              orientation="horizontal"
              className="absolute bottom-0 left-0 right-0"
            />
          </ScrollArea>
        </div>
      )}
      {pagination && <DataTablePagination table={table} />}
      {/* Dialog for showing row details */}
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
    </>
  );
};
