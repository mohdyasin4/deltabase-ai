"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Braces, DatabaseIcon, Pencil, Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/dialog";
import { useSession, useUser } from "@clerk/nextjs";
import SampleCard from "./_components/sampleCard"; // Import the new SampleCard component
import { Tooltip } from "@heroui/react";
import DbCard from "./_components/dbCard";
import SetupDatabaseDialog from "./_components/SetupDatabaseDialog";
import { createClient } from "@supabase/supabase-js";
import EditDatabaseDialog from "./_components/EditDatabaseDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileCsv } from "@fortawesome/free-solid-svg-icons";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabaseClient } from "@/lib/supabaseClient";
import { dataConfig, type DataConfig } from "@/config/data";
import { CsvImporter } from "@/components/csv-importer";
import Papa from "papaparse";

// Data samples array
const dataSamples = [
  {
    id: 1,
    title: "A glance at Accounts",
    description: "Explore account-related data.",
    query: "SELECT * FROM accounts LIMIT 10;",
    chartType: "bar",
  },
  {
    id: 2,
    title: "Some insights about People",
    description: "Understand people trends.",
    query: "SELECT * FROM people LIMIT 10;",
    chartType: "line",
  },
  {
    id: 3,
    title: "A look at Orders",
    description: "Review recent orders.",
    query: "SELECT * FROM orders LIMIT 10;",
    chartType: "pie",
  },
  {
    id: 4,
    title: "A look at Analytic Events",
    description: "Analyze user events.",
    query: "SELECT * FROM events LIMIT 10;",
    chartType: "area",
  },
  {
    id: 5,
    title: "A glance at Products",
    description: "Monitor product trends.",
    query: "SELECT * FROM products LIMIT 10;",
    chartType: "radar",
  },
  {
    id: 6,
    title: "A summary of Feedback",
    description: "Analyze customer feedback.",
    query: "SELECT * FROM feedback LIMIT 10;",
    chartType: "line",
  },
  {
    id: 7,
    title: "Some insights about Reviews",
    description: "Get a view of product reviews.",
    query: "SELECT * FROM reviews LIMIT 10;",
    chartType: "bar",
  },
  {
    id: 8,
    title: "A summary of Invoices",
    description: "Look at invoices.",
    query: "SELECT * FROM invoices LIMIT 10;",
    chartType: "pie",
  },
];

// Function to shuffle array
function shuffleArray(array: any[]) {
  return array.sort(() => Math.random() - 0.5);
}

function Loading() {
  return (
    <div className="flex justify-center h-[calc(100vh-5vh)] items-center gap-2">
      <Spinner size={"small"} className="text-primary" />
      Fetching Data...
    </div>
  );
}

export default function DatabasePage() {
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const { session } = useSession();
  const [shuffledSamples, setShuffledSamples] = useState<typeof dataSamples>(
    []
  );
  const [data, setData] = useState<any[]>([]);
  const [sampleConnections, setSampleConnections] = useState<any[]>([]); // Sample connections
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_SERVICE_ROLE_KEY as string;
  // Create a Supabase client with the Clerk token
  const supabaseClient = createClient(supabaseUrl!, supabaseKey!, {
    global: {
      fetch: async (url: string | URL | Request, options = {}) => {
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

  const [selectedOption, setSelectedOption] = useState(null); // Tracks selected option

  const handleOptionSelect = (option: string | React.SetStateAction<null>) => {
    setSelectedOption(option);
  };

  const handleDialogStateChange = (
    isOpen: boolean | ((prevState: boolean) => boolean)
  ) => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedOption(null); // Reset to initial state after close animation
      }, 300); // Match delay to the dialog's close animation duration
    }
    setIsDialogOpen(isOpen);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedOption(null);
  };
  // Shuffle dataSamples when the component mounts
  useEffect(() => {
    setShuffledSamples(shuffleArray([...dataSamples]));
  }, []);

  // Fetch data function
  async function getData(): Promise<any[]> {
    if (!user) return [];

    const [databaseConnections, apiConnections, csvData] = await Promise.all([
      supabaseClient
        .from("database_connections")
        .select("id, connection_name")
        .eq("user_id", user.id),
      supabaseClient
        .from("api_connections")
        .select("id, connection_name")
        .eq("user_id", user.id),
      supabaseClient
        .from("csvData")
        .select("id, connection_name")
        .eq("user_id", user.id),
    ]);

    if (databaseConnections.error) {
      console.error(
        "Error fetching database connections",
        databaseConnections.error
      );
      return [];
    }

    if (apiConnections.error) {
      console.error("Error fetching API connections", apiConnections.error);
      return [];
    }

    if(csvData.error) {
      console.error("Error fetching CSV connections", csvData.error);
      return [];
    }

    // Add a type field to distinguish between the data sources
    const combinedData = [
      ...databaseConnections.data.map((conn) => ({
        ...conn,
        type: "database",
      })),
      ...apiConnections.data.map((conn) => ({
        ...conn,
        type: "api",
      })),
      ...csvData.data.map((conn) => ({
        ...conn,
        type: "csv",
      })),
    ];

    return combinedData;
  }

  // Fetch sample database connections
  async function getSampleConnections(): Promise<any[]> {
    const { data, error } = await supabaseClient
      .from("dashboards") // Query the dashboard table
      .select("*") // Fetch all columns or specify the necessary ones
      .eq("type", "sample"); // Filter for dashboards with type 'sample'

    if (error) {
      console.error("Error fetching sample dashboards", error);
      return [];
    }
    return data;
  }

  useEffect(() => {
    const fetchData = async () => {
      if (user && session) {
        const data = await getData();
        setData(data);
        const samples = await getSampleConnections(); // Fetch sample connections
        setSampleConnections(samples); // Set sample connections
        setLoading(false);
      }
    };

    fetchData();
  }, [user, session]);

  console.log("data state:", data);

  const handleDialogOpen = () => setIsDialogOpen(true);

  const handleDialogClose = () => {
    setSelectedOption(null);
    setIsDialogOpen(false);
  };

  useEffect(() => {
    if (!user || !session) {
      setData([]);
      setSampleConnections([]);
    }
  }, [user, session]);

  if (loading) {
    return (
      <div className="flex h-full overflow-hidden w-full items-center justify-center">
        <Loading />
      </div>
    );
  }

  const handleUpdate = async (id: number) => {
    if (!user) return;

    // Update the state with the new data
    setData(
      (prevData) => prevData.filter((db) => db.id !== id) // Remove the disconnected database from the state
    );
  };

  const hasDatabasesConnected = data.length > 0;

  console.log("user id", user);
  return (
    <main className="h-[calc(100vh-5vh)] flex flex-col justify-center px-4 md:px-12 lg:px-36 space-y-8">
      {/* Greeting Section with Metabot icon */}
      <div className="p-4 rounded-lg flex flex-col md:flex-row justify-between items-center shadow-sm space-y-4 md:space-y-0">
        <div className="flex items-center space-x-3">
          <Tooltip
            placement={"top-start"}
            content="Hello there! Ready to turn data into insights? Let's get started"
          >
            <Bot color="#ffcc19" size={40} />
          </Tooltip>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">
              Good to see you, {user?.username || "User"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {hasDatabasesConnected
                ? "Here are your connected data sources and some sample insights."
                : "Connect your data sources to get started."}
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogStateChange}>
          <DialogTrigger>
            <Button className="bg-primary text-black font-semibold w-full md:w-auto">
              <Plus size={20} className="mr-2" />
              Add Data Source
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-full md:max-w-lg">
            {!selectedOption && (
              <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-semibold">
                  Choose Data Source Type
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Button
                    onClick={() => handleOptionSelect("database")}
                    variant="outline"
                    className="w-full h-20 md:h-24 flex flex-col items-center justify-between font-semibold"
                  >
                    <div className="flex justify-center pt-2 md:pt-4 items-center w-full">
                      <DatabaseIcon size={24} />
                    </div>
                    <span className="text-center">Database</span>
                  </Button>
                  <Button
                    onClick={() => handleOptionSelect("api")}
                    variant="outline"
                    className="w-full h-20 md:h-24 flex flex-col items-center justify-between font-semibold"
                  >
                    <div className="flex justify-center pt-2 md:pt-4 items-center w-full">
                      <Braces size={24} />
                    </div>
                    API
                  </Button>
                  <Button
                    onClick={() => handleOptionSelect("csv")}
                    variant="outline"
                    className="w-full h-20 md:h-24 flex flex-col items-center justify-between font-semibold"
                  >
                    <div className="flex justify-center pt-2 md:pt-4 items-center w-full">
                      <FontAwesomeIcon icon={faFileCsv as any} size="2x" />
                    </div>
                    CSV
                  </Button>
                </div>
              </div>
            )}
            {selectedOption === "database" && (
              <SetupDatabaseDialog
                onClose={handleCloseDialog}
                getData={getData}
                setData={setData}
                setSelectedOption={setSelectedOption}
              />
            )}
            {selectedOption === "api" && (
              <SetupApiDialog
                onClose={handleCloseDialog}
                getData={getData}
                setData={setData}
                setSelectedOption={setSelectedOption}
              />
            )}
            {selectedOption === "csv" && (
              <SetupCsvDialog
                onClose={handleCloseDialog}
                getData={getData}
                setData={setData}
                setSelectedOption={setSelectedOption}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Connected Databases Section */}
      {hasDatabasesConnected && (
        <section>
          <h2 className="text-lg md:text-xl my-4 font-semibold">
            Your Data Sources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {data.map((connection) => (
              <DbCard
                key={connection.id}
                id={connection.id}
                name={connection.connection_name}
                type={connection.type}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </section>
      )}

      {/* Sample Insights Section */}
      <section>
        {sampleConnections.map((sample) => (
          <>
            <h2 className="text-lg md:text-xl my-4 font-semibold">
              Sample Insights to Explore
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <SampleCard
                key={sample.id}
                id={sample.id}
                title={sample.name} // Use the name from sample connections
                description={sample.description} // Use the description from sample connections
              />
            </div>
          </>
        ))}
      </section>
    </main>
  );
}

const SetupApiDialog = ({
  onClose,
  getData,
  setData,
  setSelectedOption,
}: {
  onClose: () => void;
  getData: () => Promise<any[]>;
  setData: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedOption: React.Dispatch<React.SetStateAction<any>>;
}) => {
  const [connectionName, setConnectionName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [headers, setHeaders] = useState("");
  const user = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabaseClient
        .from("api_connections")
        .insert([
          {
            connection_name: connectionName,
            api_url: apiUrl,
            api_key: apiKey || null,
            headers: headers ? JSON.parse(headers) : null,
            user_id: user.user?.id, // Replace with actual user ID
          },
        ]);

      if (error) {
        throw new Error(error.message);
      }

      // Refresh the data list
      const updatedData = await getData();
      setData(updatedData);

      // Close the dialog and reset state
      setConnectionName("");
      setApiUrl("");
      setApiKey("");
      setHeaders("");
      onClose();
    } catch (err) {
      console.error("Error adding API connection:", err);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Add API Source</h2>
      <form onSubmit={handleSubmit}>
        <div className="my-4">
          <Label htmlFor="connection-name" className="block font-medium my-4">
            Connection Name
          </Label>
          <Input
            id="connection-name"
            placeholder="Enter connection name"
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            required
          />
        </div>
        <div className="my-4">
          <Label htmlFor="api-url" className="block font-medium my-4">
            API URL
          </Label>
          <Input
            id="api-url"
            placeholder="https://api.example.com/data"
            type="url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            required
          />
        </div>
        <div className="my-2">
          <Button
            type="submit"
            className="w-full bg-primary text-black font-semibold"
          >
            Connect
          </Button>
          <Button
            type="button"
            onClick={() => setSelectedOption(null)}
            className="w-full mt-2 font-semibold"
            variant="outline"
          >
            Back
          </Button>
        </div>
      </form>
    </div>
  );
};

const SetupCsvDialog = ({
  onClose,
  getData,
  setData,
  setSelectedOption,
}: {
  onClose: () => void;
  getData: () => Promise<any[]>;
  setData: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedOption: React.Dispatch<React.SetStateAction<any>>;
}) => (
  <div className="space-y-4">
    <h2 className="text-xl font-semibold">Upload CSV</h2>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Add CSV setup logic
        onClose();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="csv-file" className="block font-medium">
          Drag and drop your files here or click to browse.
        </Label>
        <CsvImporter
          onClose={onClose}
          onImport={(parsedData: any[]) => {
            try {
              const formattedData = parsedData.map((item) => ({
                id: crypto.randomUUID(),
                ...item,
              }));

              // Update the data state
            } catch (error) {
              console.error("Error processing CSV data:", error);
            }
          }}
          className="self-end"
        />

        <div className="my-2">
          <Button
            type="submit"
            className="w-full bg-primary text-black font-semibold"
          >
            Save
          </Button>
          <Button
            type="button"
            onClick={() => setSelectedOption(null)}
            className="w-full mt-2 font-semibold"
            variant="outline"
          >
            Back
          </Button>
        </div>
      </div>
    </form>
  </div>
);
