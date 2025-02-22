import React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const Loading = () => (
  <div
    className={
      "fixed inset-0 bg-opacity-50 bg-white dark:bg-black/20 flex items-center justify-center z-50"
    }
  >
    <Spinner className="text-black mr-2 dark:text-primary"/>
    Loading..
  </div>
);

export default Loading;
