// components/DashboardHeader.tsx
import React from "react";
import { Button, Tooltip, Dropdown, DropdownTrigger, DropdownItem, DropdownMenu } from "@heroui/react";
import { Pencil, Clock, Bookmark, MoreHorizontal, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";

type DashboardHeaderProps = {
  dashboardName: string;
  lastEdited?: string;
  isEditMode: boolean;
  created_at: string;
  onEditClick: () => void;
  onAddWidgetClick: () => void;
};

export default function DashboardHeader({
  dashboardName,
  lastEdited,
  isEditMode,
  onEditClick,
  created_at,
  onAddWidgetClick,
}: DashboardHeaderProps) {
  return (
    <div className="flex bg-background border-b justify-between items-center py-2 px-8 shadow-md">
      {/* Left Side: Dashboard Name */}
      <Tooltip content={`Dashboard Created on: ${created_at}`} placement="bottom">
        
      <div>
          <h1 className="text-xl font-semibold">{dashboardName}</h1> {/* Reduced font size */}
      </div>
      </Tooltip>

      {/* Right Side: Icons and Menu */}
      <div className="flex items-center space-x-3">
     
<Tooltip content={`${isEditMode ? "Add Widget" : "Edit Dashboard"}`} placement="bottom">
  {isEditMode ? (
    <motion.div
      key="plus-circle"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
    >
      <PlusCircle className="cursor-pointer w-5 h-5" onClick={onAddWidgetClick} />
    </motion.div>
  ) : (
    <motion.div
      key="pencil"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
    >
      <Pencil className="cursor-pointer w-5 h-5" onClick={onEditClick} />
    </motion.div>
  )}
</Tooltip>
        
        <Tooltip content="View History" placement="bottom">
          <Clock className="cursor-pointer w-5 h-5" /> {/* Reduced icon size */}
        </Tooltip>

        <Tooltip content="Bookmark" placement="bottom">
          <Bookmark className="cursor-pointer w-5 h-5" />
        </Tooltip>

        {/* More Options Dropdown */}
        <Dropdown>
          <DropdownTrigger>
            <MoreHorizontal className="cursor-pointer w-5 h-5" />
          </DropdownTrigger>
          <DropdownMenu>
            <DropdownItem key="delete">Delete Dashboard</DropdownItem>
            <DropdownItem key="duplicate">Duplicate Dashboard</DropdownItem>
            <DropdownItem key="settings">Settings</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  );
}
