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
import { Skeleton } from "@heroui/react";
import { Button } from "@heroui/react"; // For the top bar buttons
import { Pencil, PlusCircle } from "lucide-react";
import WidgetSidePanel from "@/app/dashboard/_components/WidgetSidePanel";
import DashboardHeader from "@/app/dashboard/_components/DashboardHeader";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useUser } from "@clerk/nextjs";
import Papa from "papaparse";
import { useSignal } from "@preact/signals-react";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardPage() {
  const { dash_id } = useParams();
  const searchParams = useSearchParams();
  const name = searchParams.get("name");
  const { user } = useUser();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false); // State to manage edit mode
  const [layout, setLayout] = useState<any[]>([]); // Store layout changes
  const [customSettings, setCustomSettings] = useState<any>({}); // Store additional custom settings
  interface Widget {
    widgetId: string;
    [key: string]: any; // Add other properties as needed
  }
  const [widgets, setWidgets] = useState<Widget[]>([]); // Widgets loaded from the database
  const [widgetToEdit, setWidgetToEdit] = useState(null);
  const [isSidePanelOpen, setSidePanelOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("addWidget");
  const [gridWidth, setGridWidth] = React.useState(window.innerWidth);

  useEffect(() => {
    const updateWidth = () =>
      setGridWidth(
        document.getElementById("grid-container")?.offsetWidth ||
          window.innerWidth
      );
    window.addEventListener("resize", updateWidth);
    updateWidth(); // Call it initially
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Default layout in case no layout is saved
  const generateDefaultLayout = (widgetDetails: any) => {
    if (!widgetDetails || widgetDetails.length === 0) {
      return []; // Return an empty layout if there are no widgets
    }
    return widgetDetails.map((widget: any, index: number) => ({
      i: widget.widgetId || index.toString(),
      x: (index * 4) % 12,
      y: Math.floor(index / 3),
      w: 4,
      h: 3,
      minW: 3,
      minH: 3,
    }));
  };

  // Trigger layout resize when the side panel opens/closes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("resize"));
    }
  }, [isSidePanelOpen]);

  const handleSaveEditedWidget = (updatedWidget: { widgetId: any }) => {
    // Update the widget in the parent component's state
    setWidgets((prevWidgets) =>
      prevWidgets.map((w) =>
        w.widgetId === updatedWidget.widgetId ? updatedWidget : w
      )
    );
    refreshDashboard(); // Refresh the dashboard after saving changes
  };

  const handleAddWidget = (widget: any) => {
    // Add the new widget to the datasets and layout
    const updatedDatasets = [...datasets, widget];
    setDatasets(updatedDatasets);

    const newLayoutItem = {
      i: widget.widgetId,
      x: (datasets.length * 4) % 12,
      y: Math.floor(datasets.length / 3),
      w: 4,
      h: 3,
      minW: 3,
      minH: 3,
    };
    setLayout([...layout, newLayoutItem]); // Update layout with new widget
  };

  const addWidget = () => {
    setEditMode(true);
    setInitialTab("addWidget");
    setSidePanelOpen(true);
  };
  const handleEditWidget = (widget: any) => {
    setEditMode(true);
    setWidgetToEdit(widget);
    setInitialTab("editWidget"); // Set the initial tab to editWidget
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
          custom_settings: JSON.stringify(customSettings),
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
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Top Bar for Edit Mode */}
      {editMode && (
        <div className="fixed top-0 right-0 w-[calc(100vw-3vw)] bg-[#ffcc19] h-12 text-black p-4 z-50 flex justify-between items-center">
          <span>You are editing this dashboard</span>
          <div className="flex gap-2">
            <Button
              className="h-8"
              variant="solid"
              color="danger"
              onPress={cancelEdit}
            >
              Cancel
            </Button>
            <Button
              className="h-8"
              variant="solid"
              color="success"
              onPress={saveLayoutAndSettings}
            >
              Save
            </Button>
          </div>
        </div>
      )}
      <div className="sticky top-12 z-50 w-full">
        {/* Use the DashboardHeader component */}
        <DashboardHeader
          dashboardName={decodeURIComponent(name || "")}
          isEditMode={editMode}
          onEditClick={() => setEditMode(true)}
          created_at={dashboard?.createdAt}
          onAddWidgetClick={() => setSidePanelOpen(true)}
        />
      </div>
      <div className={`h-full max-h-[calc(100vh-10vh)] p-4 lg:p-6 space-y-6 `}>
        {datasets.length > 0 ? (
          <div
            className={`transition-all ease-in-out duration-200 ${
              isSidePanelOpen ? "w-[calc(100vw-25vw)]" : "w-full"
            }`}
          >
            <ResponsiveGridLayout
              className="layout"
              layouts={{ layout }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={140}
              isResizable={editMode}
              isDraggable={editMode}
              onLayoutChange={(newLayout) => setLayout(newLayout)}
              width={gridWidth} // ✅ Use tracked width instead of window.innerWidth
            >
              {datasets.map((widget: any, index: number) => (
                <div key={widget.widgetId || index} data-grid={layout[index]}>
                  <WidgetCard
                    widget={widget}
                    colors={colors}
                    removeWidget={removeWidget}
                    editWidget={handleEditWidget}
                    dashboardId={dash_id as string}
                    gridWidth={gridWidth} // ✅ Pass tracked width
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        ) : (
          <div className="flex flex-col h-full  items-center justify-center p-16 rounded-lg border border-dashed text-center">
            <h3 className="text-2xl font-bold">Your Dashboard is Empty</h3>
            <p className="text-sm text-muted-foreground mb-4">
              It looks like there are no widgets on this dashboard. Add your
              first widget to start visualizing your data.
            </p>
            <Button
              className="bg-primary text-black"
              onPress={() => addWidget()}
            >
              <PlusCircle size={20} className="mr-2" />
              Add Widget
            </Button>
          </div>
        )}
      </div>

      {/* Side Panel for adding new widget */}
      <WidgetSidePanel
        isOpen={isSidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        widgetToEdit={widgetToEdit}
        onEditWidget={handleSaveEditedWidget}
        onAddWidget={handleAddWidget}
        userId={user?.id || ""}
        dashboardId={dash_id as string} // Make sure this value is valid
        initialTab={initialTab} // Pass initialTab prop to set the default tab
        onTabChange={(tab: string) => setInitialTab(tab)} // Handle tab change
      />
    </>
  );
}
