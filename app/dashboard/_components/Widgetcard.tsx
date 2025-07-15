"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import VisualizationRenderer from "./VisualizationRenderer";
import { Skeleton, Tooltip } from "@heroui/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import Papa from "papaparse";
import {
  determineAxes,
  autoPivotRows,
  transformData,
  transformDataForChart,
} from "@/utils/dataTransform";
import { detectDatetimeColumns, formatRowData } from "@/utils/datetimeUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { byOptions } from "./ResultPage";
import { GearIcon } from "@radix-ui/react-icons";
import { toast as sonner } from "sonner";
import { 
  Bot, 
  Info, 
  Pencil, 
  X, 
  Maximize2, 
  Download, 
  RefreshCw,
  TrendingUp,
  BarChart3,
  PieChart,
  Table2,
  Hash,
  Calendar,
  EllipsisVertical
} from "lucide-react";
import animationData from "@/public/lotties/animated-triangle.json";
import Lottie from "react-lottie"; // Import Lottie

// Define your default Lottie options with optimized settings
const defaultOptions = {
  loop: true,
  autoplay: true,
  animationData: animationData,
  rendererSettings: {
    preserveAspectRatio: "xMidYMid slice",
  },
};

type WidgetCardProps = {
  widget: any;
  colors: string[];
  removeWidget: (widgetId: any) => void;
  editWidget: (widgetId: any) => void;
  stacked?: boolean;
  dashboardId: string;
  gridWidth: number;
  editMode?: boolean;
};

  const WidgetCard = React.memo(
  ({
    widget,
    colors,
    removeWidget,
    editWidget,
    stacked,
    dashboardId,
    gridWidth,
    editMode = false,
  }: WidgetCardProps) => {    const [loading, setLoading] = useState(true);
    const [widgetData, setWidgetData] = useState<any>(null);
    const [filteredRows, setFilteredRows] = useState<any[]>([]);
    const [selectedColumn, setSelectedColumn] = useState<string>("");
    const [explanation, setExplanation] = useState<string>("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Local state for dateBy for this widget only.
    const [widgetDateBy, setWidgetDateBy] = useState<string | null>(null);
    // Assume currentQuery is stored in widgetData or elsewhere.
    const currentQuery = widgetData?.sqlQuery || "";

    // Helper function to get visualization icon
    const getVisualizationIcon = (type: string) => {
      switch (type) {
        case 'bar':
          return <BarChart3 className="h-4 w-4" />;
        case 'line':
          return <TrendingUp className="h-4 w-4" />;
        case 'pie':
          return <PieChart className="h-4 w-4" />;
        case 'table':
          return <Table2 className="h-4 w-4" />;
        case 'number':
          return <Hash className="h-4 w-4" />;
        default:
          return <BarChart3 className="h-4 w-4" />;
      }
    };

    const explainChartWithAI = async () => {      if (!widgetData) {
        toast.error("Chart data is not available yet.");
        return;
      }

      // Show AI thinking toast using `toast.loading`
      const toastId = sonner.loading("AI is thinking...", {
        className: "bg-background text-foreground",
      });

      setExplanation("Generating explanation...");

      try {
        const response = await fetch("/api/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summarize: true,
            originalQuery: widgetData.sqlQuery,
            queryData: widgetData.data.rows,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get explanation from AI");
        }

        const result = await response.json();
        setExplanation(result.text);

        // Dismiss loading sonner and show success message
        sonner.dismiss(toastId);
        sonner.success("AI Explanation", {
          description: result.text,
          className:
            "bg-background text-md items-start justify-start text-foreground",
          icon: <Bot className="h-4 w-4 text-yellow-500" />,
        });
      } catch (error: any) {
        console.error("Error explaining chart:", error);

        // Dismiss loading sonner and show error
        sonner.dismiss(toastId);
        sonner.error("Error", {
          description: "Error generating explanation.",
        });
      }
    };

    useEffect(() => {
      async function fetchWidgetData() {
        try {
          setLoading(true);
          const { data: dashboardData, error: dashboardError } =
            await supabaseClient
              .from("dashboards")
              .select("widget_details")
              .eq("id", dashboardId)
              .single();

          if (dashboardError || !dashboardData) {
            toast.error("Error fetching widget details from dashboard.");
            return;
          }

          const widgetDetails = dashboardData.widget_details.find(
            (w: any) => w.widgetId === widget.widgetId
          );

          if (!widgetDetails) {
            toast.error(
              `Widget with ID ${widget.widgetId} not found in dashboard.`
            );
            return;
          }

          const {
            dataset_id,
            xAxis,
            yAxis,
            sqlQuery,
            selectedField,
            widgetName,
            selectedGroupByValues,
            selectedDateBy, // API-provided dateBy value
          } = widgetDetails;

          // Use the updated widgetDateBy instead of selectedDateBy
          const appliedDateBy = widgetDateBy || selectedDateBy;

          if (dataset_id) {
            const { data: datasetData, error: datasetError } =
              await supabaseClient
                .from("datasets")
                .select("dataset_name, connection_id, api_id, csv_id")
                .eq("id", dataset_id)
                .single();

            if (datasetError || !datasetData) {
              toast.error(
                `Error fetching dataset for widget ID ${widget.widgetId}`
              );
              return;
            }

            const { dataset_name, connection_id, api_id } = datasetData;

            if (api_id) {
              const { data: apiConnection, error: apiError } =
                await supabaseClient
                  .from("api_connections")
                  .select("*")
                  .eq("id", api_id)
                  .single();

              if (apiError || !apiConnection) {
                toast.error(
                  `Error fetching API connection for widget ID ${widget.widgetId}`
                );
                return;
              }

              const response = await fetch(apiConnection.api_url, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${apiConnection.api_key}`,
                },
              });

              if (response.ok) {
                const apiData = await response.json();
                if (!Array.isArray(apiData) || apiData.length === 0) {
                  toast.error(
                    `No data returned from API for widget ID ${widget.widgetId}`
                  );
                  return;
                }

                const apiResult = {
                  rows: apiData,
                  columns: Object.keys(apiData[0]),
                };

                setWidgetData({
                  data: apiResult,
                  name: widgetName,
                  sqlQuery,
                  xAxis,
                  yAxis: Array.isArray(yAxis)
                    ? yAxis
                    : yAxis?.split(",").map((y: string) => y.trim()) || [],
                  selectedField: selectedField || apiResult.columns[0],
                  selectedDateBy: appliedDateBy, // Use appliedDateBy
                });
                setFilteredRows(apiResult.rows);
                setSelectedColumn(selectedField || apiResult.columns[0]);
              } else {
                toast.error(
                  `Error fetching data from API for widget ID ${widget.widgetId}`
                );
              }
            } else {
              const response = await fetch(
                `/api/datasets/${connection_id}/${dataset_id}/${dataset_name}${
                  appliedDateBy ? `?dateBy=${appliedDateBy}` : ""
                }`
              );

              if (response.ok) {
                const datasetResult = await response.json();
                const datasetData = datasetResult?.datasetData || {};
                const columns = datasetData?.columns ?? [];
                const rows = datasetData?.rows ?? [];

                const { finalRows, axes } = transformData(rows, {
                  selectedDateBy: appliedDateBy, // Ensure selectedDateBy is updated
                  groupByValue: selectedGroupByValues,
                });

                setWidgetData({
                  data: { rows: finalRows, columns },
                  name: widgetName,
                  sqlQuery: datasetResult.sqlQuery,
                  xAxis: axes.xAxis,
                  yAxis: Array.isArray(yAxis)
                    ? yAxis
                    : yAxis?.split(",").map((y: string) => y.trim()) || [],
                  selectedField: selectedField || columns[0],
                  selectedDateBy: appliedDateBy,
                });
                setFilteredRows(finalRows);
                setSelectedColumn(selectedField || columns[0]);
              } else {
                toast.error(
                  `Error fetching data for widget ID ${widget.widgetId}`
                );
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
    }, [dashboardId, widget.widgetId, widgetDateBy]);    const handleDateByChange = async (newDateBy: string) => {
      setWidgetDateBy(newDateBy); // This will trigger `useEffect` to refetch data
    };

    const handleRefreshWidget = async () => {
      setIsRefreshing(true);
      try {
        // Trigger a refresh by resetting the state
        setLoading(true);
        setWidgetData(null);
        // The useEffect will automatically refetch the data
        setTimeout(() => setIsRefreshing(false), 1000); // Minimum loading time for UX
      } catch (error) {
        setIsRefreshing(false);
        toast.error("Failed to refresh widget");
      }
    };

    const chartData = useMemo(() => {
      if (!widgetData?.data?.rows) return [];

      const rawRows = widgetData.data.rows;
      const datetimeColumns = detectDatetimeColumns(rawRows);
      const formattedData =
        datetimeColumns.length > 0 && widgetDateBy
          ? rawRows.map((row: any) =>
              formatRowData(row, datetimeColumns, widgetDateBy)
            )
          : rawRows;
      return filteredRows;
    }, [widgetData, widgetDateBy, filteredRows]);    return (
      <Card className={`widget-card rounded-xl flex flex-col h-full w-full bg-background border border-border/60 shadow-sm hover:shadow-md transition-all duration-200 ${editMode ? 'ring-primary/30 hover:ring-primary/40' : ''} group relative overflow-hidden`}>
        {/* Modern drag handle with coordinated styling */}
        {editMode && (
          <div className="drag-handle absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-primary/10 to-transparent cursor-move opacity-0 group-hover:opacity-100 transition-all duration-200 z-30 flex items-center justify-center backdrop-blur-sm">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-0.5 bg-primary/60 rounded-full transition-all duration-200 group-hover:bg-primary/80"></div>
              <div className="w-0.5 h-0.5 bg-primary/60 rounded-full transition-all duration-200 group-hover:bg-primary/80"></div>
              <div className="w-0.5 h-0.5 bg-primary/60 rounded-full transition-all duration-200 group-hover:bg-primary/80"></div>
              <div className="w-0.5 h-0.5 bg-primary/60 rounded-full transition-all duration-200 group-hover:bg-primary/80"></div>
              <div className="w-0.5 h-0.5 bg-primary/60 rounded-full transition-all duration-200 group-hover:bg-primary/80"></div>
              <div className="w-0.5 h-0.5 bg-primary/60 rounded-full transition-all duration-200 group-hover:bg-primary/80"></div>
            </div>
          </div>
        )}

        {/* Widget header - positioned above content, not overlapping */}
        <div className={`${editMode ? 'mt-4' : ''} w-full flex justify-between items-center px-3 py-2 bg-background border-b border-border/30 flex-shrink-0`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {widget.widgetName}
            </h3>          </div>
          
          <div className={`${isDropdownOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-all duration-200 flex-shrink-0`}>
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 rounded hover:bg-muted transition-colors data-[state=open]:bg-muted"
                >
                  <EllipsisVertical className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </Button>
              </DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44 bg-background border border-border shadow-lg rounded-lg">
                <DropdownMenuItem onClick={() => editWidget(widget)} className="text-sm px-3 py-2 rounded hover:bg-muted transition-colors">
                  <Pencil className="h-4 w-4 mr-2 text-foreground" />
                  <span>Edit Widget</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRefreshWidget} disabled={isRefreshing} className="text-sm px-3 py-2 rounded hover:bg-muted transition-colors">
                  <RefreshCw className={`h-4 w-4 mr-2 text-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={explainChartWithAI} className="text-sm px-3 py-2 rounded hover:bg-muted transition-colors">
                  <Bot className="h-4 w-4 mr-2 text-foreground" />
                  <span>AI Explain</span>
                </DropdownMenuItem>{widgetData?.selectedDateBy && !editMode && (
                  <>
                    <div className="border-t border-border/50 my-1" />
                    <div className="px-3 py-2">
                      <label className="text-xs font-medium text-muted-foreground mb-2 block">Date Grouping</label>
                      <Select
                        value={widgetDateBy || widgetData?.selectedDateBy}
                        onValueChange={handleDateByChange}
                      >
                        <SelectTrigger className="w-full h-7 text-xs rounded border-border bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg bg-background border border-border">
                          {byOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="rounded">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                {editMode && (
                  <>
                    <div className="border-t border-border/50 my-1" />
                    <DropdownMenuItem
                      onClick={() => removeWidget(widget.widgetId)}
                      className="text-red-500 text-sm px-3 py-2 rounded hover:bg-destructive/50 transition-colors"
                    >
                      <X className="h-4 w-4 mr-2" />
                      <span>Remove Widget</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>            </DropdownMenu>
          </div>
        </div>
        
        {/* Chart content - full width and height without padding */}
        <CardContent className="widget-content flex-1 p-0 relative overflow-hidden bg-background" style={{ height: 'calc(100% - 48px)', maxHeight: 'calc(100% - 48px)' }}>          {loading || isRefreshing ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 py-8">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 flex items-center justify-center backdrop-blur-sm shadow-lg">
                  <Lottie 
                    options={defaultOptions} 
                    height={45} 
                    width={45}
                    style={{ 
                      filter: 'hue-rotate(var(--primary-hue, 0deg))',
                      opacity: 0.9 
                    }}
                  />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {isRefreshing ? "Refreshing data..." : "Loading widget..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Please wait while we prepare your visualization
                </p>
              </div>
            </div>
          ) : widgetData ? (
            <div className="h-full w-full">
              <VisualizationRenderer
                selectedVisualization={widget.visualization_type}
                rows={filteredRows}
                columns={widgetData.data.columns}
                colors={colors}
                xAxis={widgetData.xAxis}
                yAxis={widgetData.yAxis}
                chartData={chartData}
                chartConfig={{
                  [widgetData.xAxis]: { label: widgetData.xAxis },
                  ...widgetData.yAxis.reduce((config: any, yAxisValue: string) => {
                    config[yAxisValue] = { label: yAxisValue };
                    return config;
                  }, {}),
                }}
                filteredRows={filteredRows}
                selectedColumn={selectedColumn}
                stacked={stacked}
                gridWidth={gridWidth}
                limit={100}
                searchTerm=""
                tablePagination={true}
                filters={[]}
                primaryKeys=""
                loading={false}
                setSearchTerm={() => {}}
                setLimit={() => {}}
                setXAxis={() => {}}
                setYAxis={() => {}}
                fetchDbData={() => {}}                applyFilters={async () => {}}
                setFilters={() => {}}
              />            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <X className="h-7 w-7 text-destructive" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Failed to Load Widget</p>
                <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
                  Unable to load widget data. Please check your data source connection and try again.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshWidget}
                  className="h-7 text-xs px-3 rounded bg-background hover:bg-muted transition-colors"
                >
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  Retry
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

export default WidgetCard;
