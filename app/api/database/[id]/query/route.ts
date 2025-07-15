// app/api/database/[id]/query/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  connectToPostgres,
  executePostgresQuery,
  connectToMySQL,
  executeMySQLQuery,
  connectToMongoDB,
  executeMongoDBQuery,
  getPostgresColumnTypes,
  getMySQLColumnTypes,
  getMongoColumnTypes,
  getPostgresPrimaryKey,
  getMySQLPrimaryKey,
} from "@/utils/databaseUtils";
import { getDbConnectionDetails, setDbConnectionDetails } from "@/lib/dbCache";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { query } = await req.json();
    if (!id || !query) {
      return NextResponse.json(
        { error: "Database ID and query are required." },
        { status: 400 }
      );
    }

    // Clean the query: trim whitespace and remove any trailing semicolon
    const cleanedQuery = query.trim().replace(/;$/, "");

    // Check cache for connection details
    let connectionDetails = getDbConnectionDetails(id);
    if (!connectionDetails) {
      const { data, error } = await supabaseClient
        .from("database_connections")
        .select("database_type, host, database_name, username, password")
        .eq("id", id)
        .single();

      if (error) throw new Error("Error fetching database details.");

      connectionDetails = data;
      setDbConnectionDetails(id, connectionDetails);
    }

    const { database_type, host, database_name, username, password } =
      connectionDetails;

    // Ensure the query has a LIMIT (max 2000 rows for safety)
    const limitRegex = /\blimit\s+(\d+)/i;
    const hasLimit = limitRegex.test(cleanedQuery);
    const enforcedLimit = " LIMIT 2000";    const queryWithLimit = hasLimit
      ? cleanedQuery.replace(limitRegex, (match: string, p1: string) =>
          parseInt(p1) > 2000 ? enforcedLimit : match
        )
      : `${cleanedQuery}${enforcedLimit}`;// Extract table name from query (for column types & primary key detection)
    // Use a more robust extraction that handles complex queries
    let tableName = "";
    try {
      // First try simple pattern for basic queries
      const simpleTableMatch = cleanedQuery.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
      if (simpleTableMatch) {
        tableName = simpleTableMatch[1].replace(/[`"]/g, "").trim();
      } else {
        // For complex queries, try to find the main table after the first FROM
        const fromIndex = cleanedQuery.toLowerCase().indexOf('from');
        if (fromIndex !== -1) {
          const afterFrom = cleanedQuery.substring(fromIndex + 4).trim();
          // Look for the first word that looks like a table name (alphanumeric + underscore)
          const complexTableMatch = afterFrom.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)/);
          if (complexTableMatch) {
            tableName = complexTableMatch[2].replace(/[`"]/g, "").trim();
          }
        }
      }
    } catch (parseError) {
      console.warn("Could not parse table name from query:", parseError);
      // Continue without table name - query will still execute
      tableName = "";
    }

    let queryResult: any = [];
    let columnTypes: any[] = [];
    let primaryKeys: string[] = [];

    console.log(`Executing query on ${database_type}...`);
    //Start timer
    const startTime = Date.now();

    switch (database_type) {      case "postgres": {
        const pgClient = await connectToPostgres({
          host,
          database: database_name,
          user: username,
          password,
        });
        queryResult = await executePostgresQuery(pgClient, queryWithLimit);

        if (tableName) {
          try {
            columnTypes = await getPostgresColumnTypes(pgClient, tableName);
            primaryKeys = await getPostgresPrimaryKey(pgClient, tableName);
          } catch (metadataError) {
            console.warn(`Could not fetch metadata for table "${tableName}":`, metadataError);
            // Continue without metadata - query result is still valid
            columnTypes = [];
            primaryKeys = [];
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
        queryResult = await executeMySQLQuery(mysqlConnection, queryWithLimit);

        if (tableName) {
          try {
            columnTypes = await getMySQLColumnTypes(mysqlConnection, tableName);
            primaryKeys = await getMySQLPrimaryKey(mysqlConnection, database_name, tableName);
          } catch (metadataError) {
            console.warn(`Could not fetch metadata for table "${tableName}":`, metadataError);
            // Continue without metadata - query result is still valid
            columnTypes = [];
            primaryKeys = [];
          }
        }

        await mysqlConnection.end();
        break;
      }

      case "mongodb": {
        const mongoDb = await connectToMongoDB({
          host,
          database: database_name,
          user: username,
          password,
        });
        queryResult = await executeMongoDBQuery(mongoDb, query);
        columnTypes = getMongoColumnTypes(queryResult);
        await mongoDb.client.close();
        break;
      }

      default:
        return NextResponse.json(
          { error: "Unsupported database type." },
          { status: 400 }
        );
    }

    
    // End timing
    const endTime = Date.now();
    const queryExecutionTime = endTime - startTime;

    return NextResponse.json(
      {
        queryResult,
        columnTypes,
        primaryKeys,
        query: queryWithLimit,
        queryExecutionTime
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error executing query:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
