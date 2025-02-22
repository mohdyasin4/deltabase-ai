"use client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useState } from "react";
import { HeroUIProvider } from "@heroui/react";

export default function Provider({ children }: { children: ReactNode }) {

  return (
    <HeroUIProvider>
        {children}    
      </HeroUIProvider>
  );
}
