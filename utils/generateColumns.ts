// src/utils/generateColumns.ts
import { createElement } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@nextui-org/react";

export function generateColumns<T extends object>(rows: T[]): ColumnDef<T>[] {
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]) as (keyof T)[];

  return [
    {
      id: "select",
      header: ({ table }) => {
        const isChecked = table.getIsAllPageRowsSelected() || table.getIsSomePageRowsSelected();
        return createElement(Checkbox, {
          isSelected: isChecked,
          onChange: (e) => table.toggleAllPageRowsSelected(e.target.checked),
          "aria-label": "Select all",
          className: "relative z-5",
        });
      },
      cell: ({ row }) => {
        return createElement(Checkbox, {
          isSelected: row.getIsSelected(),
          onChange: (e) => row.toggleSelected(e.target.checked),
          "aria-label": "Select row",
          className: "relative z-5",
        });
      },
      enableSorting: false,
      enableHiding: false,
    },
    ...keys.map((key) => ({
      accessorKey: key as string,
      header: key.toString().charAt(0).toUpperCase() + key.toString().slice(1),
      enableSorting: true,
      cell: (info: { getValue: () => any; }) => info.getValue(),
    }))
  ];
}
