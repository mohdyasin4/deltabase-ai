//api/database/[id]/tables/[tableName]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/supabaseClient";
import {
  connectToPostgres,
  queryPostgresTable,
  connectToMySQL,
  queryMySQLTable,
  connectToMongoDB,
  queryMongoDBCollection,
} from "@/utils/databaseUtils";
import { getDbConnectionDetails, setDbConnectionDetails } from "@/lib/dbCache";

// Utility function for formatting row data
function formatRowData(row: any) {
  const formattedRow = { ...row };
  for (const key in formattedRow) {
    if (formattedRow.hasOwnProperty(key)) {
      const value = formattedRow[key];
      // Ensure the value is a valid date string and not a numeric value
      if (
        typeof value === "string" &&
        isNaN(Number(value)) &&
        Date.parse(value)
      ) {
        const date = new Date(value);
        formattedRow[key] = new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        }).format(date);
      }
    }
  }
  return formattedRow;
}

function buildQuery(tableName: string, params: { [key: string]: any }) {
  const {
    aggregate,
    column,
    where,
    orderBy,
    orderDirection,
    limit,
    filters, // New: an array of filters from the client
  } = params;

  // Start building the query
  let query = `SELECT `;

  // Add aggregate function if provided
  if (aggregate && column) {
    query += `${aggregate.toUpperCase()}(${column}) AS ${column}_${aggregate}`;
  } else if (aggregate && !column) {
    query += `${aggregate.toUpperCase()}(*) AS ${aggregate}_of_rows`;
  } else {
    query += "*";
  }

  // Specify the table
  query += ` FROM ${tableName}`;

  // If filters are provided from the client, build the WHERE clause from them.
  if (filters && Array.isArray(filters) && filters.length > 0) {
    // Build conditions from each filter
    const conditions = filters.reduce((acc: string[], filter: any, idx: number) => {
      // Skip any filter without a valid column
      if (!filter.column) return acc;
      // Escape single quotes in the value
      const safeValue = String(filter.value).replace(/'/g, "''");
      const condition = `${filter.column} ${filter.operation} '${safeValue}'`;
      // If not the first condition, prepend the logical operator (defaulting to AND if not specified)
      if (idx > 0) {
        acc.push(`${filter.operator || "AND"} ${condition}`);
      } else {
        acc.push(condition);
      }
      return acc;
    }, []);
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" ")}`;
    }
  } else if (where) {
    // If filters are not provided but a raw where clause is, use that.
    query += ` WHERE ${where}`;
  }

  // Add GROUP BY clause if aggregate count is provided along with a column
  if (aggregate === "count" && column) {
    query += ` GROUP BY ${column}`;
  }

  // Add ORDER BY clause if provided
  if (orderBy) {
    query += ` ORDER BY ${orderBy} ${orderDirection || "ASC"}`;
  }

  // Add LIMIT clause if provided
  if (limit) {
    query += ` LIMIT ${limit}`;
  }

  return query.trim();
}

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

  // Check cache for existing connection details
  let connectionDetails = getDbConnectionDetails(id);

  if (!connectionDetails) {
    // Fetch connection details from Supabase if not found in the cache
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
    setDbConnectionDetails(id, connectionDetails); // Cache the details
  }

  const { database_type, host, database_name, username, password } =
    connectionDetails;
  const queryParams = req.nextUrl.searchParams; // Extract query params from the request

  // Parse additional filters from the request (assumes filters are passed as a JSON string)
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
      : 100,
    count: queryParams.get("count") === "true",
    aggregate: queryParams.get("aggregate"), // Extract aggregate function
    column: queryParams.get("column"), // Extract column for aggregation
    filters: filtersArray, // <-- This is where filters are added
  };

  // If a direct query is provided via query parameters, use it.
  const directQuery = queryParams.get("query");
  const finalQuery =
    directQuery && directQuery.trim().length > 0
      ? directQuery
      : buildQuery(tableName, queryOptions);

  try {
    let tableData: { columns: string[]; rows: any[]; query?: string };

    switch (database_type) {
      case "postgres":
        {
          const pgClient = await connectToPostgres({
            host,
            database: database_name,
            user: username,
            password,
          });
          // Use finalQuery (either the direct query or the built one)
          const pgResult = await queryPostgresTable(pgClient, finalQuery);
          tableData = {
            columns: Object.keys(pgResult[0] || {}),
            rows: pgResult.map(formatRowData),
          };
          await pgClient.end();
        }
        break;

      case "mysql":
        {
          const mysqlConnection = await connectToMySQL({
            host,
            database: database_name,
            user: username,
            password,
          });
          // Use finalQuery (either the direct query or the built one)
          const mysqlResult: any = await queryMySQLTable(
            mysqlConnection,
            finalQuery
          );
          tableData = {
            columns: mysqlResult.columns,
            rows: mysqlResult.rows.map(formatRowData),
            query: finalQuery,
          };
          await mysqlConnection.end();
        }
        break;

      case "mongodb":
        {
          const mongoDb = await connectToMongoDB({
            host,
            database: database_name,
            user: username,
            password,
          });
          // For MongoDB, we continue to use queryOptions since direct SQL queries are not applicable.
          const mongoData = await queryMongoDBCollection(
            mongoDb,
            tableName,
            queryOptions
          );
          tableData = {
            columns: Object.keys(mongoData[0] || {}),
            rows: mongoData.map(formatRowData),
          };
          await mongoDb.client.close();
        }
        break;

      default:
        return NextResponse.json(
          { error: "Unsupported database type" },
          { status: 400 }
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
