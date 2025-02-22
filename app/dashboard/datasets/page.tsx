// app/dashboard/datasets/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Filter, Plus, PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabaseClient } from "@/lib/supabaseClient";
import { FaSpinner } from "react-icons/fa";
import { Icons } from "@/components/icons";
import { Spinner } from "@/components/ui/spinner";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Dialog } from "@/components/ui/dialog";
import DatasetCard from "../_components/DatasetCard";
import toast from "react-hot-toast";
import SetupDatabaseDialog from "../_components/SetupDatabaseDialog";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

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
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { user } = useUser();

  async function getData(): Promise<any[]> {
    // Fetch data from your API here.
    const { data, error } = await supabaseClient
      .from("datasets")
      .select('*')
      .eq('user_id', user?.id);
  
    if (error) {
      console.error("Error fetching data from Supabase", error);
      return [];
    }
    return data;
  }
  
  async function fetchData() {
    const data = await getData();
    console.log(data);
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

  if (loading) {
    return (
      <div className="flex h-full min-h-[calc(100vh-5vh)] w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  const handleAddDataset = () => () => {
    router.push("/dashboard/");
  };

  const hasData = data.length > 0;
  return (
    <main className="flex flex-col gap-2 px-8 py-4 lg:gap-2 min-h-[calc(100vh-5vh)] w-full">
      {hasData ? (
        <div className="flex flex-col tems-center">
          <div className="flex justify-between">
            <div>
              <h1 className="text-3xl font-bold">Datasets</h1>
              <p className="text-muted-foreground text-sm">
                Here are the list of your saved datasets
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5 mt-4">
            {data.map((dataset, index) => (
              <DatasetCard
                key={index}
                dataset_id={dataset.id}
                dataset_name={dataset.dataset_name}
                dataset_description={dataset.dataset_description}
                connection_id={dataset.connection_id}
                tableName={dataset.table_name}
                fetchData={fetchData}
                api_id={dataset.api_id}
                csv_id={dataset.csv_id}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 h-full max-h-[calc(100vh-5vh)] p-16 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col h-full max-h-[calc(100vh-5vh)] items-center text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              You have no Dataset
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Dataset list will appear here
            </p>
            <Button onClick={handleAddDataset()} className="bg-primary text-black font-semibold">
                  <Plus size={20} className="mr-2" />
                  Add Dataset
                </Button>
          </div>
        </div>
      )}
    </main>
  );
}
