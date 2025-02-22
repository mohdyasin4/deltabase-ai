// app/api/database/[id]/datasets/[datasetName]/columns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';
import { connectToPostgres, listPostgresColumns, connectToMySQL, listMySQLColumns, connectToMongoDB, listMongoDBColumns } from '@/utils/databaseUtils';

export async function GET(req: NextRequest, { params }: { params: { id: string; datasetName: string } }) {
  const { id, datasetName } = params;

  if (!id || !datasetName) {
    return NextResponse.json({ error: 'Invalid ID or datasetName' }, { status: 400 });
  }

  // Fetch the dataset SQL query from Supabase
  const { data: dataset, error: datasetError } = await supabaseClient
    .from('datasets')
    .select('id, name, connection_id, sql_query')
    .eq('connection_id', id)
    .eq('name', datasetName)
    .single();

  if (datasetError || !dataset) {
    console.error('Error fetching dataset:', datasetError?.message || 'Dataset not found');
    return NextResponse.json({ error: 'Error fetching dataset' }, { status: 500 });
  }

  const { sql_query } = dataset;

  // Fetch database connection details from Supabase
  const { data: dbConnection, error: dbConnectionError } = await supabaseClient
    .from('database_connections')
    .select('database_type, host, database_name, username, password')
    .eq('id', id)
    .single();

  if (dbConnectionError || !dbConnection) {
    console.error('Error fetching database connection:', dbConnectionError?.message || 'Connection not found');
    return NextResponse.json({ error: 'Error fetching database details' }, { status: 500 });
  }

  const { database_type, host, database_name, username, password } = dbConnection;

  try {
    let columns: string[] = [];

    switch (database_type) {
      case 'postgres':
        console.log('Connecting to Postgres...');
        const pgClient = await connectToPostgres({ host, database: database_name, user: username, password });
        console.log('Postgres connected. Fetching columns for dataset query:', sql_query);
        columns = await listPostgresColumns(pgClient, sql_query); // Adjusted to fetch columns based on query
        await pgClient.end();
        break;

      case 'mysql':
        console.log('Connecting to MySQL...');
        const mysqlConnection = await connectToMySQL({ host, database: database_name, user: username, password });
        console.log('MySQL connected. Fetching columns for dataset query:', sql_query);
        columns = await listMySQLColumns(mysqlConnection, sql_query); // Adjusted to fetch columns based on query
        await mysqlConnection.end();
        break;

      case 'mongodb':
        console.log('Connecting to MongoDB...');
        const { db, client } = await connectToMongoDB({ host, database: database_name, user: username, password });
        console.log('MongoDB connected. Fetching columns for dataset query:', sql_query);
        columns = await listMongoDBColumns(db, sql_query); // Adjusted to fetch columns based on query
        await client.close();
        break;

      default:
        console.error('Unsupported database type:', database_type);
        return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 });
    }

    return NextResponse.json(columns, { status: 200 });
  } catch (err) {
    console.error('Error connecting to the database or querying the dataset columns:', err);
    return NextResponse.json({ error: 'Error connecting to the database or querying the dataset columns' }, { status: 500 });
  }
}
