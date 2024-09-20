import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';
import { connectToPostgres, queryPostgresTable, connectToMySQL, queryMySQLTable, connectToMongoDB, queryMongoDBCollection } from '@/utils/databaseUtils';

export async function GET(req: NextRequest, { params }: { params: { id: string; tableName: string } }) {
  const { id, tableName } = params;

  if (!id || !tableName) {
    return NextResponse.json({ error: 'Invalid ID or tableName' }, { status: 400 });
  }

  const { data, error } = await supabaseClient
    .from('database_connections')
    .select('database_type, host, database_name, username, password')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Error fetching database details' }, { status: 500 });
  }

  const { database_type, host, database_name, username, password } = data;

  try {
    let tableData: { columns: string[], rows: any[] };
    switch (database_type) {
      case 'postgres':
        const pgClient = await connectToPostgres({ host, database: database_name, user: username, password });
        const pgResult = await queryPostgresTable(pgClient, tableName);
        tableData = { columns: pgResult.fields.map(field => field.name), rows: pgResult.rows };
        await pgClient.end();
        break;
      case 'mysql':
        const mysqlConnection = await connectToMySQL({ host, database: database_name, user: username, password });
        tableData = await queryMySQLTable(mysqlConnection, tableName);
        await mysqlConnection.end();
        break;
      case 'mongodb':
        const mongoDb = await connectToMongoDB({ host, database: database_name, user: username, password });
        const mongoData = await queryMongoDBCollection(mongoDb, tableName);
        tableData = { columns: Object.keys(mongoData[0] || {}), rows: mongoData };
        await mongoDb.client.close();
        break;
      default:
        return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 });
    }

    return NextResponse.json(tableData, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Error connecting to the database or querying the table' }, { status: 500 });
  }
}