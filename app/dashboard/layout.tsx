"use client";

import { ReactNode, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardSideBar from "./_components/dashboard-side-bar";
import { Topbar } from "./_components/dashbord-top-nav";
import { useParams } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { useSidePanelStore } from "@/store/sidePanelStates";
import { useShallow } from "zustand/shallow";
import { BackgroundBeams } from "./_components/background-beam";
import { Spotlight } from "./_components/spotlight-new";
import AISidePanel from "./_components/AISidePanel";

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
}: MailProps & { children: ReactNode | ReactNode[] }) {
  const { id } = useParams();
  const { isAiSidePanelOpen, setIsAiSidePanelOpen } = useSidePanelStore(
    useShallow((state) => ({
      isAiSidePanelOpen: state.isAiSidePanelOpen,
      setIsAiSidePanelOpen: state.setIsAiSidePanelOpen,
    }))
  );

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen">
        <div className="w-14 h-full flex flex-col">
          <DashboardSideBar />
        </div>

        <main className="w-full flex-1 overflow-auto flex flex-col min-h-0">
          <Topbar />
          <Toaster
            toastOptions={{
              duration: 5000,
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
          />          {/* Main content area with sidebar */}
          <div className="mt-12 flex flex-1 min-h-0 overflow-hidden">
            {/* Main Content */}
            <div className={`transition-all duration-800 flex-1 overflow-auto ${isAiSidePanelOpen ? "mr-[540px]" : ""}`}>
              {children}
            </div>
            {/* Side Panel */}
            <AISidePanel />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
