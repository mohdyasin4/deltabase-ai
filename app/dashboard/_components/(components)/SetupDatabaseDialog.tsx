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
import { useEffect } from "react";
import { auth } from "@clerk/nextjs/server";

interface SetupDatabaseDialogProps {
  onClose: () => void;
  setData: (data: any) => void;
  getData: () => Promise<any[]>;
}

const SetupDatabaseDialog: React.FC<SetupDatabaseDialogProps> = ({
  onClose,
  setData,
  getData,
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

  const handleSubmit = async (formData: any) => {
    // Send form data to the server
    console.log("handleSubmit Invoked");
    console.log("Form data:", formData);
    
    // Example implementation with SupabaseClient
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
        },
      ]);
    if (error) {
      console.error("Error inserting data into Supabase", error);
      return;
    } else {
      toast.success("Database connection added successfully");
    }
    const newData = await getData();
    setData(newData);
    onClose();
    resetForm();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Setup New Database Connection</DialogTitle>
      </DialogHeader>
      <DatabaseDetailsForm onSubmit={handleSubmit} />
    </DialogContent>
  );
};

export default SetupDatabaseDialog;
