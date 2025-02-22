// components/CreateWidgetDialog.tsx
import React, { useState } from "react";
import { DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CreateWidgetDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddWidget: (widget: any) => void;
}

const CreateWidgetDialog: React.FC<CreateWidgetDialogProps> = ({ isOpen, onOpenChange, onAddWidget }) => {
  const [widgetType, setWidgetType] = useState<string>("chart");

  const createWidget = () => {
    const newWidget = {
      id: String(Date.now()),
      type: widgetType,
      data: {}, // Placeholder for widget data
    };
    onAddWidget(newWidget);
    onOpenChange(false);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <h3>Create New Widget</h3>
      </DialogHeader>
      <div className="flex flex-col space-y-4">
        <label>Select Widget Type</label>
        <select value={widgetType} onChange={(e) => setWidgetType(e.target.value)}>
          <option value="chart">Chart</option>
          <option value="table">Table</option>
          <option value="number">Number</option>
        </select>
        <Button onClick={createWidget} className="bg-primary">
          Create Widget
        </Button>
      </div>
    </DialogContent>
  );
};

export default CreateWidgetDialog;
