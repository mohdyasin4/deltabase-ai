"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner"; // Replace with your loader component
import ResultPage from "../../_components/ResultPage";

const ApiDetails = () => {
  const [loading, setLoading] = useState(true); // Loader state
  const [connectionStatus, setConnectionStatus] = useState("Connected");
  const [apiName, setApiName] = useState("");
  const [apiKey, setApiKey] = useState("************");
  const [apiUrl, setApiUrl] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [lastUsed, setLastUsed] = useState("");

  const router = useRouter();
  const { apiId } = useParams();
  
  useEffect(() => {
    const fetchApiDetails = async () => {
      try {
        const apiDetails = await supabaseClient
          .from("api_connections")
          .select("*")
          .eq("id", apiId)
          .single();

        if (apiDetails.data) {
          setApiUrl(apiDetails.data.api_url);
          setLastUsed(new Date().toLocaleString()); // Example timestamp
          setApiName(apiDetails.data.connection_name);
        } else {
          console.error("Failed to retrieve API details:", apiDetails.error);
        }
      } catch (error) {
        console.error("Error fetching API details:", error);
      } finally {
        setLoading(false); // Hide loader after data fetch
      }
    };

    if (apiId) {
      fetchApiDetails();
    } else {
      console.error("API ID is undefined");
      setLoading(false); // Hide loader even if no ID is present
    }
  }, [apiId]);

  const handleTestConnection = async () => {
    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (response.ok) {
        toast.success("API Connection test successful.");
        setLastUsed(new Date().toLocaleString());
      } else {
        toast.error("API Connection test failed.");
      }
    } catch (error) {
      console.error("Connection test error:", error);
      toast.error("Failed to test connection.");
    }
  };

  const handleDisconnect = async () => {
    try {
      const { error } = await supabaseClient
        .from("api_connections")
        .delete()
        .eq("id", apiId);

      if (error) throw error;

      toast.success("API disconnected successfully.");
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect the API.");
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
          apiId={Array.isArray(apiId) ? apiId[0] : apiId}
          tableName={"table_name"}
          sourceType="api"
          type="table"
        />
  );
};

export default ApiDetails;
