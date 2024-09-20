// app/dashboard/[id]/query-result/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useRouter } from "@/hooks/useRouter";
import { Spinner } from "@/components/ui/spinner";
import { DataTable } from "../../(components)/data-table"; // Adjust the path as needed
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import {
  Modal,
  ModalContent,
  useDisclosure,
  Button,
  ModalFooter,
  ModalBody,
  ModalHeader,
  Input,
} from "@nextui-org/react";
import { Label } from "@/components/ui/label";
import { supabaseClient } from "@/lib/supabaseClient"; // Import Supabase client
import { Save } from "lucide-react";

export default function QueryResultPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [queryResult, setQueryResult] = useState<any[]>([]);
  const [queryColumns, setQueryColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [datasetName, setDatasetName] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");

  useEffect(() => {
    async function fetchQueryResult() {
      const query = searchParams.get("query");

      if (!query) {
        toast.error("No query provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/database/${id}/query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });
        const data = await response.json();

        if (response.ok) {
          setQueryColumns(Object.keys(data[0] || {}));
          setQueryResult(data);
        } else {
          console.error("Error executing query", data.error);
        }
      } catch (error) {
        console.error("Error executing query", error);
      }

      setLoading(false);
    }

    fetchQueryResult();
  }, [id, searchParams]);

  async function saveDataset() {
    try {
      // Save dataset logic here
      const { data, error } = await supabaseClient.from("datasets").insert({
        connection_id: id,
        dataset_name: datasetName,
        dataset_description: datasetDescription,
        sql_query: searchParams.get("query") || "",
      });

      if (error) {
        toast.error("Error saving dataset");
        console.error("Error saving dataset:", error);
      } else {
        toast.success("Dataset saved successfully!");
        onClose(); // Close the modal after saving
        router.push('/dashboard/datasets')
      }
    } catch (error) {
      console.error("Error saving dataset:", error);
      toast.error("Error saving dataset");
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10vh)] w-full gap-2 items-center justify-center">
        <Spinner size={"small"} className="text-primary" />
        Fetching Query Results...
      </div>
    );
  }

  return (
    <main className="flex flex-col gap-2 px-8 py-4 lg:gap-2 min-h-[90vh] w-full">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Query Results</h1>
        <Button variant="faded" onPress={onOpen}>
          <Save className="h-5 w-5 " />
          Save Dataset
        </Button>
      </div>
      <div className="w-full mt-6 rounded-none">
        <DataTable rows={queryResult} />
      </div>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Save Dataset
          </ModalHeader>
          <ModalBody className="h-full">
            <div className="flex flex-col gap-2">
              <Label className="text-sm">Dataset Name</Label>
              <Input
                type="text"
                labelPlacement="inside"
                isRequired
                label="Dataset name"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              />
              <Label className="text-sm">Dataset Description</Label>
              <Input
                type="text"
                labelPlacement="inside"
                label="Dataset description"
                value={datasetDescription}
                onChange={(e) => setDatasetDescription(e.target.value)}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Close
            </Button>
            <Button color="primary" onClick={saveDataset}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </main>
  );
}
