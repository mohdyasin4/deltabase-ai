"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Dialog } from "@/components/ui/dialog";
import SetupDatabaseDialog from "./_components/SetupDatabaseDialog";
import { useSession, useUser } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import DbCard from "./_components/dbCard";

function Loading() {
  return (
    <div className="flex justify-center h-[calc(100vh-5vh)] items-center gap-2 ">
      <Spinner size={"small"} className="text-primary" />
      Fetching Data...
    </div>
  );
}
export default function DatabasePage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useUser();
  const { session } = useSession();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY as string;
  // Create a Supabase client with the Clerk token
  const supabaseClient = createClient(supabaseUrl!, supabaseKey!, {
    global: {
      fetch: async (url, options = {}) => {
        const clerkToken = await session?.getToken({ template: "supabase" });
        const headers = new Headers(options?.headers);
        headers.set("Authorization", `Bearer ${clerkToken}`);

        return fetch(url, {
          ...options,
          headers,
        });
      },
    },
  });

  // Fetch data function
  const getData = useCallback(async (): Promise<any[]> => {
    if (!user) return [];
    const { data, error } = await supabaseClient
      .from("database_connections")
      .select("id, connection_name")
      .eq("user_id", user.id);
    if (error) {
      console.error("Error fetching data from Supabase", error);
      return [];
    }
    return data;
  }, [user, supabaseClient]);

  useEffect(() => {
    if (user && session) {
      getData().then((data) => {
        setData(data);
        setLoading(false);
      });
    }
  }, [user, session, getData]);

  const handleDialogOpen = () => setIsDialogOpen(true);
  const handleDialogClose = () => setIsDialogOpen(false);

  if (loading) {
    return (
      <div className="flex h-full overflow-hidden w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  const hasData = data.length > 0;
  return (
    <main className="flex flex-col gap-2 px-8 py-4 lg:gap-2 h-[calc(100vh-5vh)] w-full overflow-hidden">
      {hasData ? (
        <div className="flex flex-col tems-center">
        <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold">Browse Database</h1>
          <p className="text-muted-foreground text-sm">
            View and manage your databases
          </p>
        </div>
        <div className="flex justify-between gap-2 py-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger>
              <Button className="bg-primary text-black font-semibold">
                <Plus size={20} className="mr-2" />
                Add Database
              </Button>
            </DialogTrigger>
            <SetupDatabaseDialog onClose={handleDialogClose} getData={getData} setData={setData}/>
          </Dialog>
        </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {data.map((database, index) => (
            <DbCard key={index} id={database.id} name={database.connection_name} />
          ))}
        </div>
      </div>
      ) : (
        <div className="flex flex-1 p-16 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              You have no database
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Database list will appear here
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger>
              <Button className="bg-primary text-black font-semibold">
                <Plus size={20} className="mr-2" />
                Add Database
              </Button>
            </DialogTrigger>
            <SetupDatabaseDialog onClose={handleDialogClose} getData={getData} setData={setData}/>
          </Dialog>
          </div>
        </div>
      )}
    </main>
  );
}