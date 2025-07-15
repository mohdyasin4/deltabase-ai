import dayjs from "dayjs";
import { formatRowData, detectDatetimeColumns, formatGranularity } from "./datetimeUtils";

type PivotResult = {
  pivotData: Record<string, any>[];
  pivotColumns: string[];
  rowKey: string;
  pivotKey: string;
  valueKey: string;
};

export const determineAxes = (
  data: any[]
): { xAxis: string; seriesAxis: string; measure: string; yAxis: string[] } => {
  if (!data.length)
    return { xAxis: "", seriesAxis: "", measure: "", yAxis: [] };

  const columns = Object.keys(data[0]);
  const numericCols = columns.filter((col) =>
    data.every((row) => typeof row[col] === "number")
  );
  const stringCols = columns.filter((col) =>
    data.some((row) => typeof row[col] === "string")
  );

  return {
    xAxis: stringCols[0] || numericCols[0] || "",
    seriesAxis: stringCols.length > 1 ? stringCols[1] : "",
    measure: numericCols[0] || "",
    yAxis: [...numericCols],
  };
};

export const transformData = (
  rawRows: any[],
  options: { selectedDateBy?: string; groupByValue?: string[] } = {}
) => {
  // Detect datetime columns and format each row.
  const datetimeColumns = detectDatetimeColumns(rawRows);
  const formattedRows = rawRows.map((row) =>
    formatRowData(row, datetimeColumns, options.selectedDateBy)
  );

  // Determine axes based on the formatted data.
  const axes = determineAxes(formattedRows);

  // Optionally, if a pivot should be applied, call autoPivotRows.
  let finalRows = formattedRows;
  if (
    (options.selectedDateBy && options.selectedDateBy.length > 0) ||
    (options.groupByValue && options.groupByValue.length > 0)
  ) {
    // For example, if exactly two groupBy columns are provided, we pivot.
    if (options.groupByValue && options.groupByValue.length === 2) {
      const { pivotData, pivotColumns, rowKey } = autoPivotRows(formattedRows, options.selectedDateBy);
      finalRows = pivotData;
      // Update axes if needed (for instance, set the xAxis to the pivot row key)
      axes.xAxis = rowKey;
      axes.yAxis = pivotColumns;
    }
  }

  return { finalRows, axes };
};

export const transformDataForChart = (
  data: Record<string, any>[],
  xAxis: string,
  seriesAxis?: string,
  measure?: string,
  selectedYAxis?: string[]
): Record<string, any>[] => {
  if (!data.length || !xAxis) return [];
  console.log("Transforming data for chart:", data);

  // Pivoting case: Handle grouped series if provided.
  if (seriesAxis && measure) {
    const resultMap = new Map<string, Record<string, any>>();

    data.forEach((row) => {
      const xVal = row[xAxis] ?? "Unknown";
      const sVal = row[seriesAxis] ?? "Default";
      const mVal = Number(row[measure]) || 0;

      if (!resultMap.has(xVal)) {
        resultMap.set(xVal, { [xAxis]: xVal });
      }

      const current = resultMap.get(xVal)!;
      current[sVal] = (current[sVal] || 0) + mVal; // Aggregate measure values
    });

    return Array.from(resultMap.values());
  } else {
    // No pivoting: Aggregate all numeric columns
    const numericKeys = new Set<string>();
    data.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== xAxis && typeof row[key] === "number") {
          if (!selectedYAxis || selectedYAxis.includes(key)) {
            numericKeys.add(key);
          }
        }
      });
    });

    const resultMap = new Map<string, Record<string, any>>();

    data.forEach((row) => {
      const xVal = row[xAxis] ?? "Unknown";
      if (!resultMap.has(xVal)) {
        const newObj: Record<string, any> = { [xAxis]: xVal };
        numericKeys.forEach((key) => (newObj[key] = 0));
        resultMap.set(xVal, newObj);
      }

      const current = resultMap.get(xVal)!;
      numericKeys.forEach((key) => {
        current[key] += Number(row[key]) || 0; // Sum values
      });
    });

    return Array.from(resultMap.values());
  }
};

function detectKeys(data: any[]): { rowKey: string; pivotKey: string; valueKey: string } {
  const sample = data[0];
  const keys = Object.keys(sample);

  // Split keys by type
  const numericKeys = keys.filter((k) => typeof sample[k] === "number");
  const stringKeys = keys.filter((k) => typeof sample[k] === "string");

  // Value key: prefer a numeric key that includes 'count'
  const valueKey =
    numericKeys.find((k) => k.toLowerCase().includes("count")) ||
    (numericKeys.length ? numericKeys[0] : "");

  // Row key: first try keys that include 'floor'
  let rowKey = keys.find((k) => k.toLowerCase().includes("floor"));
  // Otherwise, pick a string that looks like a date
  if (!rowKey) {
    rowKey = stringKeys.find((k) => dayjs(sample[k]).isValid());
  }
  // Fallback if still not found
  if (!rowKey && keys.length) {
    rowKey = keys[0];
  }

  // should be a string key that is not the row key
  let pivotKey =
    stringKeys.find((k) => k !== rowKey && k !== valueKey) ||
    stringKeys.find((k) => k !== rowKey);
  // Fallback if necessary
  if (!pivotKey && keys.length > 1) {
    pivotKey = keys[1];
  }

  return { rowKey, pivotKey, valueKey };
}

export function autoPivotRows(data: any[], granularity?: string): PivotResult {
  if (!Array.isArray(data) || data.length === 0) {
    return { pivotData: [], pivotColumns: [], rowKey: "", pivotKey: "", valueKey: "" };
  }

  // Dynamically detect keys using our heuristic
  const { rowKey, pivotKey, valueKey } = detectKeys(data);

  // Precompute all unique pivot categories
  const allPivotCategories = new Set<string>();
  data.forEach((row) => {
    const category = row[pivotKey] || "Unset";
    allPivotCategories.add(category);
  });
  const pivotColumnsArray = Array.from(allPivotCategories);

  // Build the pivot map
  const pivotMap: Record<string, Record<string, any>> = {};
  data.forEach((row) => {
    let rowValue = row[rowKey] ?? "Unknown";

    // Handle granularity for date fields
    if (granularity) {
      const parsed = dayjs(rowValue);
      if (parsed.isValid()) {
        rowValue = formatGranularity(parsed, granularity);
      }
    }

    const category = row[pivotKey] || "Unset";
    const value = row[valueKey] ?? 0;

    // Initialize the row if it doesn't exist with all categories set to 0
    if (!pivotMap[rowValue]) {
      pivotMap[rowValue] = { [rowKey]: rowValue };
      pivotColumnsArray.forEach((cat) => (pivotMap[rowValue][cat] = 0));
    }

    // Accumulate the value for this category
    pivotMap[rowValue][category] += value;
  });

  const pivotData = Object.values(pivotMap);

  return {
    pivotData,
    pivotColumns: pivotColumnsArray,
    rowKey,
    pivotKey,
    valueKey,
  };
}
