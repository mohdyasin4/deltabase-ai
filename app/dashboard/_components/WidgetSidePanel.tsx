import React, { useEffect, useState } from "react";
import { Button, Select, SelectItem, Switch } from "@heroui/react"; // NextUI for Button and Input
import Papa from "papaparse";
import {
  AreaChart,
  BarChart,
  LineChart,
  PieChart,
  Table2,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabaseClient } from "@/lib/supabaseClient"; // Adjust this to your Supabase client path
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; // Assuming Tabs component from your UI library
import SqlEditor from "./SqlEditor";
import toast from "react-hot-toast";

type SidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: any) => void;
  onEditWidget: (updatedWidget: any) => void; // Callback for saving widget changes
  widgetToEdit?: any; // Widget to edit (optional)
  userId: string;
  dashboardId: string;
  initialTab?: string; // This will determine the tab to open first
  onTabChange?: (tab: string) => void; // Callback for tab change
};

export default function WidgetSidePanel({
  isOpen,
  onClose,
  onAddWidget,
  onEditWidget,
  onTabChange,
  widgetToEdit,
  userId,
  dashboardId,
  initialTab,
}: SidePanelProps) {
  const [widgetName, setWidgetName] = useState("");
  const [selectedDataset, setSelectedDataset] = useState<any>();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [widgetType, setWidgetType] =
    useState<keyof typeof widgetIcons>("line"); // Default widget type
  const [columns, setColumns] = useState<string[]>([]); // State to store columns
  const [xAxis, setXAxis] = useState(widgetToEdit?.xAxis || "");
  const [yAxis, setYAxis] = useState(widgetToEdit?.yAxis || "");
  const [sqlQuery, setSqlQuery] = useState(widgetToEdit?.sql_query || "");
  console.log("initialTab", initialTab);
  // Fetch datasets from Supabase on mount
  useEffect(() => {
    const fetchDatasets = async () => {
      const { data, error } = await supabaseClient
        .from("datasets")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching datasets:", error.message);
      } else {
        setDatasets(data);
      }
    };

    if (userId) {
      fetchDatasets();
    }
  }, [userId]);

  useEffect(() => {
    if (widgetToEdit) {
      setWidgetName(widgetToEdit.widgetName || ""); // Set widget name
      setWidgetType(widgetToEdit.visualization_type || ""); // Set visualization type
      setSelectedDataset(
        datasets.find((dataset) => dataset.id === widgetToEdit.dataset_id) ||
          null
      ); // Set dataset
      setXAxis(widgetToEdit.xAxis || ""); // Set X-Axis
      setYAxis(widgetToEdit.yAxis || []); // Set Y-Axis (Array)
      setSqlQuery(widgetToEdit.sql_query || ""); // Set SQL query
    }
  }, [widgetToEdit, datasets]);


  // Fetch dataset columns when dataset is selected
  useEffect(() => {
    if (selectedDataset) {
      const fetchDatasetColumns = async () => {
        // Check if api_id exists in the selected dataset
        if (selectedDataset.api_id) {
          // Fetch API connection details
          const { data: apiConnection, error: apiError } = await supabaseClient
            .from("api_connections")
            .select("*")
            .eq("id", selectedDataset.api_id)
            .single();

          if (apiError) {
            console.error("Error fetching API connection:", apiError.message);
            return;
          }

          // Fetch data from the API URL
          const response = await fetch(apiConnection.api_url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiConnection.api_key}`,
            },
          });

          const apiData = await response.json();

          if (Array.isArray(apiData) && apiData.length > 0) {
            const columns = Object.keys(apiData[0]);
            setColumns(columns);
            } else if (typeof apiData === "object" && apiData !== null) {
            const columns = Object.keys(apiData);
            const rows = [apiData];
            setColumns(columns);
          } else {
            console.error("Unexpected API response format");
          }
        } else if(selectedDataset.csv_id) {
              try {
                // Fetch CSV connection details
                const { data: csvConnection, error: csvError } = await supabaseClient
                  .from("csvData")
                  .select("*")
                  .eq("id", selectedDataset.csv_id)
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
                  throw new Error("Error parsing CSV file: " + parsedData.errors[0].message);
                }
            
                const allRows = parsedData.data;
                
                // Set columns and rows
                setColumns(selectedFields);
            
                // Fetch visualization data from the datasets table using csvId
                const { data: datasetDetails, error: datasetError } = await supabaseClient
                  .from("datasets")
                  .select(
                    "selectedField, x_axis, y_axis, is_stacked, visualization_type, sql_query"
                  )
                  .eq("csv_id", selectedDataset.csv_id) // Updated to use csvId instead of apiId
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
                  y_axis: datasetDetails?.y_axis
                    ?.split(",")
                    .map((y: string) => y.trim()) || [],
                  selectedField: datasetDetails?.selectedField,
                  visualization_type: datasetDetails?.visualization_type || "table",
                  is_stacked: datasetDetails?.is_stacked || false,
                };
              } catch (error) {
                console.error("Error fetching CSV details:", error);
                toast.error("An error occurred while fetching CSV details.");
              } 
        } else if(selectedDataset.connection_id) {
          // Existing logic for fetching dataset columns
          const { data, error } = await supabaseClient
            .from("datasets")
            .select("connection_id, api_id, dataset_name, csv_id")
            .eq("id", selectedDataset.id)
            .single();

          if (error || !data) return;
          const { connection_id, dataset_name } = data;

          const response = await fetch(
            `/api/datasets/${connection_id}/${selectedDataset.id}/${dataset_name}`
          );
          if (response.ok) {
            const datasetResult = await response.json();
            setColumns(datasetResult.columns); // Store the columns in the state
          }
        }
      };

      fetchDatasetColumns();
    }
  }, [selectedDataset]);
  
  useEffect(() => {
    if (widgetToEdit && datasets.length) {
      const selected = datasets.find(
        (dataset) => dataset.id === widgetToEdit.dataset_id
      );
      setSelectedDataset(selected);
    }
  }, [widgetToEdit, datasets]);

  // Handle save changes for editing
  const handleSaveChanges = async () => {
    if (widgetToEdit) {
      const updatedWidget = {
        ...widgetToEdit, // Use the existing values for fields not being edited
        widgetName: widgetName || widgetToEdit.widgetName, // Update only if changed
        dataset_id: selectedDataset?.id || widgetToEdit.dataset_id, // Keep original if not changed
        sql_query: sqlQuery || widgetToEdit.sql_query,
        xAxis: xAxis || widgetToEdit.xAxis,
        yAxis: yAxis || widgetToEdit.yAxis,
        visualization_type: widgetType || widgetToEdit.visualization_type,
      };

      try {
        // Fetch existing widget_details from the dashboard
        const { data: dashboardData, error: fetchError } = await supabaseClient
          .from("dashboards")
          .select("widget_details")
          .eq("id", dashboardId)
          .single();

        if (fetchError) {
          console.error("Error fetching widget details:", fetchError.message);
          return;
        }

        const widgetDetails = dashboardData.widget_details || [];

        // Find the index of the widget to update in the widget_details array
        const updatedWidgets = widgetDetails.map(
          (widget: { widgetId: any }) =>
            widget.widgetId === widgetToEdit.widgetId
              ? { ...widget, ...updatedWidget } // Update only the matching widget
              : widget // Keep the other widgets unchanged
        );

        const { data } = await supabaseClient
          .from("datasets")
          .update({ sql_query: sqlQuery })
          .eq("id", selectedDataset.id);

        // Update the dashboard's widget_details with the modified array
        const { error: updateError } = await supabaseClient
          .from("dashboards")
          .update({
            widget_details: updatedWidgets, // Update with the new widget_details array
          })
          .eq("id", dashboardId);

        if (updateError) {
          console.error("Error updating widget:", updateError.message);
        } else {
          onEditWidget(updatedWidget); // Notify parent to update state
          onClose(); // Close the panel after saving changes
        }
      } catch (error) {
        console.error(
          "An error occurred while updating widget:",
          error.message
        );
      }
    }
  };

  // Handle adding widget and saving to the database
  const handleAddWidget = async () => {
    if (widgetName && selectedDataset && widgetType) {
      const datasetId = selectedDataset.id;

      // Retrieve the SQL query from the selected dataset
      const { data: datasetData, error: datasetError } = await supabaseClient
        .from("datasets")
        .select("sql_query")
        .eq("id", datasetId)
        .single();

      if (datasetError) {
        console.error("Error fetching SQL query:", datasetError.message);
        return;
      }

      const sqlQuery = datasetData.sql_query; // Retrieve the query from the dataset

      const newWidget = {
        widgetId: Date.now().toString(), // Unique widget ID
        sql_query: sqlQuery, // SQL query from the dataset
        dataset_id: datasetId,
        widgetName,
        visualization_type: widgetType,
      };

      // Step 1: Retrieve existing widget_details
      const { data: dashboardData, error: dashboardError } =
        await supabaseClient
          .from("dashboards")
          .select("widget_details")
          .eq("id", dashboardId)
          .single();

      if (dashboardError) {
        console.error("Error fetching widget details:", dashboardError.message);
        return;
      }

      const existingWidgets = dashboardData.widget_details || [];

      // Step 2: Append new widget to the existing array
      const updatedWidgets = [...existingWidgets, newWidget];

      // Step 3: Update the dashboard with the new widget_details array
      const { error: updateError } = await supabaseClient
        .from("dashboards")
        .update({ widget_details: updatedWidgets })
        .eq("id", dashboardId);

      if (updateError) {
        console.error("Error updating widget details:", updateError.message);
      } else {
        onAddWidget(newWidget); // Call the callback to update the parent component
        onClose(); // Close the panel after adding the widget
      }
    } else {
      alert("Please fill out all fields before adding the widget");
    }
  };

  const widgets = [
    { value: "table", label: "Table", icon: <Table2 /> },
    {
      value: "number",
      label: "Number",
      icon: <Icon icon={"material-symbols:123"} height={40} width={40} />,
    },
    { value: "line", label: "Line Chart", icon: <LineChart /> },
    { value: "bar", label: "Bar Chart", icon: <BarChart /> },
    { value: "area", label: "Area Chart", icon: <AreaChart /> },
    { value: "pie", label: "Pie Chart", icon: <PieChart /> },
  ];

  const widgetIcons = {
    table: <Table2 />,
    line: <LineChart />,
    bar: <BarChart />,
    area: <AreaChart />,
    pie: <PieChart />,
    number: <Icon icon={"material-symbols:123"} height={40} width={40} />,
  };

  useEffect(() => {
    if (selectedDataset) {
      console.log("Selected dataset:", selectedDataset);
    }
  }, [selectedDataset]);

  // Ensure columns are ready and widgetToEdit data is available
  useEffect(() => {
    if (widgetToEdit?.xAxis) {
      setXAxis(widgetToEdit.xAxis); // Set the xAxis default value once data is loaded
    }
  }, [widgetToEdit]); // This effect runs whenever widgetToEdit changes

  const handleTabChange = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div
      className={`z-50 fixed right-0 mt-12 border top-0 w-96 h-full bg-background shadow-lg transition-transform ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-4 flex justify-between items-center">
        <h3 className="text-xl font-semibold">
          {initialTab === "editWidget" ? "Edit Widget" : "Add Widget"}
        </h3>
        <XCircle className="cursor-pointer" onClick={onClose} />
      </div>

      {/* Tabs for Add/Edit Widget and Settings */}
      <Tabs value={initialTab} onValueChange={handleTabChange}>
        <div className="flex justify-between items-center p-4 border-b">
          <TabsList>
            <TabsTrigger value="addWidget">Add Widget</TabsTrigger>
            <TabsTrigger value="editWidget">Edit Widget</TabsTrigger>
          </TabsList>
        </div>

        {/* Add Widget */}
        <TabsContent value="addWidget">
          {/* Select widget form */}
          <div className="p-4 space-y-4">
            {/* Widget Name input */}
            <Input
              placeholder="Enter widget name"
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
            />
            {/* Dataset Selection */}
            <Select
              label="Select Dataset"
              placeholder="Choose a dataset for the widget"
              value={selectedDataset || ""} // Bind the selected dataset ID
              onSelectionChange={(value) => {
                console.log("Raw selected value:", value);

                // Extract the actual dataset ID from the custom object (anchorKey or currentKey)
                const selectedId =
                  value.anchorKey || value.currentKey || String(value); // Fallback if key isn't found
                console.log("Extracted dataset ID:", selectedId);

                // Find the dataset using the extracted ID
                const selected = datasets.find(
                  (dataset) => String(dataset.id) === selectedId
                );

                if (selected) {
                  console.log("Selected dataset object:", selected); // Ensure the object is found
                  setSelectedDataset(selected); // Set the selected dataset object
                } else {
                  console.error("Dataset not found for the selected ID.");
                }
              }}
            >
              {datasets.map((dataset) => (
                <SelectItem key={dataset.id} value={String(dataset.id)}>
                  {dataset.dataset_name}
                </SelectItem>
              ))}
            </Select>

            {/* X-Axis Selection */}
            <Select
              label="Select X-Axis"
              placeholder="Choose a column for X-Axis"
              selectedKeys={xAxis ? new Set([xAxis]) : new Set([])} // Use Set for selectedKeys
              onSelectionChange={(keys) =>
                setXAxis(Array.from(keys)[0] as string)
              } // Extract first value from selection
            >
              {columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </Select>

            {/* Y-Axis Selection */}
           
            <Select
              label="Y-Axis"
              placeholder="Choose columns for Y-Axis"
              selectionMode="multiple"
              selectedKeys={yAxis ? new Set(yAxis) : new Set([])} // Set of selected keys based on yAxis array
              onSelectionChange={(selected) => {
                const selectedValues = Array.from(selected); // Convert selected Set to array
                setYAxis(selectedValues); // Update yAxis with the selected values
              }}
            >
              {columns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </Select>

            {/* Widget Type Selection */}
            <div className="grid grid-cols-2 gap-2">
              {widgets.map((widget) => (
                <Card
                  key={widget.value}
                  className={`flex flex-col items-center justify-center p-4 h-26 bg-background border shadow-md cursor-pointer ${
                    widgetType === widget.value ? "border-primary" : ""
                  }`}
                  onClick={() =>
                    setWidgetType(widget.value as keyof typeof widgetIcons)
                  }
                >
                  <div className="flex flex-col items-center">
                    <div className="mb-2">{widget.icon}</div>
                    <p className="text-sm font-medium">{widget.label}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Add Widget button */}
            <Button onPress={handleAddWidget} className="w-full mt-4">
              Add Widget
            </Button>
          </div>
        </TabsContent>
        {/* Edit Widget */}
        <TabsContent value="editWidget">
          <div className="p-4 space-y-4">
            {/* Widget Name input */}
            <Input
              placeholder="Enter widget name"
              value={widgetName}
              onChange={(e) => setWidgetName(e.target.value)}
            />

            {/* Dataset selection */}
            <Select
              label="Dataset"
              labelPlacement="inside"
              defaultSelectedKeys={
                selectedDataset?.id ? [String(selectedDataset?.id)] : []
              } // Use an array
              selectedKeys={
                selectedDataset?.id ? [String(selectedDataset?.id)] : []
              } // Use an array
              placeholder="Choose a dataset for the widget"
              onSelectionChange={(value) => {
                const selectedId =
                  value.anchorKey || value.currentKey || String(value);
                const selected = datasets.find(
                  (dataset) => String(dataset.id) === selectedId
                );
                setSelectedDataset(selected);
              }}
            >
              {datasets.map((dataset) => (
                <SelectItem key={dataset.id} value={String(dataset.id)}>
                  {dataset.dataset_name}
                </SelectItem>
              ))}
            </Select>

            {/* X-Axis Selection */}
            <Select
              label="X-Axis"
              placeholder="Choose a column for X-Axis"
              selectedKeys={xAxis ? new Set([xAxis]) : new Set([])} // Use Set for selectedKeys
              defaultSelectedKeys={xAxis || ""} // Ensure it's a string and set as default value
              onChange={(e) => setXAxis(e.target.value)}
            >
              {columns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </Select>

            {/* Y-Axis Selection */}
            <Select
              label="Y-Axis"
              placeholder="Choose columns for Y-Axis"
              selectionMode="multiple"
              selectedKeys={yAxis ? new Set(yAxis) : new Set([])} // Set of selected keys based on yAxis array
              onSelectionChange={(selected) => {
                const selectedValues = Array.from(selected); // Convert selected Set to array
                setYAxis(selectedValues); // Update yAxis with the selected values
              }}
            >
              {columns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                </SelectItem>
              ))}
            </Select>

            {/* Visualization Type Selection (using cards for consistency) */}
            {/* Select widget type */}
            <Select
              label="Widget Type"
              placeholder="Choose a visualization type"
              selectedKeys={widgetType ? new Set([widgetType]) : new Set([])} // Default selected widgetType
              renderValue={() =>
                widgetType ? (
                  <div className="flex items-center gap-2">
                    {widgetIcons[widgetType]} {/* Display icon */}
                    {
                      widgets.find((widget) => widget.value === widgetType)
                        ?.label
                    }{" "}
                    {/* Display label */}
                  </div>
                ) : (
                  "Choose a visualization type"
                )
              }
              onSelectionChange={(selected) => {
                const selectedValue = Array.from(selected)[0]; // Get the selected value
                setWidgetType(selectedValue as keyof typeof widgetIcons); // Update the widget type
              }}
            >
              {widgets.map((widget) => (
                <SelectItem key={widget.value} value={widget.value}>
                  {widget.label} {/* Display label for each widget */}
                </SelectItem>
              ))}
            </Select>

            {/* SQL Query */}

            <SqlEditor
              sqlQuery={sqlQuery}
              onSqlChange={(value) => setSqlQuery(value || "")}
              columns={columns}
              height="200px"
            />
            {/* Save Button */}
            <Button onPress={handleSaveChanges} className="w-full mt-4">
              Save Changes
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
