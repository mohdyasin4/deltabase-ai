import { createElement } from "react";
import { ColumnDef, CellContext } from "@tanstack/react-table";
import { Dispatch, SetStateAction } from "react";
import { Button, Chip } from "@heroui/react";

function formatHeader(header: string): string {
  return header
    .split('_') // Split by underscore
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
    .join(' '); // Join the words with space
}
import { getCellDropdownItems } from '@/utils/getCellDropdownItems';

export function generateColumns<T extends object>(
  rows: T[],
  setDialogRow: Dispatch<SetStateAction<T | null>>, // Pass function to set dialog row data
  setIsDialogOpen: Dispatch<SetStateAction<boolean>>, // To open/close the dialog
): ColumnDef<T>[] {
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]) as (keyof T)[];
  return [
    ...keys.map((key) => {
      // Special behavior for the ID column
      if (key === 'ID') {
        return {
          accessorKey: key as string,
          header: formatHeader(key as string), // Use the utility function for formatting
          enableSorting: true,
          cell: ({ row }: CellContext<T, unknown>) =>
            createElement(
              Chip,
              {
                className: "border-small rounded-sm border-white/50 px-2 w-6 h-6 hover:scale-105 transition-all ease-in-out text-bold text-primary text-xs",
                variant: "flat",
                color: "primary",
                onClick: () => {
                  setDialogRow(row.original); // Set the clicked row's data in the dialog
                  setIsDialogOpen(true); // Open the dialog
                },
              },
              row.getValue(key as string) // Display the value for the ID column
            ),
          dropdownItems: [
            {
              label: "Sort Ascending",
              icon: "arrowUp",
              action: (column: { toggleSorting: (arg0: boolean) => any; }) => column?.toggleSorting(false),
            },
            {
              label: "Sort Descending",
              icon: "arrowDown",
              action: (column: { toggleSorting: (arg0: boolean) => any; }) => column?.toggleSorting(true),
            },
            {
              label: "Hide Column",
              icon: "eyeOff", // Use a string identifier for the icon
              action: (column: { toggleVisibility: (arg0: boolean) => any; }) => column?.toggleVisibility(false),
            },
          ],
        };
      }

      // Default behavior for other columns
      return {
        accessorKey: key as string,
        header: formatHeader(key as string), // Apply formatting here
        enableSorting: true,
        enableResizing: true,
        cell: (info: CellContext<T, unknown>) => info.getValue(),
        dropdownItems: [
          {
            label: "Sort Ascending",
            icon: "arrowUp",
            action: (column: { toggleSorting: (arg0: boolean) => any; }) => column?.toggleSorting(false),
          },
          {
            label: "Sort Descending",
            icon: "arrowDown",
            action: (column: { toggleSorting: (arg0: boolean) => any; }) => column?.toggleSorting(true),
          },
          {
            label: "Hide Column",
            icon: "eyeOff", // Use a string identifier for the icon
            action: (column: { toggleVisibility: (arg0: boolean) => any; }) => column?.toggleVisibility(false),
          },
        ],
      };
    }),
  ];
}
