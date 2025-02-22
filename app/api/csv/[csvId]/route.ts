import { supabaseClient } from "@/lib/supabaseClient";
import { useUser } from  "@clerk/nextjs";

import { NextResponse } from "next/server";
import Papa from "papaparse";

export async function GET(
  request: Request,
  { params }: { params: {  userId: string, csvId: string} }
) {
  try {
    const { csvId, userId } = params
    // Fetch CSV connection details
    const { data: csvConnection, error: csvError } = await supabaseClient
      .from("csvData")
      .select("*")
      .eq("id", csvId)
      .eq("user_id", userId)
      .single();

    if (csvError) {
      return NextResponse.json(
        { error: "Error fetching CSV connection details" },
        { status: 500 }
      );
    }

    const { bucket_name, file_name, selectedFields } = csvConnection;

    if (!bucket_name || !file_name || !selectedFields) {
      return NextResponse.json(
        { error: "Missing required CSV details" },
        { status: 400 }
      );
    }

    // Fetch the CSV file from Supabase storage
    const { data: file, error: fileError } = await supabaseClient
      .storage
      .from(bucket_name)
      .download(file_name);

    if (fileError) {
      return NextResponse.json(
        { error: "Error downloading CSV file" },
        { status: 500 }
      );
    }

    // Read the file content as text
    const csvText = await file.text();

    // Parse the CSV file
    const parsedData = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsedData.errors.length > 0) {
      return NextResponse.json(
        { error: `Error parsing CSV file: ${parsedData.errors[0].message}` },
        { status: 500 }
      );
    }

    const allRows = parsedData.data;

    // Filter rows based on selected fields
    const filteredRows = allRows.map((row) => {
      const filteredRow: Record<string, any> = {};
      selectedFields.forEach((field: string) => {
        if (row && typeof row === "object" && field in row) {
          filteredRow[field] = row[field];
        }
      });
      return filteredRow;
    });

    // Fetch visualization data from the datasets table
    const { data: datasetDetails, error: datasetError } = await supabase
      .from("datasets")
      .select(
        "selectedField, x_axis, y_axis, is_stacked, visualization_type, sql_query"
      )
      .eq("csv_id", csvId)
      .single();

    // Prepare the response
    const response = {
      columns: selectedFields,
      rows: filteredRows,
      visualization: datasetError || !datasetDetails
        ? {
            x_axis: null,
            y_axis: [],
            selectedField: null,
            visualization_type: "table",
            is_stacked: false,
          }
        : {
            x_axis: datasetDetails.x_axis,
            y_axis: datasetDetails.y_axis?.split(",").map((y: string) => y.trim()) || [],
            selectedField: datasetDetails.selectedField,
            visualization_type: datasetDetails.visualization_type || "table",
            is_stacked: datasetDetails.is_stacked || false,
          },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in CSV API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 