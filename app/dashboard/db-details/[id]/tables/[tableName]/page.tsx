"use client";

import { useParams } from "next/navigation";
import ResultPage from "@/app/dashboard/_components/ResultPage";
import { useStore } from "@/store/useStatesStore";
import { useShallow } from "zustand/shallow";
import { useEffect } from "react";

export default function TablePage() {
  const { id, tableName } = useParams();
  const { setConnectionId, setTableName } = useStore(useShallow((state) => ({
    setConnectionId: state.setConnectionId,
    setTableName: state.setTableName,
  })));

  useEffect(() => {
    console.log("ConnectionIDD:", Array.isArray(id) ? id[0] : id);
    if (id) setConnectionId(Array.isArray(id) ? id[0] : id);
    if (tableName) setTableName(Array.isArray(tableName) ? tableName[0] : tableName);
  }, [id, tableName, setConnectionId, setTableName]); // ✅ Dependencies added

  if (!id || !tableName) {
    return <div>Invalid table details</div>;
  }

  return (
    <ResultPage sourceType="database" type="table" />
  );
}
