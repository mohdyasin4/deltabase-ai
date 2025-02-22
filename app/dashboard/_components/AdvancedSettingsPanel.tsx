"use client";

import React, { useEffect } from "react";
import { Button, Input, Tab, Tabs } from "@heroui/react";
import { Spinner } from "@/components/ui/spinner";
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";
import SqlEditor from "./SqlEditor";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@heroui/react";
import { XIcon } from "lucide-react";

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
  handleSqlSubmit: () => void;
  apiUrl?: string;
  setApiUrl: (url: string) => void;
  apiUrlLoading: boolean;
  handleApiUrlChange: (url: string) => void;
  renderVisualizationOptions: () => React.ReactNode;
  renderVisualizationSettings: () => React.ReactNode;
  showSummarizePanel: boolean;
  setShowSummarizePanel: (show: boolean) => void;
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
  renderVisualizationSettings,
}: AdvancedSettingsPanelProps) {
  console.log("sqlQuery", sqlQuery);
    
  return (
    <div
      className={`flex flex-col gap-2 transition-transform transform ease-in-out duration-300 ${
        showSidePanel ? "translate-x-0" : "translate-x-full"
      } fixed right-0 bg-background border-l-2 w-[380px] h-[calc(100vh-5vh)] shadow-lg p-4 z-50`}
    >
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold text-foreground">Advanced Settings</h1>
        <Button size="sm" variant="flat" color="danger" onClick={() => setShowSidePanel(false)}>
        <XIcon height={16} width={16} />
          Close
        </Button>
      </div>
      <Tabs
        aria-label="Options"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        color="primary"
        variant="underlined"
        classNames={{
          tabList:
            "gap-6 w-full relative rounded-none p-0 border-b border-divider",
          cursor: "w-full bg-[#ffcc19]",
          tab: "max-w-fit px-0 h-12",
          tabContent: "group-data-[selected=true]:text-[#ffcc19]",
        }}
      >
        <Tab
          key="visualization"
          title={
            <div className="flex items-center gap-2">
              <Icon
                icon={"hugeicons:chart-line-data-01"}
                height={20}
                width={20}
              />
              Visualization
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-4">{renderVisualizationOptions()}</div>
        </Tab>
        {sourceType === "database" && (
          <Tab
            key="sqlEditor"
            className="p-0 m-0"
            title={
              <div className="flex items-center gap-2">
                <Icon icon={"bi:terminal"} height={20} width={20} />
                SQL Editor
              </div>
            }
          >
            <div>
              <SqlEditor
                sqlQuery={sqlQuery}
                onSqlChange={handleSqlChange}
                tables={tables}
                columns={columns}
              />

              <div className="mt-4 flex justify-between">
                <Button
                  variant="flat"
                  color="danger"
                  onPress={() => setShowSidePanel(false)}
                >
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
              </div>
            </div>
          </Tab>
        )}
        {apiSource && (
          <Tab
            key="api"
            title={
              <div className="flex items-center gap-2">
                <Icon icon={"bi:cloud"} height={20} width={20} />
                API Settings
              </div>
            }
          >
            <div className="p-4">
              <Input
                placeholder="API URL"
                defaultValue={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-between">
              <Button
                variant="flat"
                color="danger"
                onPress={() => setShowSidePanel(false)}
              >
                Close
              </Button>
              <Button
                type="submit"
                color="primary"
                onClick={() => handleApiUrlChange(apiUrl)}
              >
                {apiUrlLoading ? (
                  <>
                    <Spinner className="text-black" size={"small"} />
                    Updating API URL...
                  </>
                ) : (
                  "Update API URL"
                )}
              </Button>
            </div>
          </Tab>
        )}
        <Tab
          key="settings"
          title={
            <div className="flex items-center gap-2">
              <Icon icon={"bi:gear"} height={20} width={20} />
              Settings
            </div>
          }
        >
          <div className="p-4">{renderVisualizationSettings()}</div>
        </Tab>
      </Tabs>
    </div>
  );
} 