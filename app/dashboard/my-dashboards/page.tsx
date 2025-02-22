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
import DashboardCard from "@/app/dashboard/_components/DashboardCard"; // Import the new component
import { PlusCircle } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Card, CardHeader } from "@heroui/react";

function DataTableSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="w-full">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  return (
    <main className="p-6 lg:p-8 space-y-4 w-full h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Dashboards</h1>
        {dashboards.length > 0 && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary text-black"
                onClick={() => setIsDialogOpen(true)}
              >
                <PlusCircle size={20} className="mr-2" />
                Create Dashboard
              </Button>
            </DialogTrigger>
            <CreateDashboardDialog
              isOpen={isDialogOpen}
              onOpenChange={setIsDialogOpen}
            />
          </Dialog>
        )}
      </div>

      {loading ? (
        <DataTableSkeleton />
      ) : dashboards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {dashboards.map((dashboard) => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              id={dashboard.id}
              name={dashboard.name}
              description={dashboard.description}
              createdAt={dashboard.createdAt}
              dataset_id={dashboard.widget_details?.[0]?.dataset_id || null}
              onDelete={handleDelete} // Pass the onDelete callback to each card
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 rounded-lg border border-dashed text-center">
          <h3 className="text-2xl font-bold">No Dashboards Created</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You haven't created any dashboards yet. Start by creating one now.
          </p>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary text-black"
                onClick={() => setIsDialogOpen(true)}
              >
                <PlusCircle size={20} className="mr-2" />
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
    </main>
  );
}
