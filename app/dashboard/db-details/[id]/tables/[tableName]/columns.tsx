"use client"

import { ColumnDef } from "@tanstack/react-table";

// Utility function to format the header text
export function formatHeader(header: string): string {
  return header
    .split('_') // Split by underscores
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
    .join(' '); // Join the words with space
}

export const generateColumns = (data: any[]): ColumnDef<any>[] => {
  if (data.length === 0) return [];

  const keys = Object.keys(data[0]);

  return keys.map((key) => ({
    accessorKey: key,
    header: formatHeader(key), // Apply formatting here
  }));
};
