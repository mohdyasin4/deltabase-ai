"use client";
import React from 'react';
import { Card } from '@/components/ui/card';
import { useRouter } from '@/hooks/useRouter';
import { Database } from 'lucide-react';

interface DbCardProps {
  id: string;
  name: string;
}

export default function DbCard({ id, name }: DbCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/dashboard/${id}`);
  };

  return (
    <Card
      className="flex items-center p-6 shadow-xl gap-4 cursor-pointer hover:bg-white/10 transition-all ease-linear duration-100 hover:scale-105"
      onClick={handleClick}
    >
      <Database size={32} />
      <h2 className="text-xl font-semibold w-full">{name}</h2>
    </Card>
  );
}
