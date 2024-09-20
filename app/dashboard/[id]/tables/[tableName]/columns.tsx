"use client"

import { ColumnDef } from "@tanstack/react-table";

export const generateColumns = (data: any[]): ColumnDef<any>[] => {
  if (data.length === 0) return [];

  const keys = Object.keys(data[0]);

  return keys.map((key) => ({
    accessorKey: key,
    header: key.charAt(0).toUpperCase() + key.slice(1),
  }));
};
