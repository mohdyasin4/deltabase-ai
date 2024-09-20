// app/dashboard/[id]/tables/[tableName]/page.tsx
"use client"
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/hooks/useRouter';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/app/dashboard/_components/data-table';

export default function TablePage() {
  const router = useRouter();
  const { id, tableName } = useParams();
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTableData() {
      if (!id || !tableName) return;

      try {
        const response = await fetch(`/api/database/${id}/tables/${tableName}`);
        const data = await response.json();

        if (response.ok) {
          const filteredColumns = data.columns.filter((column: string) =>
            data.rows.some((row: any) => row[column] !== null && row[column] !== undefined)
          );

          setColumns(filteredColumns);
          setRows(data.rows);
        } else {
          console.error('Error fetching table data', data.error);
        }
      } catch (error) {
        console.error('Error fetching table data', error);
      }

      setLoading(false);
    }

    fetchTableData();
  }, [id, tableName]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10vh)] w-full items-center justify-center">
        <Spinner size={'small'} className="mr-2 text-primary" />
        Fetching Table Data...
      </div>
    );
  }

  return (
    <main className="flex flex-col gap-2 px-8 py-4 lg:gap-2 min-h-[90vh] w-full">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          Table: &nbsp;{Array.isArray(tableName) 
            ? tableName[0].charAt(0).toUpperCase() + tableName[0].slice(1).replace(/_/g," ")
            : tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g," ")}
        </h1>
        <Button onClick={() => router.back()}>Back</Button>
      </div>
      <div className="w-full mt-6 rounded-none">
        <DataTable rows={rows} />
      </div>
    </main>
  );
}
