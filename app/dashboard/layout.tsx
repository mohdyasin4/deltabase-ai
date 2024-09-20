"use client";

import { ReactNode, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardSideBar from "./_components/dashboard-side-bar";
import Topbar from "./_components/dashbord-top-nav";
import { useParams } from "next/navigation";
import { Toaster } from "react-hot-toast";

interface MailProps {
  accounts: {
    label: string;
    email: string;
    icon: React.ReactNode;
  }[];
  defaultLayout: number[] | undefined;
  defaultCollapsed?: boolean;
  navCollapsedSize: number;
}

export default function DashboardLayout({
  accounts,
  defaultLayout = [265, 440, 655],
  defaultCollapsed = false,
  navCollapsedSize,
  children,
}: MailProps & { children: ReactNode }) {
  const { id } = useParams();
  // Use effect to disable body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen">
        <div className="w-14 h-full flex flex-col">
          <DashboardSideBar />
        </div>

        <main className="w-full flex-1 overflow-auto ">
        <Topbar />
          <Toaster
            toastOptions={{
              duration: 5000, // Custom duration setting (5 seconds)
              error: {
                className: "border border-white/10 text-sm",
                style: {
                  background: "#232323",
                  color: "#fff",
                },
              },
              success: {
                className: "border border-white/10 text-sm",
                style: {
                  background: "#232323",
                  color: "#fff",
                },
              },
            }}
          />
          {/* <DashboardTopNav id={id}/> */}
          <div className="mt-12">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
}
