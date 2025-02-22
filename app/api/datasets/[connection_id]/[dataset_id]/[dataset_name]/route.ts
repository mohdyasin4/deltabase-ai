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

export async function GET(req: NextRequest, { params }: { params: { connection_id: string; dataset_id: string , dataset_name: string} }) {
  const { connection_id, dataset_id, dataset_name } = params;
  console.log('Connection ID:', connection_id, 'Dataset Name:', dataset_name);

  if (!connection_id || !dataset_id) {
    console.error('Invalid connection ID or dataset name');
    return NextResponse.json({ error: 'Invalid ID or dataset name' }, { status: 400 });
  }

  // Fetch dataset details
  const { data: dataset, error: datasetError } = await supabaseClient
    .from('datasets')
    .select('id, dataset_name, connection_id, sql_query')
    .eq('connection_id', connection_id)
    .eq('id', dataset_id)
    .single();

  if (datasetError || !dataset) {
    console.error('Error fetching dataset:', datasetError?.message || 'Dataset not found');
    return NextResponse.json({ error: 'Error fetching dataset' }, { status: 500 });
  }

  console.log('Fetched dataset:', dataset);

  // Check the cache for existing connection details
  let dbConnection = getDbConnectionDetails(connection_id);

  if (!dbConnection) {
    // Fetch database connection details if not found in the cache
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
    // Store the details in the cache
    setDbConnectionDetails(connection_id, dbConnection);
  }

  console.log('Fetched or cached database connection:', dbConnection);

  const { database_type, host, database_name, username, password } = dbConnection;

  try {
    let datasetData: { columns: string[], rows: any[] };

    // Establish the connection and execute the query
    switch (database_type) {
      case 'postgres':
        const pgClient = await connectToPostgres({ host, database: database_name, user: username, password });
        datasetData = await executeDatasetQuery(pgClient, dataset?.sql_query, 'postgres');
        await pgClient.end();
        break;

      case 'mysql':
        const mysqlConnection = await connectToMySQL({ host, database: database_name, user: username, password });
        datasetData = await executeDatasetQuery(mysqlConnection, dataset?.sql_query, 'mysql');
        await mysqlConnection.end();
        break;

      case 'mongodb':
        const mongoConnection = await connectToMongoDB({ host, database: database_name, user: username, password });
        datasetData = await executeDatasetQuery(mongoConnection.db, dataset?.sql_query, 'mongodb');
        await mongoConnection.client.close();
        break;

      default:
        console.error('Unsupported database type:', database_type);
        return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 });
    }

    return NextResponse.json(datasetData, { status: 200 });
  } catch (err) {
    console.error('Error connecting to the database or querying the table:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
