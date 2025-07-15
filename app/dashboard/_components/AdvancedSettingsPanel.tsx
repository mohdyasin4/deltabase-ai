"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Tab, Tabs } from "@heroui/react";
import { Spinner } from "@/components/ui/spinner";
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";
import SmartSQLEditor from "./SmartSQLEditor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@heroui/react";
import { XIcon } from "lucide-react";
import toast from "react-hot-toast";
import QueryExplanationModal from "./QueryExplanationModal";

interface AdvancedSettingsPanelProps {
  showSidePanel: boolean;
  setShowSidePanel: (show: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sourceType: "api" | "database" | "csv";
  apiSource?: boolean;
  sqlQuery?: string;
  handleSqlChange: (value: string | undefined) => void;
  tables: string[];
  columns: string[];
  queryLoading: boolean;
  handleSqlSubmit: (query?: string) => void;
  apiUrl?: string;
  setApiUrl: (url: string) => void;
  apiUrlLoading: boolean;
  handleApiUrlChange: (url: string) => void;
  renderVisualizationOptions: () => React.ReactNode;
  RenderVisualizationSettings: () => React.ReactNode;
  showSummarizePanel: boolean;
  setShowSummarizePanel: (show: boolean) => void;
  connectionId?: string; // Add connection ID for AI features
}

export default function AdvancedSettingsPanel({
  showSidePanel,
  setShowSidePanel,
  activeTab,
  setActiveTab,
  sourceType,
  apiSource,
  sqlQuery,
  handleSqlChange,
  tables,
  columns,
  queryLoading,
  handleSqlSubmit,
  apiUrl,
  setApiUrl,
  apiUrlLoading,
  handleApiUrlChange,
  renderVisualizationOptions,
  RenderVisualizationSettings,
  connectionId,
}: AdvancedSettingsPanelProps) {
  console.log("sqlQuery", sqlQuery);
  
  // State for explanation modal
  const [showExplanationModal, setShowExplanationModal] = React.useState(false);  const [explanationData, setExplanationData] = React.useState({
    query: "",
    explanation: "",
    conciseExplanation: "",
    detailedExplanation: "",
    loading: false
  });// Handler for explaining query
  const handleExplainQuery = async (query: string) => {
    if (!connectionId) {
      toast.error("No connection ID provided for explain query");
      return;
    }
    
    if (!query || query.trim() === "") {
      toast.error("Please enter a SQL query to explain");
      return;
    }
      // Set loading state and show modal
    setExplanationData({
      query: query,
      explanation: "",
      conciseExplanation: "",
      detailedExplanation: "",
      loading: true
    });
    setShowExplanationModal(true);
    
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          explainQuery: true,
          connection_id: connectionId,
          sqlQuery: query 
        }),
      });
      
      const data = await response.json();
        if (response.ok) {
        console.log("Query explanation:", data.explanation);
        setExplanationData({
          query: query,
          explanation: data.explanation || data.detailedExplanation || "",
          conciseExplanation: data.conciseExplanation || "",
          detailedExplanation: data.detailedExplanation || data.explanation || "",
          loading: false
        });
        toast.success("Query explanation generated!");
      } else {
        setExplanationData(prev => ({ ...prev, loading: false }));
        toast.error(data.error || "Failed to explain query");
      }
    } catch (error) {
      setExplanationData(prev => ({ ...prev, loading: false }));
      toast.error("Error explaining query");
      console.error("Error explaining query:", error);
    }
  };
  // Handler for optimizing query
  const handleOptimizeQuery = async (query: string) => {
    if (!connectionId) {
      toast.error("No connection ID provided for optimize query");
      return;
    }
    
    if (!query || query.trim() === "") {
      toast.error("Please enter a SQL query to optimize");
      return;
    }
    
    try {
      toast.loading("Optimizing SQL query...");
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          optimizeQuery: true,
          connection_id: connectionId,
          sqlQuery: query 
        }),
      });
      
      const data = await response.json();
      toast.dismiss();
      
      if (response.ok) {
        console.log("Query optimization:", data.sqlQuery);
        
        // Update the SQL query with the optimized version if it's different
        if (data.sqlQuery && data.sqlQuery !== query) {
          handleSqlChange(data.sqlQuery);
          toast.success("Query updated with optimizations!");
        } else {
          toast.success("Query is already optimized!");
        }
      } else {
        toast.error(data.error || "Failed to optimize query");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Error optimizing query");
      console.error("Error optimizing query:", error);    }
  };
  return (
    <>
      <AnimatePresence>
        {showSidePanel && (
          <motion.div
            initial={{ x: "100%"}}
            animate={{ x: 0}}
            exit={{ x: "100%"}}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 200,
              opacity: { duration: 0.2 }
            }}
            className="fixed right-0 h-[calc(100vh-5vh)] w-[480px] bg-gradient-to-br from-background via-background/95 to-background backdrop-blur-xl border-l border-border/50 shadow-2xl z-50 flex flex-col"
          >
            {/* Enhanced Header */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-6 border-b border-border/20 bg-gradient-to-r from-muted/10 to-transparent"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Icon icon="lucide:settings" className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Advanced Settings</h1>
                  <p className="text-xs text-muted-foreground">Configure your data source</p>
                </div>
              </div>
             
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors" 
                  onClick={() => setShowSidePanel(false)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>

            {/* Enhanced Tabs with Animations */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-1 overflow-hidden"
            >
              <div className="p-6 h-full overflow-y-auto">
                <Tabs
                  aria-label="Options"
                  selectedKey={activeTab}
                  onSelectionChange={(key) => setActiveTab(key as string)}
                  color="primary"
                  variant="underlined"
                  className="w-full"
                  classNames={{
                    base: "w-full",
                    tabList: "gap-6 w-full relative rounded-none p-0 border-b border-border bg-transparent",
                    cursor: "w-full bg-gradient-to-r from-[#ffcc19] to-[#ffcc19]/80 h-0.5",
                    tab: "max-w-fit px-2 h-12 transition-all duration-200 data-[selected=true]:text-[#ffcc19]",
                    tabContent: "group-data-[selected=true]:text-[#ffcc19] group-data-[selected=false]:text-muted-foreground font-medium transition-colors",
                    panel: "pt-4 pb-0 px-0"
                  }}
                >
                  <Tab
                    key="visualization"
                    title={
                      <motion.div 
                        className="flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Icon icon="hugeicons:chart-line-data-01" className="w-5 h-5" />
                        <span>Visualization</span>
                      </motion.div>
                    }
                  >
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="pt-6"
                    >
                      <div className="grid grid-cols-2 gap-4">{renderVisualizationOptions()}</div>
                    </motion.div>
                  </Tab>

                  {sourceType === "database" && (
                    <Tab
                      key="sqlEditor"
                      title={
                        <motion.div 
                          className="flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <Icon icon="lucide:terminal" className="w-5 h-5" />
                          <span>SQL Editor</span>
                        </motion.div>
                      }
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="h-full w-full"
                      >
                        {/* Full-Height SQL Editor */}
                        <div className="h-[calc(100vh-280px)] w-full">
                          <SmartSQLEditor
                            value={sqlQuery || ""}
                            onChange={handleSqlChange}
                            onExecute={handleSqlSubmit}
                            onExplain={handleExplainQuery}
                            onOptimize={handleOptimizeQuery}                            loading={queryLoading}
                            height="100%"
                            readOnly={false}
                            tables={tables}
                            columns={columns}
                            connectionId={connectionId}
                            className="rounded-lg border border-border/20"
                          />
                        </div>
                      </motion.div>
                    </Tab>
                  )}

                  {apiSource && (
                    <Tab
                      key="api"
                      title={
                        <motion.div 
                          className="flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <Icon icon="lucide:cloud" className="w-5 h-5" />
                          <span>API Settings</span>
                        </motion.div>
                      }
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="pt-6"
                      >
                        <div className="space-y-4">
                          <Input
                            placeholder="API URL"
                            defaultValue={apiUrl || ""}
                            onChange={(e) => setApiUrl(e.target.value)}
                            className="w-full"
                          />
                          <div className="flex justify-between gap-3">
                            <Button
                              variant="outline"
                              onClick={() => setShowSidePanel(false)}
                              className="flex-1"
                            >
                              Close
                            </Button>
                            <Button
                              onClick={() => handleApiUrlChange(apiUrl || "")}
                              className="flex-1"
                            >
                              {apiUrlLoading ? (
                                <div className="flex items-center gap-2">
                                  <Spinner className="text-current" size={"small"} />
                                  <span>Updating...</span>
                                </div>
                              ) : (
                                "Update API URL"
                              )}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    </Tab>
                  )}

                  <Tab
                    key="settings"
                    title={
                      <motion.div 
                        className="flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Icon icon="lucide:settings" className="w-5 h-5" />
                        <span>Settings</span>
                      </motion.div>
                    }
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="pt-6"
                    >
                      {RenderVisualizationSettings()}
                    </motion.div>
                  </Tab>
                </Tabs>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Query Explanation Modal */}      <QueryExplanationModal
        isOpen={showExplanationModal}
        onOpenChange={setShowExplanationModal}
        sqlQuery={explanationData.query}
        explanation={explanationData.explanation}
        conciseExplanation={explanationData.conciseExplanation}
        detailedExplanation={explanationData.detailedExplanation}
        loading={explanationData.loading}
      />
    </>
  );
}