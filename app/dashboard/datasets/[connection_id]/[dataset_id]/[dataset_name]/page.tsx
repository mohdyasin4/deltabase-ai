"use client";

import React, { useEffect, useState } from "react";
import ResultPage from "@/app/dashboard/_components/ResultPage"; // Adjust the path as necessary
import { useParams } from "next/navigation";
import supabaseClient from "@/lib/supabaseClient";
import { Spinner } from "@/components/ui/spinner";

// Initialize Supabase client
const DatasetPage = () => {
  const { connection_id, dataset_id, dataset_name } = useParams() as { connection_id: string; dataset_id: string; dataset_name: string };
  const [sourceType, setSourceType] = useState<"api" | "database" | "csv" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
  const determineSourceType = async () => {
    const { data: apiData, error: apiError } = await supabaseClient
      .from("api_connections")
      .select("*")
      .eq("id", connection_id)
      .single();

    if (apiData) {
      setSourceType("api");
    } else {
      const { data: dbData, error: dbError } = await supabaseClient
        .from("database_connections")
        .select("*")
        .eq("id", connection_id)
        .single();

      if (dbData) {
        setSourceType("database");
      } else {
        setSourceType("csv");
      }
    }

    setLoading(false);
  };
  
  determineSourceType();
  }, [connection_id]);

  if (loading) {
    return (
      <div className="flex h-full justify-center items-center gap-2">
        <Spinner className="animate-spin" />
        Fetching Dataset...
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100vh-20vh)]">
      <ResultPage
        connection_id={sourceType === "database" ? connection_id : null}
        apiId={sourceType === "api" ? connection_id : null}
        dataset_id={dataset_id}
        csvId={sourceType === "csv" ? connection_id : null}
        dataset_name={dataset_name}
        type="dataset"
        sourceType={sourceType || "database"} // Default to "database" if null
      />
    </div>
  );
};

export default DatasetPage;
