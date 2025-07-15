"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Braces,
  DatabaseIcon,
  Pencil,
  Plus,
  ArrowRight,
  Sparkles,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  LayoutDashboard,
  Zap,
  Star,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/dialog";
import { useSession, useUser } from "@clerk/nextjs";
import SampleCard from "./_components/sampleCard"; // Import the new SampleCard component
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DbCard from "./_components/dbCard";
import SetupDatabaseDialog from "./_components/SetupDatabaseDialog";
import { createClient } from "@supabase/supabase-js";
import EditDatabaseDialog from "./_components/EditDatabaseDialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileCsv } from "@fortawesome/free-solid-svg-icons";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabaseClient } from "@/lib/supabaseClient";
import { CsvImporter } from "@/components/csv-importer";
import Papa from "papaparse";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import Image from "next/image";
import { BorderBeam } from "@/components/magicui/border-beam";
import AnimatedGradientText from "@/components/magicui/animated-gradient-text";

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
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Spinner size={"small"} className="text-primary" />
      </motion.div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-foreground"
      >
        Fetching Data...
      </motion.span>
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

  // Pagination state for database connections
  const [showAllConnections, setShowAllConnections] = useState(false);
  const INITIAL_CONNECTIONS_LIMIT = 8;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env
    .NEXT_PUBLIC_SUPABASE_SUPABASE_SERVICE_ROLE_KEY as string;
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
  const [selectedOption, setSelectedOption] = useState<string | null>(null); // Tracks selected option

  const handleOptionSelect = (option: string) => {
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
  }, []);  // Fetch data function
  async function getData(): Promise<any[]> {
    console.log("=== getData function called ===", new Date().toISOString());
    if (!user) {
      console.log("No user found, returning empty array");
      return [];
    }
    console.log("Fetching data for user:", user.id);
    
    // Test the connection first with the imported supabaseClient
    try {
      const testQuery = await supabaseClient
        .from("api_connections")
        .select("count", { count: "exact" });
      
      console.log("API connections table test query result:", testQuery);
    } catch (testError) {
      console.error("Test query failed:", testError);
    }

    // Fetch all connections in parallel
    const [databaseConnections, apiConnections, csvConnections] = await Promise.all([
      supabaseClient
        .from("database_connections")
        .select("id, connection_name")
        .eq("user_id", user.id),
      supabaseClient
        .from("api_connections")
        .select("id, connection_name, api_url, api_key")
        .eq("user_id", user.id),
      supabaseClient
        .from("csvData")
        .select("id, connection_name, file_name")
        .eq("user_id", user.id),
    ]);

    // Handle database connections
    if (databaseConnections.error) {
      console.error("Error fetching database connections", databaseConnections.error);
      console.error("Database error details:", {
        message: databaseConnections.error.message,
        details: databaseConnections.error.details,
        hint: databaseConnections.error.hint,
        code: databaseConnections.error.code
      });
    } else {
      console.log("Database connections fetched:", databaseConnections.data);
    }

    // Handle API connections
    if (apiConnections.error) {
      console.error("Error fetching API connections", apiConnections.error);
      console.error("API error details:", {
        message: apiConnections.error.message,
        details: apiConnections.error.details,
        hint: apiConnections.error.hint,
        code: apiConnections.error.code
      });
    } else {
      console.log("API connections fetched:", apiConnections.data);
    }

    // Handle CSV connections
    if (csvConnections.error) {
      console.error("Error fetching CSV connections", csvConnections.error);
      console.error("CSV error details:", {
        message: csvConnections.error.message,
        details: csvConnections.error.details,
        hint: csvConnections.error.hint,
        code: csvConnections.error.code
      });
    } else {
      console.log("CSV connections fetched:", csvConnections.data);
    }

    // Combine all connections into a single array
    const allConnections = [
      ...(databaseConnections.data || []).map((conn: any) => ({ ...conn, type: "database" })),
      ...(apiConnections.data || []).map((conn: any) => ({ ...conn, type: "api" })),
      ...(csvConnections.data || []).map((conn: any) => ({ ...conn, type: "csv" })),
    ];    console.log("All connections combined:", allConnections);
    console.log("API connections in data:", allConnections.filter(conn => conn.type === "api"));
    console.log("Database connections in data:", allConnections.filter(conn => conn.type === "database"));
    console.log("CSV connections in data:", allConnections.filter(conn => conn.type === "csv"));

    return allConnections;
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
    return <Loading />;
  }

  const handleUpdate = async (id: number) => {
    if (!user) return;

    // Update the state with the new data
    setData(
      (prevData) => prevData.filter((db) => db.id !== id) // Remove the disconnected database from the state
    );
  };
  const hasDatabasesConnected = data.length > 0;
  const hasSampleInsights = sampleConnections.length > 0;
  console.log("user id", user);
  return (
    <main className="min-h-[calc(100vh-5vh)] flex flex-col justify-center px-4 md:px-8 lg:px-16 xl:px-24 space-y-6 py-4">
      {/* CSS Animations for enhanced button effects */}
      <style jsx>{`
        @keyframes gradient-shift {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes subtle-pulse {
          0%,
          100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.005);
            filter: brightness(1.05);
          }
        }

        @keyframes floating {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
        }
      `}</style>

      <TooltipProvider>
        {/* Hero Section - Centered Layout */}
        <div className="w-full mx-auto  mt-8 lg:mt-12">
          {/* Premium Hero Section - Modern & Professional */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative w-full"
          >
            {/* Clean background with subtle accent */}            <div
              className="relative rounded-xl p-4 md:p-5 
                          bg-white/95 dark:bg-card/95 
                          border border-gray-200/60 dark:border-border/60
                          shadow-lg shadow-black/5 dark:shadow-black/20
                          backdrop-blur-md"
            >
              {/* Minimal accent border */}
              <div className="absolute inset-0 rounded-xl border border-[#ffbe19]/20 dark:border-[#ffbe19]/10" />
              {/* Subtle corner accents */}
              <div className="absolute top-0 left-0 w-12 h-12 bg-[#ffbe19]/5 dark:bg-[#ffbe19]/3 rounded-xl blur-lg" />
              <div className="absolute bottom-0 right-0 w-10 h-10 bg-[#ffbe19]/5 dark:bg-[#ffbe19]/3 rounded-xl blur-lg" />
              {/* Hero Content */}{" "}              <div className="relative z-10">
                {/* Main Content - Optimized compact layout */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
                  {/* Left Content - Compact spacing */}
                  <div className="space-y-2 flex-1">
                    {/* Main Header Section - Reduced spacing */}
                    <div className="space-y-1.5">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="flex items-center space-x-3"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              className="relative cursor-pointer"
                            >
                              <div className="relative bg-[#ffbe19]/10 dark:bg-[#ffbe19]/5 p-1.5 rounded-md border border-[#ffbe19]/30">
                                <Bot color="#ffbe19" size={30} />
                              </div>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Your AI assistant is ready to help!</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex flex-col">
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-xs font-medium text-[#ffbe19] tracking-wide uppercase leading-none"
                          >
                            Hello {user?.firstName || "User"}, great to see you!
                          </motion.span>
                          <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-foreground tracking-tight mt-1"
                          >
                            Welcome to Refract.
                          </motion.h1>
                        </div>
                      </motion.div>

                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="text-sm md:text-base text-gray-600 dark:text-muted-foreground leading-snug max-w-xl"
                      >
                        {hasDatabasesConnected
                          ? "Your data ecosystem is ready. Let's dive into some insights!"
                          : "Ready to transform your data? Connect a source and unlock AI-powered analytics."}
                      </motion.p>
                    </div>
                    
                    {/* Interactive Feature Highlights - Compact version */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="flex flex-wrap gap-1.5 pt-1"
                    >
                      {[
                        {
                          icon: Zap,
                          label: "AI-Powered Analytics",
                          color: "text-[#ffbe19]",
                          bg: "bg-[#ffbe19]/10 border-[#ffbe19]/20",
                          desc: "Advanced AI insights and predictions for your data",
                        },
                        {
                          icon: TrendingUp,
                          label: "Real-time Insights",
                          color: "text-emerald-600",
                          bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/40 dark:border-emerald-800/40",
                          desc: "Live data monitoring and instant analytics",
                        },
                        {
                          icon: LayoutDashboard,
                          label: "Interactive Dashboards",
                          color: "text-blue-600",
                          bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200/40 dark:border-blue-800/40",
                          desc: "Beautiful, customizable visualizations and reports",
                        },                      ].map((feature, index) => (
                        <Tooltip key={feature.label}>
                          <TooltipTrigger asChild>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.9 + index * 0.1 }}
                              whileHover={{ scale: 1.05, y: -2 }}
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border ${feature.bg} 
                                        cursor-pointer transition-all duration-200 group`}
                            >
                              <feature.icon
                                className={`${feature.color} group-hover:scale-110 transition-transform`}
                                size={12}
                              />
                              <span className="text-xs font-medium text-gray-900 dark:text-foreground">
                                {feature.label}
                              </span>
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{feature.desc}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </motion.div>
                  </div>
                  
                  {/* Right Side - Optimized Button */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.0 }}
                    className="flex-shrink-0 flex items-center lg:items-stretch"
                  >
                    <Dialog
                      open={isDialogOpen}
                      onOpenChange={handleDialogStateChange}
                    >
                      <DialogTrigger asChild>
                        <div className="flex items-stretch">
                          <motion.div
                            whileHover={{ scale: 1.01, y: -1 }}
                            whileTap={{ scale: 0.99 }}
                            className="flex items-stretch"
                          >
                            {" "}                            <Button
                              className="group relative overflow-hidden px-6 py-4 text-base font-semibold
                                           w-[200px] lg:w-[220px] h-full min-h-[100px] lg:min-h-[110px]
                                           rounded-2xl transition-all duration-700 ease-out
                                           focus:ring-4 focus:ring-[#ffbe19]/30 focus:ring-offset-2 focus:outline-none
                                           transform-gpu hover:scale-[1.02] active:scale-[0.98]"
                              style={{
                                background: `
                                  linear-gradient(135deg, 
                                    #ffbe19 0%, 
                                    #f5a623 25%, 
                                    #e6941a 50%, 
                                    #ffbe19 75%, 
                                    #ffc73d 100%
                                  )`,
                                backgroundSize: "200% 200%",
                                animation: "gradient-shift 6s ease infinite",
                                border: "2px solid rgba(255, 190, 25, 0.5)",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor =
                                  "rgba(255, 190, 25, 0.8)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor =
                                  "rgba(255, 190, 25, 0.5)";
                              }}
                            >
                              {/* Glassmorphism overlay */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent rounded-2xl" />

                              {/* Animated shine effect */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                <div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
                                                -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] 
                                                transition-transform duration-1000 ease-out"
                                />
                              </div>

                              {/* Pulsing background on hover */}
                              <div
                                className="absolute inset-0 bg-gradient-to-br from-[#ffc73d]/20 to-[#ffbe19]/20 
                                              opacity-0 group-hover:opacity-100 transition-opacity duration-500 
                                              animate-pulse group-hover:animate-none rounded-2xl"
                              />                              {/* Button content */}
                              <div className="relative flex flex-col items-center justify-center h-full space-y-3 text-black/90">
                                {/* Icon with enhanced background */}
                                <div className="relative">
                                  {/* Icon glow effect */}
                                  <div
                                    className="absolute inset-0 w-12 h-12 bg-white/20 rounded-full blur-sm 
                                                  group-hover:bg-white/30 transition-all duration-300 group-hover:scale-125"
                                  />
                                  <div
                                    className="relative w-12 h-12 bg-white/15 backdrop-blur-sm rounded-full 
                                                  flex items-center justify-center border border-white/20
                                                  group-hover:bg-white/25 group-hover:border-white/40 
                                                  transition-all duration-500 group-hover:scale-110 group-hover:rotate-90
                                                  shadow-lg shadow-black/10"
                                  >
                                    <Plus
                                      size={24}
                                      className="text-black/80 font-bold transition-all duration-500 
                                                 group-hover:text-black/90 drop-shadow-sm"
                                    />
                                  </div>
                                </div>
                                
                                {/* Text content with better typography */}
                                <div className="text-center space-y-1">
                                  <div className="text-lg font-bold tracking-wide text-black/90 group-hover:text-black transition-colors duration-300">
                                    Add Data Source
                                  </div>
                                  <div
                                    className="text-sm font-medium text-black/75 
                                                  group-hover:text-black/85 transition-colors duration-300"
                                  >
                                    Get started instantly
                                  </div>
                                </div>
                                
                                {/* Enhanced arrow indicator */}
                                <div className="flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all duration-300">
                                  <div
                                    className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full 
                                                  bg-black/10 group-hover:bg-black/15 transition-all duration-300"
                                  >
                                    <span className="text-xs font-medium text-black/80 group-hover:text-black/90">
                                      Start
                                    </span>
                                    <ArrowRight
                                      size={14}
                                      className="text-black/80 group-hover:text-black/90 
                                                 group-hover:translate-x-1 transition-all duration-300"
                                    />
                                  </div>
                                </div>
                              </div>
                            </Button>
                          </motion.div>
                        </div>
                      </DialogTrigger>                      {/* Enhanced Dialog Content */}
                      <DialogContent className="max-w-2xl p-0 gap-0 bg-background backdrop-blur-xl border border-border/50 shadow-2xl">
                        <div className="relative">
                          {/* Dynamic Dialog Header */}
                          <div className={`px-6 py-5 border-b border-border/50 ${
                            !selectedOption 
                              ? "bg-gradient-to-r from-[#ffbe19]/5 to-transparent"
                              : selectedOption === "database"
                              ? "bg-gradient-to-r from-[#ffbe19]/5 to-transparent"
                              : selectedOption === "csv"
                              ? "bg-gradient-to-r from-emerald-500/5 to-transparent"
                              : selectedOption === "api"
                              ? "bg-gradient-to-r from-violet-500/5 to-transparent"
                              : "bg-gradient-to-r from-[#ffbe19]/5 to-transparent"
                          }`}>
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                !selectedOption 
                                  ? "bg-[#ffbe19]/10"
                                  : selectedOption === "database"
                                  ? "bg-[#ffbe19]/10"
                                  : selectedOption === "csv"
                                  ? "bg-emerald-500/10"
                                  : selectedOption === "api"
                                  ? "bg-violet-500/10"
                                  : "bg-[#ffbe19]/10"
                              }`}>
                                {!selectedOption ? (
                                  <Plus className="text-[#ffbe19]" size={20} />
                                ) : selectedOption === "database" ? (
                                  <DatabaseIcon className="text-[#ffbe19]" size={20} />
                                ) : selectedOption === "csv" ? (
                                  <FontAwesomeIcon
                                    icon={faFileCsv as any}
                                    className="text-emerald-500 text-lg"
                                  />
                                ) : selectedOption === "api" ? (
                                  <Braces className="text-violet-500" size={20} />
                                ) : (
                                  <Plus className="text-[#ffbe19]" size={20} />
                                )}
                              </div>
                              <div>
                                <h2 className="text-xl font-semibold text-foreground">
                                  {!selectedOption 
                                    ? "Add Data Source"
                                    : selectedOption === "database"
                                    ? "Connect Database"
                                    : selectedOption === "csv"
                                    ? "Upload CSV File"
                                    : selectedOption === "api"
                                    ? "Setup API Connection"
                                    : "Add Data Source"
                                  }
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                  {!selectedOption 
                                    ? "Choose how you'd like to connect your data"
                                    : selectedOption === "database"
                                    ? "Configure your database connection settings"
                                    : selectedOption === "csv"
                                    ? "Upload and configure your CSV data"
                                    : selectedOption === "api"
                                    ? "Setup your REST API endpoint configuration"
                                    : "Choose how you'd like to connect your data"
                                  }
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Dialog Body */}
                          <div className="p-6">
                            {!selectedOption && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <Button
                                    onClick={() =>
                                      handleOptionSelect("database")
                                    }
                                    variant="outline"
                                    className="h-32 flex flex-col items-center justify-center space-y-3 font-semibold 
                                             hover:bg-[#ffbe19]/5 hover:border-[#ffbe19]/50 
                                             transition-all duration-300 group border-2 border-dashed border-border/50
                                             hover:border-solid hover:shadow-lg"
                                  >
                                    <div className="w-12 h-12 bg-[#ffbe19]/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <DatabaseIcon
                                        className="text-[#ffbe19]"
                                        size={24}
                                      />
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-foreground">
                                        Database
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        PostgreSQL, MySQL, etc.
                                      </div>
                                    </div>
                                  </Button>

                                  <Button
                                    onClick={() => handleOptionSelect("csv")}
                                    variant="outline"
                                    className="h-32 flex flex-col items-center justify-center space-y-3 font-semibold 
                                             hover:bg-success/5 hover:border-success/50 
                                             transition-all duration-300 group border-2 border-dashed border-border/50
                                             hover:border-solid hover:shadow-lg"
                                  >
                                    <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <FontAwesomeIcon
                                        icon={faFileCsv as any}
                                        className="text-success text-2xl"
                                      />
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-foreground">
                                        CSV File
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Upload spreadsheet data
                                      </div>
                                    </div>
                                  </Button>                                  <Button
                                    onClick={() => handleOptionSelect("api")}
                                    variant="outline"
                                    className="h-32 flex flex-col items-center justify-center space-y-3 font-semibold 
                                             hover:bg-violet-500/5 hover:border-violet-500/50 
                                             transition-all duration-300 group border-2 border-dashed border-border/50
                                             hover:border-solid hover:shadow-lg"
                                  >
                                    <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <Braces
                                        className="text-violet-500"
                                        size={24}
                                      />
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-foreground">
                                        API
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        REST endpoints
                                      </div>
                                    </div>
                                  </Button>
                                </div>

                                {/* Quick tips */}
                                <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
                                  <div className="flex items-start space-x-3">
                                    <div className="w-5 h-5 bg-blue-500/10 rounded-full flex items-center justify-center mt-0.5">
                                      <span className="text-blue-500 text-xs">
                                        💡
                                      </span>
                                    </div>
                                    <div className="text-sm">
                                      <p className="font-medium text-foreground mb-1">
                                        Quick Start Tips:
                                      </p>
                                      <ul className="text-muted-foreground space-y-1 text-xs">
                                        <li>
                                          • Database connections are encrypted
                                          and secure
                                        </li>
                                        <li>
                                          • CSV files are processed locally
                                          before upload
                                        </li>
                                        <li>
                                          • API connections support
                                          authentication headers
                                        </li>
                                      </ul>
                                    </div>
                                  </div>
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
                            {selectedOption === "csv" && (
                              <SetupCsvDialog
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
                            )}{" "}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </motion.div>
                </div>
              </div>
            </div>{" "}
          </motion.div>
        </div>
        {/* Quick Start Guide for New Users */}
        {!hasDatabasesConnected && !hasSampleInsights && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Get Started in 3 Simple Steps
              </h2>
              <p className="text-muted-foreground">
                Connect your data and start generating insights in minutes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  title: "Connect Your Data",
                  description:
                    "Start by connecting your database, uploading a CSV file, or integrating with an API.",
                  icon: DatabaseIcon,
                  color: "text-[#ffbe19]",
                  bgColor: "bg-[#ffbe19]/10",
                  action: "Connect Now",
                  onClick: handleDialogOpen,
                },
                {
                  step: "2",
                  title: "Explore Insights",
                  description:
                    "Let our AI analyze your data and generate meaningful insights and visualizations.",
                  icon: BarChart3,
                  color: "text-success",
                  bgColor: "bg-success/10",
                  action: "Coming Soon",
                  disabled: true,
                },
                {
                  step: "3",
                  title: "Create Dashboards",
                  description:
                    "Build interactive dashboards and share insights with your team.",
                  icon: LayoutDashboard,
                  color: "text-purple-500",
                  bgColor: "bg-purple-500/10",
                  action: "Coming Soon",
                  disabled: true,
                },
              ].map((item, index) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 + index * 0.2 }}
                  className="relative group"
                >
                  <div className="bg-background/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[#ffbe19]/30 h-full">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-12 h-12 ${item.bgColor} rounded-xl flex items-center justify-center relative`}
                        >
                          <item.icon className={item.color} size={24} />
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#ffbe19] text-black text-xs font-bold rounded-full flex items-center justify-center">
                            {item.step}
                          </div>
                        </div>
                        <h3 className="font-semibold text-lg text-foreground">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {item.description}
                      </p>
                      <Button
                        onClick={item.onClick}
                        variant={item.disabled ? "outline" : "default"}
                        disabled={item.disabled}
                        className={`w-full transition-all duration-300 ${
                          !item.disabled
                            ? "bg-[#ffbe19] hover:bg-[#ffbe19]/90 text-black font-semibold transform hover:scale-105"
                            : ""
                        }`}
                      >
                        {item.action}
                        {!item.disabled && (
                          <ArrowRight className="ml-2" size={16} />
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}{" "}        {/* Connected Data Sources Section */}
        {hasDatabasesConnected && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#ffbe19]/10 rounded-xl flex items-center justify-center">
                  <DatabaseIcon className="text-[#ffbe19]" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Your Data Sources
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Connected databases, APIs, and CSV files ready for analysis
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-success/10 px-3 py-1 rounded-full border border-success/20">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span>{data.length} Active</span>
              </div>
            </div>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {(showAllConnections
                ? data
                : data.slice(0, INITIAL_CONNECTIONS_LIMIT)
              ).map((connection, index) => (
                <motion.div
                  key={connection.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.4 }}
                >
                  <DbCard
                    id={connection.id}
                    name={connection.connection_name}
                    type={connection.type}
                    onUpdate={handleUpdate}
                  />
                </motion.div>
              ))}
            </div>
            {/* Show More/Show Less Button */}
            {data.length > INITIAL_CONNECTIONS_LIMIT && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="flex justify-center mt-8"
              >
                <Button
                  onClick={() => setShowAllConnections(!showAllConnections)}
                  variant="outline"
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl border-2 border-dashed border-border/50 hover:border-[#ffbe19]/50 hover:bg-[#ffbe19]/5 transition-all duration-300 group"
                >
                  <div className="flex items-center space-x-2">
                    {showAllConnections ? (
                      <>
                        <ChevronUp
                          className="text-muted-foreground group-hover:text-[#ffbe19] transition-colors"
                          size={18}
                        />
                        <span className="font-medium group-hover:text-[#ffbe19] transition-colors">
                          Show Less ({data.length - INITIAL_CONNECTIONS_LIMIT}{" "}
                          hidden)
                        </span>
                      </>
                    ) : (
                      <>
                        <ChevronDown
                          className="text-muted-foreground group-hover:text-[#ffbe19] transition-colors"
                          size={18}
                        />
                        <span className="font-medium group-hover:text-[#ffbe19] transition-colors">
                          Show {data.length - INITIAL_CONNECTIONS_LIMIT} More
                        </span>
                      </>
                    )}
                  </div>
                </Button>
              </motion.div>
            )}
          </motion.section>
        )}
        {/* Sample Insights Section */}
        {hasSampleInsights && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: hasDatabasesConnected ? 0.6 : 0.3,
              duration: 0.6,
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#ffbe19]/20 to-primary/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="text-[#ffbe19]" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {!hasDatabasesConnected
                      ? "Sample Insights to Explore"
                      : "Additional Sample Insights"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {!hasDatabasesConnected
                      ? "Try our pre-built samples to see the platform in action"
                      : "Explore more sample data and insights"}
                  </p>
                </div>
              </div>
              {!hasDatabasesConnected && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-[#ffbe19]/10 px-3 py-1 rounded-full border border-[#ffbe19]/20">
                  <Sparkles className="text-[#ffbe19]" size={12} />
                  <span>Try Samples</span>
                </div>
              )}
            </div>{" "}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {sampleConnections.map((sample, index) => (
                <Tooltip key={sample.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index, duration: 0.4 }}
                    >
                      <SampleCard
                        id={sample.id}
                        title={sample.name}
                        description={sample.description}
                      />
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Explore sample insights for {sample.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}{" "}
            </div>
          </motion.section>
        )}
      </TooltipProvider>
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
  setSelectedOption: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  // State for the API connection details
  const [connectionName, setConnectionName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [headers, setHeaders] = useState("");
  const user = useUser();

  // State for multi-step dialog
  const [step, setStep] = useState<"api" | "database">("api");

  // State for database selection
  const [databaseConnections, setDatabaseConnections] = useState<any[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string>("");
  const [tableName, setTableName] = useState<string>("");

  // Fetch available database connections
  useEffect(() => {
    const fetchDatabaseConnections = async () => {
      if (!user.user?.id) return;

      const { data, error } = await supabaseClient
        .from("database_connections")
        .select("*")
        .eq("user_id", user.user.id);

      if (error) {
        console.error("Error fetching database connections:", error.message);
      } else {
        setDatabaseConnections(data || []);
      }
    };

    fetchDatabaseConnections();
  }, [user.user?.id]);

  // Handle initial API details form submit
  const handleApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Move to database selection step
    setStep("database");
  };

  // Handle final API connection submission
  const handleFinalSubmit = async () => {
    try {
      // Save API connection to api_connections table
      const { data: apiData, error: apiError } = await supabaseClient
        .from("api_connections")
        .insert([
          {
            connection_name: connectionName,
            api_url: apiUrl,
            api_key: apiKey || null,
            headers: headers ? JSON.parse(headers) : null,
            user_id: user.user?.id,
            database_connection_id: selectedDatabaseId,
            table_name: tableName,
          },
        ])
        .select();

      if (apiError) {
        throw new Error(apiError.message);
      }

      // Fetch data from API
      const headersObj = headers ? JSON.parse(headers) : {};
      if (apiKey) {
        headersObj["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: headersObj,
      });

      if (!response.ok) {
        throw new Error(`API response error: ${response.status}`);
      }

      // Parse the response data
      const apiResponseData = await response.json();

      // Handle different API response formats - extract array of data
      let dataToInsert = Array.isArray(apiResponseData)
        ? apiResponseData
        : apiResponseData.data ||
          apiResponseData.results ||
          apiResponseData.items || [apiResponseData];

      // Ensure we have array data to work with
      if (!Array.isArray(dataToInsert) || dataToInsert.length === 0) {
        throw new Error("Could not extract array data from API response");
      }

      // Upload the API data to the database using the same endpoint as CSV
      const uploadPayload = {
        connectionId: selectedDatabaseId,
        tableName: tableName,
        data: dataToInsert.slice(0, 1000), // Limit to 1000 rows to prevent overload
      };

      const uploadResponse = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadPayload),
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Failed to create table and insert data: ${errorText}`);
      }

      // Refresh the data list
      const updatedData = await getData();
      setData(updatedData);

      // Close the dialog and reset state
      setConnectionName("");
      setApiUrl("");
      setApiKey("");
      setHeaders("");
      setSelectedDatabaseId("");
      setTableName("");
      onClose();
    } catch (err) {
      console.error("Error adding API connection:", err);
      alert(
        `Error: ${
          err instanceof Error ? err.message : "Unknown error occurred"
        }`
      );
    }
  };

  // Go back to API details form
  const handleBackToApi = () => {
    setStep("api");
  };

  return (
    <div className="space-y-4">
      {step === "api" ? (
        <>
          <h2 className="text-xl font-semibold">Add API Source</h2>
          <form onSubmit={handleApiSubmit}>
            <div className="my-4">
              <Label
                htmlFor="connection-name"
                className="block font-medium my-4"
              >
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
            <div className="my-4">
              <Label htmlFor="api-key" className="block font-medium my-4">
                API Key (Optional)
              </Label>
              <Input
                id="api-key"
                placeholder="Enter API key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="my-4">
              <Label htmlFor="headers" className="block font-medium my-4">
                Headers (Optional - JSON format)
              </Label>
              <Input
                id="headers"
                placeholder='{"Authorization": "Bearer token"}'
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
              />
            </div>
            <div className="my-2">
              <Button
                type="submit"
                className="w-full bg-primary text-black font-semibold"
                disabled={!connectionName || !apiUrl}
              >
                Next: Select Database
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
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold">Select Database & Table</h2>
          <div className="my-4">
            <Label
              htmlFor="database_connection"
              className="block font-medium my-4"
            >
              Database Connection
            </Label>
            <Select
              value={selectedDatabaseId}
              onValueChange={setSelectedDatabaseId}
            >
              <SelectTrigger className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <SelectValue placeholder="Select Database Connection..." />
              </SelectTrigger>
              <SelectContent>
                {databaseConnections.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    {connection.connection_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="my-4">
            <Label htmlFor="table_name" className="block font-medium my-4">
              Table Name
            </Label>
            <Input
              id="table_name"
              placeholder="Enter table name for API data"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              required
            />
          </div>
          <div className="my-2">
            <Button
              type="button"
              onClick={handleFinalSubmit}
              className="w-full bg-primary text-black font-semibold"
              disabled={!selectedDatabaseId || !tableName}
            >
              Connect API
            </Button>
            <Button
              type="button"
              onClick={handleBackToApi}
              className="w-full mt-2 font-semibold"
              variant="outline"
            >
              Back to API Details
            </Button>
          </div>
        </>
      )}
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
  setSelectedOption: React.Dispatch<React.SetStateAction<string | null>>;
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
