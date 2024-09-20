"use client";
import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateColumns } from "@/utils/generateColumns";
import {
  flexRender,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { DataTablePagination } from "@/app/dashboard/(components)/data-table-pagination";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button";

interface DataTableProps<T extends object> {
  rows: T[];
}

export const DataTable = <T extends object>({ rows }: DataTableProps<T>) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const columns = React.useMemo(() => generateColumns(rows), [rows]);

  const filteredRows = React.useMemo(
    () =>
      rows.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      ),
    [rows, searchTerm]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    initialState:{
      pagination: {
        pageSize: 20,
      }
    },
    state: {
      sorting,
      columnVisibility,
    },
  });

  return (
    <>
    <DropdownMenu>
      <div className="relative overflow-auto h-auto max-h-[calc(100vh-20vh)] rounded-sm bg-white/5">
          <DropdownMenuContent align="end">
            <ScrollArea className="h-96 w-96 overflow-auto border p-2 rounded-sm">
            {table
              .getAllColumns()
              .filter(
                (column) => column.getCanHide()
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
              </ScrollArea>
          </DropdownMenuContent>
      <ScrollArea className="h-full w-full overflow-auto border p-2 rounded-sm">
        <Table>
          <TableHeader className="sticky z-10 ">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className={row.getIsSelected() ? "bg-white/25 z-0" : ""}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="relative z-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" className="absolute bottom-0 left-0 right-0" />
      </ScrollArea>
      </div>
      </DropdownMenu>
      <DataTablePagination table={table} />
    </>
  );
};
