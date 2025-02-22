export const getCellDropdownItems = (
  cellType: "date" | "number" | "boolean" | "string",
  cell: { row: { original: any; }; },
  setDialogRow: (arg0: any) => void,
  setIsDialogOpen: (arg0: boolean) => void,
  filterAction: (filterType: string, value: any) => void // Add this as a parameter
) => {
  switch (cellType) {
    case "date":
      return [
        { label: "Before", icon: "calendar", action: () => filterAction("before", cell.row.original) },
        { label: "After", icon: "calendar", action: () => filterAction("after", cell.row.original) },
        { label: "On", icon: "calendar", action: () => filterAction("on", cell.row.original) },
        { label: "Not On", icon: "calendar", action: () => filterAction("not-on", cell.row.original) },
      ];
    case "number":
      return [
        { label: "< Less Than", icon: "less-than", action: () => filterAction("less-than", cell.row.original) },
        { label: "> Greater Than", icon: "greater-than", action: () => filterAction("greater-than", cell.row.original) },
        { label: "= Equal", icon: "equal-to", action: () => filterAction("equals", cell.row.original) },
        { label: "≠ Not Equal", icon: "not-equal", action: () => filterAction("not-equal", cell.row.original) },
      ];
    case "boolean":
      return [
        { label: "True", icon: "check", action: () => filterAction("true", cell.row.original) },
        { label: "False", icon: "x", action: () => filterAction("false", cell.row.original) },
      ];
    default:
      return [];
  }
};
