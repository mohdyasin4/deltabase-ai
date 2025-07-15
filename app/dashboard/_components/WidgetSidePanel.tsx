import React, { useEffect, useState } from "react";
import { Switch } from "@heroui/react";
import Papa from "papaparse";
import {
  AreaChart,
  BarChart,
  LineChart,
  PieChart,
  Table2,
  Plus,
  Settings,
  Database,
  FileText,
  Zap,
  Save,
  Loader2,
  Hash,
  X,
  GripVertical,
  Search,
  Filter,
  Eye,
  EyeOff,
  Palette,
  Layout,
  TrendingUp,
  BarChart3,
  Clock,
  Users,
  DollarSign,
  Activity,
  MousePointer,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabaseClient } from "@/lib/supabaseClient";
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SqlEditor from "./SqlEditor";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

type SidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: any) => void;
  onEditWidget: (updatedWidget: any) => void;
  widgetToEdit?: any;
  userId: string;
  dashboardId: string;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
};

interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: string;
  category: string;
  color: string;
  preview?: string;
  complexity: 'simple' | 'medium' | 'advanced';
}

const widgetTemplates: WidgetTemplate[] = [
  {
    id: 'table',
    name: 'Data Table',
    description: 'Display structured data in rows and columns',
    icon: <Table2 className="w-4 h-4" />,
    type: 'table',
    category: 'Data Display',
    color: 'bg-blue-500',
    complexity: 'simple'
  },
  {
    id: 'line',
    name: 'Line Chart',
    description: 'Show trends and changes over time',
    icon: <LineChart className="w-4 h-4" />,
    type: 'line',
    category: 'Analytics',
    color: 'bg-green-500',
    complexity: 'simple'
  },
  {
    id: 'bar',
    name: 'Bar Chart',
    description: 'Compare values across categories',
    icon: <BarChart className="w-4 h-4" />,
    type: 'bar',
    category: 'Analytics',
    color: 'bg-purple-500',
    complexity: 'simple'
  },
  {
    id: 'area',
    name: 'Area Chart',
    description: 'Visualize cumulative totals over time',
    icon: <AreaChart className="w-4 h-4" />,
    type: 'area',
    category: 'Analytics',
    color: 'bg-orange-500',
    complexity: 'medium'
  },
  {
    id: 'pie',
    name: 'Pie Chart',
    description: 'Show proportions and percentages',
    icon: <PieChart className="w-4 h-4" />,
    type: 'pie',
    category: 'Analytics',
    color: 'bg-pink-500',
    complexity: 'simple'
  },
  {
    id: 'number',
    name: 'Number Widget',
    description: 'Display key metrics and KPIs',
    icon: <Hash className="w-4 h-4" />,
    type: 'number',
    category: 'KPI',
    color: 'bg-indigo-500',
    complexity: 'simple'
  },
  {
    id: 'metric',
    name: 'Metric Card',
    description: 'Highlight important business metrics',
    icon: <TrendingUp className="w-4 h-4" />,
    type: 'metric',
    category: 'KPI',
    color: 'bg-emerald-500',
    complexity: 'simple'
  },
  {
    id: 'progress',
    name: 'Progress Bar',
    description: 'Show completion status and goals',
    icon: <Activity className="w-4 h-4" />,
    type: 'progress',
    category: 'KPI',
    color: 'bg-cyan-500',
    complexity: 'medium'
  }
];

export default function WidgetSidePanel({
  isOpen,
  onClose,
  onAddWidget,
  onEditWidget,
  onTabChange,
  widgetToEdit,
  userId,
  dashboardId,
  initialTab = "gallery"
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [widgetName, setWidgetName] = useState("");
  const [selectedDataset, setSelectedDataset] = useState<any>();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [widgetType, setWidgetType] = useState<string>("line");
  const [columns, setColumns] = useState<string[]>([]);
  const [xAxis, setXAxis] = useState(widgetToEdit?.xAxis || "");
  const [yAxis, setYAxis] = useState(widgetToEdit?.yAxis || []);
  const [yAxisKeys, setYAxisKeys] = useState<string[]>([]);
  const [sqlQuery, setSqlQuery] = useState(widgetToEdit?.sql_query || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedWidget, setDraggedWidget] = useState<WidgetTemplate | null>(null);

  // Sync activeTab with initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Enhanced close handler with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };
  // Form validation
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!widgetName.trim()) {
      newErrors.widgetName = "Widget name is required";
    }
    if (!selectedDataset) {
      newErrors.selectedDataset = "Please select a dataset";
    }
    if (!widgetType) {
      newErrors.widgetType = "Please select a visualization type";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, template: WidgetTemplate) => {
    setDraggedWidget(template);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'widget-template',
      widgetType: template.type,
      widgetName: template.name,
      widgetId: Date.now().toString()
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  const handleWidgetSelect = (template: WidgetTemplate) => {
    setWidgetType(template.type);
    setWidgetName(template.name);
    setActiveTab("create");
    onTabChange?.("create");
  };  // Filter widgets based on search only (no category filter)
  const filteredTemplates = widgetTemplates.filter(widget => {
    const matchesSearch = widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         widget.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });
  // Fetch datasets from Supabase on mount
  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchDatasets = async () => {
      if (abortController.signal.aborted) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabaseClient
          .from("datasets")
          .select("*")
          .eq("user_id", userId);

        if (abortController.signal.aborted) return;

        if (error) {
          console.error("Error fetching datasets:", error.message);
          toast.error("Failed to load datasets");
        } else {
          setDatasets(data);
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        console.error("Unexpected error:", err);
        toast.error("An unexpected error occurred");
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    if (userId) {
      fetchDatasets();
    }

    return () => {
      abortController.abort();
    };
  }, [userId]);

  useEffect(() => {
    if (widgetToEdit) {
      setWidgetName(widgetToEdit.widgetName || "");
      setWidgetType(widgetToEdit.visualization_type || "");
      setSelectedDataset(
        datasets.find((dataset) => dataset.id === widgetToEdit.dataset_id) || null
      );
      setXAxis(widgetToEdit.xAxis || "");
      setYAxis(widgetToEdit.yAxis || []);
      setYAxisKeys(widgetToEdit.yAxis || []);
      setSqlQuery(widgetToEdit.sql_query || "");
    }
  }, [widgetToEdit, datasets]);
  // Fetch dataset columns when dataset is selected
  useEffect(() => {
    const abortController = new AbortController();
    
    if (selectedDataset) {
      const fetchDatasetColumns = async () => {
        if (abortController.signal.aborted) return;
        
        setIsLoadingColumns(true);
        try {
          if (selectedDataset.csv_id) {
            const csvConnection = selectedDataset.csvConnection || {};
            const { bucket_name, file_name, selectedFields } = csvConnection;
            
            if (!bucket_name || !file_name || !selectedFields) {
              throw new Error("Missing required CSV details.");
            }
            
            const { data: file, error: fileError } = await supabaseClient.storage
              .from(bucket_name)
              .download(file_name);

            if (abortController.signal.aborted) return;

            if (fileError) {
              throw fileError;
            }

            const csvText = await file.text();
            const parsedData = Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
            });

            if (parsedData.errors.length > 0) {
              throw new Error("Error parsing CSV file: " + parsedData.errors[0].message);
            }

            if (!abortController.signal.aborted) {
              setColumns(selectedFields);
            }
          } else if (selectedDataset.connection_id) {
            const { data, error } = await supabaseClient
              .from("datasets")
              .select("connection_id, api_id, dataset_name, csv_id")
              .eq("id", selectedDataset.id)
              .single();

            if (abortController.signal.aborted) return;

            if (error || !data) {
              throw new Error("Failed to fetch dataset details");
            }
            
            const { connection_id, dataset_name } = data;

            const response = await fetch(
              `/api/datasets/${connection_id}/${selectedDataset.id}/${dataset_name}`,
              { signal: abortController.signal }
            );
            
            if (abortController.signal.aborted) return;
            
            if (response.ok) {
              const datasetResult = await response.json();
              const { datasetData } = datasetResult;
              if (!abortController.signal.aborted) {
                setColumns(datasetData.columns);
              }
            } else {
              throw new Error("Failed to fetch dataset columns");
            }
          }
        } catch (error) {
          if (abortController.signal.aborted) return;
          console.error("Error fetching dataset columns:", error);
          toast.error("Failed to load dataset columns");
        } finally {
          if (!abortController.signal.aborted) {
            setIsLoadingColumns(false);
          }
        }
      };

      fetchDatasetColumns();
    }

    return () => {
      abortController.abort();
    };
  }, [selectedDataset]);

  // Handle save changes for editing
  const handleSaveChanges = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (!widgetToEdit) {
      toast.error("No widget selected for editing");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const updatedWidget = {
        ...widgetToEdit,
        widgetName: widgetName || widgetToEdit.widgetName,
        dataset_id: selectedDataset?.id || widgetToEdit.dataset_id,
        sql_query: sqlQuery || widgetToEdit.sql_query,
        xAxis: xAxis || widgetToEdit.xAxis,
        yAxis: yAxis || widgetToEdit.yAxis,
        visualization_type: widgetType || widgetToEdit.visualization_type,
      };

      const { data: dashboardData, error: fetchError } = await supabaseClient
        .from("dashboards")
        .select("widget_details")
        .eq("id", dashboardId)
        .single();

      if (fetchError) {
        console.error("Error fetching widget details:", fetchError.message);
        toast.error("Failed to fetch dashboard details");
        return;
      }

      const widgetDetails = dashboardData.widget_details || [];
      const updatedWidgets = widgetDetails.map(
        (widget: { widgetId: any }) =>
          widget.widgetId === widgetToEdit.widgetId
            ? { ...widget, ...updatedWidget }
            : widget
      );

      if (selectedDataset && sqlQuery) {
        const { error: datasetUpdateError } = await supabaseClient
          .from("datasets")
          .update({ sql_query: sqlQuery })
          .eq("id", selectedDataset.id);
          
        if (datasetUpdateError) {
          console.error("Error updating dataset SQL query:", datasetUpdateError.message);
          toast.error("Failed to update dataset query");
          return;
        }
      }

      const { error: updateError } = await supabaseClient
        .from("dashboards")
        .update({
          widget_details: updatedWidgets,
        })
        .eq("id", dashboardId);

      if (updateError) {
        console.error("Error updating dashboard:", updateError.message);
        toast.error("Failed to save widget changes");
      } else {
        onEditWidget(updatedWidget);
        toast.success("Widget updated successfully!");
        handleClose();
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAddWidgetFields = () => {
    setWidgetName("");
    setSelectedDataset(undefined);
    setXAxis("");
    setYAxis([]);
    setSqlQuery("");
    setWidgetType("line");
    setYAxisKeys([]);
    setColumns([]);
  };

  // Handle adding widget and saving to the database
  const handleAddWidget = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const datasetId = selectedDataset.id;

      const { data: datasetData, error: datasetError } = await supabaseClient
        .from("datasets")
        .select("selectedGroupByValues, selectedDateBy, y_axis, sql_query")
        .eq("id", datasetId)
        .single();

      if (datasetError) {
        console.error("Error fetching SQL query:", datasetError.message);
        toast.error("Failed to fetch dataset details");
        return;
      }

      const groupByValues = datasetData.selectedGroupByValues || [];
      const sqlQuery = datasetData.sql_query;
      const dateBy = datasetData.selectedDateBy || "";
      const yAxisValue = datasetData.y_axis || [];
      
      if (typeof yAxisValue === "string") {
        setYAxisKeys(
          yAxisValue.split(",").map((item: string) => item.trim())
        );
      } else if (Array.isArray(yAxisValue)) {
        setYAxisKeys(yAxisValue);
      } else {
        setYAxisKeys([]);
      }
      
      const newWidget = {
        widgetId: Date.now().toString(),
        sql_query: sqlQuery,
        dataset_id: datasetId,
        widgetName,
        visualization_type: widgetType,
        selectedGroupByValues: groupByValues,
        selectedDateBy: dateBy,
      };

      const { data: dashboardData, error: dashboardError } =
        await supabaseClient
          .from("dashboards")
          .select("widget_details")
          .eq("id", dashboardId)
          .single();

      if (dashboardError) {
        console.error("Error fetching widget details:", dashboardError.message);
        toast.error("Failed to fetch dashboard details");
        return;
      }

      const existingWidgets = dashboardData.widget_details || [];
      const updatedWidgets = [...existingWidgets, newWidget];

      const { error: updateError } = await supabaseClient
        .from("dashboards")
        .update({ widget_details: updatedWidgets })
        .eq("id", dashboardId);

      if (updateError) {
        console.error("Error updating widget details:", updateError.message);
        toast.error("Failed to add widget");
      } else {
        onAddWidget(newWidget);
        resetAddWidgetFields();
        toast.success("Widget added successfully!");
        handleClose();
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Professional Widget Side Panel with slide-in animation */}
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.4 
            }}            className={cn(
              "fixed right-0 top-0 h-screen max-h-screen bg-background border-l border-border shadow-2xl z-50",
              "w-[400px]" // Original width
            )}>
            <div className="h-full flex flex-col overflow-hidden">
              {/* Enhanced Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex items-center justify-between p-6 border-b border-border bg-muted/30 flex-shrink-0"
              >
                <div className="flex items-center gap-3">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                    className="p-2 rounded-lg bg-primary/10"
                  >
                    {activeTab === "settings" ? (
                      <Settings className="w-5 h-5 text-primary" />
                    ) : (
                      <Plus className="w-5 h-5 text-primary" />
                    )}
                  </motion.div>
                  <div>
                    <motion.h2 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                      className="text-lg font-semibold text-foreground"
                    >
                      {activeTab === "settings" ? "Widget Settings" : "Widget Library"}
                    </motion.h2>
                    <motion.p 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                      className="text-sm text-muted-foreground"
                    >
                      {activeTab === "settings" ? "Configure your widget" : "Create and customize widgets"}
                    </motion.p>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, type: "spring" }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              </motion.div>              {/* Enhanced Tab Navigation */}              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="flex-1 flex flex-col min-h-0 overflow-hidden"
              >
                <Tabs value={activeTab} onValueChange={(value) => {
                  setActiveTab(value);
                  onTabChange?.(value);
                }} className="h-full flex flex-col min-h-0 overflow-hidden">
                  <div className="px-6 pt-4 pb-2 border-b border-border/50 flex-shrink-0">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/50 rounded-lg p-1">                      <TabsTrigger 
                        value="gallery" 
                        className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Library
                      </TabsTrigger>
                      <TabsTrigger 
                        value="create" 
                        className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create
                      </TabsTrigger>
                      <TabsTrigger 
                        value="settings" 
                        className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </TabsTrigger>
                    </TabsList>
                  </div>            {/* Gallery Tab */}
            <TabsContent 
              value="gallery" 
              className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=inactive]:hidden"
            >
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Enhanced Search Header */}
                <div className="p-4 border-b border-border/20 bg-gradient-to-r from-background to-muted/20 flex-shrink-0">
                  <div className="space-y-4">                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-2">Widget Library</h2>
                      <p className="text-sm text-muted-foreground">Choose from our collection of professionally designed widget templates</p>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search widget templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 bg-background/80 backdrop-blur-sm border-border/40 focus:border-primary/60 rounded-xl shadow-sm"
                      />
                    </div>
                  </div>
                </div>                {/* Enhanced Widget Grid */}
                <ScrollArea className="flex-1 min-h-0">                  <div className="p-4">
                    {filteredTemplates.length > 0 ? (
                      <div className="grid gap-2">
                          {filteredTemplates.map((template) => (
                            <Card
                              key={template.id}
                              className={cn(
                                "group relative overflow-hidden cursor-pointer transition-all duration-200",
                                "border-border/40 hover:border-primary/50 hover:shadow-sm",
                                "bg-background hover:bg-muted/20",
                                "hover:scale-[1.005] active:scale-[0.995]",
                                draggedWidget?.id === template.id && "opacity-50 scale-95"
                              )}
                              onClick={() => handleWidgetSelect(template)}
                              onDragStart={(e) => handleDragStart(e, template)}
                              onDragEnd={handleDragEnd}
                              draggable
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center gap-3">
                                  {/* Enhanced Icon */}
                                  <div className={cn(
                                    "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-white transition-all duration-200",
                                    "group-hover:scale-110",
                                    template.color
                                  )}>
                                    {React.cloneElement(template.icon as React.ReactElement, { className: "w-4 h-4" })}
                                  </div>
                                  
                                  {/* Clean Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                        {template.name}
                                      </h3>
                                      <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors flex-shrink-0" />
                                    </div>
                                    
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                      {template.description}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>                          ))}
                        </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted/60 to-muted/30 flex items-center justify-center mb-6">
                          <Search className="w-10 h-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="font-semibold text-lg text-foreground mb-3">No widgets found</h3>
                        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-4">
                          We couldn't find any widgets matching your search. Try using different keywords or browse our complete collection.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="text-xs"
                        >
                          Clear search
                        </Button>
                      </div>
                    )}
                  </div>                </ScrollArea>                {/* Minimal Footer */}
                <div className="border-t border-border/20 bg-muted/10 flex-shrink-0 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{filteredTemplates.length} widgets{searchQuery ? ' found' : ' available'}</span>
                    <div className="flex items-center gap-3">
                      {searchQuery && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSearchQuery("")}
                          className="h-6 px-2 text-xs hover:bg-muted/50"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                      <span className="text-muted-foreground/60">Drag to add</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>            {/* Create Tab - Enhanced */}
            <TabsContent 
              value="create" 
              className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=inactive]:hidden"
            >              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Enhanced Header */}
                <div className="p-4 border-b border-border/20 flex-shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Create New Widget</h2>
                      <p className="text-sm text-muted-foreground mt-1">Design and configure your custom data visualization</p>
                    </div>
                  </div>
                    </div>

                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 space-y-8">
                    {/* Widget Information Section - Enhanced */}
                    <div className="space-y-6">
                      {/* Widget Name - Enhanced */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Hash className="w-4 h-4 text-primary" />
                          Widget Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          placeholder="e.g., Monthly Sales Performance, User Engagement Trends"
                          value={widgetName}
                          onChange={(e) => {
                            setWidgetName(e.target.value);
                            if (e.target.value.trim()) {
                              setErrors(prev => ({ ...prev, widgetName: "" }));
                            }
                          }}
                          className={cn(
                            "h-14 bg-background/80 backdrop-blur-sm border-border/40 focus:border-primary/60 rounded-xl px-4 text-base placeholder:text-muted-foreground/60",
                            "transition-all duration-200 hover:bg-background",
                            errors.widgetName && "border-destructive focus:border-destructive"
                          )}
                        />
                        {errors.widgetName && (
                          <p className="text-sm text-destructive flex items-center gap-2">
                            <X className="w-4 h-4" />
                            {errors.widgetName}
                          </p>
                        )}
                      </div>

                      {/* Visualization Type - Enhanced */}
                      <div className="space-y-5">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-primary" />
                          Visualization Type
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          {widgetTemplates.slice(0, 6).map((widget) => (
                            <Card
                              key={widget.id}
                              className={cn(
                                "cursor-pointer transition-all duration-300 border-2 hover:shadow-lg group",
                                widgetType === widget.type 
                                  ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20" 
                                  : "border-border/40 hover:border-primary/40 hover:bg-primary/5"
                              )}
                              onClick={() => setWidgetType(widget.type)}
                            >
                              <CardContent className="p-5 text-center">
                                <div className={cn(
                                  "w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110",
                                  widgetType === widget.type 
                                    ? widget.color + " text-white shadow-lg" 
                                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                )}>
                                  {React.cloneElement(widget.icon as React.ReactElement, { className: "w-6 h-6" })}
                                </div>
                                <h4 className={cn(
                                  "font-semibold text-sm mb-1 transition-colors",
                                  widgetType === widget.type ? "text-primary" : "text-foreground"
                                )}>{widget.name}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {widget.description}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Data Source Section - Enhanced */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <Database className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">Data Source</h3>
                          <p className="text-sm text-muted-foreground">Connect your widget to a reliable data source</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-600" />
                          Choose Dataset <span className="text-destructive">*</span>
                        </label>
                        <Select
                          value={selectedDataset ? String(selectedDataset.id) : ""}
                          onValueChange={(value) => {
                            const selected = datasets.find(
                              (dataset) => String(dataset.id) === value
                            );
                            if (selected) {
                              setSelectedDataset(selected);
                              setErrors(prev => ({ ...prev, selectedDataset: "" }));
                            }
                          }}
                          disabled={isLoading}
                        >                          <SelectTrigger className="w-full h-14 bg-background/80 backdrop-blur-sm border-border/40 focus:border-primary/60 rounded-xl px-4">
                            <SelectValue placeholder={isLoading ? "Loading datasets..." : "Select your data source"} />
                          </SelectTrigger>
                          <SelectContent className="z-50 max-h-80">
                            {datasets.map((dataset) => (
                              <SelectItem key={dataset.id} value={String(dataset.id)} className="p-0">
                                <div className="flex items-center gap-4 py-3 px-2 w-full">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-xl border-2 bg-background flex-shrink-0">
                                    {dataset.type === "database" && <Database className="w-5 h-5 text-blue-600" />}
                                    {dataset.type === "api" && <Zap className="w-5 h-5 text-emerald-600" />}
                                    {dataset.type === "csv" && <FileText className="w-5 h-5 text-orange-600" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm text-foreground truncate">{dataset.dataset_name}</div>
                                    <div className="text-xs text-muted-foreground capitalize flex items-center gap-2 mt-1">
                                      <div className={cn(
                                        "w-2 h-2 rounded-full flex-shrink-0",
                                        dataset.type === "database" && "bg-blue-600",
                                        dataset.type === "api" && "bg-emerald-600",
                                        dataset.type === "csv" && "bg-orange-600"
                                      )}></div>
                                      <span className="truncate">{dataset.type} connection • Ready</span>
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.selectedDataset && (
                          <p className="text-sm text-destructive flex items-center gap-2">
                            <X className="w-4 h-4" />
                            {errors.selectedDataset}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Chart Configuration - Enhanced */}
                    {selectedDataset && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                              Chart Configuration
                              {isLoadingColumns && (
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">Map your data columns to chart elements</p>
                          </div>
                        </div>
                        
                        {isLoadingColumns ? (
                          <Card className="border-dashed border-border/50 bg-gradient-to-br from-background to-muted/20">
                            <CardContent className="flex items-center justify-center py-16">
                              <div className="flex flex-col items-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">Analyzing data structure...</p>
                                  <p className="text-sm text-muted-foreground mt-1">Discovering columns and data types</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ) : columns.length > 0 ? (
                          <div className="grid gap-8">
                            {/* X-Axis - Enhanced */}
                            <div className="space-y-4">
                              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Hash className="w-4 h-4 text-blue-600" />
                                X-Axis (Categories)
                              </label>
                              <Select
                                value={xAxis}
                                onValueChange={(value) => setXAxis(value)}
                              >
                                <SelectTrigger className="w-full h-12 bg-background/80 backdrop-blur-sm border-border/40 focus:border-primary/60 rounded-xl">
                                  <SelectValue placeholder="Choose X-Axis column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {columns.map((col) => (
                                    <SelectItem key={col} value={col}>
                                      <div className="flex items-center gap-3 py-2">
                                        <Hash className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium">{col}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Y-Axis - Enhanced */}
                            <div className="space-y-4">
                              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                Y-Axis (Values)
                                <Badge variant="secondary" className="text-xs">Multi-select</Badge>
                              </label>
                              <Card className="bg-muted/30 border-border/40">
                                <CardContent className="p-4">
                                  <div className="space-y-3 max-h-56 overflow-y-auto">
                                    {columns.map((column) => (
                                      <label key={column} className="flex items-center gap-3 p-3 rounded-lg hover:bg-background/80 cursor-pointer transition-colors border border-transparent hover:border-border/40">
                                        <input
                                          type="checkbox"
                                          checked={yAxis.includes(column)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setYAxis([...yAxis, column]);
                                            } else {
                                              setYAxis(yAxis.filter((y: string) => y !== column));
                                            }
                                          }}
                                          className="w-5 h-5 text-primary border-border rounded-md focus:ring-primary focus:ring-2"
                                        />
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm font-medium text-foreground">{column}</span>
                                      </label>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        ) : (
                          <Card className="border-dashed border-border/50 bg-gradient-to-br from-background to-muted/20">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                                <Database className="w-8 h-8 text-muted-foreground" />
                              </div>
                              <h4 className="font-semibold text-foreground mb-2">No columns detected</h4>
                              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                                Unable to read data structure from the selected dataset. Please ensure the data source is accessible and contains valid data.
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>                </ScrollArea>

                {/* Enhanced Create Button */}
                <div className="p-4 border-t border-border/20 bg-gradient-to-r from-background to-muted/20 flex-shrink-0">
                  <Button 
                    onClick={handleAddWidget} 
                    className="w-full h-14 font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={isLoading || !widgetName || !selectedDataset}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        Creating your widget...
                      </>
                    ) : (
                      <>
                        <Plus className="w-6 h-6 mr-3" />
                        Create Widget
                      </>
                    )}
                  </Button>
                  {(!widgetName || !selectedDataset) && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      Complete the required fields above to create your widget
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>            {/* Settings Tab - Enhanced */}
            <TabsContent 
              value="settings" 
              className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=inactive]:hidden"
            >              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">                {/* Enhanced Header */}
                <div className="p-4 border-b border-border/20 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Widget Settings</h2>
                      <p className="text-sm text-muted-foreground mt-1">Customize and configure your widget properties</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 px-3 py-1">
                        <Settings className="w-3 h-3 mr-1" />
                        Editing
                      </Badge>
                    </div>
                  </div>
                </div>                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4 space-y-8">
                    {/* Widget Overview - Enhanced */}
                    {widgetToEdit && (
                      <div className="bg-gradient-to-br from-muted/40 to-muted/20 rounded-2xl p-6 border border-border/30">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Layout className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-foreground">{widgetToEdit.widgetName || "Untitled Widget"}</h3>
                              <p className="text-sm text-muted-foreground capitalize flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                {widgetToEdit.visualization_type || widgetType} visualization
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 px-3 py-1">
                            <Activity className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground bg-background/60 rounded-lg px-3 py-2">
                            <Database className="w-4 h-4" />
                            <span>Connected to data source</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground bg-background/60 rounded-lg px-3 py-2">
                            <Clock className="w-4 h-4" />
                            <span>Last modified today</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Basic Settings - Enhanced */}
                    <div className="space-y-6">
                      {/* Widget Name - Enhanced */}
                      <div className="space-y-4">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Palette className="w-4 h-4 text-blue-600" />
                          Widget Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                          placeholder="Enter a descriptive name for your widget"
                          value={widgetName}
                          onChange={(e) => {
                            setWidgetName(e.target.value);
                            if (e.target.value.trim()) {
                              setErrors(prev => ({ ...prev, widgetName: "" }));
                            }
                          }}
                          className={cn(
                            "h-14 bg-background/80 backdrop-blur-sm border-border/40 focus:border-primary/60 rounded-xl px-4 text-base",
                            "transition-all duration-200 hover:bg-background",
                            errors.widgetName && "border-destructive focus:border-destructive"
                          )}
                        />
                        {errors.widgetName && (
                          <p className="text-sm text-destructive flex items-center gap-2">
                            <X className="w-4 h-4" />
                            {errors.widgetName}
                          </p>
                        )}
                      </div>

                      {/* Visualization Type - Enhanced */}
                      <div className="space-y-5">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          Visualization Type
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          {widgetTemplates.slice(0, 6).map((widget) => (
                            <Card
                              key={widget.id}
                              className={cn(
                                "cursor-pointer transition-all duration-300 border-2 hover:shadow-lg group",
                                widgetType === widget.type 
                                  ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20" 
                                  : "border-border/40 hover:border-primary/40 hover:bg-primary/5"
                              )}
                              onClick={() => setWidgetType(widget.type)}
                            >
                              <CardContent className="p-5 text-center">
                                <div className={cn(
                                  "w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110",
                                  widgetType === widget.type 
                                    ? widget.color + " text-white shadow-lg" 
                                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                )}>
                                  {React.cloneElement(widget.icon as React.ReactElement, { className: "w-6 h-6" })}
                                </div>
                                <h4 className={cn(
                                  "font-semibold text-sm mb-1 transition-colors",
                                  widgetType === widget.type ? "text-primary" : "text-foreground"
                                )}>{widget.name}</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {widget.description}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Data Source Settings - Enhanced */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <Database className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">Data Source</h3>
                          <p className="text-sm text-muted-foreground">Manage the data source and connection for this widget</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-600" />
                          Connected Dataset <span className="text-destructive">*</span>
                        </label>
                        <Select
                          value={selectedDataset ? String(selectedDataset.id) : ""}
                          onValueChange={(value) => {
                            const selected = datasets.find(
                              (dataset) => String(dataset.id) === value
                            );
                            setSelectedDataset(selected);
                          }}                        >
                          <SelectTrigger className="w-full h-14 bg-background/80 backdrop-blur-sm border-border/40 focus:border-primary/60 rounded-xl px-4">
                            <SelectValue placeholder="Select a dataset" />
                          </SelectTrigger>
                          <SelectContent className="z-50 max-h-80">
                            {datasets.map((dataset) => (
                              <SelectItem key={dataset.id} value={String(dataset.id)} className="p-0">
                                <div className="flex items-center gap-4 py-3 px-2 w-full">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-xl border-2 bg-background flex-shrink-0">
                                    {dataset.type === "database" && <Database className="w-5 h-5 text-blue-600" />}
                                    {dataset.type === "api" && <Zap className="w-5 h-5 text-emerald-600" />}
                                    {dataset.type === "csv" && <FileText className="w-5 h-5 text-orange-600" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm text-foreground truncate">{dataset.dataset_name}</div>
                                    <div className="text-xs text-muted-foreground capitalize flex items-center gap-2 mt-1">
                                      <div className={cn(
                                        "w-2 h-2 rounded-full flex-shrink-0",
                                        dataset.type === "database" && "bg-blue-600",
                                        dataset.type === "api" && "bg-emerald-600",
                                        dataset.type === "csv" && "bg-orange-600"
                                      )}></div>
                                      <span className="truncate">{dataset.type} connection • Ready</span>
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Chart Configuration - Enhanced */}
                    {selectedDataset && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                              Chart Configuration
                              {isLoadingColumns && (
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">Configure how your data columns are mapped to the chart</p>
                          </div>
                        </div>
                        
                        {isLoadingColumns ? (
                          <Card className="border-dashed border-border/50 bg-gradient-to-br from-background to-muted/20">
                            <CardContent className="flex items-center justify-center py-16">
                              <div className="flex flex-col items-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">Loading column information...</p>
                                  <p className="text-sm text-muted-foreground mt-1">Please wait while we analyze your data</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ) : columns.length > 0 ? (
                          <div className="grid gap-8">
                            {/* X-Axis Configuration - Enhanced */}
                            <div className="space-y-4">
                              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Hash className="w-4 h-4 text-blue-600" />
                                X-Axis (Categories)
                              </label>
                              <Select
                                value={xAxis}
                                onValueChange={(value) => setXAxis(value)}
                              >
                                <SelectTrigger className="w-full h-12 bg-background/80 backdrop-blur-sm border-border/40 focus:border-primary/60 rounded-xl">
                                  <SelectValue placeholder="Select X-Axis column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {columns.map((col) => (
                                    <SelectItem key={col} value={col}>
                                      <div className="flex items-center gap-3 py-2">
                                        <Hash className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium">{col}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Y-Axis Configuration - Enhanced */}
                            <div className="space-y-4">
                              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                                Y-Axis (Values)
                                <Badge variant="secondary" className="text-xs">Multi-select</Badge>
                              </label>
                              <Card className="bg-muted/30 border-border/40">
                                <CardContent className="p-4">
                                  <div className="space-y-3 max-h-56 overflow-y-auto">
                                    {(yAxisKeys.length > 0 ? yAxisKeys : columns).map((column) => (
                                      <label key={column} className="flex items-center gap-3 p-3 rounded-lg hover:bg-background/80 cursor-pointer transition-colors border border-transparent hover:border-border/40">
                                        <input
                                          type="checkbox"
                                          checked={yAxis.includes(column)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setYAxis([...yAxis, column]);
                                            } else {
                                              setYAxis(yAxis.filter((y: string) => y !== column));
                                            }
                                          }}
                                          className="w-5 h-5 text-primary border-border rounded-md focus:ring-primary focus:ring-2"
                                        />
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                        <span className="text-sm font-medium text-foreground">{column}</span>
                                      </label>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        ) : (
                          <Card className="border-dashed border-border/50 bg-gradient-to-br from-background to-muted/20">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                                <Database className="w-8 h-8 text-muted-foreground" />
                              </div>
                              <h4 className="font-semibold text-foreground mb-2">No columns available</h4>
                              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                                Please select a valid dataset or check your data source connection to see available columns.
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Advanced Options - Enhanced */}
                    {selectedDataset && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground">Advanced Options</h3>
                            <p className="text-sm text-muted-foreground">Customize advanced settings and data processing</p>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-4">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                              <Database className="w-4 h-4 text-orange-600" />
                              Custom SQL Query
                              <Badge variant="outline" className="text-xs">Optional</Badge>
                            </label>
                            <Card className="border-border/40 overflow-hidden bg-background/50">
                              <CardHeader className="bg-muted/50 py-3 px-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-xs font-medium text-muted-foreground">SQL Editor</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Eye className="w-3 h-3" />
                                    <span>Live preview</span>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0">
                                <SqlEditor
                                  sqlQuery={sqlQuery}
                                  onSqlChange={(value) => setSqlQuery(value || "")}
                                  columns={columns}
                                  height="240px"
                                />
                              </CardContent>
                            </Card>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Database className="w-3 h-3 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-blue-900 mb-1">Custom SQL Query</p>
                                  <p className="text-xs text-blue-700 leading-relaxed">
                                    Write custom SQL to filter, aggregate, or transform your data before visualization. 
                                    This overrides the basic column mapping above.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>                </ScrollArea>

                {/* Enhanced Save Buttons */}
                <div className="p-4 border-t border-border/20 bg-gradient-to-r from-background to-muted/20 flex-shrink-0">
                  <div className="flex gap-4">
                    <Button 
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1 h-12 font-medium rounded-xl border-border/40 hover:bg-muted/50 transition-all"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveChanges} 
                      className="flex-1 h-12 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={isLoading || !widgetName}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                  {!widgetName && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      Widget name is required to save changes
                    </p>
                  )}
                </div>
              </div>            </TabsContent>
                </Tabs>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
