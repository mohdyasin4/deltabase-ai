// Utility function to determine the cell type based on value
export const getCellType = (value: any): "date" | "number" | "boolean" | "string" => {
  // Check for Date objects directly
  if (value instanceof Date && !isNaN(value.getTime())) {
    return "date";
  }

  // Check for date strings that can be parsed
  if (typeof value === "string" && !isNaN(Date.parse(value))) {
    return "date";
  }

  // Check for numbers, including strings that are numeric
  if (typeof value === "number" || (typeof value === "string" && !isNaN(Number(value)))) {
    return "number";
  }

  // Check for boolean values
  if (typeof value === "boolean") {
    return "boolean";
  }

  // If it's a string, check for 'true' or 'false' in a case-insensitive way
  if (typeof value === "string") {
    const trimmedValue = value.trim().toLowerCase();
    if (trimmedValue === "true" || trimmedValue === "false") {
      return "boolean";
    }
  }

  // Default to string if no other type matches
  return "string";
};
