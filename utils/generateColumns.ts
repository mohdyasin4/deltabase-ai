import { createElement } from "react";
import { ColumnDef, CellContext } from "@tanstack/react-table";
import { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";

function formatHeader(header: string): string {
  return header
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper function to safely format any value to a string representation
function formatValueToString(value: any): string {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "boolean") return value ? "✅ Yes" : "❌ No";
  if (typeof value === "number" || typeof value === "string") return value.toString();
  if (typeof value === "object") {
    // Handle nested objects and arrays
    if (Array.isArray(value)) {
      return value.map(formatValueToString).join(", ");
    } else {
      try {
        // Format object as a readable string with key-value pairs
        return Object.entries(value)
          .map(([k, v]) => `${k}: ${formatValueToString(v)}`)
          .join(", ");
      } catch (e) {
        return "Complex Object";
      }
    }
  }
  return String(value);
}

export function generateColumns<T extends object>(
  rows: T[],
  setDialogRow: Dispatch<SetStateAction<T | null>>,
  setIsDialogOpen: Dispatch<SetStateAction<boolean>>,
  primaryKey: string // Primary key is a string column name
): ColumnDef<T>[] {
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]) as (keyof T)[];

  return keys.map((key) => {
    const isPrimaryKey = primaryKey === key; // 🔹 Direct comparison instead of `includes`

    return {
      accessorKey: key as string,
      header: formatHeader(key as string),
      enableSorting: true,
      enableResizing: true,
      minSize: isPrimaryKey ? 20 : 50,
      maxSize: isPrimaryKey ? 100 : 1200,
      cell: (info: CellContext<T, unknown>) => {
        const value = info.getValue();
        if (isPrimaryKey) {
          return createElement(
            Badge,
            {
              style: { margin: "0", minWidth: 0, backgroundColor: "#ffcc1933" },
              className:
                "w-full border-small rounded-sm bg-yellow-500/25 border-white/50 px-2 hover:scale-102 transition-all ease-in-out text-bold dark:text-primary text-yellow-500 text-xs whitespace-nowrap",
              onClick: () => {
                setDialogRow(info.row.original);
                setIsDialogOpen(true);
              },
            },
            formatValueToString(value)
          );
        }

        // Handle all value types with our new helper function
        return formatValueToString(value);
      },
      dropdownItems: [
        {
          label: "Sort Ascending",
          icon: "arrowUp",
          action: (column: { toggleSorting: (arg0: boolean) => any }) => column?.toggleSorting(false),
        },
        {
          label: "Sort Descending",
          icon: "arrowDown",
          action: (column: { toggleSorting: (arg0: boolean) => any }) => column?.toggleSorting(true),
        },
        {
          label: "Hide Column",
          icon: "eyeOff",
          action: (column: { toggleVisibility: (arg0: boolean) => any }) => column?.toggleVisibility(false),
        },
      ],
    };
  });
}
