// app/api/database/[id]/tables/[tableName]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  connectToPostgres,
  queryPostgresTable,
  connectToMySQL,
  queryMySQLTable,
  connectToMongoDB,
  queryMongoDBCollection,
  getPostgresColumnTypes,
  getMySQLColumnTypes,
  getMongoColumnTypes,
  getPostgresPrimaryKey,
  getMySQLPrimaryKey,
} from "@/utils/databaseUtils";
import { getDbConnectionDetails, setDbConnectionDetails } from "@/lib/dbCache";
import { detectDatetimeColumns } from "@/utils/datetimeUtils";
import { manipulateRawQueryWithGroupBy, buildQuery } from "@/utils/queryUtils";
/**
 * Manipulates a raw SQL query to update the date formatting expression based on the given `dateBy`
 * parameter, and then appends additional group-by columns (if provided) to the GROUP BY clause.
 *
 * The function expects the raw query to contain a date expression in the SELECT clause in the format:
 *   DATE(columnName) AS alias
 *
 * @param rawQuery - The original raw SQL query.
 * @param dateBy - The desired granularity (minute, hour, day, week, month, quarter, year).
 * @param additionalGroupBy - (Optional) A comma-separated string of additional columns to add to the GROUP BY clause.
 * @returns The modified query.
 *
 */

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; tableName: string } }
) {
  const { id, tableName } = params;

  if (!id || !tableName) {
    return NextResponse.json(
      { error: "Invalid ID or tableName" },
      { status: 400 }
    );
  }

  let connectionDetails = getDbConnectionDetails(id);

  if (!connectionDetails) {
    const { data, error } = await supabaseClient
      .from("database_connections")
      .select("database_type, host, database_name, username, password")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error fetching database details" },
        { status: 500 }
      );
    }
    connectionDetails = data;
    setDbConnectionDetails(id, connectionDetails);
  }

  const { database_type, host, database_name, username, password } =
    connectionDetails;
  const queryParams = req.nextUrl.searchParams;
  const fetchSchema = queryParams.get("schema") === "true"; // Check if schema param is present

  let filtersArray = [];
  const filtersParam = queryParams.get("filters");
  if (filtersParam) {
    try {
      filtersArray = JSON.parse(filtersParam);
    } catch (e) {
      console.error("Error parsing filters:", e);
    }
  }

  const queryOptions = {
    select: queryParams.get("select"),
    where: queryParams.get("where"),
    groupBy: queryParams.get("groupBy"),
    orderBy: queryParams.get("orderBy"),
    orderDirection: queryParams.get("orderDirection"),
    limit: queryParams.get("limit")
      ? parseInt(queryParams.get("limit") as string, 10)
      : 80,
    count: queryParams.get("count") === "true",
    aggregate: queryParams.get("aggregate"),
    column: queryParams.get("column"),
    dateView: queryParams.get("dateView"),
    dateBy: queryParams.get("dateBy"),
    filters: filtersArray,
  };
  const rawQueryFlag = queryParams.get("rawQuery") === "true";
  const directQuery = queryParams.get("query");
  let finalQuery = "";
  const additionalGroupBy = queryOptions.groupBy; // For instance, "property_type"

  if (
    rawQueryFlag &&
    directQuery &&
    directQuery.trim().length > 0 &&
    queryOptions.dateBy
  ) {
    finalQuery = manipulateRawQueryWithGroupBy(
      directQuery,
      queryOptions.dateBy,
      additionalGroupBy || undefined
    );
  } else if (rawQueryFlag && directQuery && directQuery.trim().length > 0) {
    finalQuery = directQuery;
  } else if (directQuery && directQuery.trim().length > 0) {
    finalQuery = directQuery;
  } else {
    finalQuery = buildQuery(tableName, queryOptions);
  }

  // Extract table name from query for column type detection and remove backticks.
  const tableNameForTypes =
    finalQuery.match(/FROM\s+([^\s;]+)/i)?.[1].replace(/`/g, "") || tableName;

  try {
    let tableData: {
      columns: string[];
      rows: any[];
      query?: string;
      columnTypes?: any[];
      fullColumnTypes?: any[];
      schema?: any;
      primaryKeys?: string[];
      queryExecutionTime?: number; // Add execution time to the response
    };

    switch (database_type) {
      case "postgres": {
        const pgClient = await connectToPostgres({
          host,
          database: database_name,
          user: username,
          password,
        });
        const pgResult = await queryPostgresTable(pgClient, finalQuery);
        const columnTypes = tableNameForTypes
          ? await getPostgresColumnTypes(pgClient, tableNameForTypes)
          : [];
        const primaryKeys = await getPostgresPrimaryKey(
          pgClient,
          tableNameForTypes
        );
        tableData = {
          columns: Object.keys(pgResult[0] || {}),
          rows: pgResult,
          columnTypes,
          primaryKeys,
        };
        await pgClient.end();
        break;
      }
      // In your GET handler, inside the switch case for "mysql":
      case "mysql": {
        const mysqlConnection = await connectToMySQL({
          host,
          database: database_name,
          user: username,
          password,
        });
        const startTime = Date.now();
        const mysqlResult: any = await queryMySQLTable(
          mysqlConnection,
          finalQuery
        );
        const endTime = Date.now();
        const queryExecutionTime = endTime - startTime;

        // Get column types for the columns returned by the query
        const columnTypes = tableNameForTypes
          ? await getMySQLColumnTypes(mysqlConnection, tableNameForTypes)
          : [];
        // Also fetch the full table schema (all columns and data types)
        const fullColumnTypes = await getMySQLColumnTypes(
          mysqlConnection,
          tableName
        );
        const primaryKeys = await getMySQLPrimaryKey(
          mysqlConnection,
          database_name,
          tableNameForTypes
        );
        tableData = {
          columns: mysqlResult.columns,
          rows: mysqlResult.rows,
          query: finalQuery,
          columnTypes, // Types for the query's selected columns
          fullColumnTypes, // Full table schema data
          primaryKeys,
          queryExecutionTime, // Add execution time to the response
        };
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
        const mongoData = await queryMongoDBCollection(
          mongoDb,
          tableName,
          queryOptions
        );
        const columnTypes =
          mongoData.length > 0 ? await getMongoColumnTypes(mongoData) : [];
        const primaryKeys = ["_id"];
        tableData = {
          columns: Object.keys(mongoData[0] || {}),
          rows: mongoData,
          columnTypes,
          primaryKeys,
        };
        await mongoDb.client.close();
        break;
      }
      default:
        return NextResponse.json(
          { error: "Unsupported database type" },
          { status: 400 }
        );
    }

    if (!tableData.rows || tableData.rows.length === 0) {
      return NextResponse.json(
        { message: "No results found", rows: [] },
        { status: 200 }
      );
    }

    return NextResponse.json(tableData, { status: 200 });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json(
      { error: "Error connecting to the database or querying the table" },
      { status: 500 }
    );
  }
}
