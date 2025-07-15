// datetimeutils.ts
import dayjs from 'dayjs';


export function detectDatetimeColumns(rows: any[]): string[] {
  if (rows.length === 0) return [];
  
  const keys = Object.keys(rows[0]);
  const dateTimeKeywords = /minute|hour|day|week|month|quarter|year/i;
  const detected: string[] = [];
  
  for (const key of keys) {
    let validCount = 0;
    let totalCount = 0;
    for (const row of rows) {
      const value = row[key];
      if (value === null || value === undefined) continue;
      totalCount++;
      
      // If the value is a string, try parsing it
      if (typeof value === 'string') {
        // Try multiple common formats and a non-strict parse
        const parsed = dayjs(value);
        if (parsed.isValid()) {
          validCount++;
        }
      } else if (typeof value === 'number') {
        // If it's a number and the key name includes a time keyword,
        // assume it's a date-related field (e.g. month numbers)
        if (dateTimeKeywords.test(key)) {
          validCount++;
        }
      } else if (value instanceof Date) {
        validCount++;
      }
    }
    // If at least 50% of the non-null values in the column are valid dates, consider it a datetime column.
    if (totalCount > 0 && validCount / totalCount > 0.5) {
      detected.push(key);
    }
    // Alternatively, if the key name contains a date/time keyword, force it.
    else if (dateTimeKeywords.test(key)) {
      detected.push(key);
    }
  }
  
  return detected;
}

export function formatGranularity(date: dayjs.Dayjs, granularity: string): string {
  switch (granularity) {
    case "minute":
      return date.format("MMMM D, YYYY, h:mm A");
    case "hour":
      return date.format("MMMM D, YYYY, h A");
    case "day":
      return date.format("MMMM D, YYYY");
    case "week": {
      const end = date.add(6, 'day');
      return `${date.format("MMMM D, YYYY")} – ${end.format("MMMM D, YYYY")}`;
    }
    case "month":
      return date.format("MMMM YYYY");
    case "quarter": {
      const quarter = Math.floor(date.month() / 3) + 1;
      return `Q${quarter} ${date.year()}`;
    }
    case "year":
      return date.format("YYYY");
    default:
      return date.toISOString();
  }
}

export const formatRowData = (
  row: any,
  datetimeColumns: string[],
  granularity?: string
) => {
  const formattedRow: Record<string, any> = {};

  for (const key of Object.keys(row)) {
    const value = row[key];

    if (
      datetimeColumns.includes(key) &&
      typeof value === "string" &&
      value.trim() !== "" &&
      isNaN(Number(value))
    ) {
      const parsed = dayjs(value);

      if (!parsed.isValid() || parsed.year() < 1900 || parsed.year() > 2100) {
        formattedRow[key] = value;
      } else if (granularity) {
        try {
          formattedRow[key] = formatGranularity(parsed, granularity);
        } catch (error) {
          console.error(`Error formatting granularity: ${error}`);
          formattedRow[key] = parsed.format("MMMM D, YYYY, h:mm A");
        }
      } else {
        // Auto-format based on input structure
        if (/^\d{4}$/.test(value)) {
          // Only year
          formattedRow[key] = parsed.format("YYYY");
        } else if (/^\d{4}-\d{2}$/.test(value)) {
          // Year + month
          formattedRow[key] = parsed.format("MMMM, YYYY");
        } else {
          formattedRow[key] = parsed.format("MMMM D, YYYY, h:mm A");
        }
      }
    }
    else if (
      (typeof value === "number" ||
        (typeof value === "string" &&
          value.trim() !== "" &&
          !isNaN(Number(value)))) &&
      value !== null
    ) {
      const numValue = Number(value);
      formattedRow[key] = Number.isInteger(numValue)
        ? numValue
        : parseFloat(numValue.toFixed(4));
    }
    else {
      formattedRow[key] = value;
    }
  }

  return formattedRow;
};
