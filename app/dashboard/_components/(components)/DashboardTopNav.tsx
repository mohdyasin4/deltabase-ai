import { useAuth } from "@clerk/nextjs";
import { Profile } from "@/components/Profile";
import { SearchBar } from "@/components/SearchBar";
import { SlashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient"; // Adjust the path as necessary
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useParams, usePathname } from "next/navigation";
import { useRouter } from "@/hooks/useRouter";
import { auth } from "@clerk/nextjs/server";

interface DashboardTopNavProps {
  id?: string;
}

async function fetchConnectionName(id: string) {
  const { data, error } = await supabaseClient
    .from("database_connections")
    .select("connection_name")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching connection name:", error);
    return null;
  }
  return data ? data.connection_name : null;
}

export default function DashboardTopNav({ id }: DashboardTopNavProps) {
  const router = useRouter();
  const { tableName } = useParams(); // Get tableName from URL parameters
  const { dataset_name, connection_id } = useParams();
  const [connectionName, setConnectionName] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchConnectionName(id).then((name) => setConnectionName(name));
    }
  }, [id]);

  const isTablePage = Boolean(id && tableName);
  const isDashboardPage = usePathname() === "/dashboard";
  const isQueryPage = usePathname().includes("/query-result");
  const isDatasetPage = usePathname().includes("/dashboard/datasets")
  return (
    <div className="flex flex-col">
      <header className="flex flex-row items-center gap-4 border-b p-2">
        <div className="pl-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                {isDashboardPage ? (
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {connectionName && (
                <>
                  <BreadcrumbSeparator>
                    <SlashIcon />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    {isQueryPage || isTablePage ? (
                      <BreadcrumbLink href={`/dashboard/${id}`}>
                        {connectionName}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{connectionName}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </>
              )}
              {isTablePage && tableName && (
                <>
                  <BreadcrumbSeparator>
                    <SlashIcon />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{tableName}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
              {isQueryPage && (
                <>
                  <BreadcrumbSeparator>
                    <SlashIcon />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage>Query Result</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
              {isDatasetPage && (
                <>
                  <BreadcrumbSeparator>
                    <SlashIcon />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/dashboard/datasets/`}>
                      Saved Datasets
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <SlashIcon />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{decodeURIComponent(dataset_name)}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <SearchBar />
          {userId && <Profile />}
        </div>
      </header>
    </div>
  );
}
