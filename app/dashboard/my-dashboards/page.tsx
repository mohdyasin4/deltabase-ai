//app/dashboard/my-dashboards/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseClient } from "@/lib/supabaseClient";
import { useUser } from "@clerk/nextjs";
import CreateDashboardDialog from "@/app/dashboard/_components/CreateDashboardDialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Dialog } from "@/components/ui/dialog";
import DashboardCard from "@/app/dashboard/_components/DashboardCard";
import { PlusCircle, Search, Grid3X3, List, LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

function DataTableSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
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
  );
}

export default function Dashboard() {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<string>("createdAt");

  useEffect(() => {
    async function fetchDashboards() {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from("dashboards")
        .select("*")
        .eq("user_id", user?.id); // Fetch all dashboards for the user

      if (!error) {
        // Filter out dashboards of type 'sample'
        const filteredDashboards = data.filter((dashboard) => dashboard.type !== 'sample');
        setDashboards(filteredDashboards);
      }
      setLoading(false);
    }

    fetchDashboards();
  }, [user?.id]);
  const handleDelete = (id: string) => {
    setDashboards((prevDashboards) =>
      prevDashboards.filter((dashboard) => dashboard.id !== id)
    );
  };
  // Filter and sort dashboards
  let filteredDashboards = dashboards;

  // Sort dashboards
  filteredDashboards = filteredDashboards.sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return (    <main className="p-4 lg:p-6 space-y-6 w-full h-full bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header Section - Enhanced Professional Design */}      <div className="flex items-center justify-between p-8 rounded-xl bg-gradient-to-r from-background/80 via-background/90 to-background/95 border border-border/30 backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-primary/8 to-primary/15 border border-primary/15 backdrop-blur-sm">
            <LayoutDashboard className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/90 bg-clip-text">
              My Dashboards
            </h1>
            <p className="text-sm text-muted-foreground font-medium mt-1.5">
              Create and manage your custom analytics dashboards
            </p>
          </div>
        </div>
        {dashboards.length > 0 && (
          <div className="flex items-center gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] h-9 bg-background/80 border-border/50 hover:border-border/70 transition-colors rounded-lg">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-md border-border/60 shadow-xl rounded-xl">
                <SelectItem value="createdAt" className="rounded-lg">Date Created</SelectItem>
                <SelectItem value="name" className="rounded-lg">Name</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex rounded-lg border border-border/50 bg-background/80 p-1 backdrop-blur-sm">
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
              </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground transition-all duration-200 h-9 px-5 text-sm font-semibold shadow-md border-0 rounded-lg"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <PlusCircle size={16} className="mr-2" />
                  Create Dashboard
                </Button>
              </DialogTrigger>
              <CreateDashboardDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
              />
            </Dialog>
          </div>
        )}
      </div>{/* Content Section */}
      {loading ? (
        <DataTableSkeleton />
      ) : filteredDashboards.length > 0 ? (        <div className="space-y-6">
         {/* Dashboard Grid/List */}
          <div className={`grid gap-4 ${
            viewMode === "grid" 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
              : "grid-cols-1"
          }`}>
            {filteredDashboards.map((dashboard) => (              <DashboardCard
                key={dashboard.id}
                dashboard={dashboard}
                id={dashboard.id}
                name={dashboard.name}
                description={dashboard.description}
                createdAt={dashboard.createdAt}
                dataset_id={dashboard.widget_details?.[0]?.dataset_id || null}
                onDelete={handleDelete}
              />
            ))}
          </div>        </div>      ) : (
        <Card className="border-dashed border-2 border-border/40 bg-gradient-to-br from-muted/10 via-background/80 to-muted/20 backdrop-blur-xl">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/8 to-primary/15 border border-primary/15 mb-8 backdrop-blur-sm">
              <LayoutDashboard className="h-14 w-14 text-primary" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/90 bg-clip-text">
              No Dashboards Created
            </h3>
            <p className="mb-10 mt-4 text-sm text-muted-foreground max-w-lg leading-relaxed">
              You haven't created any dashboards yet. Start by creating your first dashboard to visualize and analyze your data with beautiful, interactive charts and insights.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-xl transition-all duration-200 px-8 py-3.5 text-base font-semibold rounded-lg hover:shadow-primary/20"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <PlusCircle size={20} className="mr-2" />
                  Create Your First Dashboard
                </Button>
              </DialogTrigger>
              <CreateDashboardDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
              />
            </Dialog>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
