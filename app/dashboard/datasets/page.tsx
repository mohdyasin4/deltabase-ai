// app/dashboard/datasets/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter, Plus, Search, SortAsc, SortDesc, Grid3X3, List } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseClient } from "@/lib/supabaseClient";
import { Spinner } from "@/components/ui/spinner";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Dialog } from "@/components/ui/dialog";
import DatasetCard from "../_components/DatasetCard";
import toast from "react-hot-toast";
import SetupDatabaseDialog from "../_components/SetupDatabaseDialog";
import DatasetConnectionPopover from "../_components/DatasetConnectionPopover";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function Loading() {
  return (
    <div className=" flex h-full justify-center items-center gap-2 ">
      <Spinner size={"small"} className="text-primary" />
      Fetching Datasets...
    </div>
  );
}

export default function SavedDatasetPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { user } = useUser();

  async function getData(): Promise<any[]> {
    const { data, error } = await supabaseClient
      .from("datasets")
      .select("*")
      .eq("user_id", user?.id);
    if (error) {
      console.error("Error fetching data from Supabase", error);
      return [];
    }
    return data;
  }

  async function fetchData() {
    const data = await getData();
    setData(data);
    setLoading(false);
  }

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);
  const handleDialogOpen = () => setIsDialogOpen(true);
  const handleDialogClose = () => setIsDialogOpen(false);
  // Filter datasets
  let filteredData = data;
  if (typeFilter) {
    filteredData = filteredData.filter((d) => d.type === typeFilter);
  }
  filteredData = filteredData.sort((a, b) => {
    if (sortBy === "created_at") {
      return sortOrder === "asc"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });  const hasData = filteredData.length > 0;  return (
    <main className="flex flex-col gap-6 px-6 py-6 min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/10">
      {/* Enhanced Header Section */}
      <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-background via-background to-muted/30 border border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20">
            <Filter className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              Datasets
            </h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Manage and explore your connected data sources
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
         
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-9 bg-background/80 border-border/60 hover:border-border transition-colors">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-background/95 backdrop-blur-md border-border/80">
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="dataset_name">Name</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-border/60 bg-background/80 p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={`h-7 w-8 p-0 transition-all duration-200 ${
                viewMode === "grid" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "hover:bg-muted/60"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-7 w-8 p-0 transition-all duration-200 ${
                viewMode === "list" 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "hover:bg-muted/60"
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </Button>          </div>

          <DatasetConnectionPopover>
            <Button 
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground transition-all duration-200 h-9 px-4 text-sm font-medium shadow-sm border-0"
            >
              <Plus size={16} className="mr-2" />
              Add Dataset
            </Button>
          </DatasetConnectionPopover>
        </div>
      </div>{/* Content Section */}
      <div className="flex-1 overflow-auto min-h-0">
        {loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <Spinner size={"small"} className="text-primary mr-2" />
            <span className="text-muted-foreground">Loading datasets...</span>
          </div>
          <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : hasData ? (
        <div className="space-y-4">

          {/* Dataset Grid/List */}
          <div className={`grid gap-4 ${
            viewMode === "grid" 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
              : "grid-cols-1"
          }`}>
            {filteredData.map((dataset, index) => (
              <DatasetCard
                key={dataset.id}
                dataset_id={dataset.id}
                dataset_name={dataset.dataset_name}
                dataset_description={dataset.dataset_description}
                connection_id={dataset.connection_id}
                fetchData={fetchData}
                api_id={dataset.api_id}
                csv_id={dataset.csv_id}
                created_at={dataset.created_at}
                type={dataset.type}
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Plus className="h-10 w-10 text-muted-foreground" />
            </div>            <h3 className="mt-4 text-lg font-semibold">
              {typeFilter ? "No datasets found" : "No datasets yet"}
            </h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
              {typeFilter 
                ? "Try adjusting your filter criteria to find what you're looking for."
                : "Get started by connecting your first data source. You can connect databases, APIs, or upload CSV files."
              }
            </p>            {!typeFilter && (
              <DatasetConnectionPopover>
                <Button 
                  className="bg-primary text-black font-semibold hover:bg-primary/90"
                >
                  <Plus size={20} className="mr-2" />
                  Add Your First Dataset
                </Button>
              </DatasetConnectionPopover>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </main>
  );
}
