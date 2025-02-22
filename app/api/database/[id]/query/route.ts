//app/api/database/[id]/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';
import {
  connectToPostgres,
  executePostgresQuery,
  connectToMySQL,
  executeMySQLQuery,
  connectToMongoDB,
  executeMongoDBQuery,
} from '@/utils/databaseUtils';
import { getDbConnectionDetails, setDbConnectionDetails } from '@/lib/dbCache';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { query } = await req.json();
  const { clause, column } = query;

  if (!id || !query) {
    console.error("Invalid ID or query");
    return NextResponse.json({ error: 'Invalid ID or query' }, { status: 400 });
  }

  // Check the cache for existing connection details
  let connectionDetails = getDbConnectionDetails(id);
  console.log("connectionDetails", connectionDetails);  
  if (!connectionDetails) {
    // Fetch connection details from Supabase if not found in the cache
    const { data, error } = await supabaseClient
      .from('database_connections')
      .select('database_type, host, database_name, username, password')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching database details:", error);
      return NextResponse.json({ error: 'Error fetching database details' }, { status: 500 });
    }

    connectionDetails = data;
    // Store the details in the cache
    setDbConnectionDetails(id, connectionDetails);
  }

  const { database_type, host, database_name, username, password } = connectionDetails;

  // Check if the query contains a LIMIT clause
  const limitRegex = /\blimit\b/i;
  const defaultLimit = " LIMIT 100";


  // Use sqlQuery instead of the original query
  const queryWithLimit = limitRegex.test(query) ? query : `${query}${defaultLimit}`;

  try {
    console.log(`Connecting to ${database_type} database...`);
    let queryResult: any = [];
    switch (database_type) {
      case 'postgres':
        const pgClient = await connectToPostgres({ host, database: database_name, user: username, password });
        console.log("Connected to PostgreSQL database");
        queryResult = await executePostgresQuery(pgClient, queryWithLimit);
        console.log("Query result:", queryResult);
        await pgClient.end();
        break;
      case 'mysql':
        const mysqlConnection = await connectToMySQL({ host, database: database_name, user: username, password });
        console.log("Connected to MySQL database");
        queryResult = await executeMySQLQuery(mysqlConnection, queryWithLimit);
        console.log("Query result:", queryResult);
        await mysqlConnection.end();
        break;
      case 'mongodb':
        const mongoDb = await connectToMongoDB({ host, database: database_name, user: username, password });
        console.log("Connected to MongoDB database");
        queryResult = await executeMongoDBQuery(mongoDb, queryWithLimit);
        console.log("Query result:", queryResult);
        await mongoDb.client.close();
        break;
      default:
        console.error("Unsupported database type:", database_type);
        return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 });
    }

    return NextResponse.json(queryResult, { status: 200 });
  } catch (error) {
    console.error("Error executing the query:", error);
    
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
