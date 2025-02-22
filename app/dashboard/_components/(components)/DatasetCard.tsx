"use client"
import React from 'react'
import { Card } from '@/components/ui/card'
import { useRouter } from '@/hooks/useRouter'
import { Database } from 'lucide-react'

interface DatasetCardProps {
  connection_id: string
  dataset_name: string
}

export default function DatasetCard({connection_id, dataset_name} : DatasetCardProps) {
  const router = useRouter();

  const handleClick = () => { 
    router.push(`datasets/${connection_id}/${dataset_name}`)
  }

  return (
    <Card className='flex items-center p-6 gap-4 cursor-pointer hover:bg-white/10 transition-all ease-linear duration-100 hover:scale-105' onClick={handleClick}>
        <Database size={32} />
        <h2 className="text-xl font-semibold w-full">{dataset_name}</h2>
    </Card>
  )
}
