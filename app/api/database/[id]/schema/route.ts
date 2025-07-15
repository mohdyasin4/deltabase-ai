// app/api/database/[id]/schema/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  connectToPostgres,
  connectToMySQL,
  connectToMongoDB,
  listPostgresTables,
  listMySQLTables,
  listMongoDBCollections,
  listPostgresColumns,
  listMySQLColumns,
  listMongoDBColumns,
  getPostgresColumnTypes,
  getMySQLColumnTypes,
} from "@/utils/databaseUtils";
import { getDbConnectionDetails, setDbConnectionDetails } from "@/lib/dbCache";

interface SchemaInfo {
  tables: string[];
  columns: { [tableName: string]: string[] };
  columnTypes: { [tableName: string]: { columnName: string; dataType: string }[] };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    // Get connection details
    let connectionDetails = getDbConnectionDetails(id);

    if (!connectionDetails) {
      const { data, error } = await supabaseClient
        .from("database_connections")
        .select("database_type, host, database_name, username, password")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching database details:", error);
        return NextResponse.json(
          { error: "Error fetching database details" },
          { status: 500 }
        );
      }
      
      connectionDetails = data;
      setDbConnectionDetails(id, connectionDetails);
    }

    const { database_type, host, database_name, username, password } = connectionDetails;
    
    const schema: SchemaInfo = {
      tables: [],
      columns: {},
      columnTypes: {},
    };

    switch (database_type) {
      case "postgres": {
        const pgClient = await connectToPostgres({
          host,
          database: database_name,
          user: username,
          password,
        });

        // Get all tables
        schema.tables = await listPostgresTables(pgClient);

        // Get columns and types for each table
        for (const table of schema.tables) {
          try {
            schema.columns[table] = await listPostgresColumns(pgClient, table);
            schema.columnTypes[table] = await getPostgresColumnTypes(pgClient, table);
          } catch (error) {
            console.warn(`Error getting columns for table ${table}:`, error);
            schema.columns[table] = [];
            schema.columnTypes[table] = [];
          }
        }

        await pgClient.end();
        break;
      }

      case "mysql": {
        const mysqlConnection = await connectToMySQL({
          host,
          database: database_name,
          user: username,
          password,
        });

        // Get all tables
        schema.tables = await listMySQLTables(mysqlConnection);

        // Get columns and types for each table
        for (const table of schema.tables) {
          try {
            schema.columns[table] = await listMySQLColumns(mysqlConnection, table);
            schema.columnTypes[table] = await getMySQLColumnTypes(mysqlConnection, table);
          } catch (error) {
            console.warn(`Error getting columns for table ${table}:`, error);
            schema.columns[table] = [];
            schema.columnTypes[table] = [];
          }
        }

        await mysqlConnection.end();
        break;
      }

      case "mongodb": {
        const { db, client } = await connectToMongoDB({
          host,
          database: database_name,
          user: username,
          password,
        });

        // Get all collections (tables in MongoDB)
        schema.tables = await listMongoDBCollections(db);

        // Get columns for each collection
        for (const collection of schema.tables) {
          try {
            schema.columns[collection] = await listMongoDBColumns(db, collection);
            // MongoDB doesn't have fixed column types, so we'll set basic info
            schema.columnTypes[collection] = schema.columns[collection].map(col => ({
              columnName: col,
              dataType: "mixed" // MongoDB fields can have mixed types
            }));
          } catch (error) {
            console.warn(`Error getting columns for collection ${collection}:`, error);
            schema.columns[collection] = [];
            schema.columnTypes[collection] = [];
          }
        }

        await client.close();
        break;
      }

      default:
        return NextResponse.json(
          { error: "Unsupported database type" },
          { status: 400 }
        );
    }

    // Return schema information
    return NextResponse.json(schema, { status: 200 });
  } catch (error) {
    console.error("Error fetching database schema:", error);
    return NextResponse.json(
      { error: "Error connecting to the database or fetching schema" },
      { status: 500 }
    );
  }
}
