"use client";
import React from "react";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";

interface SampleCardProps {
  id: number;
  title: string;
  description: string;
}

export default function SampleCard({ id, title, description }: SampleCardProps) {
  const router = useRouter();

  const handleClick = () => {
    // Navigate to the dynamic sample route using the sample ID
    router.push(`/dashboard/my-dashboards/${id}?name=${title}`);
  };

  return (
    <Card
      className="flex items-center p-6 shadow-xl gap-4 cursor-pointer hover:bg-white/10 transition-all ease-linear duration-100 hover:scale-105"
      onClick={handleClick}
    >
      <Icon icon="fa6-solid:bolt-lightning" height={24} width={24} style={{ color: '#ffcc19' }} />
      <div className="w-full">
        <h2 className="text-xl font-semibold w-full">{title}</h2>
        <p className="text-sm text-muted-foreground w-full">{description}</p>
      </div>
    </Card>
  );
}
