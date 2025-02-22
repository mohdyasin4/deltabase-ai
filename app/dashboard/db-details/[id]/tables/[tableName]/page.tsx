// app/dashboard/[id]/tables/[tableName]/page.tsx
"use client";

import { useParams } from "next/navigation";
import ResultPage from "@/app/dashboard/_components/ResultPage";

export default function TablePage() {
  const { id, tableName } = useParams();

  if (!id || !tableName) {
    return <div>Invalid table details</div>;
  }

  return (
    <ResultPage
      connection_id={Array.isArray(id) ? id[0] : id}
      tableName={Array.isArray(tableName) ? tableName[0] : tableName}
      sourceType="database"
      type="table"
    />
  );
}
