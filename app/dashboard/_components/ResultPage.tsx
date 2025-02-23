"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Filter,
  FilterIcon,
  FunctionSquare,
  PieChartIcon,
  Save,
  SaveIcon,
  Search,
  Sigma,
  Table,
  Table2,
  Terminal,
  TerminalSquare,
} from "lucide-react";
import twilight from "./themes/Twilight.json";
import { DataTable } from "@/app/dashboard/_components/data-table";
import MonacoEditor from "@monaco-editor/react";
import NProgress, { set } from "nprogress";
import { useRouter } from "next/navigation";
import {
  Skeleton,
  Switch,
  Select,
  SelectItem,
} from "@heroui/react";
import { Button } from "@/components/ui/button"
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
import Papa from "papaparse";
import { AggregateControls } from "./AggregateControls";
import { handleApplyAggregate } from "@/utils/aggregateFunctions";
import AdvancedSettingsPanel from "./AdvancedSettingsPanel";
import SummarizePanel from "./SummarizePanel";
import FilterDialog, { FilterRow } from "./FilterDialog"; // adjust import as needed
import { Dialog } from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface ResultPageProps {
  connection_id?: string | null;
  dataset_id?: string;
  apiId?: string | null;
  csvId?: string | null;
  dataset_name?: string;
  type: string;
  sourceType: "api" | "database" | "csv";
  id?: string;
  tableName?: string;
  setTableName?: (name: string) => void;
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

export default function ResultPage({
  connection_id,
  dataset_id,
  apiId,
  csvId,
  dataset_name,
  type,
  sourceType,
  id,
  tableName,
  setTableName,
}: ResultPageProps) {
  const [apiDetails, setApiDetails] = useState(null);
  const router = useRouter();
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [sqlQuery, setSqlQuery] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [tables, setTables] = useState<string[]>([]);
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
  const [newDatasetName, setNewDatasetName] = useState(""); // Dataset name state
  const [datasetDescription, setDatasetDescription] = useState(""); // Dataset description state
  const { user } = useUser(); // Get the current user
  const [selectedVisualization, setSelectedVisualization] =
    useState<string>("table"); // Default to table
  const [xAxis, setXAxis] = useState(""); // X-Axis state
  const [yAxis, setYAxis] = useState<string[]>([]); // Y-Axis state as an array
  const [widgetTitle, setWidgetTitle] = useState(""); // Widget title state
  const [description, setDescription] = useState(""); // Widget description state
  const [showSidePanel, setShowSidePanel] = useState(false); // Side panel visibility state
  const [activeTab, setActiveTab] = useState("visualization"); // Manage tabs
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [isStacked, setIsStacked] = useState(false); // New state for stacked bar chart
  const [apiUrlLoading, setApiUrlLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [showSummarizePanel, setShowSummarizePanel] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterRow[]>([]);
  const filterDialogRef = useRef<any>(null);

  
  const [filters, setFilters] = useState<FilterRow[]>([
    { id: 1, column: "", operation: "", value: "", valueOptions: [] },
  ]);
  
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

  return filters
    .filter((filter) => filter.column && filter.operation && filter.value)
    .map((filter) => {
      const formattedColumn = filter.column
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return {
        id: filter.id,
        label: `${formattedColumn} ${operationMap[filter.operation] || filter.operation} ${filter.value}`,
      };
    });
};
  const chipData = useMemo(() => transformFiltersToChips(filters), [filters]);
  
  
  // When a chip is removed, update the filters and call applyFilters from the FilterDialog
  const removeChip = (chipId: number) => {
    // Use the functional form of setFilters so you immediately have the updated value.
    setFilters((prevFilters) => {
      const updatedFilters = prevFilters.filter((filter) => filter.id !== chipId);
      // Call applyFilters with the updated filters.
      if (
        filterDialogRef.current &&
        typeof filterDialogRef.current.applyFilters === "function"
      ) {
        filterDialogRef.current.applyFilters(updatedFilters);
      }
      return updatedFilters;
    });
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

    // Define IntelliSense items
    const suggestions = [
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
      // Add more SQL keywords here
      ...tables.map((table) => ({
        label: table,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: table,
      })),
      ...columns.map((column) => ({
        label: column,
        kind: monaco.languages.CompletionItemKind.Field,
        insertText: column,
      })),
    ];

    // Register the completion item provider
    monaco.languages.registerCompletionItemProvider("sql", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
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
    });
  };

  // Handle data visualization
  const handleVisualizeData = () => {
    if (showSummarizePanel) {
      setShowSummarizePanel(false);
    }
    setShowSidePanel(true);
  };

  // Handle SQL input change
  const handleSqlChange = (value: string | undefined) => {
    if (value !== undefined) {
      setSqlQuery(value);
    }
  };

  // Handle SQL submission and execute query
  const handleSqlSubmit = async (query: string) => {
    if (!sqlQuery) {
      toast.error("SQL Query cannot be empty");
      return;
    }

    setQueryLoading(true);

    try {
      console.log("Connection_Id", connection_id);
      const response = await fetch(`/api/database/${connection_id}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sqlQuery || query }),
      });

      const data = await response.json();

      if (response.ok) {
        // Reset x-axis, y-axis, chart data, and chart config
        setXAxis(""); // Reset x-axis
        setYAxis([]); // Reset y-axis

        // Update with new data
        setColumns(Object.keys(data[0] || {}));
        setRows(data);
        setSelectedVisualization("table");
        toast.success("Query executed successfully!");
      } else {
        toast.error(data.error || "Failed to execute the query.");
      }
    } catch (error) {
      toast.error("An error occurred while executing the query.");
      console.error("Error executing query:", error);
    }

    setQueryLoading(false);
  };

  useEffect(() => {
    console.log("Selected Visualization:", selectedVisualization);
  }, [selectedVisualization]);

  // Fetch tables for the current connection (only for tables)
  useEffect(() => {
    if (type === "table") {
      const fetchTables = async () => {
        if (!connection_id) return;

        try {
          const response = await fetch(`/api/database/${connection_id}`);
          const data = await response.json();

          if (response.ok) {
            setTables(data);
          } else {
            toast.error("Error fetching tables");
          }
        } catch (error) {
          console.error("Error fetching tables", error);
          toast.error("An error occurred while fetching tables.");
        }

        setLoading(false);
      };

      fetchTables();
    }
  }, [connection_id, type]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        let url = "";

        if (sourceType === "database" && !apiId) {
          if (type === "table" && tableName) {
            url = `/api/database/${connection_id}/tables/${tableName}`;
          } else if (type === "dataset" && dataset_id) {
            url = `/api/datasets/${connection_id}/${dataset_id}/${dataset_name}`;
          }

          if (!url) {
            throw new Error("Invalid URL for fetching data.");
          }

          const response = await fetch(url);
          const responseData = await response.json();

          if (!response.ok) {
            throw new Error(
              responseData?.message || "Failed to fetch data from API."
            );
          }

          const columns = responseData?.columns ?? [];
          const rows = responseData?.rows ?? [];

          // Filter columns based on row data validity
          const filteredColumns = columns.filter((column: string) =>
            rows.some(
              (row: any) => row[column] !== null && row[column] !== undefined
            )
          );

          setColumns(filteredColumns);
          setRows(rows);
          setData(rows); // Set the data state here

          if (type === "dataset" && dataset_id) {
            const datasetDetails = await fetchDatasetDetails();
            updateVisualizationData(datasetDetails);
            return;
          }
        } else if (sourceType === "api" && apiId && !csvId) {
          const apiDetails = await fetchApiDetails();
          updateVisualizationData(apiDetails);
          return;
        } else if (sourceType === "csv") {
          // TODO: Implement CSV fetching logic here
          const csvDetails = await fetchCsvDetails();
          console.log("CSV Details:", csvDetails);
          updateVisualizationData(csvDetails);
          return;
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("An error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    }

    async function fetchDatasetDetails() {
      try {
        const query = supabaseClient
          .from("datasets")
          .select(
            "selectedField, x_axis, y_axis, is_stacked, visualization_type, sql_query, table_name, filters"
          )
          .eq(
            connection_id ? "connection_id" : "api_id",
            connection_id || apiId
          )
          .eq("id", dataset_id)
          .single();

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        return {
          x_axis: data.x_axis,
          y_axis: data.y_axis.split(",").map((y: string) => y.trim()),
          selectedField: data.selectedField,
          visualization_type: data.visualization_type,
          is_stacked: data.is_stacked,
          sqlQuery: data.sql_query,
          tableName: data.table_name,
          filters: data.filters,
        };
      } catch (error) {
        console.error("Error fetching dataset details:", error);
        toast.error("Error fetching dataset details.");
      }
    }

    async function fetchApiDetails() {
      try {
        // Fetch API connection details
        const { data: apiConnection, error: apiError } = await supabaseClient
          .from("api_connections")
          .select("*")
          .eq("id", apiId)
          .single();

        if (apiError) {
          throw apiError;
        }

        // Fetch data from the API
        const response = await fetch(apiConnection.api_url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiConnection.api_key}`,
          },
        });

        const apiData = await response.json();

        // Process the data to set columns and rows
        if (Array.isArray(apiData) && apiData.length > 0) {
          const columns = Object.keys(apiData[0]);
          setColumns(columns);
          setRows(apiData);
        } else if (typeof apiData === "object" && apiData !== null) {
          const columns = Object.keys(apiData);
          setColumns(columns);
          setRows([apiData]);
        } else {
          throw new Error("Unexpected API response format.");
        }

        // Fetch visualization data from the datasets table
        const { data: datasetDetails, error: datasetError } =
          await supabaseClient
            .from("datasets")
            .select(
              "selectedField, x_axis, y_axis, is_stacked, visualization_type, sql_query"
            )
            .eq("api_id", apiId)
            .single();

        if (datasetError) {
          throw datasetError;
        }

        // Return the combined details
        return {
          x_axis: datasetDetails?.x_axis,
          y_axis:
            datasetDetails?.y_axis?.split(",").map((y: string) => y.trim()) ||
            [],
          selectedField: datasetDetails?.selectedField,
          visualization_type: datasetDetails?.visualization_type,
          is_stacked: datasetDetails?.is_stacked,
        };
      } catch (error) {
        console.error("Error fetching API details:", error);
        toast.error("An error occurred while fetching API details.");
      }
    }
    async function fetchCsvDetails() {
      try {
        // Fetch CSV connection details
        const { data: csvConnection, error: csvError } = await supabaseClient
          .from("csvData")
          .select("*")
          .eq("id", csvId)
          .eq("user_id", user?.id)
          .single();

        if (csvError) {
          throw csvError;
        }

        const { bucket_name, file_name, selectedFields } = csvConnection;

        if (!bucket_name || !file_name || !selectedFields) {
          throw new Error("Missing required CSV details.");
        }

        // Fetch the CSV file from Supabase storage
        const { data: file, error: fileError } = await supabaseClient.storage
          .from(bucket_name)
          .download(file_name);

        if (fileError) {
          throw fileError;
        }

        // Read the file content as text
        const csvText = await file.text();

        // Parse the CSV file
        const parsedData = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
        });

        if (parsedData.errors.length > 0) {
          throw new Error(
            "Error parsing CSV file: " + parsedData.errors[0].message
          );
        }

        const allRows = parsedData.data;

        // Filter rows based on selected fields
        const filteredRows = allRows.map((row) => {
          const filteredRow: Record<string, any> = {};
          selectedFields.forEach((field: string) => {
            if (row && typeof row === "object" && field in row) {
              filteredRow[field] = row[field];
            }
          });
          return filteredRow;
        });

        // Set columns and rows
        setColumns(selectedFields);
        setRows(filteredRows);

        // Fetch visualization data from the datasets table using csvId
        const { data: datasetDetails, error: datasetError } =
          await supabaseClient
            .from("datasets")
            .select(
              "selectedField, x_axis, y_axis, is_stacked, visualization_type, sql_query"
            )
            .eq("csv_id", csvId) // Updated to use csvId instead of apiId
            .single();

        // If no dataset details found, use default values
        if (datasetError || !datasetDetails) {
          console.warn("No dataset details found. Using default values.");
          return {
            x_axis: null,
            y_axis: [],
            selectedField: null,
            visualization_type: "table", // Default visualization type
            is_stacked: false, // Default stacked value
          };
        }

        // Return the combined details
        return {
          x_axis: datasetDetails?.x_axis,
          y_axis:
            datasetDetails?.y_axis?.split(",").map((y: string) => y.trim()) ||
            [],
          selectedField: datasetDetails?.selectedField,
          visualization_type: datasetDetails?.visualization_type || "table",
          is_stacked: datasetDetails?.is_stacked || false,
        };
      } catch (error) {
        console.error("Error fetching CSV details:", error);
        toast.error("An error occurred while fetching CSV details.");
      }
    }

    function updateVisualizationData(details: any) {
      if (!details) return;

      const { x_axis, y_axis, visualization_type, selectedField, is_stacked, sqlQuery, tableName, filters } =
        details;

      setXAxis(x_axis);
      setYAxis(y_axis);
      if (setTableName) {
        setTableName(tableName);
      }
      setSelectedVisualization(
        type === "dataset" ? visualization_type : "table"
      );
      setSelectedColumn(selectedField);
      setIsStacked(is_stacked);
      setSqlQuery(sqlQuery);
      setFilters(filters || []);
    }

    fetchData();
  }, [sourceType, apiId, connection_id, tableName, dataset_id, type]);

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
          tableName: tableName,
          dataset_description: datasetDescription,
          selectedField: selectedColumn,
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
        .eq(connection_id ? "connection_id" : "api_id", connection_id || apiId)
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
  const chartData = filteredRows.map((row, index) => {
    const dataPoint: any = {
      [xAxis]: row[xAxis], // X-axis value
      color: colors[index % colors.length], // Assign color
    };

    // Add each selected y-axis value to the data point
    yAxis.forEach((y) => {
      dataPoint[y] = row[y];
    });

    return dataPoint;
  });

  const chartConfig: ChartConfig = {
    [xAxis]: {
      label: xAxis,
    },
    ...Object.fromEntries(
      yAxis.map((y) => [
        y,
        {
          label: y,
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
  
  // Function to determine xAxis and yAxis automatically
  const determineAxes = () => {
    if (!columns.length || !rows.length) return { autoXAxis: '', autoYAxis: [] };

    // Separate categorical and numerical columns
    const categoricalColumns = columns.filter(col => 
      typeof rows[0][col] === 'string'
    );
    const numericalColumns = columns.filter(col => 
      typeof rows[0][col] === 'number'
    );

    console.log("Categorical Columns:", categoricalColumns);
    console.log("Numerical Columns:", numericalColumns);

    return {
      autoXAxis: categoricalColumns[0] || columns[0], // Pick first categorical or fallback to first column
      autoYAxis: numericalColumns.length ? numericalColumns : [], // Return all numerical columns
    };
  };

  // Render settings for the selected visualization
  const RenderVisualizationSettings = () => {
    // Set default values based on selected visualization
    useEffect(() => {
      const { autoXAxis, autoYAxis } = determineAxes();

      console.log("Auto X Axis:", autoXAxis);
      console.log("Auto Y Axis:", autoYAxis);

      if (selectedVisualization === "bar" || selectedVisualization === "line" || selectedVisualization === "area") {
        // Always reset xAxis and yAxis based on current data
        if (autoXAxis) {
          setXAxis(autoXAxis);
        }
        if (autoYAxis.length > 0) {
          setYAxis(autoYAxis);
        }
      } else if (selectedVisualization === "number") {
        // Set default selectedColumn to the first column if not already set
        if (!selectedColumn && columns.length > 0) {
          setSelectedColumn(columns[0]);
        }
      }
    }, [selectedVisualization, columns, rows]); // Add columns and rows to dependencies

    if (selectedVisualization === "table") {
      return <p>No additional settings for Table.</p>;
    }

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
                  placeholder="Choose a column for X-Axis"
                  selectedKeys={xAxis ? [xAxis] : []}
                  onSelectionChange={(keys) =>
                    setXAxis(Array.from(keys)[0] as string)
                  }
                >
                  {columns.map((col) => (
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
                  {determineAxes().autoYAxis.map((col) => (
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

    useEffect(() => {
      if (sourceType === "api" && apiId && !csvId) {
        const fetchApiDetails = async () => {
          try {
            const { data, error } = await supabaseClient
              .from("api_connections")
              .select("*")
              .eq("id", apiId)
              .single();

            if (error) throw error;

            // Fetch data from the API
            const response = await fetch(data.api_url, {
              method: "GET",
            });

            const apiData = await response.json();
            console.log("API Data", apiData);

            // Process the API data
            if (Array.isArray(apiData)) {
              // If the response is an array of objects
              const keys = Object.keys(apiData[0] || {}); // Extract keys from the first object
              const values = apiData.map((item) => Object.values(item)); // Extract values from each object
              console.log("Keys:", keys);
              console.log("Values:", values);

              // Set columns and rows for a data table, for example
              setRows(apiData);
            } else if (typeof apiData === "object") {
              // If the response is a single object
              const keys = Object.keys(apiData); // Extract keys
              const values = Object.values(apiData); // Extract values
              console.log("Keys:", keys);
              console.log("Values:", values);

              // You can transform this into a table format if needed
              setRows([apiData]); // Wrap in array for uniform handling
            } else {
              console.warn("Unsupported API response format");
            }

            setApiDetails(apiData); // Store raw data if needed
          } catch (error) {
            console.error("Error fetching API details:", error);
          }
        };

        fetchApiDetails();
      }
    }, [sourceType, apiId]);

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

    // First, let's create a function to calculate the container width based on panel state
    const getVisualizationClassName = (
      showSidePanel: boolean,
      showSummarizePanel: boolean
    ) => {
      if (showSidePanel || showSummarizePanel) {
        return "relative h-full transition-all duration-800 ease-in-out col-span-6 pr-[380px]";
      }
      return "relative h-full transition-all duration-800 ease-in-out col-span-6";
    };

    return (
      <main className="flex flex-col w-full h-full">
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
                <div className={`flex flex-row items-center p-2 ${selectedVisualization === "table" ? "justify-between" : "justify-end"}`}>
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
                      onAction={handleFilterOpen}
                      onFilterChange={handleFilterChange}
                    >
                    </FilterDialog>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>

                    <Button
                      size="sm"
                      color="default"
                      variant="secondary"
                      className="h-8 gap-2 transition-all ease-in-out"
                      onClick={() => {
                        if (showSidePanel) {
                          setShowSidePanel(false);
                        }
                        setShowSummarizePanel(true);
                      }}
                    >
                      <Sigma height={20} width={20} />
                      Summarize
                    </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
                  <div className={`p-2 bg-primary/5 border-b border-t flex flex-wrap gap-2 ${selectedVisualization === "table" && chipData.length > 0 ? "flex" : "hidden"}`}>

                  {chipData.map(({ id, label }) => (
          <Chip
            key={id}
            size="sm"
            color="primary"
            onClose={() => {removeChip(id)}}
            className="flex items-center rounded-full px-3 py-1"
          >
            {label}
          </Chip>
      
    ))}
    
    </div>
                <div className="relative h-[calc(100vh-12vh)] w-full">
                  {queryLoading && (
                    <div className="absolute inset-0 flex justify-center items-center backdrop-blur-md bg-background/50 z-10">
                      <Spinner size="large" />
                    </div>
                  )}

                  <div
                    className={`relative transition-opacity duration-300 ${
                      queryLoading
                        ? "opacity-60 backdrop-blur-[10px]"
                        : "opacity-100 backdrop-blur-none"
                    } ${
                      selectedVisualization === "table" && chipData.length > 0
                        ? "h-[calc(100vh-22vh)]"
                        : "h-[calc(100vh-12vh)]"
                    }
                     ${
                      selectedVisualization === "table"
                        ? "h-[calc(100vh-18vh)]"
                        : "h-[calc(100vh-12vh)]"
                    }`}
                  >
                    <VisualizationRenderer
                      selectedVisualization={selectedVisualization}
                      rows={rows}
                      filteredRows={filteredRows}
                      columns={columns}
                      xAxis={xAxis}
                      yAxis={yAxis} // Now passing the array of selected y-axes
                      setXAxis={setXAxis}
                      setYAxis={setYAxis}
                      chartData={chartData}
                      chartConfig={chartConfig}
                      colors={colors}
                      selectedColumn={selectedColumn || ""}
                      setSearchTerm={setSearchTerm}
                      searchTerm={searchTerm}
                      tablePagination={true}
                      stacked={isStacked}
                    />
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
                setShowPanel={setShowSummarizePanel}
                columns={columns}
                rows={rows}
                setVisualizationType={setSelectedVisualization}
                connectionId={connection_id || ""}
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
                  <Button variant="flat" color="danger" onPress={onClose}>
                    Close
                  </Button>

                  <Button color="primary" onPress={handleSqlSubmit}>
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
              <Button size="sm" color="danger" onClick={onSaveClose}>
                Cancel
              </Button>
              <Button size="sm" color="primary" onClick={saveDataset}>Save</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </main>
    );
  }
