"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
  Tab,
  Tabs,
  Textarea,
  Tooltip,
  useDisclosure,
} from "@heroui/react";
import {
  AreaChart,
  ChartLine,
  ChartNoAxesColumnIncreasing,
  DownloadIcon,
  Filter,
  FilterIcon,
  FunctionSquare,
  PieChartIcon,
  RefreshCw,
  Save,
  SaveIcon,
  Search,
  Sigma,
  Sparkle,
  Table,
  Table2,
  Terminal,
  TerminalSquare,
  Zap,
  ZapIcon,
} from "lucide-react";
import twilight from "./themes/Twilight.json";
import { DataTable } from "@/app/dashboard/_components/data-table";
import MonacoEditor from "@monaco-editor/react";
import NProgress, { set } from "nprogress";
import { useParams, useRouter } from "next/navigation";
import { Skeleton, Switch, Select, SelectItem } from "@heroui/react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import * as monaco2 from "monaco-editor";
import { useUser } from "@clerk/nextjs";
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";
import { NumberWidget } from "@/app/dashboard/_components/NumberWidget";
import VisualizationRenderer from "./VisualizationRenderer";
import { GearIcon } from "@radix-ui/react-icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  LineChart,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartWidget } from "./ChartWidget";
import chroma from "chroma-js";
import SqlEditor from "./SqlEditor";
import { supabaseClient } from "@/lib/supabaseClient";
import { Label } from "@/components/ui/label";
import { AggregateControls } from "./AggregateControls";
import { handleApplyAggregate } from "@/utils/aggregateFunctions";
import AdvancedSettingsPanel from "./AdvancedSettingsPanel";
import SummarizePanel from "./SummarizePanel";
import FilterDialog, { FilterRow } from "./FilterDialog"; // adjust import as needed
import { Dialog } from "@/components/ui/dialog";
import { color, motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { detectDatetimeColumns, formatRowData } from "@/utils/datetimeUtils";
import { queryOptions } from "@tanstack/react-query";
import { autoPivotRows, transformDataForChart } from "@/utils/dataTransform";
import { useSidePanelStore } from "@/store/sidePanelStates";
import { useShallow } from "zustand/shallow";
import { useStore } from "@/store/useStatesStore";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import * as htmlToImage from "html-to-image";
import { manipulateRawQueryWithGroupBy } from "@/utils/queryUtils";

interface ResultPageProps {
  dataset_id?: string;
  apiId?: string | null;
  csvId?: string | null;
  dataset_name?: string;
  type: string;
  sourceType: "api" | "database" | "csv";
  connectionId?: string;
  isSidePanelOpen?: boolean;
  setIsSidePanelOpen?: (value: boolean) => void;
}

const visualizationOptions = [
  {
    label: "Table",
    value: "table",
    icon: <Table2 />,
  },
  {
    label: "Number",
    value: "number",
    icon: <Icon icon="material-symbols:123" height={48} width={48} />,
  },
  {
    label: "Bar Chart",
    value: "bar",
    icon: <ChartNoAxesColumnIncreasing />,
  },
  {
    label: "Line Chart",
    value: "line",
    icon: <ChartLine />,
  },
  {
    label: "Pie Chart",
    value: "pie",
    icon: <PieChartIcon />,
  },
  {
    label: "Area Chart",
    value: "area",
    icon: <AreaChart />,
  },
];

export const determineAxes = (
  data: any[]
): {
  xAxis: string;
  seriesAxis: string;
  measure: string;
  yAxis: string[];
} => {
  console.log("Determining axes from data:", data);
  if (!data.length)
    return { xAxis: "", seriesAxis: "", measure: "", yAxis: [] };

  const columns = Object.keys(data[0]);

  // Classify columns by data type
  const numericCols = columns.filter(
    (col) =>
      data.some((row) => typeof row[col] === "number") &&
      data.every(
        (row) => row[col] === undefined || typeof row[col] === "number"
      )
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

// Example: Options for the two selects
export const viewOptions = [
  { value: "all-time", label: "All time" },
  { value: "previous", label: "Previous" },
  { value: "next", label: "Next" },
  { value: "current", label: "Current" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "on", label: "On" },
  { value: "between", label: "Between" },
];

export const byOptions = [
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

export const transformChartData = (
  data: any[],
  xAxis: string,
  seriesAxis?: string,
  measure?: string,
  selectedYAxis?: string[]
) => {
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

export default function ResultPage({
  dataset_id,
  apiId,
  csvId,
  dataset_name,
  type,
  sourceType,
  connectionId,
  isSidePanelOpen,
  setIsSidePanelOpen,
}: ResultPageProps) {
  const {
    connection_id,
    setConnectionId,
    setDatasetId,
    setApiId,
    setCsvId,
    apiDetails,
    setApiDetails,
    loading,
    setLoading,
    allColumns,
    setAllColumns,
    columns,
    setColumns,
    rows,
    setRows,
    searchTerm,
    setSearchTerm,
    sqlQuery,
    setSqlQuery,
    sqlAiQuery,
    setSqlAiQuery,
    queryLoading,
    setQueryLoading,
    apiUrl,
    setApiUrl,
    tables,
    setTables,
    newDatasetName,
    setNewDatasetName,
    datasetDescription,
    setDatasetDescription,
    selectedVisualization,
    setSelectedVisualization,
    xAxis,
    setXAxis,
    yAxis,
    setYAxis,
    limit,
    setLimit,
    limitOption,
    setLimitOption,
    customLimit,
    setCustomLimit,
    widgetTitle,
    setWidgetTitle,
    description,
    setDescription,
    activeTab,
    setActiveTab,
    selectedColumn,
    setSelectedColumn,
    isStacked,
    setIsStacked,
    apiUrlLoading,
    data,
    setData,
    tableName,
    setTableName,
    effectiveTableName,
    setEffectiveTableName,
    originalQuery,
    columnMetadata,
    setColumnMetadata,
    setOriginalQuery,
    primaryKeys,
    setPrimaryKeys,
    filters,
    setFilters,
    columnTypes,
    setColumnTypes,
    executionTime,
    setExecutionTime,
    selectedDateBy,
    selectedDateView,
    setSelectedDateView,
    setSelectedDateBy,
    datetimeColumns,
    setDatetimeColumns,
    selectedAggregate,
    setSelectedAggregate,
    selectedValues,
    setSelectedValues,
    groupByValue,
    setGroupByValue,
    rawRows,
    setRawRows,
  } = useStore(
    useShallow((state) => ({
      connection_id: state.connection_id,
      setConnectionId: state.setConnectionId,
      setDatasetId: state.setDatasetId,
      setApiId: state.setApiId,
      setCsvId: state.setCsvId,
      apiDetails: state.apiDetails,
      setApiDetails: state.setApiDetails,
      loading: state.loading,
      setLoading: state.setLoading,
      allColumns: state.allColumns,
      setAllColumns: state.setAllColumns,
      columns: state.columns,
      setColumns: state.setColumns,
      rows: state.rows,
      setRows: state.setRows,
      searchTerm: state.searchTerm,
      setSearchTerm: state.setSearchTerm,
      sqlQuery: state.sqlQuery,
      setSqlQuery: state.setSqlQuery,
      sqlAiQuery: state.sqlAiQuery,
      setSqlAiQuery: state.setSqlAiQuery,
      queryLoading: state.queryLoading,
      setQueryLoading: state.setQueryLoading,
      apiUrl: state.apiUrl,
      setApiUrl: state.setApiUrl,
      tables: state.tables,
      setTables: state.setTables,
      newDatasetName: state.newDatasetName,
      setNewDatasetName: state.setNewDatasetName,
      datasetDescription: state.datasetDescription,
      setDatasetDescription: state.setDatasetDescription,
      selectedVisualization: state.selectedVisualization,
      setSelectedVisualization: state.setSelectedVisualization,
      xAxis: state.xAxis,
      setXAxis: state.setXAxis,
      yAxis: state.yAxis,
      setYAxis: state.setYAxis,
      limit: state.limit,
      setLimit: state.setLimit,
      limitOption: state.limitOption,
      setLimitOption: state.setLimitOption,
      customLimit: state.customLimit,
      setCustomLimit: state.setCustomLimit,
      widgetTitle: state.widgetTitle,
      setWidgetTitle: state.setWidgetTitle,
      description: state.description,
      setDescription: state.setDescription,
      activeTab: state.activeTab,
      setActiveTab: state.setActiveTab,
      columnMetadata: state.columnMetadata,
      setColumnMetadata: state.setColumnMetadata,
      selectedColumn: state.selectedColumn,
      executionTime: state.executionTime,
      setExecutionTime: state.setExecutionTime,
      setSelectedColumn: state.setSelectedColumn,
      selectedAggregate: state.selectedAggregate,
      setSelectedAggregate: state.setSelectedAggregate,
      isStacked: state.isStacked,
      setIsStacked: state.setIsStacked,
      apiUrlLoading: state.apiUrlLoading,
      data: state.data,
      setData: state.setData,
      tableName: state.tableName,
      setTableName: state.setTableName,
      effectiveTableName: state.effectiveTableName,
      setEffectiveTableName: state.setEffectiveTableName,
      originalQuery: state.originalQuery,
      setOriginalQuery: state.setOriginalQuery,
      primaryKeys: state.primaryKeys,
      setPrimaryKeys: state.setPrimaryKeys,
      filters: state.filters,
      setFilters: state.setFilters,
      columnTypes: state.columnTypes,
      setColumnTypes: state.setColumnTypes,
      selectedDateBy: state.selectedDateBy,
      selectedDateView: state.selectedDateView,
      setSelectedDateView: state.setSelectedDateView,
      setSelectedDateBy: state.setSelectedDateBy,
      datetimeColumns: state.datetimeColumns,
      setDatetimeColumns: state.setDatetimeColumns,
      selectedValues: state.selectedValues,
      setSelectedValues: state.setSelectedValues,
      groupByValue: state.groupByValue,
      setGroupByValue: state.setGroupByValue,
      rawRows: state.rawRows,
      setRawRows: state.setRawRows,
    }))
  );

  const router = useRouter();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [selectedFormat, setSelectedFormat] = useState(".csv");
  const [isFormatted, setIsFormatted] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper to export CSV
  const exportCSV = (rows: any[], columns: string[]) => {
    const csvData = Papa.unparse({
      fields: columns,
      data: rows,
    });
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "dataset.csv");
  };

  // Helper to export JSON
  const exportJSON = (rows: any[]) => {
    const jsonBlob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json",
    });
    saveAs(jsonBlob, "dataset.json");
  };

  // Helper to export XLSX
  const exportXLSX = (rows: any[], columns: string[]) => {
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: columns,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dataset");
    const xlsxBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([xlsxBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "dataset.xlsx");
  };

  // Helper to export PNG (Chart)
  const exportChartAsPNG = () => {
    const chartElement = document.getElementById("chart-widget"); // Ensure you give this id to your chart component

    if (!chartElement) {
      console.error("Chart widget not found.");
      return;
    }

    htmlToImage
      .toPng(chartElement)
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "chart.png";
        link.click();
      })
      .catch((error) => console.error("Error exporting chart as PNG:", error));
  };

  const isChartRendered = useMemo(() => {
    return ["bar", "line", "pie", "area"].includes(selectedVisualization);
  }, [selectedVisualization]);

  // Main download handler
  const handleDownload = () => {
    console.log("Downloading:", selectedFormat, "Formatted:", isFormatted);

    switch (selectedFormat) {
      case ".csv":
        if (isFormatted) {
          exportCSV(rows, columns);
        } else {
          exportCSV(rawRows, columns);
        }
        break;
      case ".xlsx":
        if (isFormatted) {
          exportXLSX(rows, columns);
        } else {
          exportXLSX(rawRows, columns);
        }
        break;
      case ".json":
        if (isFormatted) {
          exportJSON(rows);
        } else {
          exportJSON(rawRows);
        }
        break;
      case ".png":
        exportChartAsPNG();
        break;
      default:
        console.warn("Invalid format selected.");
    }
  };

  const {
    isOpen: isSaveOpen,
    onOpen: onSaveOpen,
    onOpenChange: onSaveClose,
  } = useDisclosure();
  const {
    isOpen: isFilterOpen,
    onOpen: onFilterOpen,
    onOpenChange: onFilterClose,
  } = useDisclosure();
  const { user } = useUser(); // Get the current user
  const userId = user?.id;
  const filterDialogRef = useRef<any>(null);
  const dateColumn = selectedValues.find((value) =>
    datetimeColumns.includes(value)
  );
  const [hasManualXAxis, setHasManualXAxis] = useState(false);
  const [hasManualYAxis, setHasManualYAxis] = useState(false);
  const {
    isAiSidePanelOpen,
    setIsAiSidePanelOpen,
    showSidePanel,
    setShowSidePanel,
    showSummarizePanel,
    setShowSummarizePanel,
  } = useSidePanelStore(
    useShallow((state) => ({
      isAiSidePanelOpen: state.isAiSidePanelOpen,
      setIsAiSidePanelOpen: state.setIsAiSidePanelOpen,
      showSidePanel: state.showSidePanel,
      setShowSidePanel: state.setShowSidePanel,
      showSummarizePanel: state.showSummarizePanel,
      setShowSummarizePanel: state.setShowSummarizePanel,
    }))
  );

  useEffect(() => {
    setConnectionId(connection_id ?? id ?? null);
    setDatasetId(dataset_id ?? null);
    setApiId(apiId ?? null);
    setCsvId(csvId ?? null);
    setTableName(tableName ?? null);
  }, [connection_id, dataset_id, apiId, csvId, tableName]);

  // Fetch database tables for SQL completion when connection_id changes
  useEffect(() => {
    const fetchDatabaseTables = async () => {
      if (!connection_id || sourceType !== "database") {
        console.log("❌ No connection_id or not database source, skipping tables fetch");
        return;
      }
      
      try {
        console.log("🔍 Fetching database tables for connection:", connection_id);
        const response = await fetch(`/api/database/${connection_id}`);
        
        if (!response.ok) {
          throw new Error(`Tables fetch failed: ${response.status}`);
        }
        
        const tablesData = await response.json();
        const tableNames = Array.isArray(tablesData) ? tablesData : [];
        
        console.log("✅ Database tables loaded:", tableNames);
        setTables(tableNames);
      } catch (error) {
        console.error("❌ Error fetching database tables:", error);
        // Clear tables on error
        setTables([]);
      }
    };

    fetchDatabaseTables();
  }, [connection_id, sourceType, setTables]);

  console.log("SELECTEDVALUES", selectedValues);
  // Helper to transform filters into chip labels
  const transformFiltersToChips = (filters: FilterRow[]) => {
    const operationMap: { [key: string]: string } = {
      "=": "is",
      "!=": "is not",
      ">": "is greater than",
      "<": "is less than",
      ">=": "is greater than or equal to",
      "<=": "is less than or equal to",
      "LIKE": "contains",
      "NOT LIKE": "does not contain",
    };

    // Use a separate map for date filter types.
    const dateOperationMap: { [key: string]: string } = {
      before: "is before",
      after: "is after",
      on: "is on",
      "not-on": "is not on",
    };

    return filters
      .filter((filter) => filter.column && filter.operation && filter.value)
      .map((filter) => {
        // Format the column name from snake_case to Title Case.
        const formattedColumn = filter.column
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        // If filter.type exists and is one of the date types, use dateOperationMap,
        // otherwise fall back to the generic operationMap using filter.operation.
        const operationLabel =
          dateOperationMap[filter.type] ||
          operationMap[filter.operation] ||
          filter.operation;

        return {
          id: filter.id,
          label: `${formattedColumn} ${operationLabel} ${filter.value}`,
        };
      });
  };
  const chipData = useMemo(() => transformFiltersToChips(filters), [filters]);

  // When a chip is removed, update the filters and call applyFilters from the FilterDialog
  const removeChip = (chipId: number) => {
    // Compute the updated filters array and set it directly.
    const updatedFilters = filters.filter(
      (filter: { id: number }) => filter.id !== chipId
    );
    // Call applyFilters with the updated filters.
    if (
      filterDialogRef.current &&
      typeof filterDialogRef.current.applyFilters === "function"
    ) {
      filterDialogRef.current.applyFilters(updatedFilters);
    }
    setFilters(updatedFilters);
  };

  console.log("APIID in result", apiId);
  console.log("connectt", connection_id);
  const apiSource =
    (sourceType === "api" && apiId) || (type === "dataset" && apiId);
  const csvSource =
    (sourceType === "csv" && csvId) || (type === "dataset" && csvId);

  // Function to apply the custom theme to the Monaco editor
  const handleEditorDidMount = (
    editor: monaco2.editor.IStandaloneCodeEditor,
    monaco: typeof monaco2
  ) => {
    const modifiedtwilightTheme: monaco2.editor.IStandaloneThemeData = {
      base: twilight.base as monaco2.editor.BuiltinTheme,
      inherit: twilight.inherit,
      rules: twilight.rules,
      colors: {
        ...twilight.colors,
        "editor.background": "#111111",
        "editor.textColor": "#FFFFFF",
      },
    };
    monaco.editor.defineTheme("twilight", modifiedtwilightTheme);
    monaco.editor.setTheme("twilight");

    // Define SQL keywords
    const sqlKeywords = [
      {
        label: "SELECT",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "SELECT ",
      },
      {
        label: "FROM",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "FROM ",
      },
      {
        label: "WHERE",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "WHERE ",
      },
      {
        label: "JOIN",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "JOIN ",
      },
      {
        label: "LEFT JOIN",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "LEFT JOIN ",
      },
      {
        label: "RIGHT JOIN",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "RIGHT JOIN ",
      },
      {
        label: "INNER JOIN",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "INNER JOIN ",
      },
      {
        label: "GROUP BY",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "GROUP BY ",
      },
      {
        label: "ORDER BY",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "ORDER BY ",
      },
      {
        label: "HAVING",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "HAVING ",
      },
      {
        label: "LIMIT",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "LIMIT ",
      },
    ];

    // Register the completion item provider
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        
        // Check if user just typed a backtick
        const isAfterBacktick = textBeforeCursor.endsWith('`');
        
        // Check if we're inside backticks (for table name context)
        const backtickCount = (textBeforeCursor.match(/`/g) || []).length;
        const isInsideBackticks = backtickCount % 2 === 1;

        let suggestions: any[] = [];
        
        // If user typed backtick or is inside backticks, prioritize table suggestions
        if (isAfterBacktick || isInsideBackticks) {
          suggestions = tables.map((table) => ({
            label: table,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: isAfterBacktick ? `${table}\`` : table,
            detail: "Table",
            documentation: `Database table: ${table}`,
            sortText: `0_${table}`, // Higher priority
          }));
        } else {
          // Regular suggestions (keywords, tables, columns)
          suggestions = [
            ...sqlKeywords,
            ...tables.map((table) => ({
              label: table,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: `\`${table}\``,
              detail: "Table",
              documentation: `Database table: ${table}`,
              sortText: `1_${table}`,
            })),
            ...columns.map((column) => ({
              label: column,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: column,
              detail: "Column",
              documentation: `Table column: ${column}`,
              sortText: `2_${column}`,
            })),
          ];
        }

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: suggestions.map((suggestion) => ({
            ...suggestion,
            range: range,
          })),
        };
      },
      triggerCharacters: ['`', ' ', '.'], // Trigger completion on backtick, space, and dot
    });

    // Add a key binding to trigger completion when backtick is pressed
    editor.addCommand(monaco.KeyCode.Backquote, () => {
      editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
    });
  };

  // Handle data visualization
  const handleVisualizeData = () => {
    if (showSummarizePanel) {
      setShowSummarizePanel(!showSummarizePanel);
    } else if (isAiSidePanelOpen) {
      setIsAiSidePanelOpen(false);
    }
    setShowSidePanel(!showSidePanel);
  };

  useEffect(() => {
    if (isAiSidePanelOpen === true) {
      setShowSidePanel(false);
      setShowSummarizePanel(false);
    }
  }, [isAiSidePanelOpen]);

  // Handle SQL input change
  const handleSqlChange = (value: string | undefined) => {
    if (value !== undefined) {
      setSqlQuery(value);
    }
  };

  function updateStateWithFetchedData(
    data: {
      columns: any[];
      rows: any[];
      columnTypes: any;
      primaryKeys: any;
      query: any;
      columnMetadata: any;
    },
    formattedRows: any[]
  ) {
    const filteredColumns = data.columns.filter((column: string | number) =>
      data.rows.some(
        (row: any) => row[column] !== null && row[column] !== undefined
      )
    );

    setRows(formattedRows);
    setData(formattedRows);
    setColumns(filteredColumns);
    if (allColumns.length === 0) setAllColumns(filteredColumns);

    setColumnTypes(data.columnTypes || []);
    setPrimaryKeys(data.primaryKeys || []);
    setSqlQuery(data.query || "");
    setColumnMetadata(data.columnMetadata || []);
    setGroupByValue([]);
  }

  const handleSqlSubmit = async (query?: string) => {
    const queryToExecute = query || sqlQuery;
    
    if (!queryToExecute) {
      toast.error("SQL Query cannot be empty");
      return;
    }

    setQueryLoading(true);

    try {
      console.log("Connection_Id", connection_id);
      console.log("Executing query:", queryToExecute);
      
      // Update the SQL query state if a new query is provided
      if (query && query !== sqlQuery) {
        setSqlQuery(query);
      }
      
      const response = await fetch(`/api/database/${connection_id}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryToExecute }),
      });

      const data = await response.json();
      console.log("Response from query:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to execute the query.");
      }

      // Extract queryResult from the response
      if (!data || !Array.isArray(data.queryResult)) {
        throw new Error(
          "Invalid response format: Expected 'queryResult' as an array."
        );
      }

      const rowsData = data.queryResult; // Extracted data
      setDatetimeColumns(detectDatetimeColumns(rowsData));
      const formattedRows = rowsData.map((row: any) =>
        formatRowData(row, datetimeColumns)
      );

      // Update state with new data
      const newColumns = rowsData.length > 0 ? Object.keys(rowsData[0]) : [];
      setColumns(newColumns);
      setAllColumns(newColumns);
      setRows(formattedRows);
      setData(formattedRows); // Make sure to update the main data state
      setRawRows(rowsData); // Update raw rows for other components
      
      if (data.primaryKeys) {
        setPrimaryKeys(data.primaryKeys);
      }
      if (data.columnTypes) {
        setColumnTypes(data.columnTypes);
      }
      
      setSelectedVisualization("table");

      toast.success("Query executed successfully!");
    } catch (error: any) {
      toast.error(
        error.message || "An error occurred while executing the query."
      );
      console.error("Error executing query:", error);
    }

    setQueryLoading(false);
  };

  useEffect(() => {
    console.log("Selected Visualization:", selectedVisualization);
  }, [selectedVisualization]);

  // Helper: Check if table is an API connection table and refresh if so
  async function maybeRefreshApiTable(connectionId: string, tableName: string) {
    try {
      const { data: apiConn, error } = await supabaseClient
        .from("api_connections")
        .select("id, api_url, api_key, table_name")
        .eq("database_connection_id", connectionId)
        .eq("table_name", tableName)
        .single();
      if (apiConn && apiConn.id == connectionId && apiConn.table_name == tableName) {
        
      const response = await fetch(apiConn.api_url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiConn.api_key}`,
          "Cache-Control": "no-cache",
        },
      });
  
      if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
  
      const apiData = await response.json();
        // Found an API connection, refresh the data
        await fetch(`/api/api/${apiConn.id}/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId: connectionId,
            tableName: tableName,
            data: apiData,
          }),
        });
      }
    } catch (err) {
      // Silently fail, just log
      console.warn("maybeRefreshApiTable error", err);
    }
  }

  async function fetchData({
    aggregate,
    column,
    groupBy,
    limit,
    dateView,
    dateBy,
    rawQuery,
    binColumn,
    binSize,
  } = {}) {
    // Create an abort controller for cleanup
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    try {
      setLoading(true);
      let url = "";
      let params = new URLSearchParams();

      // Add common query parameters
      if (aggregate) params.append("aggregate", aggregate);
      if (column) params.append("column", column);
      if (limit) params.append("limit", limit.toString());
      if (Array.isArray(groupBy) && groupBy.length > 0) {
        params.append("groupBy", groupBy.join(","));
      } else if (typeof groupBy === "string") {
        params.append("groupBy", groupBy);
      }
      if (dateView) params.append("dateView", dateView);
      if (dateBy) params.append("dateBy", dateBy);
      if (rawQuery) {
        params.append("rawQuery", rawQuery);
        params.append("query", sqlAiQuery);
      }
      if (binColumn) params.append("binColumn", binColumn);
      if (binSize) params.append("binSize", binSize.toString());

      // Check and refresh if this is an API connection table
      if (connection_id && tableName) {
        await maybeRefreshApiTable(connection_id, tableName);
      }

      // Fetch from database source
      if (sourceType === "database" && !apiId) {
        if (type === "table" && tableName) {
          url = `/api/database/${connection_id}/tables/${tableName}?${params.toString()}`;
        } else if (type === "dataset" && dataset_id) {
          url = `/api/datasets/${connectionId}/${dataset_id}/${dataset_name}?${params.toString()}`;
        }

        if (!url) {
          throw new Error("Invalid URL for fetching data.");
        }

        const response = await fetch(url, { signal });
        if (signal.aborted) return; // Exit if aborted
        
        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(
            responseData?.message || "Failed to fetch data from API."
          );
        }

        const data = await response.json();
        if (signal.aborted) return; // Exit if aborted
        
        const responseData = data;

        // Process database or dataset response
        // For dataset API, extract columns and rows
        let rows = data.rows || data.datasetData?.rows || [];
        let columns = data.columns || data.datasetData?.columns || [];
        let dateBy: string | undefined = data.selectedDateBy;
        let pKeys = responseData.primaryKeys || [];
        let colTypes = responseData.columnTypes || [];
        setExecutionTime(
          responseData.queryExecutionTime ||
            responseData.queryExecutionTime ||
            0
        );

        // Filter out columns that have only null/undefined values
        const filteredColumns = columns.filter((column: string | number) =>
          rows.some(
            (row: { [x: string]: undefined }) =>
              row[column] !== null && row[column] !== undefined
          )
        );

        // Save raw data for future reformatting
        setRawRows(rows);

        // Detect datetime columns and format rows accordingly
        const rawDatetimeCols = detectDatetimeColumns(rows);
        const datetimeColumns = Array.from(new Set([...rawDatetimeCols]));
        setDatetimeColumns(datetimeColumns);
        setSelectedDateBy(dateBy);

        console.log("Datetime Columns:", datetimeColumns);
        console.log("Rows before formatting:", rows);
        console.log("Columns before formatting:", columns);

        const formattedRows = rows.map((row: any) =>
          formatRowData(row, datetimeColumns, dateBy)
        );
        
        if (signal.aborted) return; // Exit if aborted
        
        console.log("Formatted Rows:", formattedRows);
        console.log("Columns after formatting:", columns);
        console.log("Filtered Columns:", filteredColumns);
        console.log("Filtered Rows:", rows);
        console.log("Datetime Columns:", datetimeColumns);

        // Handle auto-pivoting logic
        if (dateBy && groupByValue?.length > 0 && groupByValue.length <= 2) {
          const { pivotData, pivotColumns, rowKey } = autoPivotRows(
            formattedRows,
            dateBy
          );
          console.log("Pivot Data:", pivotData);
          console.log("Pivot Columns:", pivotColumns);
          console.log("Row Key:", rowKey);
          
          if (!signal.aborted) {
            setRows(pivotData);
            setColumns([rowKey, ...pivotColumns]);
          }
        } else {
          if (!signal.aborted) {
            setRows(formattedRows);
            setColumns(filteredColumns);
          }
        }

        // Update additional state based on response
        if (!signal.aborted) {
          if (allColumns.length === 0) {
            setAllColumns(filteredColumns);
          }
          setPrimaryKeys(pKeys[0] || []);
          console.log("Primary Keys", primaryKeys);
          setColumnTypes(colTypes || []);
          console.log("Column Types", columnTypes);
          setSqlQuery(responseData.query || "");
          setData(formattedRows);

          // Set visualization type based on result size
          if (formattedRows.length === 1) {
            setSelectedVisualization("number");
          } else if (formattedRows.length > 1) {
            setSelectedVisualization("table");
          }

          if (type === "dataset") {
            const datasetDetails = await fetchDatasetDetails();
            if (!signal.aborted && datasetDetails) {
              updateVisualizationData(datasetDetails);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
    
    // Return the abort controller so it can be used for cleanup
    return abortController;
  }

  useEffect(() => {
    fetchData();
  }, [sourceType, connection_id, tableName, apiId, csvId, type, dataset_id]);

  const filteredRows = useMemo(() => {
    return Array.isArray(rows)
      ? rows.filter((row) =>
          columns.some((column) =>
            row[column]
              ?.toString()
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          )
        )
      : [];
  }, [rows, columns, searchTerm]);

  console.log("FilteredRows", filteredRows);
  // Save or update dataset in Supabase
  const saveDataset = async () => {
    if (!newDatasetName || !datasetDescription) {
      toast.error("Dataset name and description cannot be empty");
      return;
    }

    try {
      // If dataset_id exists, update the existing dataset
      if (dataset_id) {
        const { data, error } = await supabaseClient
          .from("datasets")
          .update({
            dataset_name: newDatasetName,
            table_name: tableName,
            dataset_description: datasetDescription,
            sql_query: sqlQuery || `SELECT * FROM ${tableName}`,
            selectedAggregate: selectedAggregate,
            selectedGroupByValues: groupByValue,
            selectedDateBy: selectedDateBy,
            visualization_type: selectedVisualization, // Save selected visualization type
            selectedField: selectedColumn, // Save selected column
            x_axis: xAxis, // Save x-axis
            y_axis: yAxis.join(","),
            is_stacked: isStacked, // Save isStacked property
            filters: filters,
          })
          .eq("connection_id", connection_id)
          .eq("id", dataset_id); // Match the current dataset

        if (error) {
          toast.error("Error updating dataset");
          console.error("Error updating dataset:", error);
        } else {
          toast.success("Dataset updated successfully!");
          onSaveClose();
          router.push("/dashboard/datasets");
        }
      } else {
        // Insert new dataset if dataset_id does not exist
        console.log("APIID", apiId);

        const { data, error } = await supabaseClient.from("datasets").insert({
          connection_id: connection_id,
          dataset_name: newDatasetName,
          dataset_description: datasetDescription,
          selectedField: selectedColumn,
          selectedAggregate: selectedAggregate,
          selectedDateBy: selectedDateBy,
          selectedGroupByValues: groupByValue,
          visualization_type: selectedVisualization, // Save selected visualization type
          sql_query: sqlQuery || `SELECT * FROM ${tableName}`,
          x_axis: xAxis, // Save x-axis
          y_axis: yAxis.join(","),
          is_stacked: isStacked, // Save isStacked property
          user_id: user?.id || "",
          filters: filters,
          api_id: sourceType === "api" ? apiId : null, // Save API ID if source type is API
          csv_id: sourceType === "csv" ? csvId : null, // Save CSV ID if source type is CSV
        });

        if (error) {
          toast.error("Error saving dataset");
          console.error("Error saving dataset:", error);
        } else {
          toast.success("Dataset saved successfully!");
          onSaveClose();
          router.push("/dashboard/datasets");
        }
      }
    } catch (error) {
      console.error("Error saving dataset:", error);
      toast.error("Error saving dataset");
    }
  };
  // Function to update the SQL query or API URL of an existing dataset
  const updateDataset = async () => {
    if (sourceType === "database" && !sqlQuery) {
      toast.error("SQL Query cannot be empty");
      return;
    }

    if (sourceType === "api" && !apiUrl) {
      toast.error("API URL cannot be empty");
      return;
    }

    try {
      const updateData = {
        sql_query: sourceType === "database" ? sqlQuery : undefined,
        visualization_type: selectedVisualization,
        selectedField: selectedColumn || [xAxis && yAxis],
        x_axis: xAxis,
        y_axis: yAxis.join(","),
        is_stacked: isStacked,
        filters: filters,
        table_name: tableName,
      };

      const { error } = await supabaseClient
        .from("datasets")
        .update(updateData)
        .eq("connection_id", connectionId)
        .eq("id", dataset_id);

      if (error) {
        toast.error("Error updating dataset");
        console.error("Error updating dataset:", error);
        return;
      }

      if (sourceType === "api" && apiId) {
        const { error: apiError } = await supabaseClient
          .from("api_connections")
          .update({ api_url: apiUrl })
          .eq("id", apiId);

        if (apiError) {
          toast.error("Error updating API URL");
          console.error("Error updating API URL:", apiError);
          return;
        }
      }

      toast.success("Dataset updated successfully!");
    } catch (error) {
      console.error("Error updating dataset:", error);
      toast.error("Error updating dataset");
    }
  };

  const renderVisualizationOptions = () => {
    return visualizationOptions.map(
      (option: {
        value:
          | string
          | number
          | bigint
          | ((prevState: string) => string)
          | null
          | undefined;
        icon:
          | string
          | number
          | bigint
          | boolean
          | React.ReactElement<any, string | React.JSXElementConstructor<any>>
          | Iterable<React.ReactNode>
          | React.ReactPortal
          | Promise<React.AwaitedReactNode>
          | null
          | undefined;
        label:
          | string
          | number
          | bigint
          | boolean
          | React.ReactElement<any, string | React.JSXElementConstructor<any>>
          | Iterable<React.ReactNode>
          | React.ReactPortal
          | Promise<React.AwaitedReactNode>
          | null
          | undefined;
      }) => (
        <Card
          isPressable
          key={option.value}
          className={`flex items-center data-[press]: shadow-none h-32 rounded-sm bg-background border hover:bg-primary/20 text-foreground cursor-pointer transition-all ease-in-out ${
            selectedVisualization === option.value
              ? "bg-primary/15 text-[#c09600]"
              : ""
          }`}
          onPress={() => {
            if (option.value !== undefined) {
              setSelectedVisualization(option.value as string);
            }
          }}
        >
          <CardBody className="overflow-visible flex justify-center items-center">
            {option.icon}
          </CardBody>
          <span className="text-center mb-2">{option.label}</span>
        </Card>
      )
    );
  };

  // in generaterandomcolor only these color variables, var(--chart-1), var(--chart-2), var(--chart-3), var(--chart-4)
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
  ];

  console.log("Raw Rows:", rawRows);

  // Memoize axes determination to ensure proper updates when data changes
  const { xAxis: xAxis2, seriesAxis, measure, yAxis: yAxis2 } = useMemo(() => {
    const axes = determineAxes(filteredRows);
    console.log("Auto-determined axes:", axes);
    return axes;
  }, [filteredRows]);

  // Use store axes when available, fallback to auto-determined axes
  const effectiveXAxis = xAxis || xAxis2;
  const effectiveYAxis = yAxis && yAxis.length > 0 ? yAxis : yAxis2;
  
  console.log("Effective axes being used:", { 
    xAxis: effectiveXAxis, 
    yAxis: effectiveYAxis, 
    storeXAxis: xAxis, 
    storeYAxis: yAxis,
    autoXAxis: xAxis2, 
    autoYAxis: yAxis2 
  });

  const chartData = useMemo(() => {
    const formattedData = detectDatetimeColumns(rawRows)
      ? rawRows.map((row) =>
          formatRowData(row, datetimeColumns, selectedDateBy)
        )
      : rawRows;
    console.log("Formatted Data for Chart:", formattedData);
    console.log("Group By Value:", groupByValue);
    console.log("Effective X-Axis for Chart Data:", effectiveXAxis);
    console.log("Effective Y-Axis for Chart Data:", effectiveYAxis);
    
    if (selectedDateBy || groupByValue.length == 2) {
      console.log("rwRows:", rawRows);
      console.log("FormattedData:", formattedData);
      console.log("effectiveXAxis:", effectiveXAxis);
      console.log("seriessAxis:", seriesAxis);
      console.log("measrues:", measure);
      console.log("effectiveYAxis:", effectiveYAxis);
      const {
        pivotData: pivotDataa,
        pivotColumns,
        rowKey,
      } = autoPivotRows(formattedData);
      console.log("PData for Chart:", pivotDataa);
      return pivotDataa;
    } else {
      return formattedData;
    }
  }, [rawRows, datetimeColumns, selectedDateBy, groupByValue, effectiveXAxis, seriesAxis, measure, effectiveYAxis]);

  // Computes available Y-axis keys from pivoted chart data.
  const computeYAxisKeys = (pivotData: any[], xAxis: string): string[] => {
    if (!pivotData || !xAxis) return [];
    const keys = new Set<string>();
    pivotData.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== xAxis) keys.add(key);
      });
    });
    return Array.from(keys);
  };

  // Compute Y-axis keys from pivoted data using effective X-axis
  const computedYAxisKeys = useMemo(() => {
    return computeYAxisKeys(chartData, effectiveXAxis);
  }, [chartData, effectiveXAxis]);

  console.log("Transformed Chart Data:", chartData);
  console.log("Computed Y-Axis:", computedYAxisKeys);

  const [labelColor, setLabelColor] = useState(""); // Default fallback

  const formatLabel = (label: string) => {
    return label
      ?.replace(/_/g, " ") // Replace underscores with spaces
      .toLowerCase() // Convert everything to lowercase
      .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
  };

  useEffect(() => {
    const foregroundColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--tw-foreground")
      .trim();
    if (foregroundColor) setLabelColor(foregroundColor + "25");
  }, []);

  const chartConfig: ChartConfig = {
    [effectiveXAxis]: {
      label: formatLabel(effectiveXAxis),
      color: labelColor, // Explicitly setting label color
    },
    ...Object.fromEntries(
      effectiveYAxis.map((y) => [
        y,
        {
          label: formatLabel(y),
          color: labelColor, // Ensures Y-axis labels are visible
        },
      ])
    ),
  };

  const handleFilterOpen = () => {
    onFilterOpen();
  };

  const handleFilterChange = (filters: FilterRow[]) => {
    setFilters(filters);
  };

  const fetchDbData = async ({
    aggregate,
    column,
    groupBy,
    limit,
    dateView,
    dateBy,
    rawQuery, // new parameter
    binColumn,
    binSize,
  }: {
    aggregate?: string;
    column?: string;
    groupBy?: string | string[];
    limit?: number;
    dateView?: string;
    dateBy?: string;
    rawQuery?: string;
    binColumn?: string;
    binSize?: number;
  }) => {
    try {
      setQueryLoading(true);

      // Check and refresh if this is an API connection table
      if (connection_id && tableName) {
        await maybeRefreshApiTable(connection_id, tableName);
      }

      // If rawRows already exist and we're just changing date format, reformat the dates.
      if (rawRows && rawRows.length > 0 && dateBy && !aggregate) {
        // Detect datetime columns from the raw data.
        const rawDatetimeCols = detectDatetimeColumns(rawRows);
        const datetimeColumns = Array.from(new Set([...rawDatetimeCols]));
        setDatetimeColumns(datetimeColumns);

        // Reformat the rows based on the new dateBy granularity.
        const formattedRows = rawRows.map((row: any) =>
          formatRowData(row, datetimeColumns, dateBy)
        );

        // detect how many groupBy values are there from sqlQuery (e.g SELECT * From table GROUP BY property_type, client_status then [property_type, client_status] there are 2 group by values)
        // create function for detecting this

        // If autopivoting is desired when a date filter is applied,
        // apply the autoPivotRows function.
        if (dateBy && (!groupByValue || groupByValue.length <= 2)) {
          const { pivotData, pivotColumns, rowKey } = autoPivotRows(
            formattedRows,
            dateBy
          );
          console.log("Pivot Data:", pivotData);
          console.log("Pivot Columns:", pivotColumns);
          console.log("Row Key:", rowKey);
          setRows(pivotData);
          setColumns([rowKey, ...pivotColumns]);
        } else {
          setRows(formattedRows);
          setColumns(allColumns);
        }
        setQueryLoading(false);
        return;
      }

      // Otherwise, fetch data from the API.
      const params = new URLSearchParams();
      if (aggregate) params.append("aggregate", aggregate);
      if (column) params.append("column", column);
      if (limit) params.append("limit", limit.toString());
      if (Array.isArray(groupBy) && groupBy.length > 0) {
        params.append("groupBy", groupBy.join(","));
      } else if (typeof groupBy === "string") {
        params.append("groupBy", groupBy);
      }
      if (dateView) params.append("dateView", dateView);
      if (dateBy) params.append("dateBy", dateBy);
      if (rawQuery) {
        params.append("rawQuery", rawQuery);
        params.append("query", sqlAiQuery);
      }
      if (binColumn) params.append("binColumn", binColumn);
      if (binSize) params.append("binSize", binSize.toString());

      const response = await fetch(
        `/api/database/${connection_id}/tables/${tableName}?${params.toString()}`,
        { method: "GET" }
      );
      if (!response.ok) throw new Error("Failed to fetch data");
      const data = await response.json();

      // Save raw data for future reformatting.
      setRawRows(data.rows);
      setExecutionTime(data.queryExecutionTime || 0);

      // Detect datetime columns from the fetched data.
      const rawDatetimeCols = detectDatetimeColumns(data.rows);
      const datetimeColumns = Array.from(new Set([...rawDatetimeCols]));
      setDatetimeColumns(datetimeColumns);

      const formattedRows = data.rows.map((row: any) =>
        formatRowData(row, datetimeColumns, dateBy)
      );

      console.log("Formatted Rows:", formattedRows);
      // Suppose groupByValue holds your groupBy columns (could be ["property_type", "client_status"]).
      // Then:
      console.log("DateBy:", dateBy);
      console.log("groupByValue:", groupByValue);
      // groupBy can contain multiple values, so we need to extract how many values are there
      console.log("groupbyValue length:", groupByValue.length);
      if (dateBy || groupByValue.length == 2) {
        const { pivotData, pivotColumns, rowKey } = autoPivotRows(
          formattedRows,
          dateBy
        );
        console.log("Pivot Data1:", pivotData);
        console.log("Pivot Columns:", pivotColumns);
        console.log("Row Key:", rowKey);
        setRows(pivotData);
        setColumns([rowKey, ...pivotColumns]);
      } else {
        setRows(formattedRows);
        setColumns(data.columns);
      }

      // if only 1 row returned set visualization type as number
      if (formattedRows.length === 1) {
        setSelectedVisualization("number");
      } else if (formattedRows.length > 1) {
        setSelectedVisualization("table");
      }

      setPrimaryKeys(data.primaryKeys[0]);
      setColumnTypes(data.columnTypes);
      setSqlQuery(data.query);
      setData(formattedRows);
      setQueryLoading(false);
    } catch (error) {
      console.error("Error fetching database details:", error);
      setQueryLoading(false);
    }
  };

  useEffect(() => {
    console.log("Selected Y-Axis:", yAxis);
  }, [yAxis]);

  // Auto-determine axes when visualization changes
  useEffect(() => {
    const { xAxis: autoXAxis, yAxis: autoYAxis } = determineAxes(chartData);
    console.log("Auto X Axis:", autoXAxis);
    console.log("Auto Y Axis:", autoYAxis);

    if (
      selectedVisualization === "bar" ||
      selectedVisualization === "line" ||
      selectedVisualization === "area" ||
      selectedVisualization === "pie"
    ) {
      // Only set xAxis if not already set by the dataset/user
      if (!xAxis) {
        setXAxis(autoXAxis);
      }
      // Only set yAxis if user hasn't selected any columns yet
      if (!yAxis || yAxis.length === 0) {
        setYAxis(autoYAxis);
      }
    } else if (selectedVisualization === "number") {
      // Set default selectedColumn to the first column if not already set
      if (columns.length > 0 && (!selectedColumn || rows.length === 1)) {
        setSelectedColumn(columns[0]);
      }
    }
  }, [selectedVisualization, columns, rows, filteredRows, chartData]);

  // Render settings for the selected visualization
  const RenderVisualizationSettings = () => {
    if (selectedVisualization === "table") {
      return <p>No additional settings for Table.</p>;
    }

    const xAxisKeys = Object?.keys(rawRows[0] || {});
    console.log("X-Axis Keys:", xAxisKeys);

    return (
      <>
        <div className="my-4">
          <Label>Title</Label>
          <Input
            value={widgetTitle}
            onChange={(e) => setWidgetTitle(e.target.value)}
            placeholder="Enter widget title"
          />
        </div>
        <div className="my-4">
          <Label>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter widget description"
          />
        </div>
        {selectedVisualization !== "number" && (
          <>
            <div className="my-4">
              <Label>X-Axis</Label>
              <Select
                label="Select X-Axis"
                selectionMode="single"
                placeholder="Choose a column for X-Axis"
                defaultSelectedKeys={new Set(xAxis ? [xAxis] : [])}
                onSelectionChange={(keys) => {
                  // Convert the Set to an array and update xAxis with the first item.
                  const key = Array.from(keys)[0] as string;
                  setXAxis(key);
                }}
              >
                {xAxisKeys.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="my-4">
              <Label>Y-Axis</Label>
              <Select
                label="Select Y-Axis"
                placeholder="Choose columns for Y-Axis"
                selectionMode="multiple"
                selectedKeys={new Set(yAxis)}
                onSelectionChange={(keys) =>
                  setYAxis(Array.from(keys) as string[])
                }
              >
                {computedYAxisKeys.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* Stacked Bar Chart Toggle */}
            <div className="flex items-center mt-2">
              <Switch
                type=""
                isSelected={isStacked}
                onValueChange={setIsStacked}
                className="mr-2"
              />
              <Label>Make it stacked</Label>
            </div>
          </>
        )}
        {selectedVisualization === "number" && (
          <div className="my-4">
            <Label>Select Field to Show</Label>
            <Select
              label="Select Field"
              placeholder="Choose a field"
              selectedKeys={selectedColumn ? [selectedColumn] : []}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0];
                setSelectedColumn(selectedKey as string);
              }}
            >
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </Select>
          </div>
        )}
      </>
    );
  };
  const transformAndExecuteQuery = () => {
    const originalQuery = sqlAiQuery || sqlQuery;

    if (selectedDateBy && originalQuery) {
      const transformedQuery = manipulateRawQueryWithGroupBy(
        originalQuery,
        selectedDateBy
      );

      fetchDbData({
        aggregate: selectedAggregate,
        column: selectedValues.join(","),
        groupBy: groupByValue.join(","),
        dateView: selectedDateView,
        dateBy: selectedDateBy,
        rawQuery: true,
        query: transformedQuery,
      });
    } else {
      // Fallback in case something is missing
      console.warn("Missing dateBy or SQL query for transformation.");
    }
  };
  const handleApplyClick = () => {
    const isRawQuery = !!sqlAiQuery; // If AI query exists, use rawQuery as true

    console.log("Sql AI Query:", sqlAiQuery);
    console.log("Is Raw Query:", isRawQuery);
    console.log("Selected Date By:", selectedDateBy);
    console.log("Selected Date View:", selectedDateView);
    console.log("Selected Aggregate:", selectedAggregate);
    console.log("Group By Value:", groupByValue);
    console.log("Selected Visualization:", selectedVisualization);
    console.log("Selected Column:", selectedColumn);
    console.log("X-Axis:", xAxis);
    console.log("Y-Axis:", yAxis);
    console.log("Is Stacked:", isStacked);
    console.log("SQL Query:", sqlQuery);
    console.log("ai query", sqlAiQuery);
    console.log("Aggregate", selectedAggregate);
    console.log("Column", selectedValues);

    if (isRawQuery && selectedDateBy) {
      transformAndExecuteQuery();
    } else {
      fetchDbData({
        aggregate: selectedAggregate,
        column: selectedValues.join(","),
        groupBy: groupByValue.join(","),
        dateView: selectedDateView,
        dateBy: selectedDateBy,
        rawQuery: false,
        query: sqlQuery,
      });
    }
  };

  useEffect(() => {
    if (sourceType === "api" && apiId) {
      supabaseClient
        .from("api_connections")
        .select("*")
        .eq("id", apiId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching API details:", error);
          } else {
            setApiUrl(data.api_url);
          }
        });
    }
  }, [sourceType, apiId]);

  const handleApiUrlChange = async (url: string) => {
    setQueryLoading(true);
    const { error } = await supabaseClient
      .from("api_connections")
      .update({ api_url: url })
      .eq("id", apiId);
    setApiUrl(url);
    if (error) throw error;

    // Fetch data from the updated API URL
    const response = await fetch(url, {
      method: "GET",
    });
    const apiData = await response.json();
    console.log("API Data", apiData);
    if (
      Array.isArray(apiData) &&
      apiData.length > 0 &&
      typeof apiData[0] === "object"
    ) {
      const columns = Object.keys(apiData[0]);
      setColumns(columns);
      setRows(apiData); // Set rows as an array of objects
    } else if (typeof apiData === "object" && apiData !== null) {
      const columns = Object.keys(apiData);
      const rows = [apiData]; // Wrap single object in an array
      setColumns(columns);
      setRows(rows);
    } else {
      toast.error("Unexpected API response format");
    }
    setQueryLoading(false);
  };

  const refreshApiData = async () => {
    try {
      setIsRefreshing(true);
  
      // 1. Fetch the API connection by connectionId + userId (assuming you have connectionId)
      const { data: apiConnection, error: apiError } = await supabaseClient
        .from("api_connections")
        .select("*")
        .eq("database_connection_id", connection_id) // Use connectionId here
        .eq("user_id", userId)
        .single();
  
      if (apiError) throw apiError;
  
      // 2. Fetch data from the external API URL
      const response = await fetch(apiConnection.api_url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiConnection.api_key}`,
          "Cache-Control": "no-cache",
        },
      });
  
      if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
  
      const apiData = await response.json();
  
      // 3. Call your backend API to update DB with connectionId and tableName
      const updateResponse = await fetch(`/api/api/${apiId}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId: apiConnection.database_connection_id,
          tableName: apiConnection.table_name,
          data: apiData,
        }),
      });
  
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || "Failed to update user database");
      }
  
      // 4. Update UI
      if (Array.isArray(apiData)) {
        setColumns(Object.keys(apiData[0]));
        setRows(apiData);
        setData(apiData);
      } else {
        throw new Error("Unexpected API response format.");
      }
  
      toast.success("Data refreshed and updated in database successfully.");
    } catch (error: any) {
      toast.error(error.message || "Failed to refresh data.");
    } finally {
      setIsRefreshing(false);
    }
  };
  

  console.log("ResultPage re-rendered");

  const getVisualizationClassName = useCallback(
    (showSidePanel: boolean, showSummarizePanel: boolean) => {
      if (showSidePanel) {
        return "relative h-full transition-all duration-800 ease-in-out col-span-6 pr-[482px]";
      } else if (showSummarizePanel) {
        return "relative h-full transition-all duration-800 ease-in-out col-span-6 pr-[380px]";
      } else if (isSidePanelOpen) {
        return "relative h-full transition-all duration-800 ease-in-out col-span-6 pr-[540px]";
      }
      return "relative h-full transition-all duration-800 ease-in-out col-span-6";
    },
    [showSidePanel, showSummarizePanel, isSidePanelOpen]
  );

  // Optionally, if using dataset, fetch table name from supabase:
  useEffect(() => {
    if (type === "dataset") {
      (async () => {
        try {
          const { data, error } = await supabaseClient
            .from("datasets")
            .select("table_name")
            .eq("id", dataset_id)
            .single();
          if (error) throw error;
          if (data?.table_name) {
            setEffectiveTableName(data.table_name);
          }
        } catch (error) {
          console.error("Error fetching dataset table name:", error);
        }
      })();
    }
  }, [dataset_id, type]);

  // Extracted applyFilters function:
  const applyFilters = async (newFilters?: FilterRow[]) => {
    const filtersToUse = newFilters || filters;
    console.log("New Filters:", filtersToUse);

    if (!originalQuery) {
      setOriginalQuery(sqlQuery);
    }

    setQueryLoading(true);

    try {
      const filtersJSON = JSON.stringify(filtersToUse);
      console.log("Filters JSON:", filtersJSON);

      const table_name = tableName || effectiveTableName;

      const url = `/api/database/${connection_id}/tables/${table_name}?filters=${encodeURIComponent(
        filtersJSON
      )}`;

      const res = await fetch(url, { method: "GET" });
      const data = await res.json();

      // Detect datetime columns from the first row
      const datetimeColumns = detectDatetimeColumns(data.rows);
      console.log("Detected Datetime Columns:", datetimeColumns);

      // Format datetime columns for display
      const formattedRows = data.rows.map((row: any) =>
        formatRowData(row, datetimeColumns, queryOptions.dateBy)
      );

      setRows(formattedRows); // Use formatted values for display
      setSqlQuery(data.query);
      setColumns(data.columns);

      if (allColumns.length === 0) {
        setAllColumns(data.columns);
      }
      setPrimaryKeys(data.primaryKeys);
      setColumnTypes(data.columnTypes);
      toast.success("Filter Applied");
    } catch (error) {
      console.error("Error fetching filtered data:", error);
    } finally {
      setQueryLoading(false);
      onFilterClose();
    }
  };

  return (
    <main className="flex flex-col w-full h-full overflow-hidden">
      <div className="w-full max-w-[calc(100vw-3vw)] rounded-none">
        {loading ? (
          <Skeleton className="h-[400px]" />
        ) : (
          <div className="grid grid-cols-6 gap-4 h-full">
            {/* Visualization Section */}
            <div
              className={getVisualizationClassName(
                showSidePanel,
                showSummarizePanel
              )}
            >
              <div
                className={`flex flex-row items-center p-2 ${
                  selectedVisualization === "table"
                    ? "justify-between"
                    : "justify-end"
                }`}
              >
                {selectedVisualization === "table" && (
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    startContent={<Search height={20} width={20} />}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="max-w-xs"
                  />
                )}
                <div className="flex flex-row gap-2">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Tooltip content="Refresh API Data" placement="bottom">
                        <Button
                          isIconOnly
                          color="primary"
                          variant="ghost"
                          className="flex items-center h-8 rounded-sm transition-all ease-in-out"
                          onClick={refreshApiData}
                          isLoading={isRefreshing}
                          isDisabled={isRefreshing || !apiId}
                        >
                          <RefreshCw
                            height={18}
                            width={18}
                            className={isRefreshing ? "animate-spin" : ""}
                          />
                        </Button>
                      </Tooltip>
                    </motion.div>
                  <Tooltip content="Advanced Settings" placement="bottom">
                    <Button
                      isIconOnly
                      color="default"
                      variant="ghost"
                      className="flex items-center h-8 rounded-sm transition-all ease-in-out"
                      onClick={handleVisualizeData}
                    >
                      <GearIcon height={20} width={20} />
                    </Button>
                  </Tooltip>
                  <FilterDialog
                    ref={filterDialogRef}
                    setQueryLoading={setQueryLoading}
                    setSqlQuery={setSqlQuery}
                    connectionId={connection_id || ""}
                    datasetId={dataset_id}
                    type={type}
                    tableName={tableName || ""}
                    columns={columns}
                    rows={rows}
                    filters={filters}
                    setFilters={setFilters}
                    setSqlQuery={setSqlQuery}
                    sqlQuery={sqlQuery}
                    setColumns={setColumns}
                    setRows={setRows}
                    actionLabel="Apply"
                    isOpen={isFilterOpen}
                    onOpen={onFilterOpen}
                    onOpenChange={onFilterClose}
                    onAction={handleFilterOpen}
                    applyFilters={applyFilters}
                    onFilterChange={(filter) =>
                      console.log("Filter changed:", filter)
                    }
                  />
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="sm"
                      color="default"
                      variant="secondary"
                      className="h-8 gap-2 transition-all ease-in-out"
                      onClick={() => {
                        if (showSidePanel) {
                          setShowSidePanel(!showSidePanel);
                        } else if (isAiSidePanelOpen) {
                          setIsAiSidePanelOpen(false);
                        }
                        setShowSummarizePanel(!showSummarizePanel);
                      }}
                    >
                      <Sigma height={20} width={20} />
                      Summarize
                    </Button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  ></motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 gap-2 ransition-all ease-in-out"
                      onClick={type === "dataset" ? updateDataset : onSaveOpen}
                    >
                      <SaveIcon height={20} width={20} />
                      Save
                    </Button>
                  </motion.div>
                </div>
              </div>
              {/* Render the chip bar in the parent */}
              <div
                className={`p-2 bg-primary/5 border-b border-t flex flex-wrap gap-2 ${
                  selectedVisualization === "table" && chipData.length > 0
                    ? "flex"
                    : "hidden"
                }`}
              >
                {chipData.map(({ id, label }) => (
                  <Chip
                    key={id}
                    size="sm"
                    color="primary"
                    onClose={() => {
                      removeChip(id);
                    }}
                    className="flex items-center rounded-full px-3 py-1"
                  >
                    {label}
                  </Chip>
                ))}
              </div>
              <div className="relative h-[calc(100vh-12vh)] w-full flex flex-col">
                {queryLoading || isRefreshing && (
                  <div className="absolute inset-0 flex gap-2 justify-center items-center backdrop-blur-md bg-background/50 z-10">
                    <Spinner size="medium" />
                    Fetching Data...
                  </div>
                )}

                <div
                  className={`relative flex flex-col h-full overflow-auto transition-opacity duration-300 ${
                    queryLoading || isRefreshing
                      ? "opacity-60 backdrop-blur-[10px]"
                      : "opacity-100 backdrop-blur-none"
                  }`}
                >
                  <div
                    className={`flex flex-col h-full overflow-auto ${
                      selectedVisualization === "table"
                        ? chipData.length > 0
                          ? "h-[calc(100vh-20vh)]"
                          : "h-[calc(100vh-15vh)]"
                        : "h-[calc(100vh-15vh)]"
                    }`}
                  >
                    <VisualizationRenderer
                      selectedVisualization={selectedVisualization}
                      rows={rows}
                      filteredRows={filteredRows}
                      columns={columns}
                      xAxis={xAxis}
                      yAxis={yAxis}
                      limit={limit}
                      setLimit={setLimit}
                      setXAxis={setXAxis}
                      primaryKeys={primaryKeys}
                      setYAxis={setYAxis}
                      loading={loading}
                      filters={filters}
                      setFilters={setFilters}
                      fetchDbData={fetchDbData}
                      chartData={chartData}
                      chartConfig={chartConfig}
                      colors={colors}
                      selectedColumn={selectedColumn || ""}
                      setSearchTerm={setSearchTerm}
                      searchTerm={searchTerm}
                      tablePagination={true}
                      stacked={isStacked}
                      applyFilters={applyFilters}
                    />
                  </div>

                  {/* Rendered below VisualizationRenderer */}
                  {datetimeColumns.length > 0 && selectedAggregate && (
                          <div id="dateformatter" className="h-14 flex items-center justify-center p-2 bg-background w-full ">

                      <Label className="text-xs text-center mr-2">View:</Label>
                      <Select
                        label="View"
                        defaultSelectedKeys={["all-time"]}
                        size="sm"
                        className="w-32"
                        isDisabled
                      >
                        {viewOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </Select>

                      <Label className="text-xs text-center mx-2">by:</Label>
                      <Select
                        label="By"
                        selectedKeys={[selectedDateBy]}
                        onSelectionChange={(keys) =>
                          setSelectedDateBy(Array.from(keys)[0] as string)
                        }
                        size="sm"
                        className="w-32"
                      >
                        {byOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </Select>

                      <Button
                        size="sm"
                        color="primary"
                        className="ml-2"
                        onClick={handleApplyClick}
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                </div>

                {/* Popover for setting the limit (placed below the table) */}
                <div className="shrink-0 bg-background px-2 flex flex-wrap items-center justify-end gap-2">
                <Popover>
                    <PopoverTrigger>
                      <Button
                        variant="link"
                        color="primary"
                        className="hover:no-underline"
                      >
                        Showing {rows.length.toLocaleString()} rows
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-4" align="end" side="top">
                      <RadioGroup
                        value={limitOption}
                        onValueChange={(val: "default" | "custom") => {
                          setLimitOption(val);
                          if (val === "default") {
                            // Immediately apply default limit.
                            setLimit(100);
                            fetchDbData({ limit: 100 });
                          }
                        }}
                        className="space-y-2"
                      >
                        <Radio value="default" size="sm">
                          <span>Show first 100</span>
                        </Radio>
                        <Radio value="custom" size="sm">
                          <span>Custom limit</span>
                        </Radio>
                      </RadioGroup>

                      {limitOption === "custom" && (
                        <div className="mt-2 pointer-events-auto">
                          <Input
                            id="custom-limit"
                            type="number"
                            value={customLimit}
                            onValueChange={(val) => setCustomLimit(Number(val))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setLimit(customLimit);
                                fetchDbData({ limit: customLimit });
                              }
                            }}
                            className="w-full rounded-sm"
                          />
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <Tooltip content="Query execution time" placement="top">
                    <div className="ml-2 flex items-center">
                      <ZapIcon className="h-4 w-4" />
                      {executionTime && (
                        <span className="text-xs text-white p-2">
                          {` ${executionTime} ms`}
                        </span>
                      )}
                    </div>
                  </Tooltip>
                  {/* popover for download/ export charts or csv */}
                  <Popover>
                    <Tooltip content="Download full results" placement="top">
                      <PopoverTrigger>
                        <Button
                          variant="ghost"
                          className="p-2 h-8 w-8"
                          aria-label="Download"
                        >
                          <DownloadIcon className="h-5 w-5" />
                        </Button>
                      </PopoverTrigger>
                    </Tooltip>
                    <PopoverContent className="p-4 w-96" align="end" side="top">
                      <h4 className="text-sm font-semibold mb-4">Download</h4>

                      {/* File Format Selection */}
                      <RadioGroup
                        label="Select File Format"
                        value={selectedFormat}
                        onValueChange={setSelectedFormat}
                        orientation="horizontal"
                        className="mb-4 flex "
                      >
                        <Radio value=".csv">.csv</Radio>
                        <Radio value=".xlsx">.xlsx</Radio>
                        <Radio value=".json">.json</Radio>
                        {isChartRendered && <Radio value=".png">.png</Radio>}
                      </RadioGroup>
                      {selectedFormat !== ".png" && (
                        <>
                          {/* Formatted/Unformatted Toggle */}
                          <div className="flex items-center justify-between mb-4">
                            <label className="text-sm">Formatted</label>
                            <Switch
                              isSelected={isFormatted}
                              onValueChange={setIsFormatted}
                              aria-label="Toggle Formatted"
                            />
                          </div>

                          {/* Example Text */}
                          <p className="text-xs text-gray-500 mb-4">
                            {isFormatted
                              ? "E.g. September 6, 2024 or $187.50, like in Refract"
                              : "E.g. 2024-09-06 or 187.50, like in database"}
                          </p>
                        </>
                      )}
                      {/* Download Button */}
                      <Button color="primary" onClick={handleDownload}>
                        <DownloadIcon className="h-4 w-4 mr-2" />
                        Download
                     
                      </Button>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            {/* Advanced Settings Panel */}
            <AdvancedSettingsPanel
              showSidePanel={showSidePanel}
              setShowSidePanel={setShowSidePanel}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              sourceType={sourceType}
              connectionId={connection_id || ""}
              apiSource={apiSource}
              sqlQuery={sqlQuery}
              handleSqlChange={handleSqlChange}
              tables={tables}
              columns={columns}
              queryLoading={queryLoading}
              handleSqlSubmit={handleSqlSubmit}
              apiUrl={apiUrl}
              setApiUrl={setApiUrl}
              apiUrlLoading={apiUrlLoading}
              handleApiUrlChange={handleApiUrlChange}
              renderVisualizationOptions={renderVisualizationOptions}
              RenderVisualizationSettings={RenderVisualizationSettings}
            />
            <SummarizePanel
              showPanel={showSummarizePanel}
              setQueryLoading={setQueryLoading}
              allColumns={allColumns}
              columnTypes={columnTypes}
              datetimeColumns={datetimeColumns}
              setDatetimeColumns={setDatetimeColumns}
              setColumnTypes={setColumnTypes}
              setAllColumns={setAllColumns}
              sqlQuery={sqlAiQuery}
              setShowPanel={setShowSummarizePanel}
              primaryKeys={primaryKeys}
              selectedAggregate={selectedAggregate}
              setSelectedAggregate={setSelectedAggregate}
              selectedDateBy={selectedDateBy}
              setSelectedColumn={setSelectedColumn}
              selectedValues={selectedValues}
              setSelectedValues={setSelectedValues}
              groupByValue={groupByValue}
              setGroupByValue={setGroupByValue}
              columns={columns}
              setPrimaryKeys={setPrimaryKeys}
              rows={rows}
              setVisualizationType={setSelectedVisualization}
              connectionId={connection_id || ""}
              fetchDbData={fetchDbData}
              tableName={tableName || ""}
              setRows={setRows}
              setSqlQuery={setSqlQuery}
              setColumns={setColumns}
              showSummarizePanel={showSummarizePanel}
              setShowSummarizePanel={setShowSummarizePanel}
            />
          </div>
        )}
      </div>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        className="flex w-full max-w-screen-lg"
      >
        <ModalContent className="flex w-full max-w-screen-lg">
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                SQL Query Editor
              </ModalHeader>
              <ModalBody className="h-full">
                <MonacoEditor
                  height="300px"
                  defaultLanguage="sql"
                  defaultValue={sqlQuery}
                  onChange={handleSqlChange}
                  onMount={handleEditorDidMount}
                  theme={"vs-dark"}
                  options={{
                    minimap: { enabled: false },
                    wordWrap: "on",
                    overviewRulerBorder: false,
                    overviewRulerLanes: 0,
                    wrappingIndent: "indent",
                    wrappingStrategy: "advanced",
                  }}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>

                <Button onClick={() => handleSqlSubmit()}>
                  {queryLoading ? (
                    <>
                      <Spinner className="text-black" size={"small"} />
                      Executing query...
                    </>
                  ) : (
                    "Run Query"
                  )}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      <Modal
        isOpen={isSaveOpen}
        onOpenChange={onSaveClose}
        className="w-full max-w-md"
      >
        <ModalContent>
          <ModalHeader>Save Dataset</ModalHeader>
          <ModalBody>
            <Input
              placeholder="Dataset Name"
              value={newDatasetName}
              onChange={(e) => setNewDatasetName(e.target.value)}
            />
            <Input
              placeholder="Dataset Description"
              value={datasetDescription}
              onChange={(e) => setDatasetDescription(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button size="sm" variant="destructive" onClick={onSaveClose}>
              Cancel
            </Button>
            <Button size="sm" color="primary" onClick={saveDataset}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </main>
  );
}
