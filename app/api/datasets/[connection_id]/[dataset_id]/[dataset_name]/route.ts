// app/api/database/[connection_id]/datasets/[dataset_name]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';
import { 
  connectToPostgres, 
  connectToMySQL, 
  connectToMongoDB, 
  executeDatasetQuery 
} from '@/utils/databaseUtils';
import { getDbConnectionDetails, setDbConnectionDetails } from '@/lib/dbCache';
import { manipulateRawQueryWithGroupBy } from '@/utils/queryUtils';

export async function GET(
  req: NextRequest, 
  { params }: { params: { connection_id: string; dataset_id: string; dataset_name: string } }
) {
  const { connection_id, dataset_id, dataset_name } = params;
  console.log('Connection ID:', connection_id, 'Dataset Name:', dataset_name);

  if (!connection_id || !dataset_id) {
    console.error('Invalid connection ID or dataset name');
    return NextResponse.json({ error: 'Invalid ID or dataset name' }, { status: 400 });
  }

  // Fetch dataset details from Supabase
  const { data: dataset, error: datasetError } = await supabaseClient
    .from('datasets')
    .select('id, dataset_name, connection_id, sql_query, selectedDateBy, selectedAggregate, selectedGroupByValues')
    .eq('connection_id', connection_id)
    .eq('id', dataset_id)
    .single();

  if (datasetError || !dataset) {
    console.error('Error fetching dataset:', datasetError?.message || 'Dataset not found');
    return NextResponse.json({ error: 'Error fetching dataset' }, { status: 500 });
  }

  console.log('Fetched dataset:', dataset);

  // Extract query parameters
  const queryParam = req.nextUrl.searchParams.get("query");
  const dateByParam = req.nextUrl.searchParams.get("dateBy");

  // Use dateByParam if provided; otherwise, use selectedDateBy from DB
  const selectedDateBy = dateByParam || dataset.selectedDateBy || null;
  
  // Determine final query (default to dataset SQL query)
  let finalQuery = queryParam || dataset.sql_query;
  console.log("Original Query:", finalQuery);

  // Apply query transformation **only if dateBy or selectedDateBy exists**
  if (selectedDateBy) {
    try {
      finalQuery = manipulateRawQueryWithGroupBy(finalQuery, selectedDateBy);
      console.log("Updated Query After Manipulation:", finalQuery);
    } catch (error) {
      console.error("Error manipulating query:", error);
      return NextResponse.json({ error: 'Error processing query transformation' }, { status: 500 });
    }
  }

  // Fetch database connection details (from cache or Supabase)
  let dbConnection = getDbConnectionDetails(connection_id);
  if (!dbConnection) {
    const { data: fetchedDbConnection, error: dbConnectionError } = await supabaseClient
      .from('database_connections')
      .select('database_type, host, database_name, username, password')
      .eq('id', connection_id)
      .single();

    if (dbConnectionError || !fetchedDbConnection) {
      console.error('Error fetching database connection:', dbConnectionError?.message || 'Connection not found');
      return NextResponse.json({ error: 'Error fetching database details' }, { status: 500 });
    }

    dbConnection = fetchedDbConnection;
    setDbConnectionDetails(connection_id, dbConnection);
  }

  console.log('Fetched or cached database connection:', dbConnection);

  const { database_type, host, database_name, username, password } = dbConnection;

  try {
    let datasetData: { columns: string[], rows: any[] };

    switch (database_type) {
      case 'postgres': {
        const pgClient = await connectToPostgres({ host, database: database_name, user: username, password });
        datasetData = await executeDatasetQuery(pgClient, finalQuery, 'postgres');
        await pgClient.end();
        break;
      }
      case 'mysql': {
        const mysqlConnection = await connectToMySQL({ host, database: database_name, user: username, password });
        datasetData = await executeDatasetQuery(mysqlConnection, finalQuery, 'mysql');
        await mysqlConnection.end();
        break;
      }
      case 'mongodb': {
        const mongoConnection = await connectToMongoDB({ host, database: database_name, user: username, password });
        datasetData = await executeDatasetQuery(mongoConnection.db, finalQuery, 'mongodb');
        await mongoConnection.client.close();
        break;
      }
      default:
        console.error('Unsupported database type:', database_type);
        return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 });
    }

    return NextResponse.json({
      datasetData,
      sqlQuery: finalQuery,
      selectedDateBy, // Return the updated dateBy (if overridden)
    }, { status: 200 });
  } catch (err: any) {
    console.error('Error executing query:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
