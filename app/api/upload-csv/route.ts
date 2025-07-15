// app/api/upload-csv/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  connectToPostgres,
  connectToMySQL,
  connectToMongoDB,
} from "@/utils/databaseUtils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { connectionId, tableName, data } = body;

    if (!connectionId || !tableName || !data) {
      return NextResponse.json(
        { error: "Missing required fields: connectionId, tableName, or data." },
        { status: 400 }
      );
    }

    // Fetch connection details from Supabase
    const { data: connectionDetails, error } = await supabaseClient
      .from("database_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connectionDetails) {
      return NextResponse.json(
        { error: "Invalid database connection provided." },
        { status: 400 }
      );
    }

    const { database_type: type, host, database_name: database, username: user, password } = connectionDetails;
    
    if (type === "postgres") {
      const client = await connectToPostgres({ host, database, user, password });
      const firstRow = data[0];
      const columns = Object.keys(firstRow)
        .map((key) => `"${key}" TEXT`)
        .join(", ");
      const createTableQuery = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columns});`;
      await client.query(createTableQuery);
      for (const row of data) {
        const keys = Object.keys(row);
        const values = keys.map((key) => row[key]);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
        const insertQuery = `INSERT INTO "${tableName}" (${keys
          .map((k) => `"${k}"`)
          .join(", ")}) VALUES (${placeholders});`;
        await client.query(insertQuery, values);
      }
      await client.end();
    } else if (type === "mysql") {
      const connection = await connectToMySQL({ host, database, user, password });
      const firstRow = data[0];
      const columns = Object.keys(firstRow)
        .map((key) => `\`${key}\` TEXT`)
        .join(", ");
      const createTableQuery = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columns});`;
      await connection.execute(createTableQuery);
      for (const row of data) {
        const keys = Object.keys(row);
        const values = keys.map((key) => row[key]);
        const placeholders = keys.map(() => "?").join(", ");
        const insertQuery = `INSERT INTO \`${tableName}\` (${keys
          .map((k) => `\`${k}\``)
          .join(", ")}) VALUES (${placeholders});`;
        await connection.execute(insertQuery, values);
      }
      await connection.end();
    } else if (type === "mongodb") {
      const { db, client } = await connectToMongoDB({ host, database, user, password });
      const collection = db.collection(tableName);
      await collection.insertMany(data);
      await client.close();
    } else {
      return NextResponse.json(
        { error: "Unsupported database type." },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: "CSV data uploaded successfully." }, { status: 200 });
  } catch (err: any) {
    console.error("Error uploading CSV data:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
