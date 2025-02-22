import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog'; // Adjust the import path based on your project structure
import { Button } from '@/components/ui/button'; // Adjust the import path based on your project structure
import { Input } from '@/components/ui/input'; // Adjust the import path based on your project structure

interface SaveDialogProps {
  newDatasetName: string;
  setNewDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (description: string) => void;
  updateDataset: () => void; // Function to update the dataset
  saveDataset: () => Promise<void>; // Function to save the dataset
  type: string; // Type to determine the action
  children: React.ReactNode; // Allow children to be passed for the trigger button
}

const SaveDialog: React.FC<SaveDialogProps> = ({
  newDatasetName,
  setNewDatasetName,
  datasetDescription,
  setDatasetDescription,
  updateDataset,
  saveDataset,
  type,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false); // Local state to manage dialog visibility

  const handleTriggerClick = () => {
    if (type === "dataset") {
      updateDataset(); // Call updateDataset if type is "dataset"
    } else {
      setIsOpen(true); // Open the dialog if type is not "dataset"
    }
  };

  const handleClose = () => {
    setIsOpen(false); // Close the dialog
  };

  return (
    <>
      <Button onClick={handleTriggerClick}>
        {children} {/* Render the trigger button here */}
      </Button>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>Save Dataset</DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              value={newDatasetName}
              type='text'
              onChange={(e) => setNewDatasetName(e.target.value)}
              placeholder="Dataset Name"
            />
            <Input
              type='text'
              value={datasetDescription}
              onChange={(e) => setDatasetDescription(e.target.value)}
              placeholder="Dataset Description"
            />
          </div>
          <DialogFooter>
            <Button onClick={saveDataset}>Save</Button>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SaveDialog;
