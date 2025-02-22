"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Import router for navigation
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabaseClient } from '@/lib/supabaseClient'; // Import Supabase client
import { useUser } from '@clerk/nextjs'; // Use this to access the current user
import toast from 'react-hot-toast';

interface CreateDashboardDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function CreateDashboardDialog({ isOpen, onOpenChange }: CreateDashboardDialogProps) {
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const router = useRouter(); // Initialize the router
  const { user } = useUser(); // Get the current user

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure the user is authenticated
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    try {
      // Insert the new dashboard into Supabase
      const { data, error } = await supabaseClient
        .from('dashboards')
        .insert([
          {
            name: dashboardName,
            description: dashboardDescription,
            user_id: user.id, // Associate the dashboard with the current user
          },
        ])
        .select();

      if (error) {
        toast.error("Error creating dashboard");
        console.error("Error inserting data into Supabase", error);
        return;
      }

      // Close the dialog
      onOpenChange(false);

      // Redirect the user to the newly created dashboard
      if (data && data.length > 0) {
        const newDashboard = data[0];
        toast.success("Dashboard created successfully");
        router.push(`/dashboard/my-dashboards/${newDashboard.id}`);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New Dashboard</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className='flex flex-col gap-2'>
            <Label htmlFor="dashboard-name" className='text-[#696969]'>Dashboard Name</Label>
            <Input
              id="dashboard-name"
              placeholder="Enter dashboard name"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              required
            />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor="dashboard-description" className='text-[#696969]'>Description (optional)</Label>
            <Textarea
              id="dashboard-description"
              className='min-h-4 max-h-24'
              placeholder="Enter a brief description"
              value={dashboardDescription}
              onChange={(e) => setDashboardDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Create</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
