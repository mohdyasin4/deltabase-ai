"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner"; // Replace with your loader component
import ResultPage from "../../_components/ResultPage";

const CsvDetails = () => {
  const [loading, setLoading] = useState(true); // Loader state
  const [csvName, setCsvName] = useState("");
  const [csvUrl, setCsvUrl] = useState("");
  const [lastUsed, setLastUsed] = useState("");

  const router = useRouter();
  const { csvId } = useParams();

  useEffect(() => {
    const fetchCsvDetails = async () => {
      try {
        const csvDetails = await supabaseClient
          .from("csvData")
          .select("*")
          .eq("id", csvId)
          .single();

        if (csvDetails.data) {
          setCsvUrl(csvDetails.data.csv_url);
          setLastUsed(new Date().toLocaleString()); // Example timestamp
          setCsvName(csvDetails.data.connection_name);
        } else {
          console.error("Failed to retrieve CSV details:", csvDetails.error);
        }
      } catch (error) {
        console.error("Error fetching CSV details:", error);
      } finally {
        setLoading(false); // Hide loader after data fetch
      }
    };

    if (csvId) {
      fetchCsvDetails();
    } else {
      console.error("CSV ID is undefined");
      setLoading(false); // Hide loader even if no ID is present
    }
  }, [csvId]);

  const handleDisconnect = async () => {
    try {
      const { error } = await supabaseClient
        .from("csv_connections")
        .delete()
        .eq("id", csvId);

      if (error) throw error;

      toast.success("CSV disconnected successfully.");
      router.push("/dashboard"); // Redirect to dashboard after disconnect
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect the CSV.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner /> {/* Replace with your preferred loader */}
      </div>
    );
  }

  return (
    <ResultPage
      csvId={Array.isArray(csvId) ? csvId[0] : csvId}
      tableName={"table_name"}
      sourceType="csv"
      type="table"
    />
  );
};

export default CsvDetails;
