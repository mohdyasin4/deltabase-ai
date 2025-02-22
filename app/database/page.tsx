import React, { useState } from "react";
import { Label, Input, Button } from "@/components/ui/label";
import { CsvImporter } from "@/components/csv-importer";
import { useUser } from "@/contexts/user-context";
import { supabaseClient } from "@/lib/supabase";

const SetupCsvDialog = ({
  onClose,
  getData,
  setData,
  setSelectedOption,
}: {
  onClose: () => void;
  getData: () => Promise<any[]>;
  setData: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedOption: React.Dispatch<React.SetStateAction<any>>;
}) => {
  const [connectionName, setConnectionName] = useState("");
  const user = useUser();
  const [importedData, setImportedData] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!importedData.length) {
        throw new Error("Please import CSV data first");
      }

      // Save CSV metadata to the database
      const { data, error } = await supabaseClient
        .from("csvData")
        .insert([
          {
            connection_name: connectionName,
            file_name: `${connectionName}.csv`,
            user_id: user.user?.id,
            data: importedData, // Store the actual CSV data
            createdat: new Date(),
            updatedat: new Date(),
          },
        ]);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh the data list
      const updatedData = await getData();
      setData(updatedData);

      // Close the dialog and reset state
      setConnectionName("");
      setImportedData([]);
      onClose();
    } catch (err) {
      console.error("Error adding CSV connection:", err);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Upload CSV</h2>
      <form onSubmit={handleSubmit}>
        <div className="my-4">
          <Label htmlFor="connection-name" className="block font-medium my-4">
            Connection Name
          </Label>
          <Input
            id="connection-name"
            placeholder="Enter connection name"
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="csv-file" className="block font-medium">
            Drag and drop your files here or click to browse.
          </Label>
          <CsvImporter
            onClose={onClose}
            onImport={(parsedData: any[]) => {
              try {
                const formattedData = parsedData.map((item) => ({
                  id: crypto.randomUUID(),
                  ...item,
                }));
                setImportedData(formattedData);
              } catch (error) {
                console.error("Error processing CSV data:", error);
              }
            }}
            className="self-end"
          />
        </div>

        <div className="my-2">
          <Button
            type="submit"
            className="w-full bg-primary text-black font-semibold"
            disabled={!importedData.length}
          >
            Save
          </Button>
          <Button
            type="button"
            onClick={() => setSelectedOption(null)}
            className="w-full mt-2 font-semibold"
            variant="outline"
          >
            Back
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SetupCsvDialog; 