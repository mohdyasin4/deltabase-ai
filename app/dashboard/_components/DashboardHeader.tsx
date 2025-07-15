// components/DashboardHeader.tsx
import React from "react";
import { Tooltip, Dropdown, DropdownTrigger, DropdownItem, DropdownMenu } from "@heroui/react";
import { Button } from "@/components/ui/button"; // Use Shadcn Button
import { 
  Pencil, 
  Clock, 
  MoreHorizontal, 
  PlusCircle, 
  Share2, 
  Download, 
  Settings,
  Trash2,
  Copy,
  Activity,
  Sparkles,
  Zap,
  X,
  Save
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type DashboardHeaderProps = {
  dashboardName: string;
  lastEdited?: string;
  isEditMode: boolean;
  created_at: string;
  onEditClick: () => void;
  onAddWidgetClick: () => void;
  widgetCount?: number;
  isLive?: boolean;
  onShare?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onCancelEdit?: () => void;
  onSaveChanges?: () => void;
};

export default function DashboardHeader({
  dashboardName,
  lastEdited,
  isEditMode,
  onEditClick,
  created_at,
  onAddWidgetClick,
  widgetCount = 0,
  isLive = false,
  onShare,
  onDuplicate,
  onDelete,
  onExport,
  onCancelEdit,
  onSaveChanges,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between py-5 px-6 bg-background border-b border-border/50">
      {/* Left Side: Dashboard Name and Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              {dashboardName}
              {isEditMode && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-50 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full">
                  <Pencil size={10} />
                  Editing
                </span>
              )}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <div className="flex items-center gap-1.5">
                <Clock size={12} />
                <span>
                  Created {new Date(created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
              <div className="w-1 h-1 bg-muted-foreground/40 rounded-full"></div>
              <span className="font-medium">
                {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        
      </div>      {/* Right Side: Actions */}
      <div className="flex items-center gap-2">        {/* Show share and export only when NOT in edit mode */}
        {!isEditMode && (
          <>
            <Tooltip content="Share Dashboard">
              <Button
                variant="ghost"
                size="sm"
                onClick={onShare}
                className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200 rounded-xl border border-transparent hover:border-primary/20"
              >
                <Share2 size={16} />
              </Button>
            </Tooltip>
            
            <Tooltip content="Export Dashboard">
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                className="h-10 w-10 p-0 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all duration-200 rounded-xl border border-transparent hover:border-green-200 dark:hover:border-green-800"
              >
                <Download size={16} />
              </Button>
            </Tooltip>
            
            {/* Edit Dashboard button - only show when NOT in edit mode */}
            <Button
              onClick={onEditClick}
              variant="default"
              size="sm"
            >
              <Pencil size={16} className="mr-2" />
              Edit Dashboard
            </Button>
          </>
        )}        {/* Edit Mode Actions - Cancel and Save buttons */}
        {isEditMode && (
          <div className="flex items-center gap-2">
            <div className="text-[9px] text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded border border-border/20 mr-2">
              <span className="font-medium">You are editing this dashboard</span>
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="bg-transparent text-muted-foreground bg-red-50 dark:bg-red-900/20 hover:text-white dark:hover:text-red-400 transition-all h-8 px-3 text-xs"
              onClick={onCancelEdit}
            >
              <X size={12} className="mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm hover:shadow-md transition-all h-8 px-3 text-xs"
              onClick={onSaveChanges}
            >
              <Save size={12} className="mr-1" />
              Save
            </Button>
          </div>
        )}{/* More Options - Enhanced dropdown */}
        <Dropdown>
          <DropdownTrigger>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 hover:bg-muted/60 transition-all duration-200 rounded-xl border border-transparent hover:border-border"
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownTrigger>
          <DropdownMenu className="w-52 bg-background/95 backdrop-blur-lg border border-border/50 shadow-xl rounded-xl p-2">
            <DropdownItem 
              key="duplicate" 
              onClick={onDuplicate} 
              className="hover:bg-primary/10 hover:text-primary rounded-lg mx-1 my-1 p-3 cursor-pointer transition-all duration-200"
            >
              <Copy size={15} className="mr-3 text-current" />
              <span className="text-sm font-medium">Duplicate Dashboard</span>
            </DropdownItem>
            <DropdownItem 
              key="settings" 
              className="hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg mx-1 my-1 p-3 cursor-pointer transition-all duration-200"
            >
              <Settings size={15} className="mr-3 text-current" />
              <span className="text-sm font-medium">Dashboard Settings</span>
            </DropdownItem>
            <DropdownItem 
              key="delete" 
              onClick={onDelete} 
              className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg mx-1 my-1 p-3 cursor-pointer transition-all duration-200"
            >
              <Trash2 size={15} className="mr-3" />
              <span className="text-sm font-medium">Delete Dashboard</span>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  );
}
