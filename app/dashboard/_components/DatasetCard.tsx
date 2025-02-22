"use client"
import React from 'react'
import { Card } from '@/components/ui/card'
import { useRouter } from '@/hooks/useRouter'
import { Database, Edit, EllipsisVertical, Folder, Trash } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react'
import toast from 'react-hot-toast'
import supabaseClient from '@/lib/supabaseClient'

interface DatasetCardProps {
  dataset_id: string;
  dataset_name: string;
  dataset_description: string;
  connection_id?: string;
  api_id?: string;
  fetchData: () => void;
  csv_id?: string;
}

export default function DatasetCard({connection_id, dataset_id, dataset_name, dataset_description, api_id, fetchData, csv_id} : DatasetCardProps) {
  const router = useRouter();

  const handleClick = () => { 
    router.push(`datasets/${connection_id || api_id || csv_id}/${dataset_id}/${decodeURIComponent(dataset_name)}`);
  }

  const removaDataset = async () => {
    // remove dataset
    const { error } = await supabaseClient
      .from('datasets')
      .delete()
      .eq('id', dataset_id);

      if(error) {
        console.error('Error removing dataset:', error.message);
        alert('Failed to remove the dataset. Please try again.');
      } else {
        toast.success('Dataset removed successfully.');
        console.log(`Dataset with ID: ${dataset_id} removed.`);
        fetchData()
      }
  }

  return (
    <Card className='flex items-center p-6 w-full gap-4 cursor-pointer hover:bg-white/10 transition-all ease-linear duration-100 hover:scale-105' onClick={handleClick}>
      <Folder size={40} />
      <div className='w-full '>
        <h2 className='text-lg font-semibold'>{dataset_name}</h2>
      </div>
      
      <Dropdown placement="bottom-end">
        <Button variant="ghost" size="icon">
          <DropdownTrigger>
            <EllipsisVertical className="hover:text-white" />
          </DropdownTrigger>
        </Button>
        <DropdownMenu>
          <DropdownItem
            color="danger"
            onPress={removaDataset}
            key="remove"
            startContent={<Trash size={16} />}
          >
            Disconnect
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </Card>
  )
}
