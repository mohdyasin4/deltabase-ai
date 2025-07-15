// app/dashboard/my-dashboards/[dash_id]/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import WidgetCard from "../../_components/Widgetcard";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./dashboard-grid.css";
import "./light-mode-visibility.css";
import { Skeleton } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { 
  Pencil, 
  PlusCircle, 
  Settings, 
  Save, 
  X, 
  LayoutGrid, 
  Eye, 
  EyeOff,
  Activity
} from "lucide-react";
import WidgetSidePanel from "@/app/dashboard/_components/WidgetSidePanel";
import DashboardHeader from "@/app/dashboard/_components/DashboardHeader";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useUser } from "@clerk/nextjs";
import Papa from "papaparse";
import { useSignal } from "@preact/signals-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { Keyboard, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardPage() {
  const { dash_id } = useParams();
  const searchParams = useSearchParams();
  const name = searchParams.get("name");
  const { user } = useUser();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<any[]>([]);
  const [customSettings, setCustomSettings] = useState<any>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  interface Widget {
    widgetId: string;
    [key: string]: any;
  }
  const [widgets, setWidgets] = useState<Widget[]>([]);  const [widgetToEdit, setWidgetToEdit] = useState<any>(null);
  const [isSidePanelOpen, setSidePanelOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("gallery");  const [gridWidth, setGridWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [gridHeight, setGridHeight] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [draggedOverZone, setDraggedOverZone] = useState(false);
  useEffect(() => {
    const updateWidth = () =>
      setGridWidth(
        document.getElementById("grid-container")?.offsetWidth ||
          window.innerWidth
      );
    window.addEventListener("resize", updateWidth);
    updateWidth(); // Call it initially
    return () => window.removeEventListener("resize", updateWidth);
  }, []);  // Calculate grid height based on layout
  useEffect(() => {
    if (layout.length > 0) {
      // Find the maximum y + h value from all widgets
      const maxY = Math.max(...layout.map(item => (item.y || 0) + (item.h || 3)));
      const calculatedHeight = maxY * 100 + 80; // 100px per row + padding
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight - 200 : 600;
      setGridHeight(Math.max(calculatedHeight, viewportHeight));
    } else {
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight - 200 : 600;
      setGridHeight(viewportHeight);
    }
  }, [layout, datasets.length]);

  useEffect(() => {
    setSidePanelOpen(false);
  }, [editMode]);
  
  // Keyboard shortcuts for dashboard
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'e':
        case 'E':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (datasets.length > 0) {
              setEditMode(!editMode);
              toast.success(editMode ? 'Edit mode deactivated' : 'Edit mode activated');
            }
          }
          break;
        case 'n':
        case 'N':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            addWidget();
          }
          break;
        case 's':
        case 'S':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (editMode) {
              saveLayoutAndSettings();
            }
          }
          break;        case 'Escape':
          if (editMode) {
            cancelEdit();
          }
          if (isSidePanelOpen) {
            setSidePanelOpen(false);
          }
          if (showShortcuts) {
            setShowShortcuts(false);
          }
          break;
        case '?':
          event.preventDefault();
          setShowShortcuts(!showShortcuts);
          break;
      }
    };    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editMode, datasets.length, isSidePanelOpen, showShortcuts]);  // Helper function to calculate flexible widget position
  const calculateWidgetPosition = (index: number) => {
    // Predefined positions for specific layouts:
    // - 3 widgets in 2nd row (indices 3, 4, 5)
    // - 2 widgets in 1st column (indices 0, 1)
    // - Flexible positioning for remaining widgets
    
    if (index === 0) return { x: 0, y: 0 };    // Top-left
    if (index === 1) return { x: 4, y: 0 };   // Top-middle
    if (index === 2) return { x: 8, y: 0 };   // Top-right
    if (index === 3) return { x: 0, y: 1 };   // Second row, left
    if (index === 4) return { x: 6, y: 1 };   // Second row, right
    
    // For index 5 and beyond, use flexible 3-per-row layout
    const adjustedIndex = index - 5;
    const widgetsPerRow = 3;
    const widgetWidth = 4; // Each widget takes 4 grid units
    
    const row = Math.floor(adjustedIndex / widgetsPerRow) + 2; // Start from row 2
    const col = adjustedIndex % widgetsPerRow;
    const x = col * widgetWidth;
    
    return { x, y: row };
  };

  // Default layout in case no layout is saved
  const generateDefaultLayout = (widgetDetails: any) => {
    if (!widgetDetails || widgetDetails.length === 0) {
      return []; // Return an empty layout if there are no widgets
    }
    return widgetDetails.map((widget: any, index: number) => {
      const position = calculateWidgetPosition(index);
      return {
        i: widget.widgetId || index.toString(),
        x: position.x,
        y: position.y,
        w: 4,
        h: 3,
        minW: 2,
        minH: 2,
      };
    });
  };
  // Trigger layout resize when the side panel opens/closes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("resize"));
    }
  }, [isSidePanelOpen]);

  // Ensure layout and datasets arrays are synchronized
  useEffect(() => {
    if (datasets.length > layout.length) {
      // Add missing layout items for new widgets
      const missingLayoutItems = datasets.slice(layout.length).map((widget, index) => ({
        i: widget.widgetId || `widget-${layout.length + index}`,
        x: ((layout.length + index) * 4) % 12,
        y: Math.floor((layout.length + index) / 3),
        w: 4,
        h: 3,
        minW: 2,
        minH: 2,
      }));
      setLayout(prevLayout => [...prevLayout, ...missingLayoutItems]);
    } else if (layout.length > datasets.length) {
      // Remove extra layout items that don't have corresponding widgets
      const widgetIds = new Set(datasets.map(w => w.widgetId));
      setLayout(prevLayout => prevLayout.filter(item => widgetIds.has(item.i)));
    }
  }, [datasets.length, layout.length]);

  const handleSaveEditedWidget = (updatedWidget: { widgetId: any }) => {
    // Update the widget in the parent component's state
    setWidgets((prevWidgets) =>
      prevWidgets.map((w) =>
        w.widgetId === updatedWidget.widgetId ? updatedWidget : w
      )
    );
    refreshDashboard(); // Refresh the dashboard after saving changes
  };  const handleAddWidget = (widget: any) => {
    // Check if this is replacing a preview widget (isConfiguring: true)
    if (widget.isConfiguring && widget.widgetId && widget.widgetId.startsWith('temp-')) {
      // This is completing configuration of a preview widget
      const finalWidget = {
        ...widget,
        widgetId: widget.widgetId, // Keep the same ID to replace in place
        isConfiguring: false, // Mark as configured
        isTemplate: false // No longer a template
      };

      // Update the existing preview widget in datasets
      setDatasets(prevDatasets => 
        prevDatasets.map(w => 
          w.widgetId === widget.widgetId ? finalWidget : w
        )
      );

      // Layout should already exist for this widget, no need to add new layout item
    } else {
      // This is a new widget (not from drag/drop template)
      const finalWidget = {
        ...widget,
        widgetId: widget.widgetId || Date.now().toString(),
        isConfiguring: false,
        isTemplate: false
      };      // Add the new widget to the datasets and layout
      const updatedDatasets = [...datasets, finalWidget];
      setDatasets(updatedDatasets);

      // Use flexible positioning algorithm
      const position = calculateWidgetPosition(datasets.length);
      const newLayoutItem = {
        i: finalWidget.widgetId,
        x: position.x,
        y: position.y,
        w: 4,
        h: 3,
        minW: 2,
        minH: 2,
      };
      setLayout([...layout, newLayoutItem]); // Update layout with new widget
    }
  };

  // Enhanced drag and drop handlers for widget templates
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDraggedOverZone(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only hide drag over state if we're actually leaving the grid area
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDraggedOverZone(false);
    }
  };  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverZone(false);

    try {
      const dragData = e.dataTransfer.getData('application/json');
      if (!dragData) return;

      const parsedData = JSON.parse(dragData);
      
      if (parsedData.type === 'widget-template') {
        // Generate a temporary widget ID for the preview
        const tempWidgetId = `temp-${Date.now()}`;
        
        // Store the template data for configuration
        const templateData = {
          widgetType: parsedData.widgetType,
          widgetName: parsedData.widgetName || `${parsedData.widgetType} Widget`,
        };

        // Create a preview widget to show immediately in the dashboard
        const previewWidget = {
          widgetId: tempWidgetId,
          widgetName: templateData.widgetName,
          visualization_type: templateData.widgetType,
          dataset_id: null,
          sql_query: null,
          xAxis: null,
          yAxis: [],
          is_stacked: false,
          data: [],
          isTemplate: true,
          isConfiguring: true // Flag to show this is being configured
        };        // Add preview widget to datasets and create layout item simultaneously
        setDatasets(prevDatasets => {
          const newDatasets = [...prevDatasets, previewWidget];
          
          // Create layout item using the flexible positioning algorithm
          const position = calculateWidgetPosition(newDatasets.length - 1);
          const newLayoutItem = {
            i: tempWidgetId,
            x: position.x,
            y: position.y,
            w: 4,
            h: 3,
            minW: 2,
            minH: 2,
          };
          
          // Update layout with the new item
          setLayout(prevLayout => [...prevLayout, newLayoutItem]);
          
          return newDatasets;
        });

        // Set up the widget for editing (this will populate the form)
        setWidgetToEdit({
          widgetId: tempWidgetId,
          widgetName: templateData.widgetName,
          visualization_type: templateData.widgetType,
          dataset_id: null,
          sql_query: null,
          xAxis: null,
          yAxis: [],
          is_stacked: false,
          data: [],
          isTemplate: true,
          isConfiguring: true
        });

        // Open side panel in create mode for configuration
        setInitialTab("create");
        setSidePanelOpen(true);
        setEditMode(true);

        toast.success(`Configure your ${templateData.widgetName} settings`);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      toast.error('Failed to process widget template');
    }
  };  // Custom close handler for side panel to clean up preview widgets
  const handleSidePanelClose = () => {
    // Check if there's a preview widget being configured
    if (widgetToEdit && widgetToEdit.isConfiguring && widgetToEdit.widgetId && widgetToEdit.widgetId.startsWith('temp-')) {
      // Remove the preview widget from datasets and layout
      setDatasets(prevDatasets => 
        prevDatasets.filter(w => w.widgetId !== widgetToEdit.widgetId)
      );
      setLayout(prevLayout => 
        prevLayout.filter(item => item.i !== widgetToEdit.widgetId)
      );
      toast('Widget configuration cancelled', { icon: 'ℹ️' });
    }
    
    setWidgetToEdit(null);
    setSidePanelOpen(false);
  };

  const addWidget = () => {
    setEditMode(true);
    setInitialTab("gallery");
    setSidePanelOpen(true);
  };  const handleEditWidget = (widget: any) => {
    setEditMode(true);
    setWidgetToEdit(widget);
    setInitialTab("settings"); // Set the initial tab to settings
    setSidePanelOpen(true);
    console.log(initialTab);
  };

  // Fetch dashboard data
  const fetchDashboard = async () => {
    setLoading(true);
    const { data, error } = await supabaseClient
      .from("dashboards")
      .select("*")
      .eq("id", dash_id)
      .single();

    if (error) {
      toast.error("Error fetching dashboard data");
      setLoading(false);
      return;
    }

    if (data) {
      const fetchedData = await fetchWidgetDatasets(
        dash_id as unknown as number
      );
      setDashboard(data);
      setDatasets(fetchedData);

      const initialLayout = data.layout
        ? typeof data.layout === "string"
          ? JSON.parse(data.layout)
          : data.layout
        : generateDefaultLayout(data.widget_details || []);

      setLayout(initialLayout);
      setCustomSettings(data.custom_settings || {});
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
  }, [dash_id]);
  
  const fetchWidgetDatasets = async (dashboardId: number) => {
    try {
      // Step 1: Fetch the widget details from the dashboard table
      const { data: dashboardData, error: dashboardError } =
        await supabaseClient
          .from("dashboards")
          .select("widget_details")
          .eq("id", dashboardId)
          .single();

      if (dashboardError || !dashboardData) {
        toast.error("Error fetching widget details from dashboard.");
        return [];
      }

      const widgets = dashboardData.widget_details || [];

      if (widgets.length === 0) {
        return [];
      }

      // Step 2: Fetch datasets based on the widget details
      const fetchedDatasets = await Promise.all(
        widgets.map(async (widget: any) => {
          const {
            dataset_id,
            xAxis,
            yAxis,
            sql_query,
            is_stacked,
            widgetName,
            visualization_type,
          } = widget;

          if (dataset_id) {
            // Fetch the dataset details
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
              return null;
            }

            const { dataset_name, connection_id, api_id, csv_id } = datasetData;

            // Ensure y_axis is an array
            const yAxisArray = Array.isArray(yAxis)
              ? yAxis
              : yAxis?.split(",").map((y: string) => y.trim());

            if (api_id) {
              // Existing API logic
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
                return null;
              }

              const response = await fetch(apiConnection.api_url, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${apiConnection.api_key}`,
                },
              });

              if (response.ok) {
                const apiData = await response.json();
                return {
                  ...widget,
                  xAxis: xAxis || null,
                  yAxis: yAxisArray,
                  sqlQuery: sql_query || null,
                  is_stacked: is_stacked || false,
                  widgetName: widgetName || "Untitled Widget",
                  visualization_type: visualization_type || "bar",
                  data: apiData,
                };
              } else {
                toast.error(
                  `Error fetching data from API for widget ID ${widget.widgetId}`
                );
                return null;
              }
            } else if (csv_id) {
              // New CSV logic
              const { data: csvConnection, error: csvError } =
                await supabaseClient
                  .from("csvData")
                  .select("*")
                  .eq("id", csv_id)
                  .single();

              if (csvError || !csvConnection) {
                toast.error(
                  `Error fetching CSV connection for widget ID ${widget.widgetId}`
                );
                return null;
              }

              const { bucket_name, file_name, selectedFields } = csvConnection;

              if (!bucket_name || !file_name || !selectedFields) {
                toast.error(
                  `Missing required CSV details for widget ID ${widget.widgetId}`
                );
                return null;
              }

              const { data: file, error: fileError } =
                await supabaseClient.storage
                  .from(bucket_name)
                  .download(file_name);

              if (fileError || !file) {
                toast.error(
                  `Error fetching CSV file for widget ID ${widget.widgetId}`
                );
                return null;
              }

              const csvText = await file.text();
              const parsedData = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
              });

              if (parsedData.errors.length > 0) {
                toast.error(
                  `Error parsing CSV file for widget ID ${widget.widgetId}`
                );
                return null;
              }

              const filteredRows = parsedData.data.map((row: any) => {
                const filteredRow: Record<string, any> = {};
                selectedFields.forEach((field: string) => {
                  if (row && typeof row === "object" && field in row) {
                    filteredRow[field] = row[field];
                  }
                });
                return filteredRow;
              });

              return {
                ...widget,
                xAxis: xAxis || null,
                yAxis: yAxisArray,
                sqlQuery: sql_query || null,
                is_stacked: is_stacked || false,
                widgetName: widgetName || "Untitled Widget",
                visualization_type: visualization_type || "table",
                data: filteredRows,
              };
            }
            // If no api_id, fetch data from the dataset
            const response = await fetch(
              `/api/datasets/${connection_id}/${dataset_id}/${dataset_name}`
            );

            if (response.ok) {
              const datasetResult = await response.json();
              return {
                ...widget,
                xAxis: xAxis || null, // Use null if xAxis is missing
                yAxis: yAxisArray, // Store the yAxis as an array
                sqlQuery: sql_query || null, // Use null if sql_query is missing
                is_stacked: is_stacked || false,
                widgetName: widgetName || "Untitled Widget",
                visualization_type: visualization_type || "bar", // Default visualization type
                data: datasetResult, // Include the fetched dataset result
              };
            }
          }

          return null;
        })
      );

      return fetchedDatasets.filter((widget) => widget !== null);
    } catch (error) {
      toast.error("An error occurred while fetching widget datasets.");
      console.error("Error fetching widget datasets:", error);
      return [];
    }
  };

  // Save layout and settings to the database
  async function saveLayoutAndSettings() {
    try {
      const { error } = await supabaseClient
        .from("dashboards")
        .update({
          layout: JSON.stringify(layout),
        })
        .eq("id", dash_id);

      if (error) {
        toast.error("Error saving dashboard settings");
      } else {
        toast.success("Dashboard settings updated successfully!");
      }
    } catch (error) {
      toast.error("An error occurred while saving the layout.");
    }
    setSidePanelOpen(false);
    setEditMode(false);
  }

  function cancelEdit() {
    if (dashboard && dashboard.layout) {
      const parsedLayout =
        typeof dashboard.layout === "string"
          ? JSON.parse(dashboard.layout)
          : dashboard.layout;
      setLayout(parsedLayout);
    } else {
      const defaultLayout = generateDefaultLayout(dashboard.widget_details);
      setLayout(defaultLayout);
    }
    setSidePanelOpen(false);
    setEditMode(false);
  }

  const removeWidget = async (widgetId: string) => {
    const updatedWidgets = dashboard?.widget_details?.filter(
      (widget: { widgetId: string }) => widget.widgetId !== widgetId
    );

    setDashboard((prevDashboard: any) => ({
      ...prevDashboard,
      widget_details: updatedWidgets,
    }));

    const { error } = await supabaseClient
      .from("dashboards")
      .update({ widget_details: updatedWidgets })
      .eq("id", dash_id);

    if (error) {
      toast.error("Error removing widget");
    } else {
      toast.success("Widget removed successfully");
      fetchDashboard();
    }
  };

  // Refresh the dashboard after changes
  const refreshDashboard = () => {
    fetchDashboard();
  };

  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
  ];

  // Rendering part
  if (loading) {
    const skeletonCount = datasets.length || 3; // Show at least 3 skeletons if no widgets are fetched yet

    return (
      <>
        <div className="w-full">
          {/* Use the DashboardHeader component */}
          <DashboardHeader
            dashboardName={decodeURIComponent(name || "")}
            isEditMode={editMode}
            onEditClick={() => setEditMode(true)}
            onAddWidgetClick={() => addWidget()}
            created_at={dashboard?.createdAt}
          />
        </div>
        <div className="p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(skeletonCount)].map((_, index) => (
              <Card key={index} className="w-full">
                <CardHeader>
                  <Skeleton className="h-8 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>        </div>
      </>
    );
  }  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-background">
        {/* Dashboard Header Component */}
        <div className="flex-shrink-0 sticky top-0 z-40 w-full">       
           <DashboardHeader
            dashboardName={decodeURIComponent(name || "")}
            isEditMode={editMode}
            onEditClick={() => setEditMode(true)}
            onAddWidgetClick={addWidget}
            created_at={dashboard?.createdAt || ""}
            widgetCount={datasets.length}
            isLive={datasets.length > 0}
            onShare={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Dashboard link copied to clipboard!");
            }}
            onDuplicate={() => {/* TODO: Implement duplicate */}}
            onDelete={() => {/* TODO: Implement delete */}}
            onExport={() => {/* TODO: Implement export */}}
            onCancelEdit={cancelEdit}
            onSaveChanges={saveLayoutAndSettings}
          />
        </div>        {/* Main Content */}
        <motion.div 
          animate={{
            marginRight: isSidePanelOpen ? "400px" : "0px"
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.4
          }}
          className="flex-1 relative min-h-0"
        >          {loading ? (
          <div className="p-6 relative z-10 bg-foreground/5 min-h-screen">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <Card key={index} className="animate-pulse bg-gradient-to-br from-card/60 via-card/40 to-muted/20 backdrop-blur-sm border-border/50 rounded-xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg bg-gradient-to-r from-muted via-muted/60 to-muted" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-muted via-muted/60 to-muted" />
                        <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-muted via-muted/60 to-muted" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Skeleton className="h-36 w-full mb-4 bg-gradient-to-r from-muted via-muted/60 to-muted rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full bg-gradient-to-r from-muted via-muted/60 to-muted" />
                      <Skeleton className="h-3 w-2/3 bg-gradient-to-r from-muted via-muted/60 to-muted" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>        ) : datasets.length > 0 ? (          <div
            className={`relative z-10 transition-all ease-in-out duration-300 p-6 pb-14 bg-foreground/5 min-h-screen ${
              editMode ? 'bg-gradient-to-br from-foreground/5 dark:from-primary/5 via-background dark:via-primary/5 to-foreground/5 dark:to-primary/5 rounded-lg mx-2 my-2 border-2 border-dashed border-foreground/30 dark:border-amber-400/30' : ''
            }`}
            id="grid-container" 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >{/* Enhanced Edit Mode Visual Indicator */}
            {editMode && (
              <div className="absolute inset-0 pointer-events-none rounded-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 rounded-lg"></div>
                  {/* Full-screen widget drop zone overlay */}                <div className="absolute inset-0 w-full h-full"
                     onClick={(e) => {
                       // Only trigger if clicking on the overlay itself
                       if (e.target === e.currentTarget) {
                         addWidget();
                       }
                     }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg px-6 py-4 shadow-xl opacity-0 hover:opacity-100 transition-all duration-300 transform hover:scale-105">
                      <div className="flex items-center gap-3 text-sm text-foreground">
                        <PlusCircle size={18} className="text-primary animate-pulse" />
                        <span className="font-medium">Click anywhere to add widget</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Add Widget Zones - Dashed Line Indicators */}
                <div className="absolute inset-6 pointer-events-none">
                  <div className="w-full h-full grid grid-cols-12 gap-4 opacity-30">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="relative">
                        <div className="w-full h-full border-2 border-dashed border-foreground/40 dark:border-amber-500/40 rounded-lg bg-foreground/5 dark:bg-amber-500/5 min-h-[100px] flex items-center justify-center">
                          <div className="text-xs text-foreground/60 dark:text-amber-500/60 font-medium">Grid {i + 1}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
              </div>
            )}            {/* Enhanced Floating Add Widget Button - Bottom Right */}
            <AnimatePresence>
              {editMode && datasets.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    x: isSidePanelOpen ? -400 : 0
                  }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 30,
                    duration: 0.3 
                  }}
                  className="fixed bottom-3 right-6 z-50"
                >
                  <Button
                    onClick={addWidget}
                    size="lg"
                    className="floating-add-widget bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-xl hover:shadow-2xl transition-all duration-200 border-0 rounded-full px-6 py-3 h-auto"
                  >
                    <PlusCircle size={20} className="mr-2" />
                    Add Widget
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Add Widget Button - For Empty Dashboard */}
            {editMode && datasets.length === 0 && (
              <div className="absolute top-4 left-4 z-50">
                <Button
                  onClick={addWidget}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 rounded-full px-4 py-2"
                >
                  <PlusCircle size={16} className="mr-2" />
                  Add Widget
                </Button>
              </div>            )}
            {/* External Drag and Drop Container */}            <div
              className="w-full" 
              style={{ overflow: 'visible' }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            ><ResponsiveGridLayout
                className={`layout relative z-20 ${editMode ? 'edit-mode-grid' : ''} ${draggedOverZone ? 'drag-over-active' : ''}`}
                layouts={{ 
                  lg: datasets
                    .filter((widget: any) => {
                      return widget && 
                             typeof widget === 'object' && 
                             widget.widgetId && 
                             typeof widget.widgetId === 'string';
                    })
                    .map((widget: any, index: number) => {
                      const widgetId = String(widget.widgetId);                      const layoutItem = Array.isArray(layout) 
                        ? layout.find(item => item && item.i === widgetId) 
                        : null;
                      
                      // Use flexible positioning if no layout item exists
                      const defaultPosition = layoutItem ? 
                        { x: layoutItem.x, y: layoutItem.y } : 
                        calculateWidgetPosition(index);
                      
                      return {
                        i: widgetId,
                        x: Math.max(0, Math.floor(Number(layoutItem?.x) || defaultPosition.x)),
                        y: Math.max(0, Math.floor(Number(layoutItem?.y) || defaultPosition.y)),
                        w: Math.max(1, Math.floor(Number(layoutItem?.w) || 4)),
                        h: Math.max(1, Math.floor(Number(layoutItem?.h) || 3)),
                        minW: Math.max(1, Math.floor(Number(layoutItem?.minW) || 2)),
                        minH: Math.max(1, Math.floor(Number(layoutItem?.minH) || 2))
                      };
                    })
                }}                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={100}
                isResizable={editMode}
                isDraggable={editMode}
                onLayoutChange={(newLayout, allLayouts) => {
                  // Only update layout if user is actually making changes (not during responsive breakpoint changes)
                  if (editMode && (isDragging || isResizing)) {
                    setLayout(newLayout);
                  }
                }}
                onDragStart={() => setIsDragging(true)}
                onDragStop={() => setIsDragging(false)}
                onResizeStart={() => setIsResizing(true)}
                onResizeStop={() => setIsResizing(false)}
                onBreakpointChange={(breakpoint, cols) => {
                  // Don't update layout during breakpoint changes to prevent widget repositioning
                  console.log('Breakpoint changed to:', breakpoint, 'cols:', cols);
                }}                width={gridWidth}
                compactType="vertical"
                preventCollision={false}
                margin={[8, 8]}
                containerPadding={[0, 0]}draggableHandle=".drag-handle"
                resizeHandles={['se']}
                useCSSTransforms={true}
                transformScale={1}
                allowOverlap={false}
                autoSize={false}
                onResize={() => {
                  // Trigger window resize event to recalculate layout
                  setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
                  }, 100);
                }}
              >{datasets
                .filter((widget: any) => {
                  // More robust filtering to ensure we have valid widgets
                  return widget && 
                         typeof widget === 'object' && 
                         widget.widgetId && 
                         typeof widget.widgetId === 'string';
                })
                .map((widget: any, index: number) => {
                  // Create a completely safe unique identifier
                  const widgetId = String(widget.widgetId) || `widget-${Date.now()}-${index}`;
                    // Find the layout item for this widget or create a safe default
                  const layoutItem = Array.isArray(layout) 
                    ? layout.find(item => item && item.i === widgetId) 
                    : null;
                  
                  // Use flexible positioning if no layout item exists
                  const defaultPosition = layoutItem ? 
                    { x: layoutItem.x, y: layoutItem.y } : 
                    calculateWidgetPosition(index);
                  
                  // Create completely safe layout properties with guaranteed number values
                  const safeLayout = {
                    i: widgetId,
                    x: Math.max(0, Math.floor(Number(layoutItem?.x) || defaultPosition.x)),
                    y: Math.max(0, Math.floor(Number(layoutItem?.y) || defaultPosition.y)),
                    w: Math.max(1, Math.floor(Number(layoutItem?.w) || 4)),
                    h: Math.max(1, Math.floor(Number(layoutItem?.h) || 3)),
                    minW: Math.max(1, Math.floor(Number(layoutItem?.minW) || 2)),
                    minH: Math.max(1, Math.floor(Number(layoutItem?.minH) || 2))
                  };                  return (
                    <div 
                      key={widgetId}
                      className={`widget-container group transition-all duration-200 ${
                        editMode 
                          ? 'hover:shadow-lg hover:scale-[1.02] hover:z-30' 
                          : 'hover:shadow-md'
                      } ${
                        widget.isConfiguring 
                          ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50/50 dark:bg-blue-950/30' 
                          : ''
                      }`}                      style={{ 
                        height: `${safeLayout.h * 100}px`,
                        minHeight: `${safeLayout.h * 100}px`,
                        maxHeight: `${safeLayout.h * 100}px`,
                        overflow: 'hidden'
                      }}
                    >
                  <WidgetCard
                    widget={widget}
                    colors={colors}
                    removeWidget={removeWidget}
                    editWidget={handleEditWidget}
                    dashboardId={dash_id as string}
                    gridWidth={gridWidth}
                    editMode={editMode}
                  />
                  
                  {/* Preview widget configuration overlay */}
                  {widget.isConfiguring && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/20 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-lg border-2 border-blue-500 border-dashed">
                      <div className="bg-blue-500 text-white text-sm px-3 py-2 rounded-lg font-medium shadow-lg flex items-center gap-2 animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                        Configuring...
                      </div>
                    </div>
                  )}
                  
                  {/* Enhanced Edit Mode Indicators */}
                  {editMode && !widget.isConfiguring && (
                    <>
                      {/* Drag indicator overlay */}
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-lg border-2 border-primary/20 border-dashed">
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md font-medium">
                          Drag to move
                        </div>
                      </div>
                      
                      {/* Enhanced Resize Handle */}
                      <div className="react-resizable-handle react-resizable-handle-se absolute bottom-1 right-1 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-gradient-to-br from-primary to-primary/80 rounded-tl-lg shadow-md">
                          <div className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-primary-foreground rounded-full"></div>
                        </div>
                      </div>                    </>
                  )}
                </div>
                  );
                })}
              
              {/* Enhanced Drop Zone Overlay for Active Dragging */}
              {editMode && draggedOverZone && (
                <div className="fixed inset-0 z-30 pointer-events-none">
                  <div className="grid-drop-zone-overlay">
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="mb-4">
                        <PlusCircle className="h-16 w-16 text-primary animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-primary">Drop Widget Here</h3>
                        <p className="text-sm text-primary/80">
                          Release to add widget to your dashboard
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Add Widget Drop Zones in Edit Mode */}
              {editMode && datasets.length === 0 && (
                <div className="col-span-full">
                  <div className="border-2 border-dashed border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-colors duration-200 h-64 rounded-lg">
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <div className="mb-4">
                        <PlusCircle className="h-12 w-12 text-primary/60" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium text-foreground">Drop Zone Active</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          This is your widget canvas. Click "Add Widget" to create your first visualization.
                        </p>
                        <Button
                          size="sm"
                          onClick={addWidget}
                          className="mt-4 bg-primary hover:bg-primary/90"
                        >
                          <PlusCircle size={16} className="mr-2" />
                          Add Your First Widget
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>              )}
            </ResponsiveGridLayout>
            </div>
          </div>) : (          <div 
            className="flex flex-col items-center justify-center p-16 relative z-10 empty-dashboard bg-foreground/5 min-h-screen"
          >
            {/* Enhanced Empty State with Add Widget Focus */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none"></div>
            <div className="absolute inset-0 bg-dot-pattern opacity-[0.03] pointer-events-none"></div>
            
            <Card className="border-dashed border-2 max-w-2xl w-full bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm border-amber/50 shadow-xl relative overflow-hidden">
              {/* Subtle animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-50"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary animate-pulse"></div>
              
              <CardContent className="flex flex-col items-center justify-center py-20 text-center relative z-10">
                <div className="relative mb-8">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 border-2 border-primary/30 shadow-2xl">
                    <LayoutGrid className="h-12 w-12 text-primary animate-pulse" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-8 w-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <PlusCircle className="h-5 w-5 text-primary-foreground" />
                  </div>
                  {/* Floating elements */}
                  <div className="absolute -top-4 -left-4 w-3 h-3 bg-secondary/60 rounded-full animate-pulse delay-500"></div>
                  <div className="absolute -bottom-3 -right-6 w-2 h-2 bg-primary/60 rounded-full animate-pulse delay-1000"></div>
                  <div className="absolute -bottom-4 -left-3 w-4 h-4 bg-accent/60 rounded-full animate-pulse delay-700"></div>
                </div>
                
                <div className="space-y-6 max-w-lg">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent">
                      Start Building Your Dashboard
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Transform your data into beautiful, interactive visualizations. Add charts, tables, and metrics from your connected data sources to create comprehensive dashboards that tell your data story.
                    </p>
                  </div>
                  
                  <div className="pt-4 space-y-6">
                    <Button
                      onClick={addWidget}
                      className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 text-primary-foreground shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0 text-base py-6 px-8"
                      size="lg"
                    >
                      <PlusCircle size={20} className="mr-2" />
                      Add Your First Widget
                    </Button>
                    
                    {/* Feature highlights */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="space-y-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto">
                          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">Charts</div>
                          <div className="text-xs text-muted-foreground">Bar, Line, Pie</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto">
                          <div className="w-3 h-2 bg-green-500 rounded-sm"></div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">Tables</div>
                          <div className="text-xs text-muted-foreground">Data Grids</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-foreground">Metrics</div>
                          <div className="text-xs text-muted-foreground">KPI Cards</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-border/50 pt-4 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        ✨ Get started with professional data visualizations in minutes
                      </p>
                      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                        <span>• Drag & Drop</span>
                        <span>• Real-time Data</span>
                        <span>• Interactive Charts</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Start Guide */}
            {!editMode && (
              <div className="mt-8 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+E</kbd>
                  <span>Enable Edit Mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+N</kbd>
                  <span>Add Widget</span>
                </div>
              </div>
            )}          </div>
        )}
        </motion.div>

      {/* Enhanced Side Panel */}
      <WidgetSidePanel
        isOpen={isSidePanelOpen}
        onClose={handleSidePanelClose}
        widgetToEdit={widgetToEdit}
        onEditWidget={handleSaveEditedWidget}
        onAddWidget={handleAddWidget}
        userId={user?.id || ""}
        dashboardId={dash_id as string}
        initialTab={initialTab}
        onTabChange={(tab: string) => setInitialTab(tab)}
      />      {/* Professional Keyboard Shortcuts Panel - Positioned on the right to avoid sidebar overlap */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              x: isSidePanelOpen ? -400 : 0
            }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`fixed ${editMode ? "bottom-14" : "bottom-6"} right-6 z-50`}
          >
            <div className="keyboard-shortcuts-panel bg-card/95 border border-border/50 rounded-xl shadow-2xl p-4 w-80 max-w-sm relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Keyboard className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Keyboard Shortcuts
                  </h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowShortcuts(false)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground">Toggle Edit Mode</span>
                    <kbd className="px-2 py-1 bg-muted/80 rounded-md text-xs font-mono border border-border/50">
                      Ctrl+E
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground">Add Widget</span>
                    <kbd className="px-2 py-1 bg-muted/80 rounded-md text-xs font-mono border border-border/50">
                      Ctrl+N
                    </kbd>
                  </div>
                  {editMode && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-foreground">Save Changes</span>
                        <kbd className="px-2 py-1 bg-muted/80 rounded-md text-xs font-mono border border-border/50">
                          Ctrl+S
                        </kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-foreground">Cancel Edit</span>
                        <kbd className="px-2 py-1 bg-muted/80 rounded-md text-xs font-mono border border-border/50">
                          Esc
                        </kbd>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="border-t border-border/50 pt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-500/60 pulse-soft"></div>
                    <span>Press <kbd className="px-1 py-0.5 bg-muted/60 rounded text-xs">?</kbd> to toggle this panel</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>      {/* Floating Keyboard Shortcuts Toggle Button - Moved to respond to add widget button */}
      <motion.div 
        animate={{ 
          y: editMode && datasets.length > 0 ? -65 : 0,
          x: isSidePanelOpen ? -400 : 0
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 30,
          duration: 0.3 
        }}
        className={`fixed ${editMode ? "bottom-8" : "bottom-6"} right-6 z-40`}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="keyboard-shortcuts-toggle h-10 w-10 p-0 rounded-md bg-card/95 border-border/50 shadow-lg hover:shadow-xl transition-all duration-200"
          title="Toggle Keyboard Shortcuts (Press ?)"        >
          <Keyboard className="w-4 h-4 text-muted-foreground" />
        </Button>
      </motion.div>
    </div>
    </DndProvider>
  );
}
