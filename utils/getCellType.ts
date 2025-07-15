export const getCellType = (value: any): "date" | "number" | "boolean" | "string" => {
  // Check for Date objects directly
  if (value instanceof Date && !isNaN(value.getTime())) {
    return "date";
  }

  // Check for date strings based on expected format
  if (typeof value === "string") {
    const trimmedValue = value.trim();

    // 🔥 Strict date format check (e.g., "June 7, 2019, 12:00 AM")
    const dateRegex = /^[A-Za-z]+ \d{1,2}, \d{4}, \d{1,2}:\d{2} (AM|PM)$/;
    if (dateRegex.test(trimmedValue)) {
      return "date";
    }

    // Normalize: Replace " at " with ", " then insert space between time and AM/PM if missing
    let normalizedValue = trimmedValue.replace(/ at /i, ", ");
    normalizedValue = normalizedValue.replace(/(\d{1,2}:\d{2})(AM|PM)$/i, "$1 $2");

    // 🔥 Check if normalized value is a valid date
    if (dateRegex.test(normalizedValue) && !isNaN(Date.parse(normalizedValue))) {
      return "date";
    }
  }

  // Check for numbers, including numeric strings
  if (
    typeof value === "number" ||
    (typeof value === "string" && !isNaN(Number(value)) && !/^[A-Za-z]+\/\d{1,2}\/\d{1,3}$/.test(value))
  ) {
    return "number";
  }

  // Check for boolean values
  if (typeof value === "boolean") {
    return "boolean";
  }

  // Also check for string booleans
  if (typeof value === "string") {
    const trimmedValue = value.trim().toLowerCase();
    if (trimmedValue === "true" || trimmedValue === "false") {
      return "boolean";
    }
  }

  // Default to string if no other type matches
  return "string";
};
