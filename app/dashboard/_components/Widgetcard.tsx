// app/dashboard/_components/WidgetCard.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card"; // Import shadcn card components
import VisualizationRenderer from "./VisualizationRenderer";
import {
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Skeleton,
} from "@heroui/react"; // ScrollArea for overflow handling
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { Button, Dropdown } from "@heroui/react"; // Import NextUI Dropdown and Button components
import Papa from "papaparse"; // Import PapaParse library

type WidgetCardProps = {
  widget: any; // The widget object passed from the DashboardPage
  colors: string[]; // The colors array for the chart
  removeWidget: (widgetId: any) => void; // Callback to remove the widget
  editWidget: (widgetId: any) => void; // Callback to edit the widget
  stacked?: boolean; // Optional stacked prop for bar chart
  dashboardId: string;
  gridWidth: number;
};
const WidgetCard = React.memo(
  ({ widget, colors, removeWidget, editWidget, stacked, dashboardId, gridWidth }: WidgetCardProps) => {
    const [loading, setLoading] = useState(true);
    const [widgetData, setWidgetData] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState<string>(""); // State for search term
    const [filteredRows, setFilteredRows] = useState<any[]>([]); // State for filtered rows
    const [selectedColumn, setSelectedColumn] = useState<string>(""); // State for selected column
    console.log('widgetCardDashId',dashboardId);
    
    useEffect(() => {
      async function fetchWidgetData() {
        try {
          // Fetch widget details from the dashboard table
          const { data: dashboardData, error: dashboardError } = await supabaseClient
            .from("dashboards")
            .select("widget_details")
            .eq("id", dashboardId)
            .single();
    
          if (dashboardError || !dashboardData) {
            toast.error("Error fetching widget details from dashboard.");
            return;
          }
    
          // Find the widget with the matching widgetId
          const widgetDetails = dashboardData.widget_details.find(
            (w: any) => w.widgetId === widget.widgetId
          );
    
          if (!widgetDetails) {
            toast.error(`Widget with ID ${widget.widgetId} not found in dashboard.`);
            return;
          }
    
          const { dataset_id, xAxis, yAxis, sqlQuery, selectedField, widgetName } = widgetDetails;
    
          // Fetch dataset details
          if (dataset_id) {
            const { data: datasetData, error: datasetError } = await supabaseClient
              .from("datasets")
              .select("dataset_name, connection_id, api_id, csv_id")
              .eq("id", dataset_id)
              .single();
    
            if (datasetError || !datasetData) {
              toast.error(`Error fetching dataset for widget ID ${widget.widgetId}`);
              return;
            }
    
            const { dataset_name, connection_id, api_id, csv_id } = datasetData;
    
            if (api_id) {
              console.log("Entered API ID block...");
              // Fetch API connection details
              const { data: apiConnection, error: apiError } = await supabaseClient
                .from("api_connections")
                .select("*")
                .eq("id", api_id)
                .single();
        
              if (apiError || !apiConnection) {
                toast.error(`Error fetching API connection for widget ID ${widget.widgetId}`);
                return;
              }
        
              // Fetch data from the API URL
              const response = await fetch(apiConnection.api_url, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${apiConnection.api_key}`,
                },
              });
        
              if (response.ok) {
                const apiData = await response.json();
                //i need apiResult to be the data from the apiData which will have the rows and columns
                const apiResult = {
                  rows: apiData,
                  columns: Object.keys(apiData[0]),
                };
                
                // Check if apiData has the expected structure
                if (!Array.isArray(apiData) || apiData.length === 0) {
                  toast.error(`No data returned from API for widget ID ${widget.widgetId}`);
                  return;
                }
                const yAxisArray = Array.isArray(yAxis)
                  ? yAxis
                  : yAxis?.split(",").map((y: string) => y.trim()) || [];
        
                setWidgetData({
                  data: apiResult,
                  name: widgetName,
                  sqlQuery: sqlQuery, // Fetching from widgetDetails
                  xAxis: xAxis, // Fetching from widgetDetails
                  yAxis: yAxisArray, // Fetching from widgetDetails
                  selectedField: selectedField || Object.keys(apiData[0])[0], // Default if available
                });
                console.log('Widget Data:', widgetData); // Log the widget data
                if (Array.isArray(apiData) && apiData.length > 0) {
                  setFilteredRows(apiResult.rows);
                  console.log('Filtered Rows Updated:', apiResult.rows); // Log the updated data
                } else {
                  console.log('No data available to set filteredRows.');
                }
                console.log("widgetData", widgetData);
                console.log("widgetData.data", widgetData?.data);
                console.log("widgetData.data.rows", widgetData?.data?.rows);
                                
                // Set default selected column to the first one if selectedField is missing
                setSelectedColumn(selectedField || Object.keys(apiResult.columns[0])[0]);
              } else {
                toast.error(`Error fetching data from API for widget ID ${widget.widgetId}`);
              }
            } else {
              console.log("Entered Dataset block...");  
              // If no api_id, fetch data from the dataset
          const response = await fetch(`/api/datasets/${connection_id}/${dataset_id}/${dataset_name}`);

          if (response.ok) {
            const datasetResult = await response.json();
            console.log("Dataset Result:", datasetResult);

            const yAxisArray = Array.isArray(yAxis)
              ? yAxis
              : yAxis?.split(",").map((y: string) => y.trim()) || [];

            setWidgetData({
              data: datasetResult,
              name: widgetName,
              sqlQuery: sqlQuery,
              xAxis: xAxis,
              yAxis: yAxisArray,
              selectedField: selectedField || datasetResult.columns[0],
            });

            setFilteredRows(datasetResult.rows);

            setSelectedColumn(selectedField || datasetResult.columns[0]);
          } else {
            toast.error(`Error fetching data for widget ID ${widget.widgetId}`);
          }
            }
          }
        } catch (error) {
          console.error("Error fetching widget data:", error);
          toast.error("An error occurred while fetching widget data.");
        } finally {
          setLoading(false);
        }
      }
    
      fetchWidgetData();
    }, [dashboardId, widget.widgetId]);
    
    return (
<Card className="widget-card flex flex-grow h-full w-full items-center justify-center">
<CardHeader className="widget-header px-4 py-2 w-full flex flex-row justify-between items-center">
          <h3 className="text-lg font-semibold">{widget.widgetName}</h3>
          <div>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button isIconOnly variant="flat" color="default">
                  ⚙️
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Card settings menu">
                <DropdownItem key="edit" onClick={() => editWidget(widget)}>
                  Edit Widget
                </DropdownItem>
                <DropdownItem
                  key="remove"
                  onClick={() => removeWidget(widget.widgetId)}
                >
                  Remove Widget
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </CardHeader>

        <CardContent className="widget-content relative overflow-hidden flex-grow">
          {loading ? (
            <div>
              {/* Show a loader while fetching data */}
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : widgetData ? (
            <VisualizationRenderer
              selectedVisualization={widget.visualization_type}
              rows={widgetData.data.rows}
              columns={widgetData.data.columns}
              colors={colors}
              xAxis={widgetData.xAxis}
              yAxis={widgetData.yAxis} // yAxis is now an array
              chartData={widgetData.data.rows.map(
                (row: Record<string, any>) => {
                  // Create chart data for each y_axis value
                  const chartRow: Record<string, any> = {
                    [widgetData.xAxis]: row[widgetData.xAxis],
                  };

                  // Dynamically add each y_axis value to the chartRow
                  widgetData.yAxis.forEach((yAxisValue: string) => {
                    chartRow[yAxisValue] = row[yAxisValue];
                  });

                  return chartRow;
                }
              )}
              chartConfig={{
                [widgetData.xAxis]: { label: widgetData.xAxis },
                // Create chartConfig for each y_axis value
                ...widgetData.yAxis.reduce(
                  (config: any, yAxisValue: string) => {
                    config[yAxisValue] = { label: yAxisValue };
                    return config;
                  },
                  {}
                ),
              }}
              filteredRows={filteredRows} // Pass filtered rows
              selectedColumn={selectedColumn} // Pass selected column
              setSearchTerm={setSearchTerm} // Pass setSearchTerm function
              searchTerm={searchTerm} // Pass searchTerm state
              tablePagination={false}
              stacked={stacked}
              gridWidth={gridWidth}
            />
          ) : (
            <p>Failed to load widget data.</p>
          )}
        </CardContent>
      </Card>
    );
  }
);

export default WidgetCard;
