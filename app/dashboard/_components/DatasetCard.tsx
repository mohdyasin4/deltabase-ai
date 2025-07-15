"use client"
import React from 'react'
import { Card } from '@/components/ui/card'
import { useRouter } from '@/hooks/useRouter'
import { Layers, Edit, EllipsisVertical, Folder, Trash, Globe, FileText, Calendar, ExternalLink, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from '@heroui/react'
import toast from 'react-hot-toast'
import supabaseClient from '@/lib/supabaseClient'
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DatasetCardProps {
  dataset_id: string;
  dataset_name: string;
  dataset_description: string;
  connection_id?: string;
  api_id?: string;
  fetchData: () => void;
  csv_id?: string;
  created_at?: string;
  type?: "api" | "database" | "csv";
  viewMode?: "grid" | "list";
}

export default function DatasetCard({
  connection_id,
  dataset_id,
  dataset_name,
  dataset_description,
  api_id,
  fetchData,
  csv_id,
  created_at,
  type,
  viewMode = "grid",
}: DatasetCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`datasets/${connection_id || api_id || csv_id}/${dataset_id}/${decodeURIComponent(dataset_name)}`);
  };
  const handleEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Navigate to edit page or open edit dialog (customize as needed)
    router.push(`/dashboard/datasets/${connection_id || api_id || csv_id}/${dataset_id}/${encodeURIComponent(dataset_name)}?edit=true`);
  };

  const removaDataset = async () => {
    // remove dataset
    const { error } = await supabaseClient
      .from('datasets')
      .delete()
      .eq('id', dataset_id);

    if (error) {
      console.error('Error removing dataset:', error.message);
      alert('Failed to remove the dataset. Please try again.');
    } else {
      toast.success('Dataset removed successfully.');
      fetchData();
    }  };  // Clean type configuration to match DbCard style
  const getTypeConfig = () => {
    switch (type) {
      case "api":
        return {
          label: "API",
          icon: Globe,
          bgColor: "bg-green-50 dark:bg-green-950/30 group-hover:bg-green-100 dark:group-hover:bg-green-900/50",
          iconColor: "text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300"
        };
      case "csv":
        return {
          label: "CSV",
          icon: FileText,
          bgColor: "bg-orange-50 dark:bg-orange-950/30 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50",
          iconColor: "text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300"
        };
      default:
        return {
          label: "Dataset",
          icon: Layers,
          bgColor: "bg-purple-50 dark:bg-purple-950/30 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50",
          iconColor: "text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300"
        };
    }
  };

  const typeConfig = getTypeConfig();
  const TypeIcon = typeConfig.icon;  if (viewMode === "list") {
    return (
      <Card
        className="relative flex items-center gap-3 p-3 w-full cursor-pointer hover:bg-accent/20 border border-border/50 hover:border-border/80 transition-all duration-300 group rounded-xl hover:scale-[1.02] hover:-translate-y-1"
        onClick={handleClick}
        tabIndex={0}
        aria-label={`View dataset ${dataset_name}`}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className={`relative flex-shrink-0 p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 ${typeConfig.bgColor}`}>
          {/* Subtle glow effect */}
          <div className={`absolute inset-0 rounded-xl blur-sm opacity-0 group-hover:opacity-30 transition-opacity duration-300 ${
            type === "api" ? "bg-green-400" : type === "csv" ? "bg-orange-400" : "bg-purple-400"
          }`} />
          <TypeIcon size={20} className={`relative ${typeConfig.iconColor} transition-colors`} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold truncate leading-tight text-foreground group-hover:text-foreground/90 transition-colors">{dataset_name}</h3>
        </div>

        {/* Actions on hover */}
        <div className="hidden group-hover:flex items-center gap-2 relative flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary opacity-60 hover:opacity-100 transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
            aria-label="Edit dataset"
          >
            <Edit size={16} />
          </Button>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 hover:bg-accent/80 opacity-60 hover:opacity-100 transition-all duration-200"
                aria-label="More actions"
                onClick={(e) => e.stopPropagation()}
              >
                <EllipsisVertical size={16} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem
                color="danger"
                onPress={removaDataset}
                key="remove"
                startContent={<Trash size={16} />}
              >
                <span className="font-medium">Disconnect</span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </Card>
    );
  }  return (
    <Card
      className="relative flex flex-col w-full group p-3 shadow-sm hover:shadow-xl border border-border/50 hover:border-border/80 gap-3 cursor-pointer bg-card hover:bg-accent/20 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 overflow-hidden rounded-xl"
      onClick={handleClick}
      tabIndex={0}
      aria-label={`View dataset ${dataset_name}`}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Header: Icon, Title and Dropdown */}
      <div className="relative flex items-start justify-between w-full gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`relative flex-shrink-0 p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 ${typeConfig.bgColor}`}>
            {/* Subtle glow effect */}
            <div className={`absolute inset-0 rounded-xl blur-sm opacity-0 group-hover:opacity-30 transition-opacity duration-300 ${
              type === "api" ? "bg-green-400" : type === "csv" ? "bg-orange-400" : "bg-purple-400"
            }`} />
            <TypeIcon size={20} className={`relative ${typeConfig.iconColor} transition-colors`} />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <h2 className="text-base font-semibold truncate leading-tight text-foreground group-hover:text-foreground/90 transition-colors" title={dataset_name}>
              {dataset_name}
            </h2>
          </div>
        </div>
        
        {/* Dropdown */}
        <div className="hidden group-hover:block relative flex-shrink-0">
          <Dropdown placement="bottom-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg opacity-60 hover:opacity-100 group-hover:opacity-100 hover:bg-accent/80 transition-all duration-200 hover:scale-110"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownTrigger>
                <EllipsisVertical className="h-4 w-4" />
              </DropdownTrigger>
            </Button>
            <DropdownMenu>            
              <DropdownItem
                key="edit"
                onPress={() => handleEdit()}
                startContent={<Edit size={16} />}
              >
                <span className="font-medium">Edit Dataset</span>
              </DropdownItem>
              <DropdownItem
                color="danger"
                onPress={removaDataset}
                key="remove"
                startContent={<Trash size={16} />}
              >
                <span className="font-medium">Disconnect</span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>        
        </div>
      </div>
    </Card>
  );
}
