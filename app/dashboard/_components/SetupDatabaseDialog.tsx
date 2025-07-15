import * as React from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useDatabaseStore from "@/hooks/useDatabaseStore";
import DatabaseDetailsForm from "@/components/form/DbDetailsForm"; // Adjust path as per your file structure
import { supabaseClient } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { useUser } from "@clerk/nextjs"; // Use this to access the current user
import { Button } from "@/components/ui/button";

interface SetupDatabaseDialogProps {
  onClose: () => void;
  setData: (data: any) => void;
  getData: () => Promise<any[]>;
  setSelectedOption: React.Dispatch<React.SetStateAction<string | null>>;
}

const SetupDatabaseDialog: React.FC<SetupDatabaseDialogProps> = ({
  onClose,
  setData,
  getData,
  setSelectedOption,
}) => {
  const {
    connectionName,
    databaseName,
    databaseType,
    host,
    username,
    password,
    setConnectionName,
    setDatabaseName,
    setDatabaseType,
    setHost,
    setUsername,
    setPassword,
    resetForm,
  } = useDatabaseStore();

  const { user } = useUser();

  const handleSubmit = async (formData: any) => {
    console.log("handleSubmit Invoked");
    console.log("Form data:", formData);

    if (!user) {
      toast.error("User not authenticated");
      return;
    }
    const client = supabaseClient;
    const { data, error } = await client
      .from("database_connections")
      .insert([
        {
          connection_name: formData.connectionName,
          database_name: formData.databaseName,
          database_type: formData.databaseType,
          host: formData.host,
          username: formData.username,
          password: formData.password,
          user_id: user.id, // Save the user's externalId
        },
      ]);

    if (error) {
      console.error("Error inserting data into Supabase", error);
      return;
    } else {
      toast.success("Database connection added successfully");
    }

    // Re-fetch data and update the state
    const newData = await getData();
    setData(newData);
    onClose();
    resetForm();
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>New Database</DialogTitle>
      </DialogHeader>
      <DatabaseDetailsForm onSubmit={handleSubmit} />
      <Button type="button" onClick={() => setSelectedOption(null)} className="w-full mt-2 font-semibold" variant="outline">
        Back
      </Button>
    </div>
  );
};

export default SetupDatabaseDialog;
